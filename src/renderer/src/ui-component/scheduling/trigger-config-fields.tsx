import type { ReactElement } from 'react'

import { DayTimeScheduleFields } from '#src/renderer/src/ui-component/schedule/day-time-schedule-fields'
import {
  type ITriggerConfig,
  MAX_TRIGGER_TIMEOUT_MINUTES,
  MIN_TRIGGER_TIMEOUT_MINUTES,
} from '#src/shared/trigger-model'

export const TriggerConfigFields = (props: {
  config: ITriggerConfig
  onChange: (config: ITriggerConfig) => void
}): ReactElement => {
  const { config, onChange } = props

  return (
    <>
      <label className="settings-field">
        <span className="settings-field-label">Display name</span>
        <input
          className="settings-field-input"
          onChange={(event) => {
            onChange({ ...config, name: event.target.value })
          }}
          placeholder="Trigger"
          type="text"
          value={config.name}
        />
      </label>
      <label className="settings-field">
        <span className="settings-field-label">Command</span>
        <input
          className="settings-field-input trigger-command-input"
          onChange={(event) => {
            onChange({ ...config, command: event.target.value })
          }}
          placeholder='claude -p "Reply with only your name. One word, no explanations, no punctuation."'
          type="text"
          value={config.command}
        />
        <span className="settings-hint">Full shell command the trigger runs each time it fires.</span>
      </label>
      <DayTimeScheduleFields
        days={config.days}
        onChange={({ days, times }) => {
          onChange({ ...config, days, times })
        }}
        times={config.times}
      />
      <label className="settings-field">
        <span className="settings-field-label">Timeout (minutes)</span>
        <input
          className="settings-field-input"
          max={MAX_TRIGGER_TIMEOUT_MINUTES}
          min={MIN_TRIGGER_TIMEOUT_MINUTES}
          onChange={(event) => {
            const minutes = Number.parseInt(event.target.value, 10)

            if (!Number.isFinite(minutes)) {
              return
            }

            const clampedMinutes = Math.min(Math.max(minutes, MIN_TRIGGER_TIMEOUT_MINUTES), MAX_TRIGGER_TIMEOUT_MINUTES)

            onChange({ ...config, timeoutMs: clampedMinutes * 60_000 })
          }}
          type="number"
          value={Math.round(config.timeoutMs / 60_000)}
        />
        <span className="settings-hint">Used when the trigger command runs.</span>
      </label>
      <div className="settings-field">
        <span className="settings-field-label">Enabled</span>
        <label className="trigger-toggle">
          <input
            checked={config.isEnabled}
            onChange={(event) => {
              onChange({ ...config, isEnabled: event.target.checked })
            }}
            type="checkbox"
          />
          Register with the OS scheduler
        </label>
      </div>
    </>
  )
}
