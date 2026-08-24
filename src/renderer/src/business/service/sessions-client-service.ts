import type { ISessionFocusSupport, ISessionSnapshot } from '#src/shared/session-model'

export const sessionsClientService = {
  focusSession: (params: { cwd: string; pid: number }): Promise<void> => {
    return window.usageApi.focusSession(params)
  },
  getSessionFocusSupport: (): Promise<ISessionFocusSupport> => {
    return window.usageApi.getSessionFocusSupport()
  },
  installSessionFocusTool: (): Promise<ISessionFocusSupport> => {
    return window.usageApi.installSessionFocusTool()
  },
  listSessions: (): Promise<ISessionSnapshot> => {
    return window.usageApi.listSessions()
  },
  testSshHost: (params: { url: string }): Promise<void> => {
    return window.usageApi.testSshHost(params)
  },
}
