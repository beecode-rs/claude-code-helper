import { contextBridge, ipcRenderer } from 'electron'

import { IpcChannelMapper } from '#src/shared/ipc-channel'
import { type ISessionSnapshot } from '#src/shared/session-model'
import { type IAppSettings } from '#src/shared/settings-model'
import {
  type ISchedulingInfo,
  type ITriggerRegistrationHealth,
  type ITriggerRunLogEntry,
} from '#src/shared/trigger-model'
import { type IUsageApiClient, type IUsageSnapshot, type UsageUpdateListener } from '#src/shared/usage-model'

const usageApi: IUsageApiClient = {
  clearTriggerRunLogs: (params: { triggerId: string }): Promise<void> => {
    return ipcRenderer.invoke(IpcChannelMapper.TRIGGER_CLEAR_RUN_LOGS, params)
  },
  focusSession: (params: { cwd: string; pid: number }): Promise<void> => {
    return ipcRenderer.invoke(IpcChannelMapper.SESSIONS_FOCUS, params)
  },
  getSchedulingInfo: (): Promise<ISchedulingInfo> => {
    return ipcRenderer.invoke(IpcChannelMapper.SCHEDULING_GET_INFO)
  },
  getSettings: (): Promise<IAppSettings> => {
    return ipcRenderer.invoke(IpcChannelMapper.SETTINGS_GET)
  },
  getSnapshot: (): Promise<IUsageSnapshot> => {
    return ipcRenderer.invoke(IpcChannelMapper.USAGE_GET_SNAPSHOT)
  },
  getTriggerRunLogs: (params: { triggerId: string }): Promise<ITriggerRunLogEntry[]> => {
    return ipcRenderer.invoke(IpcChannelMapper.TRIGGER_GET_RUN_LOGS, params)
  },
  inspectTriggerRegistrations: (): Promise<ITriggerRegistrationHealth[]> => {
    return ipcRenderer.invoke(IpcChannelMapper.TRIGGER_OS_INSPECT)
  },
  listSessions: (): Promise<ISessionSnapshot> => {
    return ipcRenderer.invoke(IpcChannelMapper.SESSIONS_LIST)
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
  setSchedulingEnabled: (params: { isEnabled: boolean }): Promise<IAppSettings> => {
    return ipcRenderer.invoke(IpcChannelMapper.SCHEDULING_SET_ENABLED, params)
  },
  setTrackerPaused: (params: { isAutoRefreshPaused: boolean; trackerId: string }): Promise<IAppSettings> => {
    return ipcRenderer.invoke(IpcChannelMapper.USAGE_SET_TRACKER_PAUSED, params)
  },
  setTriggerEnabled: (params: { isEnabled: boolean; triggerId: string }): Promise<IAppSettings> => {
    return ipcRenderer.invoke(IpcChannelMapper.TRIGGER_SET_ENABLED, params)
  },
  testSshHost: (params: { url: string }): Promise<void> => {
    return ipcRenderer.invoke(IpcChannelMapper.SESSIONS_TEST_SSH_HOST, params)
  },
}

contextBridge.exposeInMainWorld('usageApi', usageApi)
