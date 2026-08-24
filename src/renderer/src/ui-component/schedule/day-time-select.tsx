import { type ChangeEvent, type ReactElement } from 'react'

import { minutesTimeUtil } from '#src/renderer/src/util/minutes-time-util'
import { formatDayMinutes } from '#src/shared/trigger-planner-model'

const HOUR_OPTIONS = Array.from({ length: 24 }, (_unused, hour) => {
  return String(hour).padStart(2, '0')
})

const MINUTE_OPTIONS = Array.from({ length: 60 }, (_unused, minute) => {
  return String(minute).padStart(2, '0')
})

export const DayTimeSelect = (props: { onChange: (time: string) => void; time: string }): ReactElement => {
  const { onChange, time } = props

  const dayMinutes = minutesTimeUtil.resolveMinutes(time)
  const hourValue = String(Math.floor(dayMinutes / 60)).padStart(2, '0')
  const minuteValue = String(dayMinutes % 60).padStart(2, '0')

  const handleHourChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextHour = Number.parseInt(event.target.value, 10)

    onChange(formatDayMinutes(nextHour * 60 + (dayMinutes % 60)))
  }

  const handleMinuteChange = (event: ChangeEvent<HTMLSelectElement>): void => {
    const nextMinute = Number.parseInt(event.target.value, 10)

    onChange(formatDayMinutes(Math.floor(dayMinutes / 60) * 60 + nextMinute))
  }

  return (
    <>
      <select aria-label="Hour" className="settings-field-input" onChange={handleHourChange} value={hourValue}>
        {HOUR_OPTIONS.map((hourOption) => {
          return (
            <option key={hourOption} value={hourOption}>
              {hourOption}
            </option>
          )
        })}
      </select>
      <select aria-label="Minute" className="settings-field-input" onChange={handleMinuteChange} value={minuteValue}>
        {MINUTE_OPTIONS.map((minuteOption) => {
          return (
            <option key={minuteOption} value={minuteOption}>
              {minuteOption}
            </option>
          )
        })}
      </select>
    </>
  )
}
