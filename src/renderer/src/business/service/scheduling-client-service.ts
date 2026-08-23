import type { IAppSettings } from '#src/shared/settings-model'
import type { ISchedulingInfo, ITriggerRegistrationHealth, ITriggerRunLogEntry } from '#src/shared/trigger-model'

export const schedulingClientService = {
  clearTriggerRunLogs: (params: { triggerId: string }): Promise<void> => {
    return window.usageApi.clearTriggerRunLogs({
      triggerId: params.triggerId,
    })
  },
  getSchedulingInfo: (): Promise<ISchedulingInfo> => {
    return window.usageApi.getSchedulingInfo()
  },
  getTriggerRunLogs: (params: { triggerId: string }): Promise<ITriggerRunLogEntry[]> => {
    return window.usageApi.getTriggerRunLogs({
      triggerId: params.triggerId,
    })
  },
  inspectTriggerRegistrations: (): Promise<ITriggerRegistrationHealth[]> => {
    return window.usageApi.inspectTriggerRegistrations()
  },
  setTriggerEnabled: (params: { isEnabled: boolean; triggerId: string }): Promise<IAppSettings> => {
    return window.usageApi.setTriggerEnabled({
      isEnabled: params.isEnabled,
      triggerId: params.triggerId,
    })
  },
}
