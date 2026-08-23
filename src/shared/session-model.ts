export type SessionStatus = 'busy' | 'idle' | 'unknown' | 'waiting'

export interface ISessionTranscriptStats {
  aiTitle: string
  cacheCreationTokens: number
  cacheReadTokens: number
  contextSizeTokens?: number
  gitBranch: string
  inputTokens: number
  lastActivityAt?: number
  lastPrompt: string
  model: string
  outputTokens: number
  thinkingTokens: number
  userTurnsCount: number
  version: string
}

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
  transcript?: ISessionTranscriptStats
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
