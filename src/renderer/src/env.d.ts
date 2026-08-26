/// <reference types="vite/client" />

import type { IUsageApiClient } from '#src/shared/usage-model'

declare global {
  interface Window {
    usageApi: IUsageApiClient
  }
}

export {}
