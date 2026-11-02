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

package org.apache.dolphinscheduler.api.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.apache.dolphinscheduler.api.service.EtlTestRunService.PipelineRequest;
import org.apache.dolphinscheduler.dao.mapper.DataSourceMapper;

import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class EtlTestRunServiceImplTest {

    @Test
    void shouldIgnoreUnreferencedDatasourceDuringTestRun() {
        List<Integer> queriedIds = new ArrayList<>();
        DataSourceMapper mapper = (DataSourceMapper) Proxy.newProxyInstance(
                DataSourceMapper.class.getClassLoader(), new Class<?>[]{DataSourceMapper.class},
                (proxy, method, args) -> {
                    if ("selectById".equals(method.getName())) {
                        queriedIds.add((Integer) args[0]);
                    }
                    return null;
                });
        EtlTestRunServiceImpl service = new EtlTestRunServiceImpl();
        ReflectionTestUtils.setField(service, "dataSourceMapper", mapper);

        PipelineRequest request = new PipelineRequest();
        request.setDatasources(new ArrayList<>(Arrays.asList(datasource("1"), datasource("2"))));
        request.setSources(Collections.singletonList(source("2")));

        // Datasource 1 is an unavailable Oracle connection. Only datasource 2
        // is referenced, so resolving it must never query or open 1.
        assertThatThrownBy(() -> ReflectionTestUtils.invokeMethod(service, "fillMissingPasswordsFromDb", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("id=2");
        assertThat(queriedIds).containsExactly(2);
    }

    private static Map<String, Object> datasource(String id) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("id", id);
        return value;
    }

    private static Map<String, Object> source(String datasourceId) {
        Map<String, Object> value = new LinkedHashMap<>();
        value.put("datasourceId", datasourceId);
        return value;
    }
}
