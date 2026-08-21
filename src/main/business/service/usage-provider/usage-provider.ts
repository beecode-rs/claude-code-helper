import type { IUsageWindow, ProviderId } from '#src/shared/usage-model'

export interface IUsageProvider {
  fetchUsage: (params: { accessToken: string }) => Promise<IUsageWindow[]>
  getProviderId: () => ProviderId
}
