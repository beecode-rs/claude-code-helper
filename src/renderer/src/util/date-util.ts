export const dateUtil = {
  formatClockTime: (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      second: '2-digit',
    })
  },

  formatDateTime: (timestamp: number): string => {
    const date = new Date(timestamp)
    const datePart = [
      String(date.getFullYear()),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-')
    const timePart = [
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0'),
      String(date.getSeconds()).padStart(2, '0'),
    ].join(':')

    return `${datePart} ${timePart}`
  },

  formatDuration: (durationMs: number): string => {
    const totalMinutes = Math.max(0, Math.floor(durationMs / 60_000))
    const days = Math.floor(totalMinutes / 1440)
    const hours = Math.floor((totalMinutes % 1440) / 60)
    const minutes = totalMinutes % 60

    if (days > 0) {
      return `${String(days)}d ${String(hours)}h`
    }

    if (hours === 0) {
      if (minutes === 0) {
        return 'under 1m'
      }

      return `${String(minutes)}m`
    }

    return `${String(hours)}h ${String(minutes)}m`
  },

  formatHourMinute: (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
    })
  },

  formatPreciseDuration: (durationMs: number): string => {
    const totalSeconds = Math.max(0, durationMs) / 1000
    const totalMinutes = Math.floor(totalSeconds / 60)
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    const seconds = Math.floor(totalSeconds % 60)

    if (totalSeconds < 60) {
      return `${totalSeconds.toFixed(1)}s`
    }

    if (hours === 0) {
      return `${String(minutes)}m ${String(seconds)}s`
    }

    return `${String(hours)}h ${String(minutes)}m`
  },
}
