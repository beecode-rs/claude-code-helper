import type { ProviderId } from '#src/shared/usage-model'

export interface IProviderCatalogEntry {
  defaultRefreshIntervalSeconds: number
  description: string
  id: ProviderId
  name: string
}

export const PROVIDER_CATALOG: IProviderCatalogEntry[] = [
  {
    defaultRefreshIntervalSeconds: 600,
    description: 'Usage limits from your Claude coding plan',
    id: 'claude',
    name: 'Claude',
  },
  {
    defaultRefreshIntervalSeconds: 300,
    description: 'Usage limits from your GLM coding plan',
    id: 'zai',
    name: 'z.ai',
  },
]
