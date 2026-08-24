import type { ReactElement } from 'react'

import '#src/renderer/src/ui-component/schedule/day-time-schedule-fields.css'
import { TRIGGER_DAYS, type TriggerDay } from '#src/shared/trigger-model'

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

export const DayTimeScheduleFields = (props: {
  days: TriggerDay[]
  onChange: (schedule: { days: TriggerDay[]; times: string[] }) => void
  times: string[]
}): ReactElement => {
  const { days, onChange, times } = props

  const resolveChipClassName = (day: TriggerDay): string => {
    if (days.includes(day)) {
      return 'trigger-chip is-active'
    }

    return 'trigger-chip'
  }

  const handleToggleDay = (day: TriggerDay): void => {
    const selectedDays = new Set(days)

    if (selectedDays.has(day)) {
      selectedDays.delete(day)
    } else {
      selectedDays.add(day)
    }

    onChange({
      days: TRIGGER_DAYS.filter((candidateDay) => {
        return selectedDays.has(candidateDay)
      }),
      times,
    })
  }

  const handleSelectDays = (selectedDays: TriggerDay[]): void => {
    onChange({ days: selectedDays, times })
  }

  const handleTimeChange = (index: number, time: string): void => {
    onChange({
      days,
      times: times.map((currentTime, currentIndex) => {
        if (currentIndex !== index) {
          return currentTime
        }

        return time
      }),
    })
  }

  const handleTimeRemove = (index: number): void => {
    onChange({
      days,
      times: times.filter((_time, currentIndex) => {
        return currentIndex !== index
      }),
    })
  }

  const handleAddTime = (): void => {
    onChange({ days, times: [...times, '09:00'] })
  }

  return (
    <>
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
        {times.map((time, index) => {
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
    </>
  )
}
