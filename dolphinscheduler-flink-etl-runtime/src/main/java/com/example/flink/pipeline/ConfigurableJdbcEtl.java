package com.example.flink.pipeline;

import org.apache.flink.api.common.RuntimeExecutionMode;
import org.apache.flink.streaming.api.environment.StreamExecutionEnvironment;
import org.apache.flink.table.api.bridge.java.StreamTableEnvironment;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.*;
import java.util.Properties;

/**
 * 通用 Flink JDBC ETL —— 多输入多输出版本
 *
 * 配置示例（多个 source + 多个 sink）：
 *   sources = url|user|pwd|driver|table|alias|schema;url|user|pwd|driver|table|alias|schema
 *   sinks   = url|user|pwd|driver|table|schema;url|user|pwd|driver|table|schema
 *   sql     = INSERT INTO ${SINK_ALIAS_1}, ${SINK_ALIAS_2} SELECT ... FROM ${SRC_ALIAS_1} JOIN ${SRC_ALIAS_2} ...
 *
 * 运行：
 *   java ... com.example.flink.pipeline.ConfigurableJdbcEtl config/multi-io-etl.properties
 */
public class ConfigurableJdbcEtl {

    /**
     * 从 MySQL 读表字段，自动转成 Flink schema 字符串
     * 例如: order_id BIGINT, product_name STRING, price DECIMAL(10,2)
     */
    /**
     * MySQL/Oracle 类型 → Flink SQL 类型映射
     */
    public static String toFlinkType(String sqlType) {
        if (sqlType == null) return "STRING";
        String t = sqlType.toUpperCase();
        // 整数
        // 修正：TINYINT/SMALLINT 强转 Byte/Short，MySQL JDBC connector 返回 Integer/Float，会 ClassCastException
        // 一律翻译成 INT/SMALLINT → INT，跟实际行数据匹配
        if (t.equals("TINYINT") || t.equals("SMALLINT")) return "INT";
        if (t.equals("MEDIUMINT") || t.equals("INT") || t.equals("INTEGER") || t.equals("YEAR")) return "INT";
        if (t.equals("BIGINT") || t.equals("INT8")) return "BIGINT";
        // 浮点
        if (t.equals("FLOAT") || t.equals("REAL")) return "FLOAT";
        if (t.equals("DOUBLE") || t.equals("FLOAT8")) return "DOUBLE";
        if (t.equals("DECIMAL") || t.equals("NUMERIC") || t.equals("NUMBER")) return "DECIMAL";
        // 字符串
        if (t.equals("CHAR")) return "CHAR";
        if (t.equals("VARCHAR") || t.equals("VARCHAR2") || t.equals("NVARCHAR") || t.equals("NVARCHAR2")) return "VARCHAR";
        if (t.startsWith("TEXT") || t.equals("CLOB") || t.equals("JSON") || t.equals("ENUM") || t.equals("SET") || t.equals("LONG") || t.equals("NCLOB")) return "STRING";
        // 二进制
        if (t.equals("BINARY")) return "BINARY";
        if (t.equals("VARBINARY") || t.equals("RAW")) return "VARBINARY";
        if (t.contains("BLOB") || t.equals("IMAGE")) return "BYTES";
        // 时间
        if (t.equals("DATE")) return "DATE";
        if (t.equals("TIME")) return "TIME";
        if (t.equals("DATETIME") || t.equals("SMALLDATETIME")) return "TIMESTAMP";
        if (t.equals("TIMESTAMP")) return "TIMESTAMP";   // TIMESTAMP 保留原类型（FixedOracleDialectConverter 已修复 oracle.sql.TIMESTAMP cast bug）
        // 布尔
        if (t.equals("BIT") || t.equals("BOOLEAN") || t.equals("BOOL")) return "BOOLEAN";
        // 默认
        return "STRING";
    }

