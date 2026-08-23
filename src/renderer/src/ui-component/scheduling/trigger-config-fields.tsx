import type { ReactElement } from 'react'

import {
  type ITriggerConfig,
  MAX_TRIGGER_TIMEOUT_MINUTES,
  MIN_TRIGGER_TIMEOUT_MINUTES,
  TRIGGER_DAYS,
  type TriggerDay,
} from '#src/shared/trigger-model'

const TRIGGER_DAY_LABELS: Record<TriggerDay, string> = {
  friday: 'Fri',
  monday: 'Mon',
  saturday: 'Sat',
  sunday: 'Sun',
  thursday: 'Thu',
  tuesday: 'Tue',
  wednesday: 'Wed',
}

const WEEKDAY_DAYS: TriggerDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
const WEEKEND_DAYS: TriggerDay[] = ['saturday', 'sunday']

export const TriggerConfigFields = (props: {
  config: ITriggerConfig
  onChange: (config: ITriggerConfig) => void
}): ReactElement => {
  const { config, onChange } = props

  const resolveChipClassName = (day: TriggerDay): string => {
    if (config.days.includes(day)) {
      return 'trigger-chip is-active'
    }

    return 'trigger-chip'
  }

  const handleToggleDay = (day: TriggerDay): void => {
    const selectedDays = new Set(config.days)

    if (selectedDays.has(day)) {
      selectedDays.delete(day)
    } else {
      selectedDays.add(day)
    }

    onChange({
      ...config,
      days: TRIGGER_DAYS.filter((candidateDay) => {
        return selectedDays.has(candidateDay)
      }),
    })
  }

  const handleSelectDays = (days: TriggerDay[]): void => {
    onChange({ ...config, days })
  }

  const handleTimeChange = (index: number, time: string): void => {
    onChange({
      ...config,
      times: config.times.map((currentTime, currentIndex) => {
        if (currentIndex !== index) {
          return currentTime
        }

        return time
      }),
    })
  }

  const handleTimeRemove = (index: number): void => {
    onChange({
      ...config,
      times: config.times.filter((_time, currentIndex) => {
        return currentIndex !== index
      }),
    })
  }

  const handleAddTime = (): void => {
    onChange({ ...config, times: [...config.times, '09:00'] })
  }

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
          placeholder='claude -p "What is your name?"'
          type="text"
          value={config.command}
        />
        <span className="settings-hint">Full shell command the trigger runs each time it fires.</span>
      </label>
      <div className="settings-field">
        <span className="settings-field-label">Days</span>
        <div className="trigger-card-chips">
          {TRIGGER_DAYS.map((day) => {
            return (
              <button
                className={resolveChipClassName(day)}
                key={day}
                onClick={() => {
                  handleToggleDay(day)
                }}
                type="button"
              >
                {TRIGGER_DAY_LABELS[day]}
              </button>
            )
          })}
        </div>
        <div className="trigger-quick-actions">
          <button
            className="button"
            onClick={() => {
              handleSelectDays(WEEKDAY_DAYS)
            }}
            type="button"
          >
            Weekdays
          </button>
          <button
            className="button"
            onClick={() => {
              handleSelectDays(WEEKEND_DAYS)
            }}
            type="button"
          >
            Weekend
          </button>
          <button
            className="button"
            onClick={() => {
              handleSelectDays([...TRIGGER_DAYS])
            }}
            type="button"
          >
            Every day
          </button>
        </div>
      </div>
      <div className="settings-field">
        <span className="settings-field-label">Times</span>
        {config.times.map((time, index) => {
          return (
            <div className="trigger-time-row" key={`${time}-${String(index)}`}>
              <input
                className="settings-field-input"
                onChange={(event) => {
                  handleTimeChange(index, event.target.value)
                }}
                type="time"
                value={time}
              />
              <button
                className="button"
                onClick={() => {
                  handleTimeRemove(index)
                }}
                type="button"
              >
                Remove
              </button>
            </div>
          )
        })}
        <button className="button" onClick={handleAddTime} type="button">
          Add time
        </button>
        <span className="settings-hint">Local time on the selected days, e.g. 09:00.</span>
      </div>
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
