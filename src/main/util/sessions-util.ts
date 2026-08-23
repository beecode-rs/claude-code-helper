import { objectUtil } from '#src/main/util/object-util'
import { type ISessionInfo, type SessionStatus } from '#src/shared/session-model'

const SESSION_STATUS_ORDER: Record<SessionStatus, number> = {
  busy: 0,
  idle: 2,
  unknown: 3,
  waiting: 1,
}

export const sessionsUtil = {
  _resolveSessionInfo: (params: { rawEntry: unknown }): ISessionInfo | undefined => {
    const rawRecord = objectUtil.asRecord(params.rawEntry)

    if (rawRecord === undefined) {
      return undefined
    }

    const pid = rawRecord['pid']

    if (typeof pid !== 'number') {
      return undefined
    }

    const startedAt = rawRecord['startedAt']

    if (typeof startedAt !== 'number') {
      return undefined
    }

    const sessionId = rawRecord['sessionId']

    if (typeof sessionId !== 'string') {
      return undefined
    }

    return {
      cwd: sessionsUtil._resolveStringValue(rawRecord['cwd']),
      kind: sessionsUtil._resolveStringValue(rawRecord['kind']),
      name: sessionsUtil._resolveStringValue(rawRecord['name']),
      pid,
      sessionId,
      startedAt,
      status: sessionsUtil._resolveSessionStatus(rawRecord['status']),
    }
  },

  _resolveSessionStatus: (value: unknown): SessionStatus => {
    switch (value) {
      case 'busy': {
        return 'busy'
      }

      case 'idle': {
        return 'idle'
      }

      case 'waiting': {
        return 'waiting'
      }

      default: {
        return 'unknown'
      }
    }
  },

  _resolveStringValue: (value: unknown): string => {
    if (typeof value === 'string') {
      return value
    }

    return ''
  },

  _sanitizeSessions: (params: { rawEntries: unknown[] }): ISessionInfo[] => {
    return params.rawEntries
      .map((rawEntry) => {
        return sessionsUtil._resolveSessionInfo({ rawEntry })
      })
      .filter((session): session is ISessionInfo => {
        return session !== undefined
      })
  },

  _tryParseSessionsJson: (params: { stdout: string }): unknown => {
    try {
      return JSON.parse(params.stdout)
    } catch {
      return sessionsUtil._tryParseSessionsJsonSlice({ stdout: params.stdout })
    }
  },

  _tryParseSessionsJsonSlice: (params: { stdout: string }): unknown => {
    const startIndex = params.stdout.indexOf('[')
    const endIndex = params.stdout.lastIndexOf(']')

    if (startIndex < 0 || endIndex <= startIndex) {
      throw new Error("'claude agents --json' printed output that is not valid JSON")
    }

    try {
      return JSON.parse(params.stdout.slice(startIndex, endIndex + 1))
    } catch {
      throw new Error("'claude agents --json' printed output that is not valid JSON")
    }
  },

  parseSessionEntries: (params: { stdout: string }): ISessionInfo[] => {
    const parsed = sessionsUtil._tryParseSessionsJson({ stdout: params.stdout })

    if (!Array.isArray(parsed)) {
      throw new Error("'claude agents --json' printed unexpected output: expected a JSON array of sessions")
    }

    return sessionsUtil._sanitizeSessions({ rawEntries: parsed })
  },

  sortSessions: (sessions: ISessionInfo[]): ISessionInfo[] => {
    return [...sessions].sort((left, right) => {
      const statusOrderDiff = SESSION_STATUS_ORDER[left.status] - SESSION_STATUS_ORDER[right.status]

      if (statusOrderDiff !== 0) {
        return statusOrderDiff
      }

      return right.startedAt - left.startedAt
    })
  },
}
