import type { IProviderUsage, ProviderId } from '#src/shared/usage-model'

export interface IUsageProvider {
  fetchUsage: (params: { accessToken: string }) => Promise<IProviderUsage>
  getProviderId: () => ProviderId
  getProviderName: () => string
}
