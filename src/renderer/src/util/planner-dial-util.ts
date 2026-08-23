export const DIAL_ANGLE_RANGE_DEGREES = 270

export const DIAL_START_ANGLE_DEGREES = 135

export const plannerDialUtil = {
  _resolveClampedValue: (params: { max: number; min: number; value: number }): number => {
    return Math.min(Math.max(params.value, params.min), params.max)
  },

  resolveDialDeltaDegrees: (params: { angleDegrees: number }): number => {
    const deltaDegrees = (((params.angleDegrees - DIAL_START_ANGLE_DEGREES) % 360) + 360) % 360

    if (deltaDegrees <= DIAL_ANGLE_RANGE_DEGREES) {
      return deltaDegrees
    }

    if (deltaDegrees - DIAL_ANGLE_RANGE_DEGREES < 360 - deltaDegrees) {
      return DIAL_ANGLE_RANGE_DEGREES
    }

    return 0
  },

  resolveKeyboardValue: (params: { key: string; max: number; min: number; step: number; value: number }): number => {
    switch (params.key) {
      case 'ArrowDown':
      case 'ArrowLeft': {
        return plannerDialUtil._resolveClampedValue({
          max: params.max,
          min: params.min,
          value: params.value - params.step,
        })
      }

      case 'ArrowRight':
      case 'ArrowUp': {
        return plannerDialUtil._resolveClampedValue({
          max: params.max,
          min: params.min,
          value: params.value + params.step,
        })
      }

      case 'End': {
        return params.max
      }

      case 'Home': {
        return params.min
      }

      default: {
        return params.value
      }
    }
  },

  resolvePointerValue: (params: { dx: number; dy: number; max: number; min: number; step: number }): number => {
    const pointerAngleDegrees = (Math.atan2(params.dy, params.dx) * 180) / Math.PI
    const deltaDegrees = plannerDialUtil.resolveDialDeltaDegrees({ angleDegrees: pointerAngleDegrees })
    const valueFraction = deltaDegrees / DIAL_ANGLE_RANGE_DEGREES
    const rawValue = params.min + valueFraction * (params.max - params.min)

    return plannerDialUtil.resolveSteppedValue({ max: params.max, min: params.min, rawValue, step: params.step })
  },

  resolveSteppedValue: (params: { max: number; min: number; rawValue: number; step: number }): number => {
    const stepCount = Math.round((params.rawValue - params.min) / params.step)
    const steppedValue = params.min + stepCount * params.step

    return plannerDialUtil._resolveClampedValue({ max: params.max, min: params.min, value: steppedValue })
  },

  resolveValueAngleDegrees: (params: { max: number; min: number; value: number }): number => {
    const valueFraction = (params.value - params.min) / (params.max - params.min)

    return DIAL_START_ANGLE_DEGREES + valueFraction * DIAL_ANGLE_RANGE_DEGREES
  },
}
