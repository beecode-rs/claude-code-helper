import type { IUpdateStatus, UpdateStatusListener } from '#src/shared/update-model'

export const updateClientService = {
  getStatus: (): Promise<IUpdateStatus> => {
    return window.usageApi.getUpdateStatus()
  },
  openRelease: (): void => {
    window.usageApi.openRelease()
  },
  subscribeToUpdateStatus: (params: { onUpdate: UpdateStatusListener }): (() => void) => {
    return window.usageApi.onUpdateStatus(params.onUpdate)
  },
}
