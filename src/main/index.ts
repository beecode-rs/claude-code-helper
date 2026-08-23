import { app, dialog } from 'electron'
import { join } from 'node:path'

import { SchedulingStrategyFactory } from '#src/main/business/component/scheduling-strategy/factory'
import { SettingsRepo } from '#src/main/business/repo/settings-repo'
import { UsageSnapshotRepo } from '#src/main/business/repo/usage-snapshot-repo'
import { SchedulingService } from '#src/main/business/service/scheduling-service'
import { UsagePollService } from '#src/main/business/service/usage-poll-service'
import { ipcController } from '#src/main/controller/ipc-controller'
import { appWindow } from '#src/main/lib/app-window'
import { errorUtil } from '#src/main/util/error-util'

if (process.argv.includes('--fire-trigger')) {
  app.exit(0)
}

const bootstrapApp = async (): Promise<void> => {
  app.on('window-all-closed', () => {
    app.quit()
  })

  const settingsRepo = new SettingsRepo({
    settingsFilePath: join(app.getPath('userData'), 'usage-pulse-settings.json'),
  })
  const usageSnapshotRepo = new UsageSnapshotRepo({
    snapshotFilePath: join(app.getPath('userData'), 'usage-pulse-snapshots.json'),
  })
  const pollService = new UsagePollService({ snapshotRepo: usageSnapshotRepo })
  const schedulingService = new SchedulingService({
    strategy: new SchedulingStrategyFactory().resolve(),
  })
  const settings = await settingsRepo.load()
  await settingsRepo.save({ settings })
  await schedulingService.syncRegistrations({ settings }).catch(() => {
    return undefined
  })
  const browserWindow = appWindow.create()

  ipcController.register({
    getWindow: () => {
      return browserWindow
    },
    pollService,
    schedulingService,
    settingsRepo,
  })
  await pollService.start({ settings })
}

const handleBootstrapError = (error: unknown): void => {
  dialog.showErrorBox('Usage Pulse failed to start', errorUtil.resolveMessage(error))
  app.quit()
}

void app.whenReady().then(bootstrapApp).catch(handleBootstrapError)
