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

package org.apache.dolphinscheduler.plugin.task.etl;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

public class EtlParametersTest {

    @Test
    public void testCheckParameters_valid() {
        EtlParameters p = new EtlParameters();
        p.setSources("jdbc:mysql://h:3306/db|root|pwd|com.mysql.cj.jdbc.Driver|orders|src1|||");
        p.setSql("SELECT * FROM ${SRC_ALIAS_1}");
        assertTrue(p.checkParameters());
    }

    @Test
    public void testCheckParameters_missingSources() {
        EtlParameters p = new EtlParameters();
        p.setSources("");
        p.setSql("SELECT 1");
        assertFalse(p.checkParameters());
    }

    @Test
    public void testCheckParameters_missingSql() {
        EtlParameters p = new EtlParameters();
        p.setSources("jdbc:mysql://h:3306/db|root|pwd|com.mysql.cj.jdbc.Driver|orders|src1|||");
        assertFalse(p.checkParameters());
    }

    @Test
    public void testSetters() {
        EtlParameters p = new EtlParameters();
        p.setSources(
                "jdbc:mysql://h:3306/db|root|pwd|com.mysql.cj.jdbc.Driver|orders|src1|||;jdbc:oracle:thin:@//h:1521/svc|app|pwd|oracle.jdbc.OracleDriver|USERS|src2|APP_USER||");
        p.setSinks("jdbc:mysql://h:3306/dw|root|pwd|com.mysql.cj.jdbc.Driver|orders_dw|dst1||");
        p.setSql(
                "INSERT INTO ${SINK_ALIAS_1} SELECT id, name FROM ${SRC_ALIAS_1} JOIN ${SRC_ALIAS_2} ON ${SRC_ALIAS_1}.uid = ${SRC_ALIAS_2}.id");
        p.setParallelism(4);
        p.setMainClass("com.example.MyEtl");
        p.setJvmArgs("-Xmx4g");
        p.setLibDir("/opt/flink/lib");

        assertEquals(4, p.getParallelism());
        assertEquals("com.example.MyEtl", p.getMainClass());
        assertEquals("-Xmx4g", p.getJvmArgs());
        assertEquals("/opt/flink/lib", p.getLibDir());
        assertTrue(p.getSources().contains("oracle"));
        assertTrue(p.getSql().contains("${SINK_ALIAS_1}"));
    }
}