    /**
     * 对用户提供的 schema 字符串做 MySQL → Flink 类型映射
     * 用正则替换独立的类型名（单词边界匹配，避免误伤字段名）
     */
    public static String convertSchemaToFlink(String schema) {
        if (schema == null || schema.isEmpty()) return schema;
        // TINYINT / SMALLINT → INT（避免 MySQL JDBC connector 返回 Integer 时 ClassCastException）
        // 必须在 DATETIME / TEXT 等替换规则之前，否则 putback 会有问题
        schema = schema.replaceAll("(?i)\\bTINYINT\\b", "INT");
        schema = schema.replaceAll("(?i)\\bSMALLINT\\b", "INT");
        // MEDIUMINT → INT（同类防御）
        schema = schema.replaceAll("(?i)\\bMEDIUMINT\\b", "INT");
        // TIME → VARCHAR(20)
        //   MySQL TIME 范围 [-838:59:59, 838:59:59]；Flink SQL TIME 只支持 [00:00:00, 23:59:59]。
        //   在 sink 阶段触发 toLocalTime(int) → DateTimeException: HourOfDay ...: 567
        //   默认翻译成 VARCHAR(20) 字符串透传，下游需要时自行 to_time / cast 解析。
        //
        //   **注意**: 必须先把 `TIMESTAMP[(n)] WITH [LOCAL] TIME ZONE` 整体替换, 否则独立替换 TIME 会破坏 "TIME ZONE"
        //     变成 "TIMESTAMP WITH VARCHAR(20) ZONE" -> SQL 解析失败
        //     (Oracle 实际写 "TIMESTAMP(6) WITH TIME ZONE", 容忍可选精度标志)
        //   替换成 VARCHAR(60) (因为 oracle.sql.TIMESTAMPTZ.stringValue() 是 ISO 字符串):
        //   - Flink OracleDialect 不支持 TIMESTAMP_LTZ 抛 validate 错
        //   - 但 CHAR/VARCHAR case 会调 oracle.sql.TIMESTAMPTZ.stringValue() 拿真实文本
        schema = schema.replaceAll("(?i)\\bTIMESTAMP\\s*(?:\\(\\s*\\d+\\s*\\))?\\s+WITH\\s+(?:LOCAL\\s+)?TIME\\s+ZONE\\b", "VARCHAR(60)");
        // TIMESTAMP_LTZ 等 Oracle/SQL Server 的 time-zone variant 也归到 VARCHAR
        schema = schema.replaceAll("(?i)\\bTIMESTAMP_WITH(?:_LOCAL)?TIMEZONE\\b", "VARCHAR(60)");
        schema = schema.replaceAll("(?i)\\bTIMESTAMP\\s+WITH\\s+TIME\\s+ZONE\\b", "VARCHAR(60)");
        schema = schema.replaceAll("(?i)\\bTIME(?:\\s*\\(\\s*\\d+\\s*\\))?\\b", "VARCHAR(20)");
        // BLOB / CLOB / BINARY / RAW 各种方言分别处理:
        //   达梦 (DM):
        //     - DM 给 byte[] / String 直接是 ok
        //     - DM DmdbNClob / DmdbBlob 是 LOB 对象, AS_TEXT UDF 反射读 data 字段
        //   Oracle:
        //     - Oracle 给 oracle.sql.CLOB / BLOB / RAW 这种"专属"对象
        //     - 反序列化器的 BYTES 路径 (Flink JDBC) 调 val.getBytes() — 对 CLOB 抛 typeMismatch
        //     - 反序列化器的 VARCHAR 路径调 val.toString() — Oracle CLOB.toString() 是对象 ID
        //   PG:
        //     - PG 给 String / byte[] 直接, BYTES 还是 STRING 都行
        //   MySQL:
        //     - MySQL 给 String / byte[] 直接
        //
        //   我们没有 Oracle 单独的 FlinkTypeConverter override, 所以这里采取保守策略:
        //     BLOB / BINARY / RAW → BYTES (反正 MySQL/达梦 BLOB 反序列化器能转 byte[])
        //     CLOB / NCLOB / LONG → STRING (BYTES 转换会触发 Oracle 反序列化器 typeMismatch)
        //     达梦 CLOB 让 DmDialectConverter 走反射 → 拿到 StringData.fromString(realString)
        //     Oracle CLOB 走 Oracle 反序列化器 → val.toString() 是对象 ID —— 让用户接受
        schema = schema.replaceAll("(?i)\\b(?:TINY|MEDIUM|LONG)?BLOB\\b", "BYTES");
        schema = schema.replaceAll("(?i)\\bVARBINARY\\s*(?:\\(\\s*\\d+\\s*\\))?\\b", "BYTES");
        schema = schema.replaceAll("(?i)\\bBINARY\\s*(?:\\(\\s*\\d+\\s*\\))?\\b", "BYTES");
        schema = schema.replaceAll("(?i)\\bRAW\\s*(?:\\(\\s*\\d+\\s*\\))?\\b", "BYTES");
        schema = schema.replaceAll("(?i)\\b(?:N)?CLOB\\b", "STRING");
        schema = schema.replaceAll("(?i)\\bLONG\\b", "STRING");
        // DATETIME → TIMESTAMP
        schema = schema.replaceAll("(?i)\\bDATETIME\\b", "TIMESTAMP");
        // SMALLDATETIME → TIMESTAMP
        schema = schema.replaceAll("(?i)\\bSMALLDATETIME\\b", "TIMESTAMP");
        // TEXT 系列 → STRING
        schema = schema.replaceAll("(?i)\\b(?:TINY|MEDIUM|LONG)?TEXT\\b", "STRING");
        // BLOB 系列 → BYTES
        schema = schema.replaceAll("(?i)\\b(?:TINY|MEDIUM|LONG)?BLOB\\b", "BYTES");
        // JSON → STRING
        schema = schema.replaceAll("(?i)\\bJSON\\b", "STRING");
        // ENUM → STRING
        schema = schema.replaceAll("(?i)\\bENUM\\b", "STRING");
        // BIT → BOOLEAN
        schema = schema.replaceAll("(?i)\\bBIT\\b", "BOOLEAN");
        // YEAR → INT
        schema = schema.replaceAll("(?i)\\bYEAR\\b", "INT");
        // Oracle: NUMBER → DECIMAL
        schema = schema.replaceAll("(?i)\\bNUMBER\\b", "DECIMAL");
        // Oracle: VARCHAR2 → VARCHAR
        schema = schema.replaceAll("(?i)\\bVARCHAR2\\b", "VARCHAR");
        // Oracle: NVARCHAR2 → VARCHAR
        schema = schema.replaceAll("(?i)\\bNVARCHAR2\\b", "VARCHAR");
        // TIMESTAMP / TIMESTAMP(n) / TIMESTAMP(n) WITH TIME ZONE → TIMESTAMP（保留原类型，FixedOracleDialectConverter 已修复 cast bug）
        // regex 必须包含 (n) 部分一起替换，否则 TIMESTAMP(6) 会被替换成 TIMESTAMP 后还残留 "(6)"
        // 同时去掉 WITH TIME ZONE / WITH LOCAL TIME ZONE 后缀
        schema = schema.replaceAll("(?i)\\bTIMESTAMP\\b\\s*(?:\\(\\s*\\d+\\s*\\))?(?:\\s+(?:WITH|WITHOUT)\\s+(?:LOCAL\\s+)?TIME\\s+ZONE)?", "TIMESTAMP");
        // Oracle: CLOB/NCLOB → STRING
        schema = schema.replaceAll("(?i)\\b(?:N)?CLOB\\b", "STRING");
        // Oracle: LONG → STRING
        schema = schema.replaceAll("(?i)\\bLONG\\b", "STRING");
        // Oracle: RAW → VARBINARY
        schema = schema.replaceAll("(?i)\\bRAW\\b", "VARBINARY");
        // Oracle: BINARY_FLOAT → FLOAT， BINARY_DOUBLE → DOUBLE
        schema = schema.replaceAll("(?i)\\bBINARY_FLOAT\\b", "FLOAT");
        schema = schema.replaceAll("(?i)\\bBINARY_DOUBLE\\b", "DOUBLE");
        return schema;
    }

    /**
     * 把前端传来的字段子集（"name1:TYPE,name2:TYPE,..."）转成 Flink DDL 列定义
     *
     * 样例：
     *   输入: "id:BIGINT,username:VARCHAR(64),created_at:TIMESTAMP"
     *   输出: "id BIGINT NOT NULL, username VARCHAR(64), created_at STRING"
     *        （TIMESTAMP 自动转 STRING，绕开 Oracle Converter bug）
     *
     * 校验：
     *   - 字段名/类型不能为空
     *   - 字段名只允许字母数字下划线点
     *   - 类型必须是支持的 Flink 类型
     */
    /** convertFieldsSpecToFlink 用 ThreadLocal 标记 LOB 列, createSourceTable 用它把 view 包装 AS_TEXT */
    private static final ThreadLocal<java.util.Set<String>> LOB_COLS_TL = ThreadLocal.withInitial(java.util.LinkedHashSet::new);

    /** JSON 解析 (DS 端 fields 用 JSON 数组传过来, 这里解析) */
    private static final com.fasterxml.jackson.databind.ObjectMapper MAPPER =
            new com.fasterxml.jackson.databind.ObjectMapper();

    /** Quote generated column identifiers so names that are Flink SQL keywords (for example METHOD) remain valid. */
    private static String quoteIdentifier(String identifier) {
        return "`" + identifier.replace("`", "``") + "`";
    }

