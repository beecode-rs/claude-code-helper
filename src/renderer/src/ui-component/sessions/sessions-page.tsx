import { type ReactElement, useEffect, useState } from 'react'

import { sessionsClientService } from '#src/renderer/src/business/service/sessions-client-service'
import { usageClientService } from '#src/renderer/src/business/service/usage-client-service'
import { LocalIcon } from '#src/renderer/src/ui-component/icon/local-icon'
import { ServerIcon } from '#src/renderer/src/ui-component/icon/server-icon'
import { SessionFocusButton } from '#src/renderer/src/ui-component/sessions/session-focus-button'
import { SessionsAutoRefreshToggle } from '#src/renderer/src/ui-component/sessions/sessions-auto-refresh-toggle'
import { SessionsRefreshButton } from '#src/renderer/src/ui-component/sessions/sessions-refresh-button'
import { SessionsSettingsButton } from '#src/renderer/src/ui-component/sessions/sessions-settings-button'
import { SessionsSettingsDialog } from '#src/renderer/src/ui-component/sessions/sessions-settings-dialog'
import { SshHostsButton } from '#src/renderer/src/ui-component/sessions/ssh-hosts-button'
import { SshHostsDialog } from '#src/renderer/src/ui-component/sessions/ssh-hosts-dialog'
import '#src/renderer/src/ui-component/sessions/sessions.css'
import '#src/renderer/src/ui-component/usage-dashboard/usage-dashboard.css'
import { dateUtil } from '#src/renderer/src/util/date-util'
import { errorUtil } from '#src/renderer/src/util/error-util'
import {
  type ISessionInfo,
  type ISessionSnapshot,
  type IUnreachableHost,
  type SessionStatus,
} from '#src/shared/session-model'
import { DEFAULT_SESSIONS_REFRESH_INTERVAL_SECONDS, type IAppSettings } from '#src/shared/settings-model'

const NOW_TICK_INTERVAL_MS = 1000

