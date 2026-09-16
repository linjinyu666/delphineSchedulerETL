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

import { useI18n } from 'vue-i18n'
import { IEmit } from '../types'
import { useFileStore } from '@/store/file/file'
import {
  createResource,
  updateResource,
  onlineCreateResource,
  updateResourceContent
} from '@/service/modules/resources'

export function useUpload(state: any) {
  const { t } = useI18n()
  const fileStore = useFileStore()

  const handleUploadFile = async (
    emit: IEmit,
    hideModal: () => void,
    resetForm: () => void
  ) => {
    await state.uploadFormRef.validate()

    if (state.saving) return
    state.saving = true
    try {
      // ETL 作业只保存 JSON 内容到 t_ds_etl_content，不再通过通用文件上传链路。
      if (state.uploadForm.type === 'ETL') {
        const content = await state.uploadForm.file.text()
        if (state.uploadForm.isReupload) {
          await updateResourceContent({
            fullName: state.uploadForm.fullName,
            tenantCode: state.uploadForm.user_name,
            content
          })
        } else {
          const fileName = String(state.uploadForm.name || 'etl.json')
          const dot = fileName.lastIndexOf('.')
          const baseName = dot > 0 ? fileName.substring(0, dot) : fileName
          const suffix = dot > 0 ? fileName.substring(dot + 1) : 'json'
          const currentDir = fileStore.getCurrentDir || '/'
          await onlineCreateResource({
            pid: -1,
            type: 'ETL',
            fileName: baseName,
            suffix,
            description: state.uploadForm.description,
            content,
            currentDir
          })
        }
        window.$message.success(t('resource.file.success'))
        state.saving = false
        emit('updateList')
        hideModal()
        resetForm()
        return
      }
      const formData = new FormData()
      formData.append('file', state.uploadForm.file)
      formData.append('type', state.uploadForm.type)
      formData.append('name', state.uploadForm.name)
      formData.append('description', state.uploadForm.description)

      if (state.uploadForm.isReupload) {
        formData.append('user_name', state.uploadForm.user_name)
        formData.append('fullName', state.uploadForm.fullName)
        formData.append('tenantCode', state.uploadForm.user_name)
        await updateResource(formData as any)
      } else {
        // no more pid, as currentDir acts as the pid or parent path right now.
        const currentDir = fileStore.getCurrentDir || '/'
        formData.append('currentDir', currentDir)
        await createResource(formData as any)
      }

      window.$message.success(t('resource.file.success'))
      state.saving = false
      emit('updateList')

      hideModal()
      resetForm()
    } catch (err) {
      state.saving = false
    }
  }

  return {
    handleUploadFile
  }
}
