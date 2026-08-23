import { type ITriggerConfig, TRIGGER_TIME_PATTERN } from '#src/shared/trigger-model'

export const triggerValidationUtil = {
  resolveValidationError(params: { trigger: ITriggerConfig }): string | undefined {
    if (params.trigger.command.trim() === '') {
      return 'Enter a command for this trigger to run.'
    }

    if (params.trigger.days.length === 0) {
      return 'Pick at least one day for this trigger.'
    }

    const filledTimes = params.trigger.times.filter((time) => {
      return time !== ''
    })

    if (filledTimes.length === 0) {
      return 'Add at least one time for this trigger.'
    }

    const hasInvalidTime = filledTimes.some((time) => {
      return !TRIGGER_TIME_PATTERN.test(time)
    })

    if (hasInvalidTime) {
      return 'Every time must use the HH:mm format.'
    }

    return undefined
  },
}
