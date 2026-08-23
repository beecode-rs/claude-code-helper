import type { ISessionSnapshot } from '#src/shared/session-model'

export const sessionsClientService = {
  focusSession: (params: { cwd: string; pid: number }): Promise<void> => {
    return window.usageApi.focusSession(params)
  },
  listSessions: (): Promise<ISessionSnapshot> => {
    return window.usageApi.listSessions()
  },
  testSshHost: (params: { url: string }): Promise<void> => {
    return window.usageApi.testSshHost(params)
  },
}
