import { type ReactElement, useEffect, useState } from 'react'

import { sessionsClientService } from '#src/renderer/src/business/service/sessions-client-service'
import { usageClientService } from '#src/renderer/src/business/service/usage-client-service'
import { SessionCard } from '#src/renderer/src/ui-component/sessions/session-card'
import { SessionsAutoRefreshToggle } from '#src/renderer/src/ui-component/sessions/sessions-auto-refresh-toggle'
import { SessionsRefreshButton } from '#src/renderer/src/ui-component/sessions/sessions-refresh-button'
import { SessionsSettingsButton } from '#src/renderer/src/ui-component/sessions/sessions-settings-button'
import { SessionsSettingsDialog } from '#src/renderer/src/ui-component/sessions/sessions-settings-dialog'
import { SshHostsButton } from '#src/renderer/src/ui-component/sessions/ssh-hosts-button'
import { SshHostsDialog } from '#src/renderer/src/ui-component/sessions/ssh-hosts-dialog'
import '#src/renderer/src/ui-component/sessions/sessions.css'
import '#src/renderer/src/ui-component/usage-dashboard/usage-dashboard.css'
import { errorUtil } from '#src/renderer/src/util/error-util'
import { type ISessionInfo, type ISessionSnapshot, type IUnreachableHost } from '#src/shared/session-model'
import { DEFAULT_SESSIONS_REFRESH_INTERVAL_SECONDS, type IAppSettings } from '#src/shared/settings-model'

const NOW_TICK_INTERVAL_MS = 1000

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
  const [expandedSessionKeys, setExpandedSessionKeys] = useState<Set<string>>(new Set<string>())

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

  const handleToggleSession = (params: { key: string }): void => {
    setExpandedSessionKeys((previous) => {
      if (previous.has(params.key)) {
        return new Set(
          [...previous].filter((candidateKey) => {
            return candidateKey !== params.key
          }),
        )
      }

      return new Set([...previous, params.key])
    })
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
          const sessionKey = resolveSessionKey(session)

          return (
            <SessionCard
              isExpanded={expandedSessionKeys.has(sessionKey)}
              key={sessionKey}
              nowMs={nowMs}
              onFocus={() => {
                void focusSession({ cwd: session.cwd, pid: session.pid })
              }}
              onToggle={() => {
                handleToggleSession({ key: sessionKey })
              }}
              session={session}
            />
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
