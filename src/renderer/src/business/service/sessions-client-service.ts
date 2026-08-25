import type { ISessionFocusSupport, ISessionSnapshot, SessionsUpdateListener } from '#src/shared/session-model'

export const sessionsClientService = {
  focusSession: (params: { cwd: string; pid: number }): Promise<void> => {
    return window.usageApi.focusSession(params)
  },
  getSessionFocusSupport: (): Promise<ISessionFocusSupport> => {
    return window.usageApi.getSessionFocusSupport()
  },
  getSessionsSnapshot: (): Promise<ISessionSnapshot | undefined> => {
    return window.usageApi.getSessionsSnapshot()
  },
  installSessionFocusTool: (): Promise<ISessionFocusSupport> => {
    return window.usageApi.installSessionFocusTool()
  },
  listSessions: (): Promise<ISessionSnapshot> => {
    return window.usageApi.listSessions()
  },
  resolveSessionsSnapshot: (): Promise<ISessionSnapshot> => {
    return window.usageApi.getSessionsSnapshot().then((cachedSnapshot) => {
      if (cachedSnapshot !== undefined) {
        return cachedSnapshot
      }

      return window.usageApi.listSessions()
    })
  },
  subscribeToSessionsUpdates: (params: { onUpdate: SessionsUpdateListener }): (() => void) => {
    return window.usageApi.onSessionsUpdate(params.onUpdate)
  },
  testSshHost: (params: { url: string }): Promise<void> => {
    return window.usageApi.testSshHost(params)
  },
}
