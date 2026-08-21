import { type ReactElement, useEffect, useState } from 'react'

import { usageClientService } from '#src/renderer/src/business/service/usage-client-service'
import { errorUtil } from '#src/renderer/src/util/error-util'
import { type IAppSettings, MAX_POLL_INTERVAL_SECONDS, MIN_POLL_INTERVAL_SECONDS } from '#src/shared/settings-model'

export const SettingsPanel = (props: { onClose: () => void; onSaved: () => void }): ReactElement => {
  const { onClose, onSaved } = props
  const [settings, setSettings] = useState<IAppSettings | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)
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
    onSaved()
    onClose()
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
          <h2 className="settings-panel-title">Settings</h2>
          <button className="button" onClick={onClose} type="button">
            Close
          </button>
        </header>
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
