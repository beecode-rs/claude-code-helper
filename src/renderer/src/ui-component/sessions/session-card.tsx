import { type ReactElement } from 'react'

import { LocalIcon } from '#src/renderer/src/ui-component/icon/local-icon'
import { ServerIcon } from '#src/renderer/src/ui-component/icon/server-icon'
import { SessionExpandButton } from '#src/renderer/src/ui-component/sessions/session-expand-button'
import { SessionFocusButton } from '#src/renderer/src/ui-component/sessions/session-focus-button'
import { dateUtil } from '#src/renderer/src/util/date-util'
import { type ISessionInfo, type ISessionTranscriptStats, type SessionStatus } from '#src/shared/session-model'

const LAST_PROMPT_PREVIEW_MAX_LENGTH = 200

const resolveStatusPresentation = (
  status: SessionStatus,
): { badgeClassName: string; dotClassName: string; label: string } => {
  switch (status) {
    case 'busy': {
      return { badgeClassName: 'session-status is-busy', dotClassName: 'session-status-dot is-busy', label: 'Working' }
    }

    case 'idle': {
      return { badgeClassName: 'session-status is-idle', dotClassName: 'session-status-dot is-idle', label: 'Idle' }
    }

    case 'waiting': {
      return {
        badgeClassName: 'session-status is-waiting',
        dotClassName: 'session-status-dot is-waiting',
        label: 'Waiting for input',
      }
    }

    default: {
      return {
        badgeClassName: 'session-status is-unknown',
        dotClassName: 'session-status-dot is-unknown',
        label: 'Unknown',
      }
    }
  }
}

const resolveCardClassName = (params: { isRemote: boolean; status: SessionStatus }): string => {
  const classNames = ['session-card', `is-${params.status}`]

  if (params.isRemote) {
    classNames.push('is-remote')
  }

  return classNames.join(' ')
}

const resolveKindLabel = (kind: string): string => {
  switch (kind) {
    case 'background': {
      return 'Background'
    }

    case 'interactive': {
      return 'Interactive'
    }

    default: {
      return kind
    }
  }
}

const resolveProjectLabel = (cwd: string): string => {
  const segments = cwd.split('/').filter((segment) => {
    return segment !== ''
  })
  const lastSegment = segments.at(-1)

  if (lastSegment === undefined) {
    return cwd
  }

  return lastSegment
}

const resolveSessionTitle = (session: ISessionInfo): string => {
  if (session.name !== '') {
    return session.name
  }

  if (session.transcript?.aiTitle !== undefined && session.transcript.aiTitle !== '') {
    return session.transcript.aiTitle
  }

  if (session.cwd !== '') {
    return resolveProjectLabel(session.cwd)
  }

  return 'Unnamed session'
}

const resolveTokenCountLabel = (count: number): string => {
  if (count < 1000) {
    return String(count)
  }

  if (count < 100_000) {
    return `${String(Math.round(count / 100) / 10)}k`
  }

  if (count < 1_000_000) {
    return `${String(Math.round(count / 1000))}k`
  }

  return `${String(Math.round(count / 100_000) / 10)}M`
}

const resolveModelLabel = (model: string): string => {
  return model.replace(/-\d{8}$/, '')
}

const resolveUptimeLabel = (params: { nowMs: number; startedAt: number }): string => {
  return `up ${dateUtil.formatDuration(params.nowMs - params.startedAt)}`
}

const resolveLastActivityLabel = (params: { lastActivityAt: number; nowMs: number }): string => {
  return `active ${dateUtil.formatDuration(params.nowMs - params.lastActivityAt)} ago`
}

const resolveLastPromptPreview = (lastPrompt: string): string => {
  const collapsedPrompt = lastPrompt.replace(/\s+/g, ' ').trim()

  if (collapsedPrompt.length <= LAST_PROMPT_PREVIEW_MAX_LENGTH) {
    return collapsedPrompt
  }

  return `${collapsedPrompt.slice(0, LAST_PROMPT_PREVIEW_MAX_LENGTH)}…`
}

const resolveExpandButtonLabel = (params: { isExpanded: boolean; title: string }): string => {
  if (params.isExpanded) {
    return `Collapse details for ${params.title}`
  }

  return `Expand details for ${params.title}`
}

const renderOriginIcon = (isRemote: boolean): ReactElement => {
  if (isRemote) {
    return <ServerIcon />
  }

  return <LocalIcon />
}

const renderTranscriptStat = (params: { label: string; value: string; valueTitle: string }): ReactElement => {
  return (
    <div className="session-transcript-stat">
      <span className="session-transcript-stat-label">{params.label}</span>
      <span className="session-transcript-stat-value" title={params.valueTitle}>
        {params.value}
      </span>
    </div>
  )
}

