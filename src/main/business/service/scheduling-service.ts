import type { ISchedulingStrategy } from '#src/main/business/component/scheduling-strategy/scheduling-strategy'
import type { IAppSettings } from '#src/shared/settings-model'
import type { ISchedulingInfo, ITriggerConfig, ITriggerRegistrationHealth } from '#src/shared/trigger-model'

export class SchedulingService {
  protected readonly _fingerprintsByTriggerId = new Map<string, string>()
  protected readonly _strategy: ISchedulingStrategy

  constructor(params: { strategy: ISchedulingStrategy }) {
    this._strategy = params.strategy
  }

  getSchedulingInfo(): ISchedulingInfo {
    return {
      isSupported: this._strategy.isSupported,
      platform: this._strategy.getSchedulingPlatform(),
    }
  }

  async inspectRegistrations(params: { settings: IAppSettings }): Promise<ITriggerRegistrationHealth[]> {
    if (!this._strategy.isSupported) {
      return params.settings.triggers.map((trigger) => {
        return { isRegistered: false, triggerId: trigger.id }
      })
    }

    return params.settings.triggers.reduce<Promise<ITriggerRegistrationHealth[]>>((chain, trigger) => {
      return chain.then(async (inspections) => {
        const inspection = await this._strategy.inspectRegistration({ triggerId: trigger.id })

        return [...inspections, { isRegistered: inspection.isRegistered, triggerId: trigger.id }]
      })
    }, Promise.resolve([]))
  }

  async syncRegistrations(params: { settings: IAppSettings }): Promise<void> {
    if (!this._strategy.isSupported) {
      return
    }

    const registeredIds = new Set(await this._strategy.listRegistrationIds())
    const triggerIds = new Set(
      params.settings.triggers.map((trigger) => {
        return trigger.id
      }),
    )
    const orphanedIds = [...registeredIds].filter((registeredId) => {
      return !triggerIds.has(registeredId)
    })

    await this._removeOrphanedRegistrations({ orphanedIds: [...orphanedIds] })
    await this._syncTriggerRegistrations({ registeredIds, triggers: params.settings.triggers })
  }

  protected async _removeOrphanedRegistrations(params: { orphanedIds: string[] }): Promise<void> {
    await params.orphanedIds.reduce<Promise<void>>((chain, orphanedId) => {
      return chain.then(async () => {
        await this._strategy.removeRegistration({ triggerId: orphanedId })
        this._fingerprintsByTriggerId.delete(orphanedId)
      })
    }, Promise.resolve())
  }

  protected async _syncTriggerRegistrations(params: {
    registeredIds: Set<string>
    triggers: ITriggerConfig[]
  }): Promise<void> {
    await params.triggers.reduce<Promise<void>>((chain, trigger) => {
      return chain.then(async () => {
        await this._syncTriggerRegistration({ registeredIds: params.registeredIds, trigger })
      })
    }, Promise.resolve())
  }

  protected async _syncTriggerRegistration(params: {
    registeredIds: Set<string>
    trigger: ITriggerConfig
  }): Promise<void> {
    if (!params.trigger.isEnabled) {
      await this._removeRegistrationIfPresent({
        isRegistered: params.registeredIds.has(params.trigger.id),
        triggerId: params.trigger.id,
      })

      return
    }

    const fingerprint = this._resolveRegistrationFingerprint({ trigger: params.trigger })
    const syncedFingerprint = this._fingerprintsByTriggerId.get(params.trigger.id)
    const isRegistrationCurrent = params.registeredIds.has(params.trigger.id) && syncedFingerprint === fingerprint

    if (isRegistrationCurrent) {
      return
    }

    await this._strategy.upsertRegistration({
      days: params.trigger.days,
      executablePath: process.execPath,
      times: params.trigger.times,
      triggerId: params.trigger.id,
    })
    this._fingerprintsByTriggerId.set(params.trigger.id, fingerprint)
  }

  protected async _removeRegistrationIfPresent(params: { isRegistered: boolean; triggerId: string }): Promise<void> {
    if (!params.isRegistered) {
      return
    }

    await this._strategy.removeRegistration({ triggerId: params.triggerId })
    this._fingerprintsByTriggerId.delete(params.triggerId)
  }

  protected _resolveRegistrationFingerprint(params: { trigger: ITriggerConfig }): string {
    return JSON.stringify({
      days: [...params.trigger.days].sort(),
      times: [...params.trigger.times].sort(),
    })
  }
}
