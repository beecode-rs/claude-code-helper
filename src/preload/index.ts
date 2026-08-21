import { contextBridge, ipcRenderer } from 'electron'

import { IpcChannelMapper } from '#src/shared/ipc-channel'
import { type IAppSettings } from '#src/shared/settings-model'
import { type IUsageApiClient, type IUsageSnapshot, type UsageUpdateListener } from '#src/shared/usage-model'

const usageApi: IUsageApiClient = {
  getSettings: (): Promise<IAppSettings> => {
    return ipcRenderer.invoke(IpcChannelMapper.SETTINGS_GET)
  },
  onUsageUpdate: (listener: UsageUpdateListener): (() => void) => {
    const usageUpdateListener = (_event: Electron.IpcRendererEvent, snapshot: IUsageSnapshot): void => {
      listener(snapshot)
    }

    ipcRenderer.on(IpcChannelMapper.USAGE_UPDATE, usageUpdateListener)

    return () => {
      ipcRenderer.removeListener(IpcChannelMapper.USAGE_UPDATE, usageUpdateListener)
    }
  },
  refreshNow: (): Promise<void> => {
    return ipcRenderer.invoke(IpcChannelMapper.USAGE_REFRESH)
  },
  refreshTracker: (params: { trackerId: string }): Promise<void> => {
    return ipcRenderer.invoke(IpcChannelMapper.USAGE_REFRESH_TRACKER, params.trackerId)
  },
  saveSettings: (settings: IAppSettings): Promise<IAppSettings> => {
    return ipcRenderer.invoke(IpcChannelMapper.SETTINGS_SAVE, settings)
  },
}

contextBridge.exposeInMainWorld('usageApi', usageApi)