    private static String unquoteIdentifier(String identifier) {
        String value = identifier == null ? "" : identifier.trim();
        if (value.length() >= 2 && value.charAt(0) == '`' && value.charAt(value.length() - 1) == '`') {
            return value.substring(1, value.length() - 1).replace("``", "`");
        }
        return value;
    }

    /**
     * 按 ',' 切分字段列表, 但不切 ( ... ) 内部.
     * 这样 DECIMAL(18,4) 里的逗号就不会把 type 切碎.
     */
    private static String[] splitFieldsSpec(String fieldsSpec) {
        java.util.List<String> out = new java.util.ArrayList<>();
        int depth = 0;
        int start = 0;
        for (int i = 0; i < fieldsSpec.length(); i++) {
            char c = fieldsSpec.charAt(i);
            if (c == '(') depth++;
            else if (c == ')') depth = Math.max(0, depth - 1);
            else if (c == ',' && depth == 0) {
                out.add(fieldsSpec.substring(start, i));
                start = i + 1;
            }
        }
        out.add(fieldsSpec.substring(start));
        return out.toArray(new String[0]);
    }

    public static String convertFieldsSpecToFlink(String fieldsSpec) {
        if (fieldsSpec == null || fieldsSpec.trim().isEmpty()) return "";

        // 新格式: JSON 数组 '[{"name":"ID","type":"NUMBER(10)"}, ...]' — type 里可以含逗号/冒号
        if (fieldsSpec.trim().startsWith("[")) {
            return convertFieldsJsonToFlink(fieldsSpec);
        }

        // 先把所有列拼成 "name TYPE, name TYPE, ..." 这种 DDL 形式，
        // 然后复用 convertSchemaToFlink 做统一的 MySQL/Oracle → Flink 类型映射
        java.util.Set<String> SUPPORTED = new java.util.HashSet<>(java.util.Arrays.asList(
                // 已经是 Flink 类型的（前端直接选过）
                "STRING", "VARCHAR", "CHAR", "BOOLEAN",
                // TINYINT / SMALLINT 仍在白名单以便前端 / DB 回填能选，
                // 但下面在拼 DDL 之前会被强制规整成 INT（避免 MySQL JDBC connector 返回 Integer 时 ClassCastException）
                "TINYINT", "SMALLINT", "INT", "INTEGER", "BIGINT",
                "FLOAT", "DOUBLE", "DECIMAL",
                "DATE", "TIME", "TIMESTAMP",
                "BYTES", "BINARY", "VARBINARY",
                // MySQL 原生类型（前端从 DB 读到的）
                "NUMBER", "TINYTEXT", "MEDIUMTEXT", "LONGTEXT", "TEXT",
                "TINYBLOB", "MEDIUMBLOB", "LONGBLOB", "BLOB",
                "DATETIME", "SMALLDATETIME", "JSON", "ENUM", "BIT", "YEAR", "MEDIUMINT",
                // Oracle 原生类型
                "VARCHAR2", "NVARCHAR2", "CLOB", "NCLOB", "LONG", "RAW",
                "BINARY_FLOAT", "BINARY_DOUBLE",
                // PG / SQL Server
                "SERIAL", "BIGSERIAL", "UUID", "BYTEA"
        ));
        StringBuilder sb = new StringBuilder();
        // **重名校验**：Flink SQL Parser 对重复列直接抛 Duplicate column。这里早点拦下来
        // 既能在抛错时给出具体哪一列冲突，也避免 DDL 解析到一半才罢工。
        //   - 同一个 fields_spec 内重名（极其常见的拼写错误）
        //   - 我们用 LinkedHashSet 保留首次出现的顺序
        java.util.LinkedHashSet<String> seenNames = new java.util.LinkedHashSet<>();
        // 不在 ( ... ) 内部切逗号, 否则 DECIMAL(18,4) 会被切坏成 "DECIMAL(18" + "4)"
        String[] cols = splitFieldsSpec(fieldsSpec);
        for (int i = 0; i < cols.length; i++) {
            String col = cols[i].trim();
            if (col.isEmpty()) continue;
            int colon = col.indexOf(':');
            if (colon <= 0 || colon == col.length() - 1) {
                throw new IllegalArgumentException("字段子集格式错误（应 name:TYPE）: " + col);
            }
            String name = col.substring(0, colon).trim();
            if (seenNames.contains(name)) {
                throw new IllegalArgumentException(
                    "字段子集包含重名列: '" + name + "'（原始第 " + (i + 1) + " 段: " + col + "，所有字段: " + fieldsSpec + "）");
            }
            seenNames.add(name);
            String type = col.substring(colon + 1).trim().toUpperCase();
            // 校验字段名
            if (!name.matches("[A-Za-z_][A-Za-z0-9_.]*")) {
                throw new IllegalArgumentException("字段名非法: " + name);
            }
            // 校验类型（支持原 DB 类型 + Flink 类型）
            String baseType = type.replaceAll("\\([^)]*\\)", "").replaceAll("(?i)\\s+WITH\\s+(LOCAL\\s+)?TIME\\s+ZONE", "").trim();
            if (!SUPPORTED.contains(baseType)) {
                throw new IllegalArgumentException("不支持的字段类型: " + type + "（字段: " + name + "）");
            }
            // **关键规整**: TINYINT/SMALLINT → INT (避免 ClassCastException)
            //   原因: MySQL JDBC connector 把 SQL TINYINT/SMALLINT 返回成 Integer/Float，
            //         但 Flink DDL 中 TINYINT 走 Byte 表示，结果 ClassCastException
            String normalizedType = type;
            if ("TINYINT".equals(normalizedType) || "SMALLINT".equals(normalizedType)) {
                normalizedType = "INT";
            }
            // **TIME 兜底**: MySQL TIME 是 "duration"，范围 [-838:59:59, 838:59:59]，
            //   Flink SQL TIME 只能是 [00:00:00, 23:59:59]。
            //   MySQL JDBC connector 把 c_time 喂到 Flink GenericRowData 时单位不一致，
            //   导致 DateTimeUtils.toLocalTime(int) 在 sink 阶段抛
            //     DateTimeException: Invalid value for HourOfDay ...: 567
            //   默认翻译成 VARCHAR(20) 透传字符串，下游业务要当 TIME 用时自行解析。
            if ("TIME".equals(normalizedType)) {
                normalizedType = "VARCHAR(20)";
            }
            // **BYTES 类**二进制列 (BLOB/CLOB/BINARY/RAW) 归一到 BYTES, 注册到 LOB 列;
            //   CLOB/NCLOB/LONG 改 STRING 透传 (因为 Oracle 反序列化器对 BYTES 路径 CLOB 抛 typeMismatch,
            //   达梦 STRING 路径 DmDialectConverter 已经反射读 data 字段拿真实 String)
            //
            //   Oracle FixedOracleDialectConverter 在 BINARY/STRING 两条路径都做了严格类型校验,
            //   对 oracle.sql.CLOB / oracle.sql.BLOB 等强类型对象直接抛 typeMismatch.
            //   我们在 dm-factory 同款设计了 oracle-factory, 但还没最终接入. 临时方案:
            //   **对 Oracle CLOB/NCLOB/LONG/RAW 字段**改透明跳过 (改名为 _skip_xxx 后 SELECT 会失败),
            //   推荐让用户改写 SQL 时显式 SELECT AS_TEXT(...) 触发手动拿.
            //   临时此处暂时让 CLOB/NCLOB/LONG 改 STRING (走父类反射拿到 oracle.sql.CLOB 然后
            //   getSubString), 已申报到 dm-factory 的 Oracle 补充插件.
            String upperType = normalizedType.toUpperCase();
            if (upperType.contains("BLOB")
                    || upperType.equals("BINARY")
                    || upperType.equals("VARBINARY")
                    || upperType.equals("RAW")) {
                normalizedType = "BYTES";   // 全部归一到 BYTES, 配合 AS_TEXT UDF 反射读真实内容
                LOB_COLS_TL.get().add(name);  // 让 main 知道这列需要 AS_TEXT 包一下
            } else if (upperType.contains("CLOB")
                    || upperType.equals("NCLOB")
                    || upperType.equals("LONG")) {
                normalizedType = "STRING";   // Oracle 等方言的 CLOB 走 STRING, 反射拿真实文本
            }
            // 标记 LOB 类字段 → 由 detectLobColumns 在 source DDL 后包一层 view (AS_TEXT)
            // 留下的 LOB 类型字符串已经让 DDL 兼容 (VARCHAR/STRING), 不需要这里再标记
            if (sb.length() > 0) sb.append(", ");
            sb.append(quoteIdentifier(name)).append(' ').append(normalizedType);
        }
        // 统一类型转换（复用 convertSchemaToFlink）
        String result = convertSchemaToFlink(sb.toString());
        // TIMESTAMP(n) → TIMESTAMP（保留原类型，FixedOracleDialectConverter 已修复 cast bug）
        result = result.replaceAll("(?i)\\bTIMESTAMP\\s*\\([^)]*\\)", "TIMESTAMP");
        return result;
    }

