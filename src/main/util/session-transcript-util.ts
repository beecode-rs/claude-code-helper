import { objectUtil } from '#src/main/util/object-util'
import { type ISessionTranscriptStats } from '#src/shared/session-model'

interface ITranscriptParseState {
  aiTitle: string
  cacheCreationTokens: number
  cacheReadTokens: number
  contextSizeTokens: number | undefined
  gitBranch: string
  inputTokens: number
  lastActivityAt: number | undefined
  lastPrompt: string
  model: string
  outputTokens: number
  seenMessageIds: Set<string>
  thinkingTokens: number
  userTurnsCount: number
  version: string
}

export const sessionTranscriptUtil = {
  _applyAssistantRecord: (params: { record: Record<string, unknown>; state: ITranscriptParseState }): void => {
    const message = objectUtil.asRecord(params.record['message'])

    if (message === undefined) {
      return
    }

    const messageId = sessionTranscriptUtil._resolveNonEmptyString(message['id'])

    if (messageId !== '') {
      if (params.state.seenMessageIds.has(messageId)) {
        return
      }

      params.state.seenMessageIds.add(messageId)
    }

    sessionTranscriptUtil._applyAssistantUsage({ message, state: params.state })

    const model = sessionTranscriptUtil._resolveNonEmptyString(message['model'])

    if (model !== '') {
      params.state.model = model
    }
  },

  _applyAssistantUsage: (params: { message: Record<string, unknown>; state: ITranscriptParseState }): void => {
    const usage = objectUtil.asRecord(params.message['usage'])

    if (usage === undefined) {
      return
    }

    const cacheCreationTokens = sessionTranscriptUtil._resolveFiniteNumber(usage['cache_creation_input_tokens'])
    const cacheReadTokens = sessionTranscriptUtil._resolveFiniteNumber(usage['cache_read_input_tokens'])
    const inputTokens = sessionTranscriptUtil._resolveFiniteNumber(usage['input_tokens'])
    const outputTokens = sessionTranscriptUtil._resolveFiniteNumber(usage['output_tokens'])

    params.state.cacheCreationTokens = params.state.cacheCreationTokens + cacheCreationTokens
    params.state.cacheReadTokens = params.state.cacheReadTokens + cacheReadTokens
    params.state.inputTokens = params.state.inputTokens + inputTokens
    params.state.outputTokens = params.state.outputTokens + outputTokens
    params.state.contextSizeTokens = inputTokens + cacheReadTokens + cacheCreationTokens

    const outputTokenDetails = objectUtil.asRecord(usage['output_tokens_details'])

    if (outputTokenDetails === undefined) {
      return
    }

    const thinkingTokens = sessionTranscriptUtil._resolveFiniteNumber(outputTokenDetails['thinking_tokens'])

    params.state.thinkingTokens = params.state.thinkingTokens + thinkingTokens
  },

  _applyRecordByType: (params: { record: Record<string, unknown>; state: ITranscriptParseState }): void => {
    switch (params.record['type']) {
      case 'ai-title': {
        const aiTitle = sessionTranscriptUtil._resolveNonEmptyString(params.record['aiTitle'])

        if (aiTitle !== '') {
          params.state.aiTitle = aiTitle
        }

        return
      }

      case 'assistant': {
        sessionTranscriptUtil._applyAssistantRecord({ record: params.record, state: params.state })

        return
      }

      case 'last-prompt': {
        const lastPrompt = sessionTranscriptUtil._resolveNonEmptyString(params.record['lastPrompt'])

        if (lastPrompt !== '') {
          params.state.lastPrompt = lastPrompt
        }

        return
      }

      case 'user': {
        if (params.record['isMeta'] !== true) {
          params.state.userTurnsCount = params.state.userTurnsCount + 1
        }

        return
      }

      default: {
        return
      }
    }
  },

  _applySharedEntryFields: (params: { record: Record<string, unknown>; state: ITranscriptParseState }): void => {
    if (params.state.gitBranch === '') {
      params.state.gitBranch = sessionTranscriptUtil._resolveNonEmptyString(params.record['gitBranch'])
    }

    if (params.state.version === '') {
      params.state.version = sessionTranscriptUtil._resolveNonEmptyString(params.record['version'])
    }

    const timestamp = params.record['timestamp']

    if (typeof timestamp !== 'string') {
      return
    }

    const timestampMs = Date.parse(timestamp)

    if (!Number.isNaN(timestampMs)) {
      params.state.lastActivityAt = timestampMs
    }
  },

  _createParseState: (): ITranscriptParseState => {
    return {
      aiTitle: '',
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
      contextSizeTokens: undefined,
      gitBranch: '',
      inputTokens: 0,
      lastActivityAt: undefined,
      lastPrompt: '',
      model: '',
      outputTokens: 0,
      seenMessageIds: new Set<string>(),
      thinkingTokens: 0,
      userTurnsCount: 0,
      version: '',
    }
  },

  _reduceLineToState: (state: ITranscriptParseState, line: string): ITranscriptParseState => {
    const trimmedLine = line.trim()

    if (trimmedLine === '') {
      return state
    }

    const record = sessionTranscriptUtil._tryParseEntry({ line: trimmedLine })

    if (record === undefined) {
      return state
    }

    sessionTranscriptUtil._applyRecordByType({ record, state })
    sessionTranscriptUtil._applySharedEntryFields({ record, state })

    return state
  },

  _resolveFiniteNumber: (value: unknown): number => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    return 0
  },

  _resolveNonEmptyString: (value: unknown): string => {
    if (typeof value === 'string' && value !== '') {
      return value
    }

    return ''
  },

  _resolveStatsFromState: (params: { state: ITranscriptParseState }): ISessionTranscriptStats => {
    return {
      aiTitle: params.state.aiTitle,
      cacheCreationTokens: params.state.cacheCreationTokens,
      cacheReadTokens: params.state.cacheReadTokens,
      contextSizeTokens: params.state.contextSizeTokens,
      gitBranch: params.state.gitBranch,
      inputTokens: params.state.inputTokens,
      lastActivityAt: params.state.lastActivityAt,
      lastPrompt: params.state.lastPrompt,
      model: params.state.model,
      outputTokens: params.state.outputTokens,
      thinkingTokens: params.state.thinkingTokens,
      userTurnsCount: params.state.userTurnsCount,
      version: params.state.version,
    }
  },

  _tryParseEntry: (params: { line: string }): Record<string, unknown> | undefined => {
    try {
      return objectUtil.asRecord(JSON.parse(params.line))
    } catch {
      return undefined
    }
  },

  hasTranscriptSignal: (params: ISessionTranscriptStats): boolean => {
    const hasTokenUsage =
      params.cacheCreationTokens > 0 ||
      params.cacheReadTokens > 0 ||
      params.inputTokens > 0 ||
      params.outputTokens > 0 ||
      params.thinkingTokens > 0

    if (hasTokenUsage || params.userTurnsCount > 0) {
      return true
    }

    return params.aiTitle !== '' || params.gitBranch !== '' || params.lastPrompt !== '' || params.model !== ''
  },

  parseTranscriptStats: (params: { content: string }): ISessionTranscriptStats => {
    const state = params.content
      .split('\n')
      .reduce<ITranscriptParseState>(
        sessionTranscriptUtil._reduceLineToState,
        sessionTranscriptUtil._createParseState(),
      )

    return sessionTranscriptUtil._resolveStatsFromState({ state })
  },
}
