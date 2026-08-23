import type { ReactElement } from 'react'

const resolveTitle = (isEnabled: boolean): string => {
  if (isEnabled) {
    return 'Sessions auto-refresh is on'
  }

  return 'Sessions auto-refresh is paused'
}

export const SessionsAutoRefreshToggle = (props: {
  isEnabled: boolean
  onToggle: (isEnabled: boolean) => void
}): ReactElement => {
  const { isEnabled, onToggle } = props

  return (
    <label className="sessions-switch" title={resolveTitle(isEnabled)}>
      <input
        aria-label="Toggle sessions auto-refresh"
        checked={isEnabled}
        onChange={(event) => {
          onToggle(event.target.checked)
        }}
        type="checkbox"
      />
      <span className="sessions-switch-track">
        <span className="sessions-switch-knob" />
      </span>
      <span className="sessions-switch-label">Auto-refresh</span>
    </label>
  )
}
