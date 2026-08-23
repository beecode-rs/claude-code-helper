import type { IAppSettings } from '#src/shared/settings-model'
import type { ISchedulingInfo, ITriggerRegistrationHealth } from '#src/shared/trigger-model'

export const schedulingClientService = {
  getSchedulingInfo: (): Promise<ISchedulingInfo> => {
    return window.usageApi.getSchedulingInfo()
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
