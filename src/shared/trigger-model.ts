import { type OsPlatform } from '#src/shared/os-model'

export type TriggerDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export const TRIGGER_DAYS: TriggerDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

export const TRIGGER_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/

export const DEFAULT_TRIGGER_TIMEOUT_MS = 5 * 60 * 1000

export const MIN_TRIGGER_TIMEOUT_MS = 60 * 1000

export const MAX_TRIGGER_TIMEOUT_MS = 60 * 60 * 1000

export const MIN_TRIGGER_TIMEOUT_MINUTES = MIN_TRIGGER_TIMEOUT_MS / 60_000

export const MAX_TRIGGER_TIMEOUT_MINUTES = MAX_TRIGGER_TIMEOUT_MS / 60_000

export interface ITriggerConfig {
  command: string
  createdAt: number
  days: TriggerDay[]
  id: string
  isEnabled: boolean
  name: string
  times: string[]
  timeoutMs: number
}

export interface ISchedulingInfo {
  isSupported: boolean
  platform: OsPlatform
}

export interface ITriggerRegistrationHealth {
  isRegistered: boolean
  triggerId: string
}
