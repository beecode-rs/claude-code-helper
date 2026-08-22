import { SchedulingStrategyLinux } from '#src/main/business/component/scheduling-strategy/linux'
import { SchedulingStrategyMacLaunchd } from '#src/main/business/component/scheduling-strategy/mac-launchd'
import { type ISchedulingStrategy } from '#src/main/business/component/scheduling-strategy/scheduling-strategy'
import { SchedulingStrategyWindows } from '#src/main/business/component/scheduling-strategy/windows'
import { type OsPlatform, osUtil } from '#src/main/util/os-util'

export class SchedulingStrategyFactory {
  resolve(params: { platform?: OsPlatform } = {}): ISchedulingStrategy {
    const platform = params.platform ?? osUtil.resolvePlatform()

    return this._resolveForPlatform({ platform })
  }

  protected _resolveForPlatform(params: { platform: OsPlatform }): ISchedulingStrategy {
    switch (params.platform) {
      case 'linux': {
        return new SchedulingStrategyLinux()
      }

      case 'macos': {
        return new SchedulingStrategyMacLaunchd()
      }

      case 'windows': {
        return new SchedulingStrategyWindows()
      }

      default: {
        throw new Error('Scheduling is not supported on the resolved platform')
      }
    }
  }
}
