import type { OsPlatform } from '#src/shared/os-model'

export const osClientService = {
  getPlatform: (): Promise<OsPlatform> => {
    return window.usageApi.getPlatform()
  },
}
