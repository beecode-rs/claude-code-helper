import { type ReactElement, useEffect, useState } from 'react'

import { SessionFinishedPulse } from '#src/renderer/src/ui-component/sessions/session-finished-pulse'
import { SessionFocusButton } from '#src/renderer/src/ui-component/sessions/session-focus-button'
import { SessionOriginIcon } from '#src/renderer/src/ui-component/sessions/session-origin-icon'
import { SessionTranscriptChips } from '#src/renderer/src/ui-component/sessions/session-transcript-chips'
import { SessionWaitingPulse } from '#src/renderer/src/ui-component/sessions/session-waiting-pulse'
import { sessionPresentationUtil } from '#src/renderer/src/util/session-presentation-util'
import { type ISessionInfo, type SessionStatus } from '#src/shared/session-model'

const TICK_INTERVAL_MS = 30_000

const resolveBoxClassName = (params: { isRemote: boolean; status: SessionStatus }): string => {
  const classNames = ['dashboard-session-box', `is-${params.status}`]

  if (params.isRemote) {
    classNames.push('is-remote')
  }

  return classNames.join(' ')
}

export const DashboardSessionBox = (props: {
  finishedAtMs?: number
  onFocus: () => void
  pulseSeconds: number
  session: ISessionInfo
}): ReactElement => {
  const { finishedAtMs, onFocus, pulseSeconds, session } = props
  const [nowMs, setNowMs] = useState((): number => {
    return Date.now()
  })

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNowMs(Date.now())
    }, TICK_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  const sessionTitle = sessionPresentationUtil.resolveSessionTitle({ session })
  const sessionTitleParts = sessionPresentationUtil.resolveSessionTitleParts({ title: sessionTitle })
  const statusPresentation = sessionPresentationUtil.resolveStatusPresentation({ status: session.status })

  return (
    <article
      className={resolveBoxClassName({ isRemote: session.hostId !== undefined, status: session.status })}
      title={session.cwd}
    >
      <SessionFinishedPulse finishedAtMs={finishedAtMs} nowMs={nowMs} pulseSeconds={pulseSeconds} />
      <SessionWaitingPulse isWaiting={session.status === 'waiting'} />
      <header className="dashboard-session-box-header">
        <div className="dashboard-session-box-heading">
          <span className="dashboard-session-box-origin">
            <SessionOriginIcon isRemote={session.hostId !== undefined} />
          </span>
          {session.hostId !== undefined && session.hostLabel !== undefined && (
            <span className="dashboard-session-box-host" title={session.hostLabel}>
              {session.hostLabel}
            </span>
          )}
        </div>
        <div className="dashboard-session-box-header-actions">
          <span className={statusPresentation.badgeClassName}>
            <span className={statusPresentation.dotClassName} />
            {statusPresentation.label}
          </span>
          {session.hostId === undefined && (
            <SessionFocusButton label={`Focus terminal for ${sessionTitle}`} onClick={onFocus} />
          )}
        </div>
      </header>
      <h2 className="dashboard-session-box-title">
        {sessionTitleParts.name}
        {sessionTitleParts.suffix !== undefined && (
          <span className="dashboard-session-box-title-suffix"> ({sessionTitleParts.suffix})</span>
        )}
      </h2>
      {session.transcript !== undefined && <SessionTranscriptChips nowMs={nowMs} transcript={session.transcript} />}
    </article>
  )
}
