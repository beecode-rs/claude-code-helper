import { type ISessionInfo } from '#src/shared/session-model'
import { MAX_WAITING_SOUND_VOLUME_PERCENT, MIN_WAITING_SOUND_VOLUME_PERCENT } from '#src/shared/settings-model'

const BEEP_ATTACK_SECONDS = 0.01
const BEEP_DECAY_SECONDS = 0.2
const BEEP_FREQUENCY_HZ = 830
const BEEP_MAX_GAIN = 0.4
const BEEP_SILENCE_GAIN = 0.0001

let audioContext: AudioContext | undefined

export const sessionWaitingSoundUtil = {
  playWaitingBeep: (params: { volumePercent: number }): void => {
    const gain = sessionWaitingSoundUtil.resolveBeepGain({ volumePercent: params.volumePercent })

    if (gain <= 0) {
      return
    }

    audioContext = audioContext ?? new AudioContext()

    if (audioContext.state === 'suspended') {
      void audioContext.resume()
    }

    const gainNode = audioContext.createGain()
    const oscillator = audioContext.createOscillator()
    const startAtSeconds = audioContext.currentTime

    gainNode.gain.setValueAtTime(0, startAtSeconds)
    gainNode.gain.linearRampToValueAtTime(gain, startAtSeconds + BEEP_ATTACK_SECONDS)
    gainNode.gain.exponentialRampToValueAtTime(BEEP_SILENCE_GAIN, startAtSeconds + BEEP_DECAY_SECONDS)
    oscillator.frequency.value = BEEP_FREQUENCY_HZ
    oscillator.type = 'sine'
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.start(startAtSeconds)
    oscillator.stop(startAtSeconds + BEEP_DECAY_SECONDS)
  },

  resolveBeepGain: (params: { volumePercent: number }): number => {
    const clampedVolumePercent = Math.min(
      Math.max(params.volumePercent, MIN_WAITING_SOUND_VOLUME_PERCENT),
      MAX_WAITING_SOUND_VOLUME_PERCENT,
    )

    return (clampedVolumePercent / MAX_WAITING_SOUND_VOLUME_PERCENT) * BEEP_MAX_GAIN
  },

  resolveNewlyWaitingSessionIds: (params: {
    currentSessions: ISessionInfo[]
    previousSessions?: ISessionInfo[]
  }): string[] => {
    if (params.previousSessions === undefined) {
      return []
    }

    const previousWaitingSessionIds = new Set(
      params.previousSessions
        .filter((session) => {
          return session.status === 'waiting'
        })
        .map((session) => {
          return session.sessionId
        }),
    )

    return params.currentSessions
      .filter((session) => {
        return session.status === 'waiting' && !previousWaitingSessionIds.has(session.sessionId)
      })
      .map((session) => {
        return session.sessionId
      })
  },
}
