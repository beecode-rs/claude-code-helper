import { contextBridge, ipcRenderer } from 'electron'

import { IpcChannelMapper } from '#src/shared/ipc-channel'
import { type IAppSettings } from '#src/shared/settings-model'
import { type ISchedulingInfo, type ITriggerRegistrationHealth } from '#src/shared/trigger-model'
import { type IUsageApiClient, type IUsageSnapshot, type UsageUpdateListener } from '#src/shared/usage-model'

const usageApi: IUsageApiClient = {
  getSchedulingInfo: (): Promise<ISchedulingInfo> => {
    return ipcRenderer.invoke(IpcChannelMapper.SCHEDULING_GET_INFO)
  },
  getSettings: (): Promise<IAppSettings> => {
    return ipcRenderer.invoke(IpcChannelMapper.SETTINGS_GET)
  },
  getSnapshot: (): Promise<IUsageSnapshot> => {
    return ipcRenderer.invoke(IpcChannelMapper.USAGE_GET_SNAPSHOT)
  },
  inspectTriggerRegistrations: (): Promise<ITriggerRegistrationHealth[]> => {
    return ipcRenderer.invoke(IpcChannelMapper.TRIGGER_OS_INSPECT)
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
  setTrackerPaused: (params: { isAutoRefreshPaused: boolean; trackerId: string }): Promise<IAppSettings> => {
    return ipcRenderer.invoke(IpcChannelMapper.USAGE_SET_TRACKER_PAUSED, params)
  },
  setTriggerEnabled: (params: { isEnabled: boolean; triggerId: string }): Promise<IAppSettings> => {
    return ipcRenderer.invoke(IpcChannelMapper.TRIGGER_SET_ENABLED, params)
  },
}

contextBridge.exposeInMainWorld('usageApi', usageApi)
