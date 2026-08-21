import { app, dialog } from 'electron'
import { join } from 'node:path'

import { SettingsRepo } from '#src/main/business/repo/settings-repo'
import { UsagePollService } from '#src/main/business/service/usage-poll-service'
import { ipcController } from '#src/main/controller/ipc-controller'
import { appWindow } from '#src/main/lib/app-window'
import { errorUtil } from '#src/main/util/error-util'

const bootstrapApp = async (): Promise<void> => {
  app.on('window-all-closed', () => {
    app.quit()
  })

  const settingsRepo = new SettingsRepo({
    settingsFilePath: join(app.getPath('userData'), 'usage-pulse-settings.json'),
  })
  const pollService = new UsagePollService({ isDevelopment: !app.isPackaged })
  const settings = await settingsRepo.load()
  await settingsRepo.save({ settings })
  const browserWindow = appWindow.create()

  ipcController.register({
    getWindow: () => {
      return browserWindow
    },
    pollService,
    settingsRepo,
  })
  await pollService.start({ settings })
}

const handleBootstrapError = (error: unknown): void => {
  dialog.showErrorBox('Usage Pulse failed to start', errorUtil.resolveMessage(error))
  app.quit()
}

void app.whenReady().then(bootstrapApp).catch(handleBootstrapError)
