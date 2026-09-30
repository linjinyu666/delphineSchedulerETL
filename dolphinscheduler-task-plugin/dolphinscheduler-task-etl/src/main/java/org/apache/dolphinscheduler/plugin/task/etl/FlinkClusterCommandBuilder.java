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

import org.apache.dolphinscheduler.plugin.task.api.TaskException;

import java.io.File;
import java.nio.file.Path;

/** Builds the shell command used to submit the ETL runner to a Flink Session cluster. */
final class FlinkClusterCommandBuilder {

    private FlinkClusterCommandBuilder() {
        throw new IllegalStateException("Utility class");
    }

    static String buildRunCommand(String javaHome, File flinkCli, String jobManagerEndpoint, int parallelism,
                                  String mainClass, File clusterJar, Path propertiesFile) {
        if (parallelism < 1) {
            throw new TaskException("Flink ETL parallelism must be greater than zero: " + parallelism);
        }
        return "JAVA_HOME=" + shellQuote(javaHome.trim())
                + " PATH=" + shellQuote(new File(javaHome.trim(), "bin").getAbsolutePath()) + ":\"$PATH\" "
                + shellQuote(flinkCli.getAbsolutePath())
                + " run -m " + shellQuote(jobManagerEndpoint)
                + " -p " + parallelism
                + " -c " + shellQuote(mainClass)
                + " " + shellQuote(clusterJar.getAbsolutePath())
                + " " + shellQuote(propertiesFile.toAbsolutePath().toString());
    }

    static String formatJobManagerEndpoint(String address, int restPort) {
        if (restPort < 1 || restPort > 65535) {
            throw new TaskException("Invalid JobManager REST port: " + restPort);
        }
        String host = address == null ? "" : address.trim();
        if (host.isEmpty()) {
            throw new TaskException("JobManager address is required for Flink cluster execution.");
        }
        if (host.startsWith("[")) {
            int closingBracket = host.indexOf(']');
            if (closingBracket < 0) {
                throw new TaskException("Invalid bracketed JobManager address: " + host);
            }
            String suffix = host.substring(closingBracket + 1);
            if (suffix.isEmpty()) {
                return host + ":" + restPort;
            }
            if (suffix.matches(":\\d{1,5}")) {
                int port = Integer.parseInt(suffix.substring(1));
                if (port < 1 || port > 65535) {
                    throw new TaskException("Invalid JobManager port in address: " + host);
                }
                return host;
            }
            throw new TaskException("Invalid JobManager address: " + host);
        }
        int firstColon = host.indexOf(':');
        int lastColon = host.lastIndexOf(':');
        if (firstColon != lastColon) {
            // An unbracketed IPv6 literal has no explicit port; bracket it for Flink's host:port syntax.
            return "[" + host + "]:" + restPort;
        }
        if (firstColon >= 0) {
            String configuredPort = host.substring(firstColon + 1);
            if (configuredPort.matches("\\d{1,5}")) {
                int port = Integer.parseInt(configuredPort);
                if (port < 1 || port > 65535) {
                    throw new TaskException("Invalid JobManager port in address: " + host);
                }
                return host;
            }
            throw new TaskException("Invalid JobManager address: " + host);
        }
        return host + ":" + restPort;
    }

    private static String shellQuote(String value) {
        return "'" + value.replace("'", "'\\''") + "'";
    }
}
