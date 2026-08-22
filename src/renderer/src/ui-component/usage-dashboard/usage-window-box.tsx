import { type ReactElement, useEffect, useState } from 'react'

import { UsageBar } from '#src/renderer/src/ui-component/usage-dashboard/usage-bar'
import { usagePaceUtil } from '#src/renderer/src/util/usage-pace-util'
import { usageResetUtil } from '#src/renderer/src/util/usage-reset-util'

const TICK_INTERVAL_MS = 30_000

export const UsageWindowBox = (props: {
  resetAt?: number
  title: string
  usedPercent: number
  windowMs: number
}): ReactElement => {
  const { resetAt, title, usedPercent, windowMs } = props
  const [now, setNow] = useState(() => {
    return Date.now()
  })

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(Date.now())
    }, TICK_INTERVAL_MS)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  const remainingMs = usageResetUtil.resolveRemainingMs({ now, resetAt })
  const elapsedPercent = usageResetUtil.resolveElapsedPercent({ remainingMs, windowMs })
  const paceFillColor = usagePaceUtil.resolvePaceColor({ now, resetAt, usedPercent, windowMs })

  return (
    <div className="usage-window-box">
      <span className="usage-window-box-title">{title}</span>
      <UsageBar ariaLabel={`${title} usage`} fillColor={paceFillColor} label="Usage" percent={usedPercent} />
      {resetAt !== undefined && (
        <UsageBar
          ariaLabel={`time until ${title} reset`}
          fillColor={paceFillColor}
          label="Reset"
          percent={elapsedPercent}
          valueText={usageResetUtil.resolveRemainingText({ remainingMs })}
        />
      )}
    </div>
  )
}
