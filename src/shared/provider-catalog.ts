import type { ProviderId } from '#src/shared/usage-model'

export interface IProviderCatalogEntry {
  description: string
  id: ProviderId
  name: string
}

export const PROVIDER_CATALOG: IProviderCatalogEntry[] = [
  {
    description: 'Usage limits from your Claude coding plan',
    id: 'claude',
    name: 'Claude',
  },
  {
    description: 'Usage limits from your GLM coding plan',
    id: 'zai',
    name: 'z.ai',
  },
]
