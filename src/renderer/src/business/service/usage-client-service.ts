import type { IAppSettings } from '#src/shared/settings-model'
import type { IUsageSnapshot, UsageUpdateListener } from '#src/shared/usage-model'

export const usageClientService = {
  getSettings: (): Promise<IAppSettings> => {
    return window.usageApi.getSettings()
  },
  getSnapshot: (): Promise<IUsageSnapshot> => {
    return window.usageApi.getSnapshot()
  },
  refreshNow: (): Promise<void> => {
    return window.usageApi.refreshNow()
  },
  refreshTracker: (params: { trackerId: string }): Promise<void> => {
    return window.usageApi.refreshTracker({ trackerId: params.trackerId })
  },
  saveSettings: (params: { settings: IAppSettings }): Promise<IAppSettings> => {
    return window.usageApi.saveSettings(params.settings)
  },
  subscribeToUsageUpdates: (params: { onUpdate: UsageUpdateListener }): (() => void) => {
    return window.usageApi.onUsageUpdate(params.onUpdate)
  },
}
