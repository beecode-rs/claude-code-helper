import { type ReactElement, useEffect, useState } from 'react'

import { usageClientService } from '#src/renderer/src/business/service/usage-client-service'
import { errorUtil } from '#src/renderer/src/util/error-util'
import { type IAppSettings, MAX_POLL_INTERVAL_SECONDS, MIN_POLL_INTERVAL_SECONDS } from '#src/shared/settings-model'

export const SettingsPanel = (): ReactElement => {
  const [settings, setSettings] = useState<IAppSettings | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      const loadedSettings = await usageClientService.getSettings()

      setSettings(loadedSettings)
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
      await usageClientService.saveSettings({ settings })
    } catch (error) {
      setErrorMessage(errorUtil.resolveMessage(error))
      setIsSaving(false)

      return
    }

    setIsSaving(false)
    setIsSaved(true)
  }

  const handleEditIntervalSeconds = (value: string): void => {
    if (settings === undefined) {
      return
    }

    const parsedInterval = Number.parseInt(value, 10)

    if (Number.isNaN(parsedInterval)) {
      return
    }

    setSettings({ ...settings, pollIntervalSeconds: parsedInterval })
    setIsSaved(false)
  }

  if (settings === undefined) {
    return (
      <div className="settings-page">
        <p className="provider-card-message">Loading settings…</p>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <header>
        <h1 className="settings-page-title">Settings</h1>
        <p className="settings-page-subtitle">Application-wide preferences for usage polling.</p>
      </header>
      <section className="settings-panel settings-page-panel">
        <label className="settings-field">
          <span className="settings-field-label">Poll interval (seconds)</span>
          <input
            className="settings-field-input"
            max={MAX_POLL_INTERVAL_SECONDS}
            min={MIN_POLL_INTERVAL_SECONDS}
            onChange={(event) => {
              handleEditIntervalSeconds(event.target.value)
            }}
            type="number"
            value={settings.pollIntervalSeconds}
          />
        </label>
        {errorMessage !== '' && <p className="settings-error">{errorMessage}</p>}
        <p className="settings-hint">
          Every tracker is polled at this interval. Provider tokens live in each tracker&apos;s own settings — use the
          gear button on its card.
        </p>
        <div className="settings-page-save">
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
          {isSaved && <span className="settings-saved">Saved</span>}
        </div>
      </section>
    </div>
  )
}