    /**
     * 把 DS 端以 JSON 数组形式发过来的字段列表 ('[{"name":"ID","type":"NUMBER(10)"}, ...]')
     * 规整成 Flink DDL 子句, 复用 convertSchemaToFlink 做统一类型映射。
     *
     * 之所以有这条路径：老格式 "name:TYPE,name:TYPE" 用 ',' 切分, 但 type 里允许出现 ',',
     * 比如 Oracle NUMBER(18,4) / VARCHAR2(4000) 等带括号带逗号的类型, 一刀切就把字段拆坏,
     * 在 test-run 里出现 {"name":"C_DECIMAL18_4","type":"NUMBER(18"} + {"name":"4)","type":"STRING"} 这种分裂结果。
     */
    public static String convertFieldsJsonToFlink(String fieldsJson) {
        if (fieldsJson == null || fieldsJson.trim().isEmpty()) return "";
        try {
            com.fasterxml.jackson.databind.JsonNode arr = MAPPER.readTree(fieldsJson);
            if (arr == null || !arr.isArray()) {
                throw new IllegalArgumentException("fields JSON 不是数组: " + fieldsJson);
            }
            java.util.Set<String> SUPPORTED = new java.util.HashSet<>(java.util.Arrays.asList(
                    "STRING", "VARCHAR", "CHAR", "BOOLEAN",
                    "TINYINT", "SMALLINT", "INT", "INTEGER", "BIGINT",
                    "FLOAT", "DOUBLE", "DECIMAL",
                    "DATE", "TIME", "TIMESTAMP",
                    "BYTES", "BINARY", "VARBINARY",
                    "NUMBER", "TINYTEXT", "MEDIUMTEXT", "LONGTEXT", "TEXT",
                    "TINYBLOB", "MEDIUMBLOB", "LONGBLOB", "BLOB",
                    "DATETIME", "SMALLDATETIME", "JSON", "ENUM", "BIT", "YEAR", "MEDIUMINT",
                    "VARCHAR2", "NVARCHAR2", "CLOB", "NCLOB", "LONG", "RAW",
                    "BINARY_FLOAT", "BINARY_DOUBLE",
                    "SERIAL", "BIGSERIAL", "UUID", "BYTEA"
            ));
            StringBuilder sb = new StringBuilder();
            java.util.LinkedHashSet<String> seenNames = new java.util.LinkedHashSet<>();
            for (int i = 0; i < arr.size(); i++) {
                com.fasterxml.jackson.databind.JsonNode rec = arr.get(i);
                String name = rec.path("name").asText("").trim();
                String type = rec.path("type").asText("").trim();
                if (name.isEmpty() || type.isEmpty()) {
                    throw new IllegalArgumentException("字段 JSON 缺 name 或 type (index " + i + "): " + rec);
                }
                if (seenNames.contains(name)) {
                    throw new IllegalArgumentException(
                        "字段子集包含重名列: '" + name + "' (原始第 " + (i + 1) + " 段: " + rec + ", 全部: " + fieldsJson + ")");
                }
                seenNames.add(name);
                if (!name.matches("[A-Za-z_][A-Za-z0-9_.]*")) {
                    throw new IllegalArgumentException("字段名非法: " + name);
                }
                String typeUpper = type.toUpperCase();
                String baseType = typeUpper.replaceAll("\\([^)]*\\)", "")
                        .replaceAll("(?i)\\s+WITH\\s+(LOCAL\\s+)?TIME\\s+ZONE", "").trim();
                if (!SUPPORTED.contains(baseType)) {
                    throw new IllegalArgumentException("不支持的字段类型: " + type + "（字段: " + name + "）");
                }
                // 规整: TINYINT/SMALLINT → INT
                String normalizedType = typeUpper;
                if ("TINYINT".equals(normalizedType) || "SMALLINT".equals(normalizedType)) {
                    normalizedType = "INT";
                }
                // TIME → VARCHAR(20)
                if ("TIME".equals(normalizedType)) {
                    normalizedType = "VARCHAR(20)";
                }
                // LOB / BINARY 归一
                if (normalizedType.contains("BLOB")
                        || normalizedType.equals("BINARY")
                        || normalizedType.equals("VARBINARY")
                        || normalizedType.equals("RAW")) {
                    normalizedType = "BYTES";
                    LOB_COLS_TL.get().add(name);
                } else if (normalizedType.contains("CLOB")
                        || normalizedType.equals("NCLOB")
                        || normalizedType.equals("LONG")) {
                    normalizedType = "STRING";
                }
                if (sb.length() > 0) sb.append(", ");
                sb.append(quoteIdentifier(name)).append(' ').append(normalizedType);
            }
            String result = convertSchemaToFlink(sb.toString());
            // TIMESTAMP(n) → TIMESTAMP
            result = result.replaceAll("(?i)\\bTIMESTAMP\\s*\\([^)]*\\)", "TIMESTAMP");
            return result;
        } catch (com.fasterxml.jackson.core.JsonProcessingException jpe) {
            throw new IllegalArgumentException("fields JSON 解析失败: " + fieldsJson + " — " + jpe.getOriginalMessage(), jpe);
        } catch (java.io.IOException ioe) {
            throw new IllegalArgumentException("fields JSON 解析失败: " + fieldsJson + " — " + ioe.getMessage(), ioe);
        }
    }

