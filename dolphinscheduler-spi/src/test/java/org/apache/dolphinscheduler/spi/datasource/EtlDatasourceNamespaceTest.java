/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.dolphinscheduler.spi.datasource;

import org.apache.dolphinscheduler.spi.enums.DbType;

import java.lang.reflect.Proxy;
import java.sql.Connection;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class EtlDatasourceNamespaceTest {

    @Test
    void mysqlUsesCatalogNotSchema() throws Exception {
        BaseConnectionParam param = new TestConnectionParam();
        param.setDatabase("flink_ui");
        Assertions.assertEquals("taobao_ke", EtlDatasourceNamespace.resolve(DbType.MYSQL, param,
                connection("taobao_ke", "ignored")));
    }

    @Test
    void oracleUsesConnectionSchemaNotServiceName() throws Exception {
        BaseConnectionParam param = new TestConnectionParam();
        param.setDatabase("ORCLCDB");
        param.setUser("APP_USER");
        Assertions.assertEquals("APP_USER", EtlDatasourceNamespace.resolve(DbType.ORACLE, param,
                connection("ORCLCDB", "APP_USER")));
    }

    @Test
    void postgresqlUsesCatalogBecauseTableMetadataExpectsDatabase() throws Exception {
        BaseConnectionParam param = new TestConnectionParam();
        param.setDatabase("etl_db");
        Assertions.assertEquals("etl_db", EtlDatasourceNamespace.resolve(DbType.POSTGRESQL, param,
                connection("etl_db", "public")));
    }

    @Test
    void rejectsSavedNodeUsingAnotherDatabase() {
        Assertions.assertThrows(IllegalArgumentException.class,
                () -> EtlDatasourceNamespace.requireMatch("taobao_ke", "flink_ui"));
        Assertions.assertEquals("taobao_ke", EtlDatasourceNamespace.requireMatch("TAOBAO_KE", "taobao_ke"));
    }

    private static Connection connection(String catalog, String schema) {
        return (Connection) Proxy.newProxyInstance(Connection.class.getClassLoader(), new Class<?>[]{Connection.class},
                (proxy, method, args) -> {
                    if ("getCatalog".equals(method.getName()))
                        return catalog;
                    if ("getSchema".equals(method.getName()))
                        return schema;
                    throw new UnsupportedOperationException(method.getName());
                });
    }

    private static final class TestConnectionParam extends BaseConnectionParam {
    }
}
