import { type ReactElement, useEffect, useState } from 'react'

import { usageClientService } from '#src/renderer/src/business/service/usage-client-service'
import { TriggerConfigFields } from '#src/renderer/src/ui-component/scheduling/trigger-config-fields'
import { errorUtil } from '#src/renderer/src/util/error-util'
import { triggerValidationUtil } from '#src/renderer/src/util/trigger-validation-util'
import { type IAppSettings } from '#src/shared/settings-model'
import {
  DEFAULT_TRIGGER_TIMEOUT_MS,
  type ITriggerConfig,
  type ITriggerPreset,
  MAX_WINDOW_TRIGGER_PRESET,
} from '#src/shared/trigger-model'

const DEFAULT_TRIGGER_COMMAND = 'claude -p "what is your name, only name"'

export const AddTriggerDialog = (props: {
  initialPreset?: ITriggerPreset
  onClose: () => void
  onSaved: () => void
}): ReactElement => {
  const { initialPreset, onClose, onSaved } = props
  const [settings, setSettings] = useState<IAppSettings | undefined>(undefined)
  const [newTrigger, setNewTrigger] = useState<ITriggerConfig>((): ITriggerConfig => {
    const preset = initialPreset ?? MAX_WINDOW_TRIGGER_PRESET

    return {
      command: DEFAULT_TRIGGER_COMMAND,
      createdAt: Date.now(),
      days: [...preset.days],
      id: crypto.randomUUID(),
      isEnabled: true,
      name: '',
      timeoutMs: DEFAULT_TRIGGER_TIMEOUT_MS,
      times: [...preset.times],
    }
  })
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      const loadedSettings = await usageClientService.getSettings()

      setSettings(loadedSettings)
    }

    void loadSettings()
  }, [])

  const handleAdd = async (): Promise<void> => {
    if (settings === undefined) {
      return
    }

    const validationError = triggerValidationUtil.resolveValidationError({ trigger: newTrigger })

    if (validationError !== undefined) {
      setErrorMessage(validationError)

      return
    }

    setIsSaving(true)
    setErrorMessage('')

    try {
      await usageClientService.saveSettings({
        settings: { ...settings, triggers: [...settings.triggers, newTrigger] },
      })
    } catch (error) {
      setErrorMessage(errorUtil.resolveMessage(error))
      setIsSaving(false)
      const currentSettings = await usageClientService.getSettings()

      setSettings(currentSettings)

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
          <h2 className="settings-panel-title">Add a trigger</h2>
          <button className="button" onClick={onClose} type="button">
            Close
          </button>
        </header>
        <div className="settings-panel-body">
          <TriggerConfigFields config={newTrigger} onChange={setNewTrigger} />
          {errorMessage !== '' && <p className="settings-error">{errorMessage}</p>}
        </div>
        <div className="settings-dialog-actions">
          <button
            className="button button-primary"
            disabled={isSaving}
            onClick={() => {
              void handleAdd()
            }}
            type="button"
          >
            Add trigger
          </button>
        </div>
      </section>
    </div>
  )
}