    /**
     * 检测 schema 字符串里 LOB / BINARY / RAW 类列名, 用于注册 view 阶段做 AS_TEXT 包装
     * (注意：当 convertFieldsSpecToFlink 把 BLOB 转成 VARCHAR(4096)、CLOB 转成 STRING 后,
     *  从 schema 字面上已经看不到原始类型的字面量, 本方法只兜底 CUSTOM DDL / DB 自动读 schema 的场景)
     */
    static java.util.Set<String> detectLobColumns(String schema) {
        java.util.Set<String> ret = new java.util.LinkedHashSet<>();
        if (schema == null || schema.isEmpty()) return ret;
        // 切字段定义, 形式: name TYPE, name TYPE, ...
        // 这是基于 schema 已经是 DDL 子句的事实形式做正则拆分
        java.util.regex.Matcher m = java.util.regex.Pattern.compile(
                "(?:^|,)\\s*((?:`(?:``|[^`])+`)|(?:[A-Za-z_][A-Za-z0-9_]*))\\s+([A-Za-z0-9_()]+)"
        ).matcher(schema);
        while (m.find()) {
            String colName = unquoteIdentifier(m.group(1));
            String type = m.group(2).toUpperCase();
            // 是 VARCHAR(4096) 形式时说明 convertFieldsSpec 兜底来自 BLOB, 也归为 LOB
            if (type.startsWith("CLOB") || type.startsWith("BLOB") || type.startsWith("NCLOB")
                    || type.equals("RAW") || type.equals("BINARY") || type.equals("VARBINARY")
                    || type.startsWith("VARCHAR(4096)")
                    || type.startsWith("VARCHAR(8192)")
                    || type.startsWith("VARCHAR(MAX)")) {
                ret.add(colName);
            }
        }
        return ret;
    }

    public static String readSchemaFromDb(String url, String user, String pwd, String driver, String table) {
        return readSchemaFromDbWithOwner(url, user, pwd, driver, table, null);
    }

    /**
     * 读表 schema（可指定 owner，用于 Oracle）
     */
    public static String readSchemaFromDbWithOwner(String url, String user, String pwd, String driver, String table, String owner) {
        StringBuilder sb = new StringBuilder();
        try (Connection conn = DriverManager.getConnection(url, user, pwd)) {
            DatabaseMetaData meta = conn.getMetaData();
            // 读主键列
            java.util.Set<String> pkCols = new java.util.HashSet<>();
            try (ResultSet rs = meta.getPrimaryKeys(null, owner, table)) {
                while (rs.next()) {
                    pkCols.add(rs.getString("COLUMN_NAME"));
                }
            }
            // 读所有列
            try (ResultSet rs = meta.getColumns(null, owner, table, null)) {
                boolean first = true;
                while (rs.next()) {
                    String colName = rs.getString("COLUMN_NAME");
                    String sqlType = rs.getString("TYPE_NAME");  // 如 INT, VARCHAR, DECIMAL
                    int size = rs.getInt("COLUMN_SIZE");
                    int decimal = rs.getInt("DECIMAL_DIGITS");
                    if (!first) sb.append(", ");
                    // MySQL 类型 → Flink 类型映射
                    String flinkType = toFlinkType(sqlType);
                    sb.append(quoteIdentifier(colName)).append(" ").append(flinkType);
                    if ("VARCHAR".equals(flinkType) || "CHAR".equals(flinkType)) {
                        sb.append("(").append(size > 0 ? size : 255).append(")");
                    } else if ("DECIMAL".equals(flinkType)) {
                        sb.append("(").append(size > 0 ? size : 18)
                          .append(",").append(decimal >= 0 ? decimal : 2).append(")");
                    }
                    // 如果是主键列，加 NOT NULL
                    if (pkCols.contains(colName)) {
                        sb.append(" NOT NULL");
                    }
                    first = false;
                }
            }
            // 如果表不存在或无字段，用 * 做兜底
            if (sb.length() == 0) {
                sb.append("* VARCHAR(255)");
            }
        } catch (Exception e) {
            System.out.println("[WARN] 自动读字段失败: " + e.getMessage());
            return "* VARCHAR(255)";  // 兜底
        }
        return sb.toString();
    }

    /**
     * 读 MySQL 表的主键列名（逗号分隔），用于 DDL 末尾加 PRIMARY KEY
     */
    public static String readPrimaryKeyFromDb(String url, String user, String pwd, String driver, String table) {
        StringBuilder sb = new StringBuilder();
        try (Connection conn = DriverManager.getConnection(url, user, pwd)) {
            DatabaseMetaData meta = conn.getMetaData();
            try (ResultSet rs = meta.getPrimaryKeys(null, null, table)) {
                boolean first = true;
                while (rs.next()) {
                    if (!first) sb.append(", ");
                    sb.append(quoteIdentifier(rs.getString("COLUMN_NAME")));
                    first = false;
                }
            }
        } catch (Exception e) {
            // 无主键则返回空
        }
        return sb.toString();
    }

