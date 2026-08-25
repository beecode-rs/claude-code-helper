import { SessionTranscriptService } from '#src/main/business/service/session-transcript-service'
import { SessionsService } from '#src/main/business/service/sessions-service'
import { SshSessionsService } from '#src/main/business/service/ssh-sessions-service'
import { errorUtil } from '#src/main/util/error-util'
import { type ISessionSnapshot, type SessionsUpdateListener } from '#src/shared/session-model'
import { type IAppSettings } from '#src/shared/settings-model'

export class SessionsPollService {
  protected _isWindowVisible = false
  protected _listeners: SessionsUpdateListener[] = []
  protected _refreshInFlight: Promise<ISessionSnapshot> | undefined
  protected _settings: IAppSettings | undefined
  protected _snapshot: ISessionSnapshot | undefined
  protected _timer: NodeJS.Timeout | undefined
  protected readonly _sessionTranscriptService: SessionTranscriptService
  protected readonly _sessionsService: SessionsService
  protected readonly _sshSessionsService: SshSessionsService

  constructor(params?: {
    sessionTranscriptService?: SessionTranscriptService
    sessionsService?: SessionsService
    sshSessionsService?: SshSessionsService
  }) {
    const {
      sessionTranscriptService = new SessionTranscriptService(),
      sessionsService = new SessionsService(),
      sshSessionsService = new SshSessionsService(),
    } = params ?? {}

    this._sessionTranscriptService = sessionTranscriptService
    this._sessionsService = sessionsService
    this._sshSessionsService = sshSessionsService
  }

  async start(params: { settings: IAppSettings }): Promise<void> {
    this._settings = params.settings

    if (!this._isWindowVisible) {
      return
    }

    await this._resumeAutoRefresh()
  }

  async restart(params: { settings: IAppSettings }): Promise<void> {
    this.stop()
    this._settings = params.settings
    await this.refreshNow()
  }

  stop(): void {
    if (this._timer === undefined) {
      return
    }

    clearTimeout(this._timer)
    this._timer = undefined
  }

  setWindowVisibility(params: { isVisible: boolean }): void {
    if (params.isVisible === this._isWindowVisible) {
      return
    }

    this._isWindowVisible = params.isVisible

    if (!params.isVisible) {
      this.stop()

      return
    }

    void this._resumeAutoRefresh()
  }

  async refreshNow(): Promise<ISessionSnapshot> {
    const inFlightRefresh = this._refreshInFlight

    if (inFlightRefresh !== undefined) {
      return await inFlightRefresh
    }

    const refresh = this._refreshSnapshot().finally(() => {
      this._refreshInFlight = undefined
    })

    this._refreshInFlight = refresh
    const snapshot = await refresh

    this._rescheduleAfterRefresh()

    return snapshot
  }

  getSnapshot(): ISessionSnapshot | undefined {
    return this._snapshot
  }

  onUpdate(params: { listener: SessionsUpdateListener }): () => void {
    this._listeners.push(params.listener)

    return () => {
      this._listeners = this._listeners.filter((listener) => {
        return listener !== params.listener
      })
    }
  }

  protected async _resumeAutoRefresh(): Promise<void> {
    const settings = this._settings

    if (settings === undefined || settings.isSessionsAutoRefreshPaused) {
      return
    }

    const resumeDelayMs = this._calcResumeDelayMs({ intervalSeconds: settings.sessionsRefreshIntervalSeconds })

    if (resumeDelayMs > 0) {
      this._scheduleNextRefresh({ delayMs: resumeDelayMs })

      return
    }

    await this.refreshNow()
  }

  protected _calcResumeDelayMs(params: { intervalSeconds: number }): number {
    const snapshot = this._snapshot

    if (snapshot === undefined) {
      return 0
    }

    const nextRefreshAt = snapshot.fetchedAt + params.intervalSeconds * 1000
    const resumeDelayMs = nextRefreshAt - Date.now()

    if (resumeDelayMs <= 0) {
      return 0
    }

    return resumeDelayMs
  }

  protected async _refreshSnapshot(): Promise<ISessionSnapshot> {
    const settings = this._settings

    if (settings === undefined) {
      return { fetchedAt: Date.now(), sessions: [], unreachableHosts: [] }
    }

    try {
      const snapshot = await this._fetchSnapshot({ settings })

      this._snapshot = snapshot
      this._notifyListeners({ snapshot })

      return snapshot
    } catch (error) {
      const snapshot = this._buildErrorSnapshot({ errorMessage: errorUtil.resolveMessage(error) })

      this._snapshot = snapshot
      this._notifyListeners({ snapshot })

      return snapshot
    }
  }

  protected async _fetchSnapshot(params: { settings: IAppSettings }): Promise<ISessionSnapshot> {
    const [localSnapshot, remoteResults] = await Promise.all([
      this._sessionsService.listSessions(),
      this._sshSessionsService.listRemoteSessions({ hosts: params.settings.sshHosts }),
    ])
    const mergedSnapshot = this._sshSessionsService.mergeSessionSnapshots({ localSnapshot, remoteResults })
    const sessions = await this._sessionTranscriptService
      .enrichSessions({ sessions: mergedSnapshot.sessions })
      .catch(() => {
        return mergedSnapshot.sessions
      })

    return { ...mergedSnapshot, sessions }
  }

  protected _buildErrorSnapshot(params: { errorMessage: string }): ISessionSnapshot {
    return {
      errorMessage: params.errorMessage,
      fetchedAt: Date.now(),
      sessions: this._snapshot?.sessions ?? [],
      unreachableHosts: this._snapshot?.unreachableHosts ?? [],
    }
  }

  protected _rescheduleAfterRefresh(): void {
    const settings = this._settings

    if (settings === undefined || settings.isSessionsAutoRefreshPaused) {
      return
    }

    if (!this._isWindowVisible) {
      return
    }

    this._scheduleNextRefresh({ delayMs: settings.sessionsRefreshIntervalSeconds * 1000 })
  }

  protected _scheduleNextRefresh(params: { delayMs: number }): void {
    this.stop()

    this._timer = setTimeout(() => {
      void this._onRefreshTimer()
    }, params.delayMs)
  }

  protected async _onRefreshTimer(): Promise<void> {
    await this.refreshNow()
  }

  protected _notifyListeners(params: { snapshot: ISessionSnapshot }): void {
    this._listeners.forEach((listener) => {
      listener(params.snapshot)
    })
  }
}
