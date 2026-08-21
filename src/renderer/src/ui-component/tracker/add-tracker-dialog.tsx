import { type ReactElement, useEffect, useState } from 'react'

import { usageClientService } from '#src/renderer/src/business/service/usage-client-service'
import { TrackerConfigFields } from '#src/renderer/src/ui-component/tracker/tracker-config-fields'
import { errorUtil } from '#src/renderer/src/util/error-util'
import { PROVIDER_CATALOG } from '#src/shared/provider-catalog'
import { ClaudeTokenSource, type IAppSettings, type ITrackerConfig } from '#src/shared/settings-model'
import type { ProviderId } from '#src/shared/usage-model'

export const AddTrackerDialog = (props: { onClose: () => void; onSaved: () => void }): ReactElement => {
  const { onClose, onSaved } = props
  const [settings, setSettings] = useState<IAppSettings | undefined>(undefined)
  const [newTracker, setNewTracker] = useState<ITrackerConfig | undefined>(undefined)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      const loadedSettings = await usageClientService.getSettings()

      setSettings(loadedSettings)
    }

    void loadSettings()
  }, [])

  const createBlankTracker = (providerId: ProviderId): ITrackerConfig => {
    switch (providerId) {
      case 'claude': {
        return {
          accessToken: '',
          id: crypto.randomUUID(),
          name: '',
          providerId: 'claude',
          tokenSource: ClaudeTokenSource.MANUAL,
        }
      }

      case 'zai': {
        return {
          accessToken: '',
          id: crypto.randomUUID(),
          name: '',
          providerId: 'zai',
        }
      }

      default: {
        throw new Error(`unsupported provider: ${String(providerId)}`)
      }
    }
  }

  const resolveTrackerValidationError = (tracker: ITrackerConfig): string | undefined => {
    if (tracker.providerId === 'claude' && tracker.tokenSource === ClaudeTokenSource.SYSTEM) {
      return undefined
    }

    if (tracker.accessToken === '') {
      return 'Enter an access token to add this tracker.'
    }

    return undefined
  }

  const handleSelectProvider = (providerId: ProviderId): void => {
    setErrorMessage('')
    setNewTracker(createBlankTracker(providerId))
  }

  const handleAdd = async (): Promise<void> => {
    if (settings === undefined || newTracker === undefined) {
      return
    }

    const validationError = resolveTrackerValidationError(newTracker)

    if (validationError !== undefined) {
      setErrorMessage(validationError)

      return
    }

    setIsSaving(true)
    setErrorMessage('')

    try {
      await usageClientService.saveSettings({
        settings: { ...settings, trackers: [...settings.trackers, newTracker] },
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

  if (newTracker === undefined) {
    return (
      <div className="settings-overlay">
        <section className="settings-panel">
          <header className="settings-panel-header">
            <h2 className="settings-panel-title">Add a tracker</h2>
            <button className="button" onClick={onClose} type="button">
              Close
            </button>
          </header>
          <p className="settings-hint">Choose which provider you want to monitor.</p>
          {PROVIDER_CATALOG.map((catalogEntry) => {
            return (
              <button
                className="provider-choice"
                key={catalogEntry.id}
                onClick={() => {
                  handleSelectProvider(catalogEntry.id)
                }}
                type="button"
              >
                <span className="provider-choice-name">{catalogEntry.name}</span>
                <span className="provider-choice-description">{catalogEntry.description}</span>
              </button>
            )
          })}
        </section>
      </div>
    )
  }

  return (
    <div className="settings-overlay">
      <section className="settings-panel">
        <header className="settings-panel-header">
          <h2 className="settings-panel-title">Add a tracker</h2>
          <button className="button" onClick={onClose} type="button">
            Close
          </button>
        </header>
        <TrackerConfigFields config={newTracker} onChange={setNewTracker} />
        {errorMessage !== '' && <p className="settings-error">{errorMessage}</p>}
        <div className="settings-dialog-actions">
          <button
            className="button"
            onClick={() => {
              setErrorMessage('')
              setNewTracker(undefined)
            }}
            type="button"
          >
            Back
          </button>
          <button
            className="button button-primary"
            disabled={isSaving}
            onClick={() => {
              void handleAdd()
            }}
            type="button"
          >
            Add tracker
          </button>
        </div>
      </section>
    </div>
  )
}