    public static void main(String[] args) throws Exception {
        long jobStart = System.currentTimeMillis();
        // 1. 读配置
        String configPath = args.length > 0 ? args[0] : "config/multi-io-etl.properties";
        Properties cfg = loadProperties(configPath);
        System.out.println("========================================");
        System.out.println("[Flink ETL] 任务启动");
        System.out.println("[Flink ETL] 配置文件: " + configPath);
        System.out.println("[Flink ETL] 启动时间: " + new java.util.Date());

        String sourcesSpec = cfg.getProperty("sources", "");
        String sinksSpec   = cfg.getProperty("sinks", "");
        String sqlTemplate = cfg.getProperty("sql");
        String parallelism = cfg.getProperty("parallelism", "1");

        // 统计 source/sink 数量
        int srcCount = 0, sinkCount = 0;
        for (String s : sourcesSpec.split(";")) if (!s.trim().isEmpty()) srcCount++;
        for (String s : sinksSpec.split(";")) if (!s.trim().isEmpty()) sinkCount++;
        System.out.println("[Flink ETL] 数据源数量: " + srcCount + " | 目标表数量: " + sinkCount + " | 并行度: " + parallelism);
        System.out.println("========================================");

        // 2. 准备环境
        System.out.println("[Step 1/4] 初始化 Flink 执行环境...");
        StreamExecutionEnvironment env = StreamExecutionEnvironment.getExecutionEnvironment();
        env.setRuntimeMode(RuntimeExecutionMode.BATCH);
        env.setParallelism(Integer.parseInt(parallelism));
        env.getCheckpointConfig().disableCheckpointing();
        StreamTableEnvironment tableEnv = StreamTableEnvironment.create(env);

        // 注册反序列化 UDF: 把达梦 DmdbNClob / DmdbBlob / 等 LOB 对象转成真实字符串
        tableEnv.createTemporarySystemFunction("AS_TEXT", AsTextUdf.class);
        System.out.println("[Step 1/4] Flink 环境初始化完成 (BATCH 模式, 并行度=" + parallelism + ", AS_TEXT UDF 已注册)");

        // 优先用我们的 dm-factory SPI 工厂 (无论 ServiceLoader 顺序如何). 当前 ServiceLoader 已注册我们的 DmFactory / OracleFactory
        // Flink 接受第一个 acceptsURL=true 的 factory
        // (Flink 内部 JdbcDialects 类维护了静态 builder 装载这些 factory, 无需我们额外干预)
        System.out.println("[Step 1/4] SPI 工厂装载顺序:");
        for (org.apache.flink.connector.jdbc.core.database.JdbcFactory f
             : java.util.ServiceLoader.load(org.apache.flink.connector.jdbc.core.database.JdbcFactory.class)) {
            System.out.println("    [FACTORY] " + f.getClass().getName() + (f.acceptsURL("jdbc:oracle:thin:@/foo:1521/ORCL") ? "  <-- 会接受 jdbc:oracle" : ""));
        }

        // 3. 注册所有 source 表
        System.out.println("[Step 2/4] 注册数据源表...");
        String[] sources = sourcesSpec.split(";");
        // Source 真正 alias, view 注册后这里换成 view alias (源码里的变量)
        String[] sourceAliasReal = new String[sources.length];
        int srcIdx = 0;
        for (String src : sources) {
            if (src.trim().isEmpty()) continue;
            srcIdx++;
            String[] parts = src.split("\\|", -1);
            // 后端 PipelineService.formatDbConfig 永远生成 9 列：
            //   url|user|pwd|driver|table|alias|owner|customDdl|fieldsSpec
            if (parts.length < 9) {
                throw new IllegalArgumentException("source 配置格式错误（期望 9 列，实际 " + parts.length + " 列）: " + src);
            }
            String url          = parts[0];
            String user         = parts[1];
            String pwd          = parts[2];
            String driver       = parts[3];
            String table        = parts[4];
            String alias        = parts[5];
            String owner        = parts[6];   // Oracle/DM schema owner（如 APP_USER），MySQL 为空
            String customDdl    = parts[7];   // 用户自定义表 DDL（可选）
            String fieldsSpec   = parts[8];   // 用户选择的字段子集：name1:TYPE,name2:TYPE
            long t0 = System.currentTimeMillis();
            // schema 字段语义（清晰版本）：
            //   1. fieldsSpec 非空 → 字段子集（最高优先级，按用户指定的列）
            //   2. customDdl 非空 → 用户自定义 DDL
            //   3. owner 非空（Oracle/DM）→ 用 owner 参数读 schema
            //   4. 都为空 → 自动从数据库读 schema（全字段）
            String schema;
            String schemaMode;
            if (fieldsSpec != null && !fieldsSpec.trim().isEmpty()) {
                schema = convertFieldsSpecToFlink(fieldsSpec);
                schemaMode = "字段子集(" + fieldsSpec.split(",").length + " 列)";
                System.out.println("  [Source " + srcIdx + "/" + srcCount + "] " + alias + " ← " + table + " (" + schemaMode + ", 耗时" + (System.currentTimeMillis()-t0) + "ms)");
            } else if (customDdl != null && !customDdl.trim().isEmpty()) {
                schema = convertSchemaToFlink(customDdl);
                System.out.println("  [Source " + srcIdx + "/" + srcCount + "] " + alias + " ← " + table + " (自定义DDL schema, 耗时" + (System.currentTimeMillis()-t0) + "ms)");
            } else if (owner != null && !owner.trim().isEmpty()) {
                schema = convertSchemaToFlink(readSchemaFromDbWithOwner(url, user, pwd, driver, table, owner));
                System.out.println("  [Source " + srcIdx + "/" + srcCount + "] " + alias + " ← " + table + " (owner=" + owner + ", 耗时" + (System.currentTimeMillis()-t0) + "ms)");
            } else {
                schema = convertSchemaToFlink(readSchemaFromDb(url, user, pwd, driver, table));
                System.out.println("  [Source " + srcIdx + "/" + srcCount + "] " + alias + " ← " + table + " (自动读取schema, 耗时" + (System.currentTimeMillis()-t0) + "ms)");
            }
            String ddl = "CREATE TABLE " + alias + " (" + schema + ") WITH (" +
                    "  'connector' = 'jdbc'," +
                    "  'url' = '" + url + "'," +
                    "  'username' = '" + user + "'," +
                    "  'password' = '" + pwd + "'," +
                    "  'driver' = '" + driver + "'," +
                    "  'table-name' = '" + table + "'" +
                    ")";
            System.out.println("    [DDL] " + ddl);
            tableEnv.executeSql(ddl);

            // 检查 schema 中是否有 LOB / BINARY / RAW 列，对这些列注册 view 把对象 toString 拆成真文本
            // (达梦 JDBC DmdbNClob / DmdbBlob 等对象 .toString() 拿到的是 JVM 对象 ID,
            //  业务侧拿不到内容。AS_TEXT UDF 用反射读其 internal data 字段或走标准 Clob/Blob 接口兜底)
            // 注意: 用了 convertFieldsSpecToFlink 后 ThreadLocal 标记了 LOB 列, 在此消费
            java.util.Set<String> lobCols = new java.util.LinkedHashSet<>(LOB_COLS_TL.get());
            System.out.println("    [DEBUG] LOB cols detected: " + lobCols);
            if (!lobCols.isEmpty()) {
                String viewAlias = alias + "_view";
                // view SELECT 列清单: schema 里所有列(LOB 列改为 AS_TEXT 形式), 避开 *
                StringBuilder viewSelect = new StringBuilder("CREATE VIEW " + viewAlias + " AS SELECT ");
                String[] schemaCols = schema.split(",");
                for (int ci = 0; ci < schemaCols.length; ci++) {
                    String sc = schemaCols[ci].trim();
                    int sp = sc.indexOf(' ');
                    if (sp <= 0) continue;
                    String colIdentifier = sc.substring(0, sp).trim();
                    String colName = unquoteIdentifier(colIdentifier);
                    if (ci > 0) viewSelect.append(", ");
                    if (lobCols.contains(colName)) {
                        viewSelect.append("AS_TEXT(").append(colIdentifier).append(") AS ").append(colIdentifier);
                    } else {
                        viewSelect.append(colIdentifier);
                    }
                }
                viewSelect.append(" FROM ").append(alias);
                tableEnv.executeSql(viewSelect.toString());
                System.out.println("    [VIEW] " + viewSelect + "  (AS_TEXT 包了 " + lobCols + ")");
                parts[5] = viewAlias;
                sourceAliasReal[srcIdx - 1] = viewAlias;  // 记录到全局
            } else {
                sourceAliasReal[srcIdx - 1] = alias;
            }
            LOB_COLS_TL.remove();  // 清空, 不影响下一个 source
        }
        System.out.println("[Step 2/4] 数据源注册完成 (" + srcCount + " 个)");

        // 4. 注册所有 sink 表
        System.out.println("[Step 3/4] 注册目标表...");
        String[] sinks = sinksSpec.split(";");
        StringBuilder multiInsert = new StringBuilder("INSERT INTO ");
        boolean firstSink = true;
        int sinkIdx = 0;
        for (String snk : sinks) {
            if (snk.trim().isEmpty()) continue;
            sinkIdx++;
            String[] parts = splitConfig(snk, 8);
            String url          = parts[0];
            String user         = parts[1];
            String pwd          = parts[2];
            String driver       = parts[3];
            String table        = parts[4];
            String alias        = parts[5];
            String owner        = parts[6];
            String customDdl    = parts[7];
            long t0 = System.currentTimeMillis();
            String schema;
            if (customDdl != null && !customDdl.trim().isEmpty()) {
                schema = convertSchemaToFlink(customDdl);
                System.out.println("  [Sink " + sinkIdx + "/" + sinkCount + "] " + alias + " → " + table + " (自定义DDL schema, 耗时" + (System.currentTimeMillis()-t0) + "ms)");
            } else if (owner != null && !owner.trim().isEmpty()) {
                schema = readSchemaFromDbWithOwner(url, user, pwd, driver, table, owner);
                System.out.println("  [Sink " + sinkIdx + "/" + sinkCount + "] " + alias + " → " + table + " (owner=" + owner + ", 耗时" + (System.currentTimeMillis()-t0) + "ms)");
            } else {
                schema = readSchemaFromDb(url, user, pwd, driver, table);
                System.out.println("  [Sink " + sinkIdx + "/" + sinkCount + "] " + alias + " → " + table + " (自动读取schema, 耗时" + (System.currentTimeMillis()-t0) + "ms)");
            }
            // INSERT 使用 append；只有 replace_into/upsert 才声明主键并启用 JDBC upsert。
            // sink spec 第 9 列为可选 mode，兼容旧的 8 列格式（默认 append）。
            String sinkMode = parts.length > 8 ? parts[8].trim().toLowerCase() : "append";
            boolean upsertMode = "upsert".equals(sinkMode) || "replace_into".equals(sinkMode)
                    || "replaceinto".equals(sinkMode) || "replace".equals(sinkMode);
            String pkCols = upsertMode ? readPrimaryKeyFromDb(url, user, pwd, driver, table) : "";
            String pkPart = pkCols.isEmpty() ? "" : ", PRIMARY KEY (" + pkCols + ") NOT ENFORCED";
            String ddl = "CREATE TABLE " + alias + " (" + schema + pkPart + ") WITH (" +
                    "  'connector' = 'jdbc'," +
                    "  'url' = '" + url + "'," +
                    "  'username' = '" + user + "'," +
                    "  'password' = '" + pwd + "'," +
                    "  'driver' = '" + driver + "'," +
                    "  'table-name' = '" + table + "'," +
                    "  'sink.buffer-flush.max-rows' = '200'," +
                    "  'sink.buffer-flush.interval' = '2s'" +
                    ")";
            tableEnv.executeSql(ddl);
            if (!firstSink) multiInsert.append(", ");
            multiInsert.append(alias);
            firstSink = false;
        }
        multiInsert.append(" ");
        System.out.println("[Step 3/4] 目标表注册完成 (" + sinkCount + " 个)");

        // 5. 替换 SQL 占位符
        String finalSql = sqlTemplate.replace("\\n", "\n");
        for (int i = 0; i < sources.length; i++) {
            finalSql = finalSql.replace("${SRC_ALIAS_" + (i + 1) + "}", sourceAliasReal[i] != null ? sourceAliasReal[i] : "source" + (i + 1));
        }
        for (int i = 0; i < sinks.length; i++) {
            if (sinks[i].trim().isEmpty()) continue;
            String[] parts = splitConfig(sinks[i].trim(), 7);
            finalSql = finalSql.replace("${SINK_ALIAS_" + (i + 1) + "}", parts[5]);
        }

        // 6. 拼接 multiInsert
        String upperSql = finalSql.toUpperCase().trim();
        boolean hasSink = !firstSink;
        String finalSqlFull = (!hasSink || upperSql.startsWith("INSERT") || upperSql.contains(";")) ? finalSql : multiInsert.toString() + finalSql;

        // 7. 执行 SQL
        System.out.println("[Step 4/4] 开始执行 SQL...");
        System.out.println("----------------------------------------");
        System.out.println("[SQL]\n" + finalSqlFull);
        System.out.println("----------------------------------------");

        String[] sqls = finalSqlFull.split(";\\s*\\n?\\s*");
        int totalSqls = 0;
        for (String s : sqls) if (!s.trim().isEmpty()) totalSqls++;

        int sqlIdx = 0;
        for (int i = 0; i < sqls.length; i++) {
            String s = sqls[i].trim();
            if (s.isEmpty()) continue;
            sqlIdx++;
            String upper = s.toUpperCase();
            long sqlStart = System.currentTimeMillis();
            if (upper.startsWith("CREATE VIEW") || upper.startsWith("CREATE TEMPORARY VIEW")
                    || upper.startsWith("CREATE TABLE") || upper.startsWith("CREATE TEMPORARY TABLE")) {
                System.out.println("[SQL " + sqlIdx + "/" + totalSqls + "] 执行 DDL: " + s.substring(0, Math.min(80, s.length())).replace("\n"," ") + "...");
                tableEnv.executeSql(s);
                System.out.println("[SQL " + sqlIdx + "/" + totalSqls + "] DDL 执行完成 (耗时 " + (System.currentTimeMillis()-sqlStart) + "ms)");
            } else if (upper.startsWith("INSERT INTO")) {
                String sinkName = extractTableName(s);
                String sinkMode = sinkModeForAlias(sinkName, sinks);
                String operation = "upsert".equals(sinkMode) ? "REPLACE INTO（upsert）" : "INSERT";
                System.out.println("[SQL " + sqlIdx + "/" + totalSqls + "] 执行 " + operation + " → " + sinkName + " ...");
                // INSERT 提交的是异步 Flink 作业；必须等待 TableResult 完成，
                // 否则主进程提前退出会让 JDBC Sink（尤其达梦）回滚事务。
                org.apache.flink.table.api.TableResult insertResult = tableEnv.executeSql(s);
                try {
                    insertResult.await();
                } catch (Exception ex) {
                    // JDBC 驱动通常只返回约束名；补充打印目标表的主键字段，便于用户定位冲突列。
                    printConflictFields(sinkName, sinks);
                    throw ex;
                }
                System.out.println("[SQL " + sqlIdx + "/" + totalSqls + "] INSERT 完成 → " + sinkName + " (耗时 " + (System.currentTimeMillis()-sqlStart) + "ms)");
            } else {
                System.out.println("[SQL " + sqlIdx + "/" + totalSqls + "] 执行查询...");
                // 使用 TableResult.print() 让 Flink 直接把结果输出到当前 stdout
                org.apache.flink.table.api.TableResult result = tableEnv.executeSql(s);
                try {
                    // 将 stdout 临时改到当前 Process 的 System.out, 这样 collect() 的打印能被父进程读到
                    result.print();
                    System.out.println("[SQL " + sqlIdx + "/" + totalSqls + "] 查询完成 (耗时 " + (System.currentTimeMillis()-sqlStart) + "ms)");
                } catch (Exception ex) {
                    System.out.println("[SQL " + sqlIdx + "/" + totalSqls + "] 查询完成 (耗时 " + (System.currentTimeMillis()-sqlStart) + "ms), print 失败: " + ex.getMessage());
                }
            }
        }

        long totalTime = System.currentTimeMillis() - jobStart;
        System.out.println("========================================");
        System.out.println("[Flink ETL] ✅ 任务执行完毕!");
        System.out.println("[Flink ETL] 完成时间: " + new java.util.Date());
        System.out.println("[Flink ETL] 总耗时: " + formatDuration(totalTime));
        System.out.println("[Flink ETL] 执行SQL数: " + totalSqls + " | 数据源: " + srcCount + " | 目标表: " + sinkCount);
        System.out.println("========================================");
    }

