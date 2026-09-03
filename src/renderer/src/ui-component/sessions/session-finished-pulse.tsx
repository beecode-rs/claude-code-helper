import { type CSSProperties, type ReactElement } from 'react'

import { sessionFinishedPulseUtil } from '#src/renderer/src/util/session-finished-pulse-util'

const resolvePulseStyle = (params: { pulseSeconds: number }): CSSProperties => {
  return { animationDuration: `${String(params.pulseSeconds)}s` }
}

export const SessionFinishedPulse = (props: {
  finishedAtMs?: number
  nowMs: number
  pulseSeconds: number
}): ReactElement | undefined => {
  if (!sessionFinishedPulseUtil.resolveIsPulsing(props)) {
    return undefined
  }

  return (
    <span
      className="session-finished-pulse"
      key={props.finishedAtMs}
      style={resolvePulseStyle({ pulseSeconds: props.pulseSeconds })}
    />
  )
}
