import type {
  ITriggerRunLogEntry,
  TriggerRunPhase,
  TriggerRunSkipReason,
  TriggerRunSource,
} from '#src/shared/trigger-model'

export interface ITriggerRunSummary {
  durationMs: number
  eventId: string
  exitCode: number
  outputSnippet: string
  phase: TriggerRunPhase
  skipReason: TriggerRunSkipReason | ''
  slot: string
  startedAtTimestamp: string
  trigger: TriggerRunSource
  triggerName: string
}

export const triggerRunUtil = {
  _applyTerminalEntry(params: { entry: ITriggerRunLogEntry; summary: ITriggerRunSummary }): ITriggerRunSummary {
    return {
      ...params.summary,
      durationMs: params.entry.durationMs,
      exitCode: params.entry.exitCode,
      outputSnippet: params.entry.outputSnippet,
      phase: params.entry.phase,
      skipReason: params.entry.skipReason,
    }
  },

  _createSummaryFromEntry(params: { entry: ITriggerRunLogEntry }): ITriggerRunSummary {
    return {
      durationMs: params.entry.durationMs,
      eventId: params.entry.eventId,
      exitCode: params.entry.exitCode,
      outputSnippet: params.entry.outputSnippet,
      phase: params.entry.phase,
      skipReason: params.entry.skipReason,
      slot: params.entry.slot,
      startedAtTimestamp: params.entry.timestamp,
      trigger: params.entry.trigger,
      triggerName: params.entry.triggerName,
    }
  },

  _mergeEntry(params: { entry: ITriggerRunLogEntry; summary: ITriggerRunSummary | undefined }): ITriggerRunSummary {
    if (params.summary === undefined) {
      return triggerRunUtil._createSummaryFromEntry({ entry: params.entry })
    }

    if (params.entry.phase === 'started') {
      return { ...params.summary, startedAtTimestamp: params.entry.timestamp }
    }

    return triggerRunUtil._applyTerminalEntry({ entry: params.entry, summary: params.summary })
  },

  groupRunsByEventId: (params: { entries: ITriggerRunLogEntry[] }): ITriggerRunSummary[] => {
    const summaryByEventId = params.entries.reduce<Record<string, ITriggerRunSummary>>((summaryRecord, entry) => {
      return {
        ...summaryRecord,
        [entry.eventId]: triggerRunUtil._mergeEntry({
          entry,
          summary: summaryRecord[entry.eventId],
        }),
      }
    }, {})

    return Object.values(summaryByEventId).sort((summary, nextSummary) => {
      return nextSummary.startedAtTimestamp.localeCompare(summary.startedAtTimestamp)
    })
  },
}