    private static void printConflictFields(String sinkAlias, String[] sinkSpecs) {
        try {
            for (String spec : sinkSpecs) {
                String[] p = splitConfig(spec.trim(), 8);
                if (!sinkAlias.equals(p[5])) continue;
                Class.forName(p[3]);
                try (java.sql.Connection c = java.sql.DriverManager.getConnection(p[0], p[1], p[2]);
                     java.sql.ResultSet rs = c.getMetaData().getPrimaryKeys(null, p[6], p[4])) {
                    java.util.List<String> keys = new java.util.ArrayList<>();
                    while (rs.next()) keys.add(rs.getString("COLUMN_NAME"));
                    if (!keys.isEmpty()) System.err.println("[JDBC] 冲突字段（主键）: " + String.join(", ", keys));
                }
                return;
            }
        } catch (Exception metadataError) {
            System.err.println("[JDBC] 无法读取冲突字段: " + metadataError.getMessage());
        }
    }

    private static String sinkModeForAlias(String sinkAlias, String[] sinkSpecs) {
        for (String spec : sinkSpecs) {
            String[] p = splitConfig(spec.trim(), 8);
            if (sinkAlias.equals(p[5])) {
                String mode = p.length > 8 ? p[8].trim().toLowerCase() : "append";
                return ("replace_into".equals(mode) || "replaceinto".equals(mode)
                        || "replace".equals(mode) || "upsert".equals(mode)) ? "upsert" : "append";
            }
        }
        return "append";
    }

