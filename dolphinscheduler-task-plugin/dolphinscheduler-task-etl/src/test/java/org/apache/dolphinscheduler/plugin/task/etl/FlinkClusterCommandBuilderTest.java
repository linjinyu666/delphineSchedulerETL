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

import java.io.File;
import java.nio.file.Paths;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class FlinkClusterCommandBuilderTest {

    @Test
    void shouldBuildSessionClusterRunCommandAndQuotePaths() {
        String command = FlinkClusterCommandBuilder.buildRunCommand(
                "/opt/jdk 17",
                new File("/opt/flink/bin/flink"),
                "flink-jobmanager:8081",
                3,
                "com.example.flink.pipeline.ConfigurableJdbcEtl",
                new File("/opt/etl/flink-learning-cluster.jar"),
                Paths.get("/tmp/etl run/etl.properties"));

        Assertions.assertEquals(
                "JAVA_HOME='/opt/jdk 17' PATH='/opt/jdk 17/bin':\"$PATH\" '/opt/flink/bin/flink' "
                        + "run -m 'flink-jobmanager:8081' -p 3 "
                        + "-c 'com.example.flink.pipeline.ConfigurableJdbcEtl' "
                        + "'/opt/etl/flink-learning-cluster.jar' '/tmp/etl run/etl.properties'",
                command);
    }

    @Test
    void shouldFormatJobManagerHostAndPort() {
        Assertions.assertEquals("flink-jobmanager:8081",
                FlinkClusterCommandBuilder.formatJobManagerEndpoint("flink-jobmanager", 8081));
        Assertions.assertEquals("flink-jobmanager:8082",
                FlinkClusterCommandBuilder.formatJobManagerEndpoint("flink-jobmanager:8082", 8081));
        Assertions.assertEquals("[2001:db8::1]:8081",
                FlinkClusterCommandBuilder.formatJobManagerEndpoint("2001:db8::1", 8081));
        Assertions.assertEquals("[2001:db8::1]:8082",
                FlinkClusterCommandBuilder.formatJobManagerEndpoint("[2001:db8::1]", 8082));
    }

    @Test
    void shouldRejectInvalidJobManagerEndpoint() {
        Assertions.assertThrows(RuntimeException.class,
                () -> FlinkClusterCommandBuilder.formatJobManagerEndpoint("", 8081));
        Assertions.assertThrows(RuntimeException.class,
                () -> FlinkClusterCommandBuilder.formatJobManagerEndpoint("flink-jobmanager", 70000));
        Assertions.assertThrows(RuntimeException.class,
                () -> FlinkClusterCommandBuilder.formatJobManagerEndpoint("flink-jobmanager:70000", 8081));
    }
}
