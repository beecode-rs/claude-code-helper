import { type IUsageProvider } from '#src/main/business/service/usage-provider/usage-provider'
import { type IUsageWindow, type ProviderId } from '#src/shared/usage-model'

export class UsageProviderDummy implements IUsageProvider {
  getProviderId(): ProviderId {
    return 'dummy'
  }

  fetchUsage(_params: { accessToken: string }): Promise<IUsageWindow[]> {
    return Promise.resolve([])
  }
}