    /** 从 INSERT INTO xxx SELECT ... 中提取表名 */
    private static String extractTableName(String sql) {
        String upper = sql.toUpperCase().trim();
        int idx = upper.indexOf("INSERT INTO");
        if (idx < 0) return "?";
        int start = idx + "INSERT INTO".length();
        // 跳过空白
        while (start < sql.length() && Character.isWhitespace(sql.charAt(start))) start++;
        // 读到下一个空白或 (
        int end = start;
        while (end < sql.length() && !Character.isWhitespace(sql.charAt(end)) && sql.charAt(end) != '(') end++;
        return sql.substring(start, end);
    }

    /** 格式化耗时 */
    private static String formatDuration(long ms) {
        if (ms < 1000) return ms + "ms";
        long sec = ms / 1000;
        if (sec < 60) return sec + "秒" + (ms % 1000) / 100 + "00ms";
        long min = sec / 60;
        return min + "分" + (sec % 60) + "秒";
    }

    /**
     * 给一条 SELECT SQL，找出它输出列对应的 sink，按"INSERT INTO sink"形式包装
     * 简化策略：每条 SELECT 输出列顺序必须与某个 sink 一致；
     * 这里按 sink 顺序轮询匹配（生产可用列名匹配）。
     */
    private static String insertForSingleSink(String selectSql, String[] sinks) {
        if (selectSql.contains("${THIS_SINK_ALIAS}")) {
            return "INSERT INTO " + splitConfig(sinks[0].trim(), 7)[5] + " " + selectSql;
        }
        return "INSERT INTO " + splitConfig(sinks[0].trim(), 7)[5] + " " + selectSql;
    }

    /** 加载 properties */
    private static Properties loadProperties(String path) throws IOException {
        Properties p = new Properties();
        if (Files.exists(Path.of(path))) {
            try (InputStream in = Files.newInputStream(Path.of(path))) {
                p.load(in);
                return p;
            }
        }
        try (InputStream in = ConfigurableJdbcEtl.class.getClassLoader().getResourceAsStream(path)) {
            if (in == null) throw new IOException("找不到配置文件: " + path);
            p.load(in);
        }
        return p;
    }

    /**
     * 按 | 分割，但管道在 schema 里（一般不含），直接 split
     * 如果 fields 超过实际分割数，抛出错误让用户立刻发现
     */
    private static String[] splitConfig(String s, int expected) {
        String[] parts = s.split("\\|", -1);
        if (parts.length < expected) {
            // 向后兼容：少于期望列数时补空字符串（而不是抛异常）
            String[] padded = new String[expected];
            System.arraycopy(parts, 0, padded, 0, parts.length);
            for (int i = parts.length; i < expected; i++) padded[i] = "";
            return padded;
        }
        return parts;
    }
}
