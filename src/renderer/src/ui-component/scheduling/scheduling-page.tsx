import { type ReactElement, useEffect, useState } from 'react'

import { schedulingClientService } from '#src/renderer/src/business/service/scheduling-client-service'
import { usageClientService } from '#src/renderer/src/business/service/usage-client-service'
import { AddTriggerDialog } from '#src/renderer/src/ui-component/scheduling/add-trigger-dialog'
import '#src/renderer/src/ui-component/scheduling/scheduling.css'
import { TriggerSettingsDialog } from '#src/renderer/src/ui-component/scheduling/trigger-settings-dialog'
import '#src/renderer/src/ui-component/usage-dashboard/usage-dashboard.css'
import { errorUtil } from '#src/renderer/src/util/error-util'
import { type OsPlatform } from '#src/shared/os-model'
import { type IAppSettings } from '#src/shared/settings-model'
import {
  type ISchedulingInfo,
  type ITriggerConfig,
  type ITriggerRegistrationHealth,
  TRIGGER_DAYS,
  type TriggerDay,
} from '#src/shared/trigger-model'

const TRIGGER_DAY_LABELS: Record<TriggerDay, string> = {
  friday: 'Fri',
  monday: 'Mon',
  saturday: 'Sat',
  sunday: 'Sun',
  thursday: 'Thu',
  tuesday: 'Tue',
  wednesday: 'Wed',
}

const resolvePlatformLabel = (platform: OsPlatform): string => {
  switch (platform) {
    case 'linux': {
      return 'Linux'
    }

    case 'macos': {
      return 'macOS'
    }

    case 'windows': {
      return 'Windows'
    }

    default: {
      throw new Error(`unsupported platform: ${String(platform)}`)
    }
  }
}

export const SchedulingPage = (): ReactElement => {
  const [settings, setSettings] = useState<IAppSettings | undefined>(undefined)
  const [schedulingInfo, setSchedulingInfo] = useState<ISchedulingInfo | undefined>(undefined)
  const [healthByTriggerId, setHealthByTriggerId] = useState<Record<string, ITriggerRegistrationHealth>>({})
  const [healthErrorMessage, setHealthErrorMessage] = useState('')
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [openTriggerId, setOpenTriggerId] = useState<string | undefined>(undefined)

  const loadHealth = async (): Promise<void> => {
    setHealthErrorMessage('')

    try {
      const healthEntries = await schedulingClientService.inspectTriggerRegistrations()
      const nextHealthByTriggerId = healthEntries.reduce<Record<string, ITriggerRegistrationHealth>>(
        (healthRecord, healthEntry) => {
          return { ...healthRecord, [healthEntry.triggerId]: healthEntry }
        },
        {},
      )

      setHealthByTriggerId(nextHealthByTriggerId)
    } catch (error) {
      setHealthErrorMessage(errorUtil.resolveMessage(error))
    }
  }

  const loadPage = async (): Promise<void> => {
    const [loadedSettings, loadedSchedulingInfo] = await Promise.all([
      usageClientService.getSettings(),
      schedulingClientService.getSchedulingInfo(),
    ])

    setSettings(loadedSettings)
    setSchedulingInfo(loadedSchedulingInfo)

    if (loadedSchedulingInfo.isSupported) {
      await loadHealth()
    }
  }

  const handleToggleTrigger = async (params: { isEnabled: boolean; triggerId: string }): Promise<void> => {
    const nextSettings = await schedulingClientService.setTriggerEnabled(params)

    setSettings(nextSettings)

    if (schedulingInfo?.isSupported) {
      await loadHealth()
    }
  }

  const handleSaved = (): void => {
    void loadPage()
  }

  useEffect(() => {
    void loadPage()
  }, [])

  const resolveDayChipClassName = (days: TriggerDay[], day: TriggerDay): string => {
    if (days.includes(day)) {
      return 'trigger-chip is-active'
    }

    return 'trigger-chip'
  }

  const resolveBadge = (trigger: ITriggerConfig): { className: string; label: string } => {
    if (!schedulingInfo?.isSupported) {
      return { className: 'trigger-badge', label: '—' }
    }

    if (!trigger.isEnabled) {
      return { className: 'trigger-badge', label: 'Paused' }
    }

    if (healthByTriggerId[trigger.id]?.isRegistered) {
      return { className: 'trigger-badge is-registered', label: 'Registered' }
    }

    return { className: 'trigger-badge is-missing', label: 'Missing' }
  }

  if (settings === undefined || schedulingInfo === undefined) {
    return (
      <div className="scheduling">
        <p className="provider-card-message">Loading scheduling…</p>
      </div>
    )
  }

  const triggers = settings.triggers

  return (
    <div className="scheduling">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Scheduling</h1>
          <p className="dashboard-subtitle">Run commands on a schedule through your OS scheduler</p>
        </div>
        <div className="dashboard-actions">
          <button
            className="button"
            onClick={() => {
              setIsAddOpen(true)
            }}
            type="button"
          >
            + Add
          </button>
        </div>
      </header>
      {!schedulingInfo.isSupported && (
        <div className="scheduling-banner">
          OS scheduling is not available on {resolvePlatformLabel(schedulingInfo.platform)} yet. Triggers are saved but
          will not fire.
        </div>
      )}
      {healthErrorMessage !== '' && <div className="scheduling-banner">{healthErrorMessage}</div>}
      <main className="scheduling-list">
        {triggers.map((trigger) => {
          const badge = resolveBadge(trigger)

          return (
            <article className="trigger-card" key={trigger.id}>
              <header className="trigger-card-header">
                <div>
                  <h2 className="trigger-card-title">{trigger.name}</h2>
                  <code className="trigger-card-command">{trigger.command}</code>
                </div>
                <label className="trigger-toggle">
                  <input
                    checked={trigger.isEnabled}
                    onChange={(event) => {
                      void handleToggleTrigger({
                        isEnabled: event.target.checked,
                        triggerId: trigger.id,
                      })
                    }}
                    type="checkbox"
                  />
                </label>
              </header>
              <div className="trigger-card-chips">
                {TRIGGER_DAYS.map((day) => {
                  return (
                    <span className={resolveDayChipClassName(trigger.days, day)} key={day}>
                      {TRIGGER_DAY_LABELS[day]}
                    </span>
                  )
                })}
              </div>
              <footer className="trigger-card-footer">
                <span className="trigger-card-times">{trigger.times.join(' · ')}</span>
                <span className={badge.className}>{badge.label}</span>
                <button
                  className="button"
                  onClick={() => {
                    setOpenTriggerId(trigger.id)
                  }}
                  type="button"
                >
                  Edit
                </button>
              </footer>
            </article>
          )
        })}
        {triggers.length === 0 && (
          <div className="dashboard-empty-state">
            <p className="dashboard-empty">No triggers yet. Add one to run commands on a schedule.</p>
            <button
              className="button button-primary"
              onClick={() => {
                setIsAddOpen(true)
              }}
              type="button"
            >
              Add trigger
            </button>
          </div>
        )}
      </main>
      {isAddOpen && (
        <AddTriggerDialog
          onClose={() => {
            setIsAddOpen(false)
          }}
          onSaved={handleSaved}
        />
      )}
      {openTriggerId !== undefined && (
        <TriggerSettingsDialog
          onClose={() => {
            setOpenTriggerId(undefined)
          }}
          onSaved={handleSaved}
          triggerId={openTriggerId}
        />
      )}
    </div>
  )
}
