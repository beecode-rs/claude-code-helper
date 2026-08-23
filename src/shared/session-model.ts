export type SessionStatus = 'busy' | 'idle' | 'unknown' | 'waiting'

export interface ISessionInfo {
  cwd: string
  hostId?: string
  hostLabel?: string
  kind: string
  name: string
  pid: number
  sessionId: string
  startedAt: number
  status: SessionStatus
}

export interface IUnreachableHost {
  errorMessage: string
  hostId: string
  hostLabel: string
}

export interface ISessionSnapshot {
  fetchedAt: number
  sessions: ISessionInfo[]
  unreachableHosts: IUnreachableHost[]
}
