import { SessionsService } from '#src/main/business/service/sessions-service'
import { type OsPlatform } from '#src/main/util/os-util'

export class SessionsServiceContractHarness extends SessionsService {
  isLinuxFocusToolInstalled: boolean | undefined
  isMacOsWindowFocusStubbed = true
  linuxFocusToolInstallAttemptCount = 0
  linuxFocusToolInstallError: Error | undefined
  readonly macOsBundleActivateCalls: { bundlePath: string }[] = []
  readonly macOsBundleResolveCalls: { hopCount: number; pid: number }[] = []
  readonly macOsTabFocusCalls: { cwd: string }[] = []
  readonly macOsWindowFocusCalls: { bundlePath: string; cwd: string }[] = []
  protected readonly _focusPlatformOverride: OsPlatform | undefined
  protected readonly _macOsBundlePath: string

  constructor(params: { focusPlatform?: OsPlatform; macOsBundlePath?: string } = {}) {
    super()
    this._focusPlatformOverride = params.focusPlatform
    this._macOsBundlePath = params.macOsBundlePath ?? '/Applications/Ghostty.app'
  }

  protected override _resolveFocusPlatform(): OsPlatform {
    if (this._focusPlatformOverride === undefined) {
      return super._resolveFocusPlatform()
    }

    return this._focusPlatformOverride
  }

  protected override _activateAppBundle(params: { bundlePath: string }): Promise<void> {
    this.macOsBundleActivateCalls.push({ bundlePath: params.bundlePath })

    return Promise.resolve()
  }

  protected override _focusGhosttyTab(params: { cwd: string }): Promise<void> {
    this.macOsTabFocusCalls.push({ cwd: params.cwd })

    return Promise.resolve()
  }

  protected override _focusVsCodeWindow(params: { bundlePath: string; cwd: string }): Promise<void> {
    this.macOsWindowFocusCalls.push({ bundlePath: params.bundlePath, cwd: params.cwd })

    if (!this.isMacOsWindowFocusStubbed) {
      return super._focusVsCodeWindow(params)
    }

    return Promise.resolve()
  }

  protected override _installLinuxFocusTool(): Promise<void> {
    this.linuxFocusToolInstallAttemptCount += 1

    if (this.linuxFocusToolInstallError !== undefined) {
      return Promise.reject(this.linuxFocusToolInstallError)
    }

    return Promise.resolve()
  }

  protected override _isLinuxFocusToolInstalled(): Promise<boolean> {
    if (this.isLinuxFocusToolInstalled === undefined) {
      return super._isLinuxFocusToolInstalled()
    }

    return Promise.resolve(this.isLinuxFocusToolInstalled)
  }

  protected override _resolveAppBundlePath(params: { hopCount: number; pid: number }): Promise<string> {
    this.macOsBundleResolveCalls.push({ hopCount: params.hopCount, pid: params.pid })

    return Promise.resolve(this._macOsBundlePath)
  }
}