const renderTranscriptChipList = (params: { nowMs: number; transcript: ISessionTranscriptStats }): ReactElement => {
  const { nowMs, transcript } = params

  return (
    <div className="session-card-chips">
      {transcript.contextSizeTokens !== undefined && (
        <span className="session-chip" title={`${String(transcript.contextSizeTokens)} context tokens`}>
          ctx {resolveTokenCountLabel(transcript.contextSizeTokens)}
        </span>
      )}
      {transcript.model !== '' && (
        <span className="session-chip" title={transcript.model}>
          {resolveModelLabel(transcript.model)}
        </span>
      )}
      {transcript.gitBranch !== '' && (
        <span className="session-chip" title={transcript.gitBranch}>
          {transcript.gitBranch}
        </span>
      )}
      {transcript.lastActivityAt !== undefined && (
        <span className="session-chip" title="Time of the last transcript entry">
          {resolveLastActivityLabel({ lastActivityAt: transcript.lastActivityAt, nowMs })}
        </span>
      )}
    </div>
  )
}

const renderTranscriptDetails = (params: {
  session: ISessionInfo
  transcript: ISessionTranscriptStats
}): ReactElement => {
  const { session, transcript } = params

  return (
    <div className="session-transcript">
      <div className="session-transcript-stats">
        {transcript.contextSizeTokens !== undefined &&
          renderTranscriptStat({
            label: 'Context',
            value: resolveTokenCountLabel(transcript.contextSizeTokens),
            valueTitle: String(transcript.contextSizeTokens),
          })}
        {renderTranscriptStat({
          label: 'Input tokens',
          value: resolveTokenCountLabel(transcript.inputTokens),
          valueTitle: String(transcript.inputTokens),
        })}
        {renderTranscriptStat({
          label: 'Output tokens',
          value: resolveTokenCountLabel(transcript.outputTokens),
          valueTitle: String(transcript.outputTokens),
        })}
        {renderTranscriptStat({
          label: 'Cache read tokens',
          value: resolveTokenCountLabel(transcript.cacheReadTokens),
          valueTitle: String(transcript.cacheReadTokens),
        })}
        {renderTranscriptStat({
          label: 'Cache creation tokens',
          value: resolveTokenCountLabel(transcript.cacheCreationTokens),
          valueTitle: String(transcript.cacheCreationTokens),
        })}
        {renderTranscriptStat({
          label: 'Thinking tokens',
          value: resolveTokenCountLabel(transcript.thinkingTokens),
          valueTitle: String(transcript.thinkingTokens),
        })}
        {renderTranscriptStat({
          label: 'Turns',
          value: String(transcript.userTurnsCount),
          valueTitle: 'Non-meta user turns recorded in the transcript',
        })}
      </div>
      {transcript.lastPrompt !== '' && (
        <p className="session-transcript-prompt" title={transcript.lastPrompt}>
          {resolveLastPromptPreview(transcript.lastPrompt)}
        </p>
      )}
      <div className="session-transcript-identifiers">
        {transcript.version !== '' && <span>version {transcript.version}</span>}
        <span className="session-transcript-session-id" title={session.sessionId}>
          {session.sessionId}
        </span>
      </div>
    </div>
  )
}

export const SessionCard = (props: {
  isExpanded: boolean
  nowMs: number
  onFocus: () => void
  onToggle: () => void
  session: ISessionInfo
}): ReactElement => {
  const { isExpanded, nowMs, onFocus, onToggle, session } = props
  const transcript = session.transcript
  const sessionTitle = resolveSessionTitle(session)
  const statusPresentation = resolveStatusPresentation(session.status)

  return (
    <article
      className={resolveCardClassName({ isRemote: session.hostId !== undefined, status: session.status })}
      title={session.cwd}
    >
      <header className="session-card-header">
        <div className="session-card-heading">
          <span className="session-card-origin">{renderOriginIcon(session.hostId !== undefined)}</span>
          <h2 className="session-card-title">{sessionTitle}</h2>
        </div>
        <span className={statusPresentation.badgeClassName}>
          <span className={statusPresentation.dotClassName} />
          {statusPresentation.label}
        </span>
        {session.hostId === undefined && (
          <SessionFocusButton label={`Focus terminal for ${sessionTitle}`} onClick={onFocus} />
        )}
        {transcript !== undefined && (
          <SessionExpandButton
            isExpanded={isExpanded}
            label={resolveExpandButtonLabel({ isExpanded, title: sessionTitle })}
            onClick={onToggle}
          />
        )}
      </header>
      <p className="session-card-project" title={session.cwd}>
        {resolveProjectLabel(session.cwd)}
      </p>
      {transcript !== undefined && renderTranscriptChipList({ nowMs, transcript })}
      {isExpanded && transcript !== undefined && renderTranscriptDetails({ session, transcript })}
      <footer className="session-card-footer">
        {session.hostId !== undefined && (
          <span className="session-card-meta session-host-chip">
            <ServerIcon size={12} />
            {session.hostLabel}
          </span>
        )}
        {session.kind !== '' && <span className="session-card-meta">{resolveKindLabel(session.kind)}</span>}
        <span className="session-card-meta">pid {String(session.pid)}</span>
        <span className="session-card-meta">{resolveUptimeLabel({ nowMs, startedAt: session.startedAt })}</span>
      </footer>
    </article>
  )
}
