import type { OsPlatform } from '#src/main/util/os-util'

export type TriggerDay = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface ISchedulingRegistrationParams {
  days: TriggerDay[]
  executablePath: string
  times: string[]
  triggerId: string
}

export interface ISchedulingInspection {
  isRegistered: boolean
}

export interface ISchedulingStrategy {
  getSchedulingPlatform: () => OsPlatform
  inspectRegistration: (params: { triggerId: string }) => Promise<ISchedulingInspection>
  removeRegistration: (params: { triggerId: string }) => Promise<void>
  upsertRegistration: (params: ISchedulingRegistrationParams) => Promise<void>
}
