import { type ReactElement, useEffect, useState } from 'react'

import { usageClientService } from '#src/renderer/src/business/service/usage-client-service'
import { SettingsPanel } from '#src/renderer/src/ui-component/settings/settings-panel'
import { AddTrackerDialog } from '#src/renderer/src/ui-component/tracker/add-tracker-dialog'
import { TrackerSettingsDialog } from '#src/renderer/src/ui-component/tracker/tracker-settings-dialog'
import { DashboardFooter } from '#src/renderer/src/ui-component/usage-dashboard/dashboard-footer'
import { ProviderUsageCard } from '#src/renderer/src/ui-component/usage-dashboard/provider-usage-card'
import '#src/renderer/src/ui-component/usage-dashboard/usage-dashboard.css'
import type { IAppSettings } from '#src/shared/settings-model'
import type { IUsageSnapshot } from '#src/shared/usage-model'

export const UsageDashboard = (): ReactElement => {
  const [snapshot, setSnapshot] = useState<IUsageSnapshot | undefined>(undefined)
  const [settings, setSettings] = useState<IAppSettings | undefined>(undefined)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [openTrackerId, setOpenTrackerId] = useState<string | undefined>(undefined)

  const loadSettings = async (): Promise<void> => {
    const loadedSettings = await usageClientService.getSettings()

    setSettings(loadedSettings)
  }

  const refreshUsage = async (): Promise<void> => {
    setIsRefreshing(true)
    await usageClientService.refreshNow()
    setIsRefreshing(false)
  }

  useEffect(() => {
    const unsubscribe = usageClientService.subscribeToUsageUpdates({
      onUpdate: (updatedSnapshot) => {
        setSnapshot(updatedSnapshot)
      },
    })

    if (!import.meta.env.DEV) {
      void usageClientService.refreshNow()
    }

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    void loadSettings()
  }, [])

  const hasSnapshot = snapshot !== undefined
  const isEmpty = settings?.trackers.length === 0
  const providerSnapshots = snapshot?.providers ?? []

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1 className="dashboard-title">Usage Pulse</h1>
          <p className="dashboard-subtitle">Track usage limits for your coding plans</p>
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
          <button
            className="button"
            disabled={isRefreshing}
            onClick={() => {
              void refreshUsage()
            }}
            type="button"
          >
            Refresh
          </button>
          <button
            className="button"
            onClick={() => {
              setIsSettingsOpen(true)
            }}
            type="button"
          >
            Settings
          </button>
        </div>
      </header>
      <main className="dashboard-grid">
        {providerSnapshots.map((providerSnapshot) => {
          return (
            <ProviderUsageCard
              key={providerSnapshot.trackerId}
              onOpenSettings={() => {
                setOpenTrackerId(providerSnapshot.trackerId)
              }}
              providerSnapshot={providerSnapshot}
            />
          )
        })}
        {!hasSnapshot && !isEmpty && <p className="dashboard-empty">Loading usage…</p>}
        {isEmpty && (
          <div className="dashboard-empty-state">
            <p className="dashboard-empty">No trackers yet. Add one to start monitoring usage.</p>
            <button
              className="button button-primary"
              onClick={() => {
                setIsAddOpen(true)
              }}
              type="button"
            >
              Add tracker
            </button>
          </div>
        )}
      </main>
      <DashboardFooter lastFetchedAt={snapshot?.fetchedAt} pollIntervalSeconds={settings?.pollIntervalSeconds} />
      {isSettingsOpen && (
        <SettingsPanel
          onClose={() => {
            setIsSettingsOpen(false)
          }}
          onSaved={() => {
            void loadSettings()
          }}
        />
      )}
      {isAddOpen && (
        <AddTrackerDialog
          onClose={() => {
            setIsAddOpen(false)
          }}
          onSaved={() => {
            void loadSettings()
          }}
        />
      )}
      {openTrackerId !== undefined && (
        <TrackerSettingsDialog
          onClose={() => {
            setOpenTrackerId(undefined)
          }}
          onSaved={() => {
            void loadSettings()
          }}
          trackerId={openTrackerId}
        />
      )}
    </div>
  )
}
