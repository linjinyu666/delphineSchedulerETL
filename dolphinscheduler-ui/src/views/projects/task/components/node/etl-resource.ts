/** Read datasource ids without changing escapes inside SQL and JSON strings. */
export function extractEtlDatasourceIds(content?: string): number[] {
  if (!content) return []
  try {
    const parsed = JSON.parse(content)
    const ids: number[] = (parsed.nodes || [])
      .map((node: any) => Number(node?.config?.cascade?.dsId ?? node?.config?.datasourceId))
      .filter((id: number) => Number.isInteger(id) && id > 0)
    return [...new Set(ids)]
  } catch {
    return []
  }
}
