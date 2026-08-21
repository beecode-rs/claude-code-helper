import { type BrowserWindow, ipcMain } from 'electron'

import { type SettingsRepo } from '#src/main/business/repo/settings-repo'
import { SettingsService } from '#src/main/business/service/settings-service'
import { type UsagePollService } from '#src/main/business/service/usage-poll-service'
import { IpcChannelMapper } from '#src/shared/ipc-channel'
import { type IAppSettings } from '#src/shared/settings-model'

export const ipcController = {
  register: (params: {
    getWindow: () => BrowserWindow
    pollService: UsagePollService
    settingsRepo: SettingsRepo
  }): void => {
    ipcMain.handle(IpcChannelMapper.SETTINGS_GET, async (): Promise<IAppSettings> => {
      return await params.settingsRepo.load()
    })

    ipcMain.handle(IpcChannelMapper.SETTINGS_SAVE, async (_event, rawSettings: unknown): Promise<IAppSettings> => {
      const settings = new SettingsService().sanitizeSettings({ rawSettings })

      await params.settingsRepo.save({ settings })
      await params.pollService.restart({ settings })

      return settings
    })

    ipcMain.handle(IpcChannelMapper.USAGE_REFRESH, async (): Promise<void> => {
      await params.pollService.pollNow()
    })

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
