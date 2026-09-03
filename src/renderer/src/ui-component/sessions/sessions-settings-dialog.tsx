import { type ReactElement, useEffect, useState } from 'react'

import { usageClientService } from '#src/renderer/src/business/service/usage-client-service'
import { SessionSoundField } from '#src/renderer/src/ui-component/sessions/session-sound-field'
import { errorUtil } from '#src/renderer/src/util/error-util'
import {
  DEFAULT_SESSIONS_REFRESH_INTERVAL_SECONDS,
  DEFAULT_SESSION_FINISHED_PULSE_SECONDS,
  DEFAULT_SESSION_FINISHED_SOUND_ID,
  DEFAULT_SOUND_VOLUME_PERCENT,
  DEFAULT_WAITING_SOUND_ID,
  type IAppSettings,
  MAX_SESSIONS_REFRESH_INTERVAL_SECONDS,
  MAX_SESSION_FINISHED_PULSE_SECONDS,
  MAX_SOUND_VOLUME_PERCENT,
  MIN_SESSIONS_REFRESH_INTERVAL_SECONDS,
  MIN_SESSION_FINISHED_PULSE_SECONDS,
  MIN_SOUND_VOLUME_PERCENT,
} from '#src/shared/settings-model'

const resolveClampedSeconds = (params: { maxSeconds: number; minSeconds: number; seconds: number }): number => {
  return Math.min(Math.max(params.seconds, params.minSeconds), params.maxSeconds)
}

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
  const [sessionFinishedPulseSeconds, setSessionFinishedPulseSeconds] = useState<number>(
    DEFAULT_SESSION_FINISHED_PULSE_SECONDS,
  )
  const [sessionFinishedSoundId, setSessionFinishedSoundId] = useState(DEFAULT_SESSION_FINISHED_SOUND_ID)
  const [waitingSoundId, setWaitingSoundId] = useState(DEFAULT_WAITING_SOUND_ID)
  const [soundVolumePercent, setSoundVolumePercent] = useState<number>(DEFAULT_SOUND_VOLUME_PERCENT)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      const loadedSettings = await usageClientService.getSettings()

      setSettings(loadedSettings)
      setRefreshIntervalSeconds(loadedSettings.sessionsRefreshIntervalSeconds)
      setSessionFinishedPulseSeconds(loadedSettings.sessionFinishedPulseSeconds)
      setSessionFinishedSoundId(loadedSettings.sessionFinishedSoundId)
      setWaitingSoundId(loadedSettings.waitingSoundId)
      setSoundVolumePercent(loadedSettings.soundVolumePercent)
    }

    void loadSettings()
  }, [])

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
          sessionFinishedPulseSeconds,
          sessionFinishedSoundId,
          sessionsRefreshIntervalSeconds: refreshIntervalSeconds,
          soundVolumePercent,
          waitingSoundId,
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

              setRefreshIntervalSeconds(
                resolveClampedSeconds({
                  maxSeconds: MAX_SESSIONS_REFRESH_INTERVAL_SECONDS,
                  minSeconds: MIN_SESSIONS_REFRESH_INTERVAL_SECONDS,
                  seconds,
                }),
              )
            }}
            type="number"
            value={refreshIntervalSeconds}
          />
          <span className="settings-hint">
            How often the sessions list refreshes automatically, between {String(MIN_SESSIONS_REFRESH_INTERVAL_SECONDS)}{' '}
            and {String(MAX_SESSIONS_REFRESH_INTERVAL_SECONDS)} seconds.
          </span>
        </label>
        <label className="settings-field">
          <span className="settings-field-label">Session finished indicator (seconds)</span>
          <input
            className="settings-field-input"
            max={MAX_SESSION_FINISHED_PULSE_SECONDS}
            min={MIN_SESSION_FINISHED_PULSE_SECONDS}
            onChange={(event) => {
              const seconds = Number.parseInt(event.target.value, 10)

              if (!Number.isFinite(seconds)) {
                return
              }

              setSessionFinishedPulseSeconds(
                resolveClampedSeconds({
                  maxSeconds: MAX_SESSION_FINISHED_PULSE_SECONDS,
                  minSeconds: MIN_SESSION_FINISHED_PULSE_SECONDS,
                  seconds,
                }),
              )
            }}
            type="number"
            value={sessionFinishedPulseSeconds}
          />
          <span className="settings-hint">
            How long a finished session card pulses its border from grey to white, fading out over the same rhythm.
            Between {String(MIN_SESSION_FINISHED_PULSE_SECONDS)} and {String(MAX_SESSION_FINISHED_PULSE_SECONDS)}{' '}
            seconds, where {String(MIN_SESSION_FINISHED_PULSE_SECONDS)} turns the indicator off.
          </span>
        </label>
        <fieldset className="settings-group">
          <legend className="settings-group-title">Sounds</legend>
          <SessionSoundField
            hint="Plays when a Claude session starts waiting for your input."
            label="Waiting sound"
            onSoundIdChange={setWaitingSoundId}
            playButtonTitle="Play waiting sound"
            soundId={waitingSoundId}
            volumePercent={soundVolumePercent}
          />
          <SessionSoundField
            hint="Plays when a Claude session finishes working."
            label="Session finished sound"
            onSoundIdChange={setSessionFinishedSoundId}
            playButtonTitle="Play session finished sound"
            soundId={sessionFinishedSoundId}
            volumePercent={soundVolumePercent}
          />
          <div className="settings-field">
            <span className="settings-field-label">Volume (%)</span>
            <input
              className="sessions-settings-range"
              max={MAX_SOUND_VOLUME_PERCENT}
              min={MIN_SOUND_VOLUME_PERCENT}
              onChange={(event) => {
                const volumePercent = Number.parseInt(event.target.value, 10)

                if (!Number.isFinite(volumePercent)) {
                  return
                }

                setSoundVolumePercent(volumePercent)
              }}
              type="range"
              value={soundVolumePercent}
            />
            <span className="settings-hint">
              Loudness of both sounds, between {String(MIN_SOUND_VOLUME_PERCENT)} and {String(MAX_SOUND_VOLUME_PERCENT)}{' '}
              percent. Use the play buttons to preview each sound.
            </span>
          </div>
        </fieldset>
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
