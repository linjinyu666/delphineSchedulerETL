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

import java.sql.Connection;
import java.sql.SQLException;

/**
 * The one database/schema an ETL datasource connection is bound to. The DS
 * table metadata API uses catalogs for MySQL/PostgreSQL/SQL Server, while
 * Oracle and Dameng select tables by schema.
 */
public final class EtlDatasourceNamespace {

    private EtlDatasourceNamespace() {
    }

    public static String resolve(DbType type, BaseConnectionParam param, Connection connection) throws SQLException {
        String namespace;
        if (type == DbType.ORACLE || type == DbType.DAMENG) {
            namespace = connection.getSchema();
            if (isBlank(namespace)) {
                namespace = param.getUser();
            }
        } else {
            namespace = type == DbType.HIVE ? param.getDatabase() : connection.getCatalog();
            if (isBlank(namespace)) {
                namespace = param.getDatabase();
            }
        }
        if (isBlank(namespace)) {
            throw new SQLException("Datasource has no fixed ETL database/schema; configure its default namespace");
        }
        return namespace.trim();
    }

    public static String requireMatch(String selected, String fixed) {
        if (isBlank(fixed)) {
            throw new IllegalArgumentException("Datasource has no fixed ETL database/schema");
        }
        if (!isBlank(selected) && !selected.trim().equalsIgnoreCase(fixed.trim())) {
            throw new IllegalArgumentException("ETL node database/schema '" + selected.trim()
                    + "' differs from datasource's fixed database/schema '" + fixed.trim()
                    + "'. Select a datasource bound to the intended database/schema.");
        }
        return fixed.trim();
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }
}
