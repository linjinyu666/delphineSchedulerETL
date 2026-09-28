package com.example.flink.pipeline;

import org.apache.flink.table.api.EnvironmentSettings;
import org.apache.flink.table.api.TableEnvironment;
import org.junit.Test;

import static org.junit.Assert.assertTrue;

public class ConfigurableJdbcEtlIdentifierTest {

    @Test
    public void quotesReservedKeywordInJsonFieldSchema() {
        String schema = ConfigurableJdbcEtl.convertFieldsJsonToFlink(
                "[{\"name\":\"method\",\"type\":\"STRING\"},{\"name\":\"id\",\"type\":\"BIGINT\"}]");

        assertTrue(schema, schema.contains("`method` STRING"));
        TableEnvironment tableEnv = TableEnvironment.create(
                EnvironmentSettings.newInstance().inBatchMode().build());
        tableEnv.executeSql("CREATE TEMPORARY TABLE source1 (" + schema + ") WITH ("
                + "'connector' = 'jdbc', "
                + "'url' = 'jdbc:mysql://localhost:3306/test', "
                + "'table-name' = 'test', "
                + "'driver' = 'com.mysql.cj.jdbc.Driver')");
    }

    @Test
    public void quotesReservedKeywordInLegacyFieldSchema() {
        String schema = ConfigurableJdbcEtl.convertFieldsSpecToFlink("method:STRING,id:BIGINT");

        assertTrue(schema, schema.contains("`method` STRING"));
    }

    @Test
    public void detectsLobColumnsWithQuotedIdentifiers() {
        assertTrue(ConfigurableJdbcEtl.detectLobColumns("`method` STRING, `raw_data` BLOB")
                .contains("raw_data"));
    }
}
