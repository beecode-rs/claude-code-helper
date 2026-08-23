import { app, dialog } from 'electron'
import { join } from 'node:path'

import { SchedulingStrategyFactory } from '#src/main/business/component/scheduling-strategy/factory'
import { SettingsRepo } from '#src/main/business/repo/settings-repo'
import { TriggerRunLogRepo } from '#src/main/business/repo/trigger-run-log-repo'
import { UsageSnapshotRepo } from '#src/main/business/repo/usage-snapshot-repo'
import { SchedulingService } from '#src/main/business/service/scheduling-service'
import { SessionTranscriptService } from '#src/main/business/service/session-transcript-service'
import { SessionsService } from '#src/main/business/service/sessions-service'
import { SshSessionsService } from '#src/main/business/service/ssh-sessions-service'
import { TriggerRunnerService } from '#src/main/business/service/trigger-runner-service'
import { UsagePollService } from '#src/main/business/service/usage-poll-service'
import { ipcController } from '#src/main/controller/ipc-controller'
import { appWindow } from '#src/main/lib/app-window'
import { errorUtil } from '#src/main/util/error-util'

const resolveFiredTriggerId = (): string | undefined => {
  const flagIndex = process.argv.indexOf('--fire-trigger')

  if (flagIndex < 0) {
    return undefined
  }

  return process.argv[flagIndex + 1]
}

const bootstrapTriggerWorker = (params: { triggerId: string }): void => {
  app.dock?.hide()

  const userDataPath = app.getPath('userData')
  const runner = new TriggerRunnerService({
    runLogRepo: new TriggerRunLogRepo({
      logFilePath: join(userDataPath, 'usage-pulse-trigger-log.jsonl'),
    }),
    settingsRepo: new SettingsRepo({
      settingsFilePath: join(userDataPath, 'usage-pulse-settings.json'),
    }),
  })

  void runner
    .runTrigger({ source: 'os-schedule', triggerId: params.triggerId })
    .then(({ exitCode }) => {
      app.exit(exitCode)
    })
    .catch(() => {
      app.exit(1)
    })
}

const resolveExecutablePrefixArgs = (): string[] => {
  if (app.isPackaged) {
    return []
  }

  return [app.getAppPath()]
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
    executablePrefixArgs: resolveExecutablePrefixArgs(),
    strategy: new SchedulingStrategyFactory().resolve(),
  })
  const sessionTranscriptService = new SessionTranscriptService()
  const sessionsService = new SessionsService()
  const sshSessionsService = new SshSessionsService()
  const triggerRunLogRepo = new TriggerRunLogRepo({
    logFilePath: join(app.getPath('userData'), 'usage-pulse-trigger-log.jsonl'),
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
    sessionsService,
    sessionTranscriptService,
    settingsRepo,
    sshSessionsService,
    triggerRunLogRepo,
  })
  await pollService.start({ settings })
}

const handleBootstrapError = (error: unknown): void => {
  dialog.showErrorBox('Usage Pulse failed to start', errorUtil.resolveMessage(error))
  app.quit()
}

if (process.argv.includes('--fire-trigger')) {
  const firedTriggerId = resolveFiredTriggerId()

  if (firedTriggerId === undefined) {
    app.exit(1)
  } else {
    bootstrapTriggerWorker({ triggerId: firedTriggerId })
  }
} else {
  void app.whenReady().then(bootstrapApp).catch(handleBootstrapError)
}
