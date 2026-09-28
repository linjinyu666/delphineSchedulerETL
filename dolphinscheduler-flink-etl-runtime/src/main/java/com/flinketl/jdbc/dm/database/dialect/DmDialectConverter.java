package com.flinketl.jdbc.dm.database.dialect;

import org.apache.flink.connector.jdbc.core.database.dialect.AbstractDialectConverter;
import org.apache.flink.table.data.DecimalData;
import org.apache.flink.table.data.StringData;
import org.apache.flink.table.data.TimestampData;
import org.apache.flink.table.types.logical.DecimalType;
import org.apache.flink.table.types.logical.LogicalType;
import org.apache.flink.table.types.logical.LogicalTypeRoot;
import org.apache.flink.table.types.logical.RowType;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

/**
 * 达梦 DialectConverter — 修复达梦 JDBC ResultSet.getObject(col) 拿到的"强类型 LOB 对象"
 * 无法直接转 String / byte[] 的问题。
 *
 * <h2>达梦 JDBC 行为特点</h2>
 * <ul>
 *   <li>{@code CLOB / NCLOB / TEXT} 列 — getObject 拿到 {@code dm.jdbc.driver.DmdbNClob}
 *       对象，其 {@code .toString()} 是 "DmdbNClob@hash"。但对象内部有一个 {@code public String data}
 *       字段，存储真实文本内容。</li>
 *   <li>{@code BLOB / BINARY / VARBINARY} 列 — getObject 拿到 {@code DmdbBlob} 对象，
 *       它有 {@code getBytes(long pos, int length)} 方法可读出真实字节。</li>
 *   <li>{@code TIMESTAMP} 列 — getObject 不稳定，有时返回 {@link Timestamp}，有时返回字符串 "yyyy-MM-dd HH:mm:ss"。</li>
 *   <li>{@code DATE} — 同上。</li>
 *   <li>{@code DECIMAL} — 返回 BigDecimal 或其他 Number 子类。</li>
 * </ul>
 *
 * <h2>反序列化策略</h2>
 * <p>每个 case 都先做类型适配（{@code val instanceof String} / {@code instanceof byte[]} / ...），
 * 然后对 DM 强类型 LOB 对象反射读 {@code data} 字段拿真实 String/byte[]，
 * 对 {@code java.sql.Clob} 走标准的 {@code Clob.getSubString(1, length)} 兜底。
 * 反射读不到时再 fallback to {@code val.toString()}（可能拿到 hash，业务自己承担）。
 *
 * <h2>匹配 DDL 归一化</h2>
 * <p>本转换器是按 Flink LogicalType 派发，无视具体 dialect。
 * 字段类型经过 {@link com.example.flink.pipeline.ConfigurableJdbcEtl#convertSchemaToFlink}
 * 预处理后再喂进来：
 *   <ul>
 *     <li>{@code TINYINT/SMALLINT/MEDIUMINT/YEAR} → {@code INT}（DDL 阶段已转换）</li>
 *     <li>{@code TIME} → {@code VARCHAR(20)}（避免 Flink TIME 0~23h 校验）</li>
 *     <li>{@code BLOB/BINARY/RAW} → {@code BYTES}（refer to AS_TEXT UDF）</li>
 *     <li>{@code CLOB/NCLOB} → {@code STRING}（业务透传）</li>
 *   </ul>
 */
public class DmDialectConverter extends AbstractDialectConverter {

    public DmDialectConverter(RowType rowType) {
        super(rowType);
    }

    @Override
    public String converterName() {
        return "DM";
    }

