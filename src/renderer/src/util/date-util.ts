export const dateUtil = {
  formatClockTime: (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      hourCycle: 'h23',
      minute: '2-digit',
      second: '2-digit',
    })
  },

  formatCountdown: (durationMs: number): string => {
    const totalSeconds = Math.max(0, Math.ceil(durationMs / 1000))
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    if (hours > 0) {
      return `${String(hours)}h ${String(minutes)}m`
    }

    if (minutes > 0) {
      return `${String(minutes)}m ${String(seconds).padStart(2, '0')}s`
    }

    return `${String(seconds)}s`
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
}
