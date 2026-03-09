import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card'
import {
  FunnelIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline'
import type { Lead, Pipeline, Stage } from '../../types'
import { NewLeadsChart } from './NewLeadsChart'

type PipelineWithStages = Pipeline & { stages?: Stage[] }

interface LeadMetricsPanelProps {
  leads: Lead[]
  pipelines: PipelineWithStages[]
}

export function LeadMetricsPanel({ leads, pipelines }: LeadMetricsPanelProps) {
  const pipelineMetrics = useMemo(() => {
    return pipelines.map(pipeline => {
      const pipelineLeads = leads.filter(l => l.pipeline_id === pipeline.id)
      const stages = (pipeline.stages || []).sort((a, b) => a.position - b.position)

      const stageMetrics = stages.map(stage => ({
        stage,
        count: pipelineLeads.filter(l => l.stage_id === stage.id).length
      }))

      return { pipeline, total: pipelineLeads.length, stageMetrics }
    })
  }, [leads, pipelines])

  return (
    <div className="space-y-2 sm:space-y-3">
      <NewLeadsChart leads={leads} />

      {pipelineMetrics.map(({ pipeline, total, stageMetrics }) => (
        <PipelineCard
          key={pipeline.id}
          pipeline={pipeline}
          total={total}
          stageMetrics={stageMetrics}
        />
      ))}

      {pipelineMetrics.length === 0 && (
        <Card>
          <CardContent className="p-4 text-center">
            <ChartBarIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-400">Nenhuma pipeline encontrada</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface StageMetric {
  stage: Stage
  count: number
}

function PipelineCard({
  pipeline,
  total,
  stageMetrics
}: {
  pipeline: PipelineWithStages
  total: number
  stageMetrics: StageMetric[]
}) {
  return (
    <Card>
      <CardHeader className="p-3 sm:p-4 pb-2 sm:pb-3">
        <CardTitle className="flex items-center justify-between text-[11px] sm:text-sm">
          <span className="flex items-center gap-1.5 truncate">
            <FunnelIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 flex-shrink-0" />
            {pipeline.name}
          </span>
          <span className="bg-indigo-50 text-indigo-700 font-semibold text-[10px] sm:text-xs px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
            {total} lead{total !== 1 ? 's' : ''}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="px-3 sm:px-4 pb-3 sm:pb-4 pt-0">
        {stageMetrics.length === 0 ? (
          <p className="text-[10px] sm:text-xs text-gray-400 italic">
            Nenhuma etapa configurada
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {stageMetrics.map(({ stage, count }) => (
              <StageCard key={stage.id} stage={stage} count={count} total={total} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function StageCard({ stage, count, total }: { stage: Stage; count: number; total: number }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0

  return (
    <div
      className="relative rounded-lg border border-gray-100 bg-gray-50/50 p-2.5 sm:p-3 overflow-hidden"
    >
      {/* Accent top bar */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
        style={{ backgroundColor: stage.color }}
      />

      <div className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
        {count}
      </div>

      <div className="text-[9px] sm:text-[10px] text-gray-500 truncate mt-0.5" title={stage.name}>
        {stage.name}
      </div>

      <div className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5">
        {pct}% do total
      </div>
    </div>
  )
}
