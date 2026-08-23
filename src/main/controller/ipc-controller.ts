import { type BrowserWindow, ipcMain } from 'electron'

import { type SettingsRepo } from '#src/main/business/repo/settings-repo'
import { type TriggerRunLogRepo } from '#src/main/business/repo/trigger-run-log-repo'
import { type SchedulingService } from '#src/main/business/service/scheduling-service'
import { SettingsService } from '#src/main/business/service/settings-service'
import { type UsagePollService } from '#src/main/business/service/usage-poll-service'
import { objectUtil } from '#src/main/util/object-util'
import { IpcChannelMapper } from '#src/shared/ipc-channel'
import { type IAppSettings } from '#src/shared/settings-model'
import {
  type ISchedulingInfo,
  type ITriggerRegistrationHealth,
  type ITriggerRunLogEntry,
} from '#src/shared/trigger-model'
import { type IUsageSnapshot } from '#src/shared/usage-model'

export const ipcController = {
  register: (params: {
    getWindow: () => BrowserWindow
    pollService: UsagePollService
    schedulingService: SchedulingService
    settingsRepo: SettingsRepo
    triggerRunLogRepo: TriggerRunLogRepo
  }): void => {
    ipcMain.handle(IpcChannelMapper.SCHEDULING_GET_INFO, (): ISchedulingInfo => {
      return params.schedulingService.getSchedulingInfo()
    })

    ipcMain.handle(IpcChannelMapper.SETTINGS_GET, async (): Promise<IAppSettings> => {
      return await params.settingsRepo.load()
    })

    ipcMain.handle(IpcChannelMapper.SETTINGS_SAVE, async (_event, rawSettings: unknown): Promise<IAppSettings> => {
      const settings = new SettingsService().sanitizeSettings({ rawSettings })

      await params.settingsRepo.save({ settings })
      await params.pollService.restart({ settings })
      await params.schedulingService.syncRegistrations({ settings })

      return settings
    })

    ipcMain.handle(IpcChannelMapper.TRIGGER_CLEAR_RUN_LOGS, async (_event, rawParams: unknown): Promise<void> => {
      const rawRecord = objectUtil.asRecord(rawParams)
      const triggerId = rawRecord?.['triggerId']

      if (typeof triggerId !== 'string') {
        return
      }

      await params.triggerRunLogRepo.removeByTriggerId({ triggerId })
    })

    ipcMain.handle(
      IpcChannelMapper.TRIGGER_GET_RUN_LOGS,
      async (_event, rawParams: unknown): Promise<ITriggerRunLogEntry[]> => {
        const rawRecord = objectUtil.asRecord(rawParams)
        const triggerId = rawRecord?.['triggerId']

        if (typeof triggerId !== 'string') {
          return []
        }

        return await params.triggerRunLogRepo.listByTriggerId({ triggerId })
      },
    )

    ipcMain.handle(IpcChannelMapper.TRIGGER_OS_INSPECT, async (): Promise<ITriggerRegistrationHealth[]> => {
      const settings = await params.settingsRepo.load()

      return await params.schedulingService.inspectRegistrations({ settings })
    })

    ipcMain.handle(IpcChannelMapper.TRIGGER_SET_ENABLED, async (_event, rawParams: unknown): Promise<IAppSettings> => {
      const settings = await params.settingsRepo.load()
      const rawRecord = objectUtil.asRecord(rawParams)
      const triggerId = rawRecord?.['triggerId']
      const isEnabled = rawRecord?.['isEnabled']

      if (typeof triggerId !== 'string' || typeof isEnabled !== 'boolean') {
        return settings
      }

      const nextSettings = new SettingsService().setTriggerEnabled({ isEnabled, settings, triggerId })

      await params.settingsRepo.save({ settings: nextSettings })
      await params.schedulingService.syncRegistrations({ settings: nextSettings })

      return nextSettings
    })

    ipcMain.handle(IpcChannelMapper.USAGE_GET_SNAPSHOT, (): IUsageSnapshot => {
      return params.pollService.getSnapshot()
    })

    ipcMain.handle(IpcChannelMapper.USAGE_REFRESH, async (): Promise<void> => {
      await params.pollService.refreshNow()
    })

    ipcMain.handle(IpcChannelMapper.USAGE_REFRESH_TRACKER, async (_event, trackerId: unknown): Promise<void> => {
      if (typeof trackerId !== 'string') {
        return
      }

      await params.pollService.refreshTracker({ trackerId })
    })

    ipcMain.handle(
      IpcChannelMapper.USAGE_SET_TRACKER_PAUSED,
      async (_event, rawParams: unknown): Promise<IAppSettings> => {
        const settings = await params.settingsRepo.load()
        const rawRecord = objectUtil.asRecord(rawParams)
        const trackerId = rawRecord?.['trackerId']
        const isAutoRefreshPaused = rawRecord?.['isAutoRefreshPaused']

        if (typeof trackerId !== 'string' || typeof isAutoRefreshPaused !== 'boolean') {
          return settings
        }

        const nextSettings = new SettingsService().setTrackerPaused({ isAutoRefreshPaused, settings, trackerId })

        await params.settingsRepo.save({ settings: nextSettings })
        await params.pollService.applyTrackerAutoRefresh({ settings: nextSettings, trackerId })

        return nextSettings
      },
    )

    params.pollService.onUpdate({
      listener: (snapshot) => {
        const browserWindow = params.getWindow()

        if (browserWindow.isDestroyed()) {
          return
        }

        browserWindow.webContents.send(IpcChannelMapper.USAGE_UPDATE, snapshot)
      },
    })
  },
}
