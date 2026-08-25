import { type ReactElement, useEffect, useRef, useState } from 'react'

import { usageClientService } from '#src/renderer/src/business/service/usage-client-service'
import { errorUtil } from '#src/renderer/src/util/error-util'
import { sessionWaitingSoundUtil } from '#src/renderer/src/util/session-waiting-sound-util'
import {
  DEFAULT_IS_WAITING_SOUND_ENABLED,
  DEFAULT_SESSIONS_REFRESH_INTERVAL_SECONDS,
  DEFAULT_WAITING_SOUND_VOLUME_PERCENT,
  type IAppSettings,
  MAX_SESSIONS_REFRESH_INTERVAL_SECONDS,
  MAX_WAITING_SOUND_VOLUME_PERCENT,
  MIN_SESSIONS_REFRESH_INTERVAL_SECONDS,
  MIN_WAITING_SOUND_VOLUME_PERCENT,
} from '#src/shared/settings-model'

const PREVIEW_BEEP_DELAY_MS = 200

const renderCloseIcon = (): ReactElement => {
  return (
    <svg
      fill="none"
      height="15"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="15"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  )
}

export const SessionsSettingsDialog = (props: { onClose: () => void; onSaved: () => void }): ReactElement => {
  const { onClose, onSaved } = props
  const [settings, setSettings] = useState<IAppSettings | undefined>(undefined)
  const [refreshIntervalSeconds, setRefreshIntervalSeconds] = useState(DEFAULT_SESSIONS_REFRESH_INTERVAL_SECONDS)
  const [isWaitingSoundEnabled, setIsWaitingSoundEnabled] = useState<boolean>(DEFAULT_IS_WAITING_SOUND_ENABLED)
  const [waitingSoundVolumePercent, setWaitingSoundVolumePercent] = useState<number>(
    DEFAULT_WAITING_SOUND_VOLUME_PERCENT,
  )
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const previewBeepTimeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      const loadedSettings = await usageClientService.getSettings()

      setSettings(loadedSettings)
      setRefreshIntervalSeconds(loadedSettings.sessionsRefreshIntervalSeconds)
      setIsWaitingSoundEnabled(loadedSettings.isWaitingSoundEnabled)
      setWaitingSoundVolumePercent(loadedSettings.waitingSoundVolumePercent)
    }

    void loadSettings()
  }, [])

  useEffect(() => {
    return () => {
      window.clearTimeout(previewBeepTimeoutRef.current)
    }
  }, [])

  const handleTestWaitingSound = (): void => {
    window.clearTimeout(previewBeepTimeoutRef.current)

    sessionWaitingSoundUtil.playWaitingBeep({ volumePercent: waitingSoundVolumePercent })
  }

  const handleSave = async (): Promise<void> => {
    if (settings === undefined) {
      return
    }

    setIsSaving(true)
    setErrorMessage('')

    try {
      await usageClientService.saveSettings({
        settings: {
          ...settings,
          isWaitingSoundEnabled,
          sessionsRefreshIntervalSeconds: refreshIntervalSeconds,
          waitingSoundVolumePercent,
        },
      })
    } catch (error) {
      setErrorMessage(errorUtil.resolveMessage(error))
      setIsSaving(false)

      return
    }

    setIsSaving(false)
    onSaved()
    onClose()
  }

  if (settings === undefined) {
    return (
      <div className="settings-overlay">
        <section className="settings-panel">
          <p className="provider-card-message">Loading settings…</p>
        </section>
      </div>
    )
  }

  return (
    <div className="settings-overlay">
      <section className="settings-panel">
        <header className="settings-panel-header">
          <h2 className="settings-panel-title">Sessions settings</h2>
          <button aria-label="Close" className="sessions-close-button" onClick={onClose} title="Close" type="button">
            {renderCloseIcon()}
          </button>
        </header>
        <label className="settings-field">
          <span className="settings-field-label">Auto-refresh interval (seconds)</span>
          <input
            className="settings-field-input"
            max={MAX_SESSIONS_REFRESH_INTERVAL_SECONDS}
            min={MIN_SESSIONS_REFRESH_INTERVAL_SECONDS}
            onChange={(event) => {
              const seconds = Number.parseInt(event.target.value, 10)

              if (!Number.isFinite(seconds)) {
                return
              }

              const clampedSeconds = Math.min(
                Math.max(seconds, MIN_SESSIONS_REFRESH_INTERVAL_SECONDS),
                MAX_SESSIONS_REFRESH_INTERVAL_SECONDS,
              )

              setRefreshIntervalSeconds(clampedSeconds)
            }}
            type="number"
            value={refreshIntervalSeconds}
          />
          <span className="settings-hint">
            How often the sessions list refreshes automatically, between {String(MIN_SESSIONS_REFRESH_INTERVAL_SECONDS)}{' '}
            and {String(MAX_SESSIONS_REFRESH_INTERVAL_SECONDS)} seconds.
          </span>
        </label>
        <div className="settings-field">
          <span className="settings-field-label">Waiting sound</span>
          <label className="ssh-host-toggle">
            <input
              checked={isWaitingSoundEnabled}
              onChange={(event) => {
                setIsWaitingSoundEnabled(event.target.checked)
              }}
              type="checkbox"
            />
            Play sound when a session waits for input
          </label>
          <span className="settings-hint">
            A single soft beep plays once when a Claude session starts waiting for you.
          </span>
        </div>
        <div className="settings-field">
          <span className="settings-field-label">Waiting sound volume (%)</span>
          <div className="sessions-settings-volume-row">
            <input
              className="sessions-settings-range"
              disabled={!isWaitingSoundEnabled}
              max={MAX_WAITING_SOUND_VOLUME_PERCENT}
              min={MIN_WAITING_SOUND_VOLUME_PERCENT}
              onChange={(event) => {
                const volumePercent = Number.parseInt(event.target.value, 10)

                if (!Number.isFinite(volumePercent)) {
                  return
                }

                setWaitingSoundVolumePercent(volumePercent)

                if (isWaitingSoundEnabled) {
                  window.clearTimeout(previewBeepTimeoutRef.current)
                  previewBeepTimeoutRef.current = window.setTimeout(() => {
                    sessionWaitingSoundUtil.playWaitingBeep({ volumePercent })
                  }, PREVIEW_BEEP_DELAY_MS)
                }
              }}
              type="range"
              value={waitingSoundVolumePercent}
            />
            <button
              className="button sessions-settings-test-button"
              disabled={!isWaitingSoundEnabled}
              onClick={handleTestWaitingSound}
              type="button"
            >
              Test sound
            </button>
          </div>
          <span className="settings-hint">
            Loudness of the waiting beep, between {String(MIN_WAITING_SOUND_VOLUME_PERCENT)} and{' '}
            {String(MAX_WAITING_SOUND_VOLUME_PERCENT)} percent. Move the slider or press Test sound to hear a preview.
          </span>
        </div>
        {errorMessage !== '' && <p className="settings-error">{errorMessage}</p>}
        <button
          className="button button-primary"
          disabled={isSaving}
          onClick={() => {
            void handleSave()
          }}
          type="button"
        >
          Save
        </button>
      </section>
    </div>
  )
}
