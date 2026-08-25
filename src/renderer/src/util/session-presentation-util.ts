import { dateUtil } from '#src/renderer/src/util/date-util'
import { type ISessionInfo, type SessionStatus } from '#src/shared/session-model'

export const sessionPresentationUtil = {
  resolveLastActivityLabel: (params: { lastActivityAt: number; nowMs: number }): string => {
    return `active ${dateUtil.formatDuration(params.nowMs - params.lastActivityAt)} ago`
  },

  resolveModelLabel: (params: { model: string }): string => {
    return params.model.replace(/-\d{8}$/, '')
  },

  resolveProjectLabel: (params: { cwd: string }): string => {
    const segments = params.cwd.split('/').filter((segment) => {
      return segment !== ''
    })
    const lastSegment = segments.at(-1)

    if (lastSegment === undefined) {
      return params.cwd
    }

    return lastSegment
  },

  resolveSessionTitle: (params: { session: ISessionInfo }): string => {
    if (params.session.name !== '') {
      return params.session.name
    }

    if (params.session.transcript?.aiTitle !== undefined && params.session.transcript.aiTitle !== '') {
      return params.session.transcript.aiTitle
    }

    if (params.session.cwd !== '') {
      return sessionPresentationUtil.resolveProjectLabel({ cwd: params.session.cwd })
    }

    return 'Unnamed session'
  },

  resolveStatusPresentation: (params: {
    status: SessionStatus
  }): { badgeClassName: string; dotClassName: string; label: string } => {
    switch (params.status) {
      case 'busy': {
        return {
          badgeClassName: 'session-status is-busy',
          dotClassName: 'session-status-dot is-busy',
          label: 'Working',
        }
      }

      case 'idle': {
        return { badgeClassName: 'session-status is-idle', dotClassName: 'session-status-dot is-idle', label: 'Idle' }
      }

      case 'waiting': {
        return {
          badgeClassName: 'session-status is-waiting',
          dotClassName: 'session-status-dot is-waiting',
          label: 'Waiting for input',
        }
      }

      default: {
        return {
          badgeClassName: 'session-status is-unknown',
          dotClassName: 'session-status-dot is-unknown',
          label: 'Unknown',
        }
      }
    }
  },

  resolveTokenCountLabel: (params: { count: number }): string => {
    if (params.count < 1000) {
      return String(params.count)
    }

    if (params.count < 100_000) {
      return `${String(Math.round(params.count / 100) / 10)}k`
    }

    if (params.count < 1_000_000) {
      return `${String(Math.round(params.count / 1000))}k`
    }

    return `${String(Math.round(params.count / 100_000) / 10)}M`
  },
}
