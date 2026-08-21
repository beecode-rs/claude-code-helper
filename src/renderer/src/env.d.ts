/// <reference types="vite/client" />

import type { IUsageApiClient } from '#src/shared/usage-model'

declare global {
  const appVersion: string

  interface Window {
    usageApi: IUsageApiClient
  }
}

export {}
