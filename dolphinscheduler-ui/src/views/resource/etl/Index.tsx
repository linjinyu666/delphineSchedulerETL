/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to you under the Apache License, Version 2.0
 */

import { defineComponent } from 'vue'
import ResourceList from '@/views/resource/components/resource'

/**
 * ETL 作业管理复用资源中心的目录列表。
 * ETL 作业本质上是资源中心中的 JSON 作业文件，因此目录、面包屑、
 * 新建文件夹、重命名、导入和分页都与文件管理保持一致。
 */
export default defineComponent({
  name: 'EtlList',
  render() {
    return <ResourceList resourceType='ETL' />
  }
})
