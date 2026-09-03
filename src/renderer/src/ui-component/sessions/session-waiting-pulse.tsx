import { type ReactElement } from 'react'

export const SessionWaitingPulse = (props: { isWaiting: boolean }): ReactElement | undefined => {
  if (!props.isWaiting) {
    return undefined
  }

  return <span className="session-waiting-pulse" />
}
