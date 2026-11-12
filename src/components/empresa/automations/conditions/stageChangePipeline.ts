// `from_pipeline_id`/`to_pipeline_id` (string) é legado: aparece na tela mas o motor não filtra por ele.
// Regras novas gravam `*_pipeline_ids`, que o motor (cliente e Edge Function) respeita.
export function getStageChangePipelineId(condition: Record<string, any> | undefined, side: 'from' | 'to'): string {
  return (condition?.[`${side}_pipeline_ids`]?.[0] || condition?.[`${side}_pipeline_id`] || '') as string
}

export function setStageChangePipeline(condition: Record<string, any> | undefined, side: 'from' | 'to', pipelineId: string): Record<string, any> {
  const next = { ...condition, [`${side}_pipeline_ids`]: pipelineId ? [pipelineId] : undefined, [`${side}_stage_id`]: '' }
  delete next[`${side}_pipeline_id`]
  return next
}
