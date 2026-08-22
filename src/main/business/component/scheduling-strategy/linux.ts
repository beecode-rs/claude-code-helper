import type {
  ISchedulingInspection,
  ISchedulingRegistrationParams,
  ISchedulingStrategy,
} from '#src/main/business/component/scheduling-strategy/scheduling-strategy'
import type { OsPlatform } from '#src/main/util/os-util'

export class SchedulingStrategyLinux implements ISchedulingStrategy {
  getSchedulingPlatform(): OsPlatform {
    return 'linux'
  }

  inspectRegistration(_params: { triggerId: string }): Promise<ISchedulingInspection> {
    return Promise.reject(new Error('OS scheduling is not implemented on Linux yet'))
  }

  removeRegistration(_params: { triggerId: string }): Promise<void> {
    return Promise.reject(new Error('OS scheduling is not implemented on Linux yet'))
  }

  upsertRegistration(_params: ISchedulingRegistrationParams): Promise<void> {
    return Promise.reject(new Error('OS scheduling is not implemented on Linux yet'))
  }
}
