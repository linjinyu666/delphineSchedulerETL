package com.flinketl.jdbc.dm.database.dialect;

import org.apache.flink.connector.jdbc.core.database.dialect.AbstractDialect;
import org.apache.flink.connector.jdbc.core.database.dialect.JdbcDialectConverter;
import org.apache.flink.table.types.logical.LogicalTypeRoot;
import org.apache.flink.table.types.logical.RowType;

import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

/**
 * 达梦数据库 Dialect。
 *
 * 达梦 SQL 语法与 Oracle 高度兼容：双引号标识符、MERGE INTO upsert、FETCH FIRST 分页。
 * 这里复刻 Oracle 的语义即可。
 *
 * 注意：达梦 JDBC 仍然走 JdbcDataTypeUtil 解析，故这里不实现复杂的 dialect-specific
 * 转换规则，主要负责：
 *   1. 提供 dialectName = "DM"
 *   2. 关联 {@link DmDialectConverter} 修复 getObject 拿到的 LOB 对象反序列化
 *   3. 限定 supportedTypes 防止 Flink 1.20 拒绝 AS_TEXT UDF v1 注册
 */
public class DmDialect extends AbstractDialect {

    private static final Set<LogicalTypeRoot> SUPPORTED_TYPES = Collections.unmodifiableSet(
            new HashSet<>(Arrays.asList(
                    LogicalTypeRoot.CHAR, LogicalTypeRoot.VARCHAR, LogicalTypeRoot.BOOLEAN,
                    LogicalTypeRoot.VARBINARY, LogicalTypeRoot.DECIMAL, LogicalTypeRoot.TINYINT,
                    LogicalTypeRoot.SMALLINT, LogicalTypeRoot.INTEGER, LogicalTypeRoot.BIGINT,
                    LogicalTypeRoot.FLOAT, LogicalTypeRoot.DOUBLE, LogicalTypeRoot.DATE,
                    LogicalTypeRoot.TIME_WITHOUT_TIME_ZONE, LogicalTypeRoot.TIMESTAMP_WITHOUT_TIME_ZONE,
                    LogicalTypeRoot.TIMESTAMP_WITH_TIME_ZONE
            )));

    @Override
    public String dialectName() {
        return "DM";
    }

    @Override
    public JdbcDialectConverter getRowConverter(RowType rowType) {
        return new DmDialectConverter(rowType);
    }

    @Override
    public String getLimitClause(long limit) {
        return "FETCH FIRST " + limit + " ROWS ONLY";
    }

    @Override
    public String quoteIdentifier(String identifier) {
        return "\"" + identifier + "\"";
    }

    @Override
    public Set<LogicalTypeRoot> supportedTypes() {
        return SUPPORTED_TYPES;
    }

    @Override
    public Optional<AbstractDialect.Range> decimalPrecisionRange() {
        // 达梦 DECIMAL(p,s)，p 最大 38
        return Optional.of(AbstractDialect.Range.of(1, 38));
    }

    @Override
    public Optional<AbstractDialect.Range> timestampPrecisionRange() {
        return Optional.of(AbstractDialect.Range.of(0, 6));
    }

    @Override
    public Optional<String> getUpsertStatement(String tableName, String[] fieldNames, String[] uniqueKeyColumns) {
        // 达梦支持 MERGE INTO 语法，模仿 Oracle
        StringBuilder sb = new StringBuilder("MERGE INTO ");
        sb.append(quoteIdentifier(tableName)).append(" T1 USING (");
        StringBuilder select = new StringBuilder("SELECT ");
        for (int i = 0; i < fieldNames.length; i++) {
            if (i > 0) select.append(", ");
            // Flink JDBC 3.3 parses named parameters (":FIELD") and converts
            // them to JDBC placeholders internally. Literal "?" parameters are
            // rejected by FieldNamedPreparedStatement before the statement is
            // prepared, which makes DM primary-key sinks fail at runtime.
            select.append(":").append(fieldNames[i]).append(" AS ").append(quoteIdentifier(fieldNames[i]));
        }
        select.append(" FROM DUAL) T2 ON (");
        for (int i = 0; i < uniqueKeyColumns.length; i++) {
            if (i > 0) select.append(" AND ");
            select.append("T1.").append(quoteIdentifier(uniqueKeyColumns[i]))
                    .append(" = T2.").append(quoteIdentifier(uniqueKeyColumns[i]));
        }
        select.append(")");
        sb.append(select);
        // DM rejects UPDATE assignments to columns used in the MERGE ON
        // condition (for example, updating the primary-key ID itself).
        // Emit only non-key columns in the MATCHED branch. If every column is
        // a key, omit MATCHED entirely and keep the NOT MATCHED insert branch.
        boolean hasUpdate = false;
        for (String fieldName : fieldNames) {
            boolean isKey = false;
            for (String key : uniqueKeyColumns) {
                if (fieldName.equalsIgnoreCase(key)) {
                    isKey = true;
                    break;
                }
            }
            if (!isKey) {
                if (!hasUpdate) {
                    sb.append(" WHEN MATCHED THEN UPDATE SET ");
                    hasUpdate = true;
                } else {
                    sb.append(", ");
                }
                sb.append(quoteIdentifier(fieldName)).append(" = T2.").append(quoteIdentifier(fieldName));
            }
        }
        sb.append(" WHEN NOT MATCHED THEN INSERT (");
        for (int i = 0; i < fieldNames.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(quoteIdentifier(fieldNames[i]));
        }
        sb.append(") VALUES (");
        for (int i = 0; i < fieldNames.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append("T2.").append(quoteIdentifier(fieldNames[i]));
        }
        sb.append(")");
        return Optional.of(sb.toString());
    }
}