const resolveStatusPresentation = (
  status: SessionStatus,
): { badgeClassName: string; dotClassName: string; label: string } => {
  switch (status) {
    case 'busy': {
      return { badgeClassName: 'session-status is-busy', dotClassName: 'session-status-dot is-busy', label: 'Working' }
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
}

const resolveCardClassName = (params: { isRemote: boolean; status: SessionStatus }): string => {
  const classNames = ['session-card', `is-${params.status}`]

  if (params.isRemote) {
    classNames.push('is-remote')
  }

  return classNames.join(' ')
}

const resolveSessionKey = (session: ISessionInfo): string => {
  const hostId = session.hostId ?? 'local'

  return `${hostId}:${session.sessionId}:${String(session.pid)}`
}

const resolveUnreachableHostsLabel = (hosts: IUnreachableHost[]): string => {
  const hostParts = hosts.map((host) => {
    return `${host.hostLabel} (${host.errorMessage})`
  })

  return `Unreachable SSH hosts: ${hostParts.join(' · ')}`
}

const resolveKindLabel = (kind: string): string => {
  switch (kind) {
    case 'background': {
      return 'Background'
    }

    case 'interactive': {
      return 'Interactive'
    }

    default: {
      return kind
    }
  }
}

const resolveProjectLabel = (cwd: string): string => {
  const segments = cwd.split('/').filter((segment) => {
    return segment !== ''
  })
  const lastSegment = segments.at(-1)

  if (lastSegment === undefined) {
    return cwd
  }

  return lastSegment
}

const resolveSessionTitle = (session: ISessionInfo): string => {
  if (session.name !== '') {
    return session.name
  }

  if (session.cwd !== '') {
    return resolveProjectLabel(session.cwd)
  }

  return 'Unnamed session'
}

const resolveUptimeLabel = (params: { nowMs: number; startedAt: number }): string => {
  return `up ${dateUtil.formatDuration(params.nowMs - params.startedAt)}`
}

const resolveUpdatedAgoLabel = (params: { fetchedAt: number; nowMs: number }): string => {
  const secondsAgo = Math.max(0, Math.round((params.nowMs - params.fetchedAt) / 1000))

  return `Updated ${String(secondsAgo)}s ago`
}

const resolveSessionsWord = (count: number): string => {
  if (count === 1) {
    return 'session'
  }

  return 'sessions'
}

const renderOriginIcon = (isRemote: boolean): ReactElement => {
  if (isRemote) {
    return <ServerIcon />
  }

  return <LocalIcon />
}

const resolveSummaryLabel = (sessions: ISessionInfo[]): string => {
  const counts = sessions.reduce<{ busy: number; idle: number; unknown: number; waiting: number }>(
    (statusCounts, session) => {
      if (session.status === 'busy') {
        return { ...statusCounts, busy: statusCounts.busy + 1 }
      }

      if (session.status === 'waiting') {
        return { ...statusCounts, waiting: statusCounts.waiting + 1 }
      }

      if (session.status === 'idle') {
        return { ...statusCounts, idle: statusCounts.idle + 1 }
      }

      return { ...statusCounts, unknown: statusCounts.unknown + 1 }
    },
    { busy: 0, idle: 0, unknown: 0, waiting: 0 },
  )
  const summaryParts = [
    `${String(sessions.length)} ${resolveSessionsWord(sessions.length)}`,
    `${String(counts.busy)} working`,
    `${String(counts.waiting)} waiting`,
    `${String(counts.idle)} idle`,
  ]

  if (counts.unknown > 0) {
    summaryParts.push(`${String(counts.unknown)} unknown`)
  }

  const remoteCount = sessions.filter((session) => {
    return session.hostId !== undefined
  }).length

  if (remoteCount > 0) {
    summaryParts.push(`${String(remoteCount)} remote`)
  }

  return summaryParts.join(' · ')
}

export const SessionsPage = (): ReactElement => {
  const [snapshot, setSnapshot] = useState<ISessionSnapshot | undefined>(undefined)
  const [errorMessage, setErrorMessage] = useState('')
  const [isHostsOpen, setIsHostsOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [settings, setSettings] = useState<IAppSettings | undefined>(undefined)
  const [nowMs, setNowMs] = useState((): number => {
    return Date.now()
  })

  const loadSessions = async (): Promise<void> => {
    try {
      const nextSnapshot = await sessionsClientService.listSessions()

      setSnapshot(nextSnapshot)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(errorUtil.resolveMessage(error))
    }
  }

  const loadSessionsSettings = async (): Promise<void> => {
    try {
      const loadedSettings = await usageClientService.getSettings()

      setSettings(loadedSettings)
    } catch (error) {
      setErrorMessage(errorUtil.resolveMessage(error))
    }
  }

  const toggleAutoRefresh = async (params: { isEnabled: boolean }): Promise<void> => {
    if (settings === undefined) {
      return
    }

    try {
      const nextSettings = await usageClientService.saveSettings({
        settings: { ...settings, isSessionsAutoRefreshPaused: !params.isEnabled },
      })

      setSettings(nextSettings)
    } catch (error) {
      setErrorMessage(errorUtil.resolveMessage(error))
    }
  }

  const focusSession = async (params: { cwd: string; pid: number }): Promise<void> => {
    try {
      await sessionsClientService.focusSession({ cwd: params.cwd, pid: params.pid })
    } catch (error) {
      setErrorMessage(errorUtil.resolveMessage(error))
    }
  }

  const refreshIntervalSeconds = settings?.sessionsRefreshIntervalSeconds ?? DEFAULT_SESSIONS_REFRESH_INTERVAL_SECONDS
  const isAutoRefreshPaused = settings?.isSessionsAutoRefreshPaused ?? false

  useEffect(() => {
    void loadSessionsSettings()
  }, [])

  useEffect(() => {
    void loadSessions()

    if (isAutoRefreshPaused) {
      return
    }

    const refreshIntervalId = setInterval(() => {
      void loadSessions()
    }, refreshIntervalSeconds * 1000)

    return () => {
      clearInterval(refreshIntervalId)
    }
  }, [refreshIntervalSeconds, isAutoRefreshPaused])

  useEffect(() => {
    const tickIntervalId = setInterval(() => {
      setNowMs(Date.now())
    }, NOW_TICK_INTERVAL_MS)

    return () => {
      clearInterval(tickIntervalId)
    }
  }, [])

  const sessions = snapshot?.sessions ?? []
  const hasSnapshot = snapshot !== undefined
  const isEmpty = hasSnapshot && sessions.length === 0

  return (
    <div className="sessions">
      <header className="sessions-header">
        <div>
          <h1 className="sessions-title">Sessions</h1>
          <p className="sessions-subtitle">{resolveSummaryLabel(sessions)}</p>
        </div>
        <div className="sessions-actions">
          {snapshot !== undefined && (
            <span className="sessions-updated">{resolveUpdatedAgoLabel({ fetchedAt: snapshot.fetchedAt, nowMs })}</span>
          )}
          <SessionsAutoRefreshToggle
            isEnabled={!isAutoRefreshPaused}
            onToggle={(isEnabled) => {
              void toggleAutoRefresh({ isEnabled })
            }}
          />
          <SessionsRefreshButton
            label="Refresh sessions"
            onClick={() => {
              void loadSessions()
            }}
          />
          <SshHostsButton
            label="Manage SSH hosts"
            onClick={() => {
              setIsHostsOpen(true)
            }}
          />
          <SessionsSettingsButton
            label="Sessions settings"
            onClick={() => {
              setIsSettingsOpen(true)
            }}
          />
        </div>
      </header>
      <div className="sessions-legend">
        <span className="sessions-legend-item">
          <span className="session-status-dot is-busy" />
          Working
        </span>
        <span className="sessions-legend-item">
          <span className="session-status-dot is-waiting" />
          Waiting for input
        </span>
        <span className="sessions-legend-item">
          <span className="session-status-dot is-idle" />
          Idle
        </span>
      </div>
      {errorMessage !== '' && <p className="sessions-error">{errorMessage}</p>}
      {snapshot !== undefined && snapshot.unreachableHosts.length > 0 && (
        <p className="sessions-warning">{resolveUnreachableHostsLabel(snapshot.unreachableHosts)}</p>
      )}
      <main className="sessions-grid">
        {!hasSnapshot && errorMessage === '' && <p className="sessions-empty">Loading sessions…</p>}
        {!hasSnapshot && errorMessage !== '' && <p className="sessions-empty">Could not load sessions</p>}
        {isEmpty && <p className="sessions-empty">No active sessions</p>}
        {sessions.map((session) => {
          const statusPresentation = resolveStatusPresentation(session.status)

          return (
            <article
              className={resolveCardClassName({ isRemote: session.hostId !== undefined, status: session.status })}
              key={resolveSessionKey(session)}
              title={session.cwd}
            >
              <header className="session-card-header">
                <div className="session-card-heading">
                  <span className="session-card-origin">{renderOriginIcon(session.hostId !== undefined)}</span>
                  <h2 className="session-card-title">{resolveSessionTitle(session)}</h2>
                </div>
                <span className={statusPresentation.badgeClassName}>
                  <span className={statusPresentation.dotClassName} />
                  {statusPresentation.label}
                </span>
                {session.hostId === undefined && (
                  <SessionFocusButton
                    label={`Focus terminal for ${resolveSessionTitle(session)}`}
                    onClick={() => {
                      void focusSession({ cwd: session.cwd, pid: session.pid })
                    }}
                  />
                )}
              </header>
              <p className="session-card-project" title={session.cwd}>
                {resolveProjectLabel(session.cwd)}
              </p>
              <footer className="session-card-footer">
                {session.hostId !== undefined && (
                  <span className="session-card-meta session-host-chip">
                    <ServerIcon size={12} />
                    {session.hostLabel}
                  </span>
                )}
                {session.kind !== '' && <span className="session-card-meta">{resolveKindLabel(session.kind)}</span>}
                <span className="session-card-meta">pid {String(session.pid)}</span>
                <span className="session-card-meta">{resolveUptimeLabel({ nowMs, startedAt: session.startedAt })}</span>
              </footer>
            </article>
          )
        })}
      </main>
      {isHostsOpen && (
        <SshHostsDialog
          onClose={() => {
            setIsHostsOpen(false)
          }}
          onSaved={() => {
            void loadSessions()
          }}
        />
      )}
      {isSettingsOpen && (
        <SessionsSettingsDialog
          onClose={() => {
            setIsSettingsOpen(false)
          }}
          onSaved={() => {
            void loadSessionsSettings()
            void loadSessions()
          }}
        />
      )}
    </div>
  )
}
