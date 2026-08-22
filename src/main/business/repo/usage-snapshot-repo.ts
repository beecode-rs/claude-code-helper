import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { objectUtil } from '#src/main/util/object-util'
import { PROVIDER_CATALOG } from '#src/shared/provider-catalog'
import { type IProviderSnapshot, type IUsageWindow, type ProviderId, UsageStatus } from '#src/shared/usage-model'

export class UsageSnapshotRepo {
  protected readonly _snapshotFilePath: string

  constructor(params: { snapshotFilePath: string }) {
    this._snapshotFilePath = params.snapshotFilePath
  }

  async load(): Promise<Record<string, IProviderSnapshot>> {
    const fileContent = await this._readFileContent()

    if (fileContent === undefined) {
      return {}
    }

    return this._sanitizeSnapshots({ rawSnapshots: this._parseJsonContent({ content: fileContent }) })
  }

  async save(params: { snapshotsByTrackerId: Record<string, IProviderSnapshot> }): Promise<void> {
    await mkdir(dirname(this._snapshotFilePath), { recursive: true })
    await writeFile(this._snapshotFilePath, `${JSON.stringify(params.snapshotsByTrackerId, null, 2)}\n`, 'utf8')
  }

  protected async _readFileContent(): Promise<string | undefined> {
    try {
      return await readFile(this._snapshotFilePath, 'utf8')
    } catch (error) {
      if (this._isNotFoundError(error)) {
        return undefined
      }

      throw error
    }
  }

  protected _isNotFoundError(error: unknown): boolean {
    const errnoException = error as NodeJS.ErrnoException

    return errnoException.code === 'ENOENT'
  }

  protected _parseJsonContent(params: { content: string }): unknown {
    try {
      return JSON.parse(params.content)
    } catch {
      return undefined
    }
  }

  protected _sanitizeSnapshots(params: { rawSnapshots: unknown }): Record<string, IProviderSnapshot> {
    const rawRecord = objectUtil.asRecord(params.rawSnapshots)

    if (rawRecord === undefined) {
      return {}
    }

    return Object.values(rawRecord).reduce<Record<string, IProviderSnapshot>>((snapshotsByTrackerId, rawSnapshot) => {
      const snapshot = this._sanitizeSnapshot({ rawSnapshot })

      if (snapshot !== undefined) {
        snapshotsByTrackerId[snapshot.trackerId] = snapshot
      }

      return snapshotsByTrackerId
    }, {})
  }

  protected _sanitizeSnapshot(params: { rawSnapshot: unknown }): IProviderSnapshot | undefined {
    const rawRecord = objectUtil.asRecord(params.rawSnapshot)

    if (rawRecord === undefined) {
      return undefined
    }

    const trackerId = rawRecord['trackerId']

    if (typeof trackerId !== 'string' || trackerId === '') {
      return undefined
    }

    const providerId = this._sanitizeProviderId({ value: rawRecord['providerId'] })

    if (providerId === undefined) {
      return undefined
    }

    const fetchedAt = rawRecord['fetchedAt']

    if (typeof fetchedAt !== 'number' || !Number.isFinite(fetchedAt)) {
      return undefined
    }

    const usage = this._sanitizeUsageWindows({ rawUsage: rawRecord['usage'] })

    if (usage.length === 0) {
      return undefined
    }

    return {
      fetchedAt,
      providerId,
      status: UsageStatus.OK,
      trackerId,
      trackerName: this._sanitizeTrackerName({ providerId, value: rawRecord['trackerName'] }),
      usage,
    }
  }

  protected _sanitizeProviderId(params: { value: unknown }): ProviderId | undefined {
    const catalogEntry = PROVIDER_CATALOG.find((entry) => {
      return entry.id === params.value
    })

    if (catalogEntry === undefined) {
      return undefined
    }

    return catalogEntry.id
  }

  protected _sanitizeTrackerName(params: { providerId: ProviderId; value: unknown }): string {
    if (typeof params.value === 'string' && params.value !== '') {
      return params.value
    }

    const catalogEntry = PROVIDER_CATALOG.find((entry) => {
      return entry.id === params.providerId
    })

    if (catalogEntry === undefined) {
      return params.providerId
    }

    return catalogEntry.name
  }

  protected _sanitizeUsageWindows(params: { rawUsage: unknown }): IUsageWindow[] {
    if (!Array.isArray(params.rawUsage)) {
      return []
    }

    return params.rawUsage
      .map((rawWindow) => {
        return this._sanitizeUsageWindow({ rawWindow })
      })
      .filter((usageWindow): usageWindow is IUsageWindow => {
        return usageWindow !== undefined
      })
  }

  protected _sanitizeUsageWindow(params: { rawWindow: unknown }): IUsageWindow | undefined {
    const rawRecord = objectUtil.asRecord(params.rawWindow)

    if (rawRecord === undefined) {
      return undefined
    }

    const label = rawRecord['label']

    if (typeof label !== 'string' || label === '') {
      return undefined
    }

    const usedPercent = rawRecord['usedPercent']

    if (typeof usedPercent !== 'number' || !Number.isFinite(usedPercent)) {
      return undefined
    }

    return {
      label,
      resetAt: this._sanitizeOptionalNumber({ value: rawRecord['resetAt'] }),
      totalAmount: this._sanitizeOptionalNumber({ value: rawRecord['totalAmount'] }),
      usedAmount: this._sanitizeOptionalNumber({ value: rawRecord['usedAmount'] }),
      usedPercent,
      windowMs: this._sanitizeOptionalNumber({ value: rawRecord['windowMs'] }),
    }
  }

  protected _sanitizeOptionalNumber(params: { value: unknown }): number | undefined {
    if (typeof params.value !== 'number' || !Number.isFinite(params.value)) {
      return undefined
    }

    return params.value
  }
}