    @Override
    protected JdbcDeserializationConverter createInternalConverter(LogicalType type) {
        LogicalTypeRoot root = type.getTypeRoot();
        switch (root) {
            case BOOLEAN:
                return val -> {
                    if (val == null) return null;
                    if (val instanceof Boolean) return (Boolean) val;
                    if (val instanceof Number) return ((Number) val).intValue() != 0;
                    return Boolean.parseBoolean(val.toString());
                };
            case TINYINT:
                return val -> {
                    if (val == null) return null;
                    if (val instanceof Number) return ((Number) val).byteValue();
                    return Byte.parseByte(val.toString().trim());
                };
            case SMALLINT:
                return val -> {
                    if (val == null) return null;
                    if (val instanceof Number) return ((Number) val).shortValue();
                    return Short.parseShort(val.toString().trim());
                };
            case INTEGER:
                return val -> {
                    if (val == null) return null;
                    if (val instanceof Number) return ((Number) val).intValue();
                    return Integer.parseInt(val.toString().trim());
                };
            case BIGINT:
                return val -> {
                    if (val == null) return null;
                    if (val instanceof Number) return ((Number) val).longValue();
                    return Long.parseLong(val.toString().trim());
                };
            case FLOAT:
                return val -> {
                    if (val == null) return null;
                    if (val instanceof Number) return ((Number) val).floatValue();
                    return Float.parseFloat(val.toString().trim());
                };
            case DOUBLE:
                return val -> {
                    if (val == null) return null;
                    if (val instanceof Number) return ((Number) val).doubleValue();
                    return Double.parseDouble(val.toString().trim());
                };
            case DECIMAL: {
                final int precision = ((DecimalType) type).getPrecision();
                final int scale = ((DecimalType) type).getScale();
                return val -> {
                    if (val == null) return null;
                    BigDecimal bd;
                    if (val instanceof BigDecimal) bd = (BigDecimal) val;
                    else if (val instanceof Number) bd = new BigDecimal(val.toString());
                    else bd = new BigDecimal(val.toString());
                    return DecimalData.fromBigDecimal(bd.setScale(scale, RoundingMode.HALF_UP), precision, scale);
                };
            }
            case CHAR:
            case VARCHAR:
                // DM VARCHAR / CHAR / TEXT 等, getObject 可能也拿到 DmdbNClob 对象,
                // .toString() 是 hash 字符串. 同样先反射读 data 字段.
                return val -> {
                    if (val == null) return null;
                    if (val instanceof String)  return StringData.fromString((String) val);
                    if (val instanceof byte[]) return StringData.fromString(new String((byte[]) val, java.nio.charset.StandardCharsets.UTF_8));
                    try {
                        java.lang.reflect.Field f = val.getClass().getField("data");
                        Object raw = f.get(val);
                        if (raw instanceof String)  return StringData.fromString((String) raw);
                        if (raw instanceof byte[]) return StringData.fromString(new String((byte[]) raw, java.nio.charset.StandardCharsets.UTF_8));
                    } catch (Exception ignore) {}
                    if (val instanceof java.sql.Clob) {
                        try {
                            java.sql.Clob c = (java.sql.Clob) val;
                            return StringData.fromString(c.getSubString(1L, (int) Math.min(c.length(), 4000)));
                        } catch (Exception ignore) {}
                    }
                    return StringData.fromString(val.toString());
                };
            case DATE:
                return val -> {
                    if (val == null) return null;
                    LocalDate d;
                    if (val instanceof Date) d = ((Date) val).toLocalDate();
                    else if (val instanceof LocalDate) d = (LocalDate) val;
                    else d = LocalDate.parse(val.toString().substring(0, 10));
                    return (int) d.toEpochDay();
                };
            case TIME_WITHOUT_TIME_ZONE:
                return val -> {
                    if (val == null) return null;
                    LocalTime t;
                    if (val instanceof Time) t = ((Time) val).toLocalTime();
                    else if (val instanceof LocalTime) t = (LocalTime) val;
                    else t = LocalTime.parse(val.toString());
                    return t.toNanoOfDay() / 1_000_000;
                };
            case TIMESTAMP_WITHOUT_TIME_ZONE:
                return val -> {
                    if (val == null) return null;
                    LocalDateTime dt;
                    if (val instanceof Timestamp) dt = ((Timestamp) val).toLocalDateTime();
                    else if (val instanceof LocalDateTime) dt = (LocalDateTime) val;
                    else if (val instanceof Date) dt = LocalDateTime.of(((Date) val).toLocalDate(), LocalTime.MIDNIGHT);
                    else dt = LocalDateTime.parse(val.toString().replace(' ', 'T'));
                    return TimestampData.fromLocalDateTime(dt);
                };
            case TIMESTAMP_WITH_TIME_ZONE:
                return val -> {
                    if (val == null) return null;
                    if (val instanceof java.time.OffsetDateTime) {
                        return TimestampData.fromInstant(((java.time.OffsetDateTime) val).toInstant());
                    }
                    if (val instanceof Timestamp) {
                        return TimestampData.fromInstant(((Timestamp) val).toInstant());
                    }
                    return TimestampData.fromInstant(java.time.Instant.parse(val.toString()));
                };
            case BINARY:
            case VARBINARY:
                // dm.jdbc.driver.DmdbBlob 是个强类型 LOB 对象, 直接 val.toString() 是 "DmdbBlob@hash"
                // 必须调 Blob.getBytes() 拿到真实字节内容。Flink BINARY/VARBINARY 都最终归为 BYTES RowData
                return val -> {
                    if (val == null) return null;
                    if (val instanceof byte[]) return val;
                    // DM DmdbBlob
                    try {
                        java.lang.reflect.Method m = val.getClass().getMethod("getBytes", long.class, int.class);
                        // DmdbBlob.getBytes(long pos, int length) — long pos=1, length=Integer.MAX_VALUE
                        return (byte[]) m.invoke(val, 1L, Integer.MAX_VALUE);
                    } catch (Exception ignore) {}
                    try {
                        // 备用: 反射读 public data 字段
                        java.lang.reflect.Field f = val.getClass().getField("data");
                        Object raw = f.get(val);
                        if (raw instanceof byte[]) return raw;
                    } catch (Exception ignore) {}
                    return new byte[0];  // 没法子拿到, 返回空字节而非 toString
                };
            default:
                // DM 很多字段 (TEXT, CLOB, NCLOB 等) getObject 拿到 DmdbClob/DmdbNClob 等强类型对象
                // 这些对象 .toString() 只是 "DmdbNClob@hash" 没业务意义.
                // 我们统一反射读 `public String data` 字段拿到真实字符串内容,
                // 对 CLOB/NClob 也是 ASCII 路径, 直接 byte[]→String 即可
                return val -> {
                    if (val == null) return null;
                    if (val instanceof byte[]) return StringData.fromString(new String((byte[]) val, java.nio.charset.StandardCharsets.UTF_8));
                    if (val instanceof String)  return StringData.fromString((String) val);
                    // 反射读 public data 字段 (dm.jdbc.driver.DmdbClob.data / DmdbNClob.data / DmdbBlob.data)
                    try {
                        java.lang.reflect.Field f = val.getClass().getField("data");
                        Object raw = f.get(val);
                        if (raw instanceof String)  return StringData.fromString((String) raw);
                        if (raw instanceof byte[]) return StringData.fromString(new String((byte[]) raw, java.nio.charset.StandardCharsets.UTF_8));
                    } catch (NoSuchFieldException ignore) {
                        // 不是 DM 的类型, 走 fallback
                    } catch (Exception ignore) {}
                    // 兜底: 强制 Clob.getSubString(1, 4000) 拿字符串
                    if (val instanceof java.sql.Clob) {
                        try {
                            java.sql.Clob c = (java.sql.Clob) val;
                            return StringData.fromString(c.getSubString(1L, (int) Math.min(c.length(), 4000)));
                        } catch (Exception ignore) {}
                    }
                    return StringData.fromString(val.toString());
                };
        }
    }
}
