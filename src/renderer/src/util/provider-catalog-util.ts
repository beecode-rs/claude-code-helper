import { developmentPrefsUtil } from '#src/renderer/src/util/development-prefs-util'
import { type IProviderCatalogEntry, PROVIDER_CATALOG } from '#src/shared/provider-catalog'
import type { ProviderId } from '#src/shared/usage-model'

const DEV_ONLY_PROVIDER_IDS: ProviderId[] = ['dummy']

export const providerCatalogUtil = {
  resolveVisibleCatalogEntries: (): IProviderCatalogEntry[] => {
    if (developmentPrefsUtil.loadIsUnlocked()) {
      return PROVIDER_CATALOG
    }

    return PROVIDER_CATALOG.filter((catalogEntry) => {
      return !DEV_ONLY_PROVIDER_IDS.includes(catalogEntry.id)
    })
  },
}
