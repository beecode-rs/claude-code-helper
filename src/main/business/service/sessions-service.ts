import { execFile } from 'node:child_process'
import { homedir } from 'node:os'
import { basename } from 'node:path'
import { promisify } from 'node:util'

import { errorUtil } from '#src/main/util/error-util'
import { type OsPlatform, osUtil } from '#src/main/util/os-util'
import { sessionsUtil } from '#src/main/util/sessions-util'
import { type ISessionSnapshot } from '#src/shared/session-model'

const execFileAsync = promisify(execFile)

const SESSIONS_QUERY_TIMEOUT_MS = 10_000

const APP_BUNDLE_PATTERN = /^(?:-)?(.*\/[^/]+\.app)\//

const GHOSTTY_BUNDLE_ID = 'com.mitchellh.ghostty'

const GHOSTTY_TAB_FOCUS_SCRIPT = `on run argv
  set sessionCwd to item 1 of argv
  tell application id "${GHOSTTY_BUNDLE_ID}"
    repeat with ghosttyWindow in windows
      repeat with ghosttyTab in tabs of ghosttyWindow
        repeat with ghosttyTerminal in terminals of ghosttyTab
          set terminalCwd to working directory of ghosttyTerminal
          if terminalCwd is sessionCwd or terminalCwd is sessionCwd & "/" then
            select tab ghosttyTab
            focus ghosttyTerminal
            activate window ghosttyWindow
            return
          end if
        end repeat
      end repeat
    end repeat
  end tell
end run`

const MAX_ANCESTOR_HOPS = 12

const OPEN_APP_TIMEOUT_MS = 5_000

const OSASCRIPT_TIMEOUT_MS = 5_000

const PROCESS_LINE_PATTERN = /^\s*(\d+)\s+(.+)$/

const PS_QUERY_TIMEOUT_MS = 5_000

const XDOTOOL_TIMEOUT_MS = 5_000

interface IProcessEntry {
  comm: string
  ppid: number
}

export class SessionsService {
  protected _inFlightSnapshot: Promise<ISessionSnapshot> | undefined

  async listSessions(): Promise<ISessionSnapshot> {
    if (this._inFlightSnapshot !== undefined) {
      return this._inFlightSnapshot
    }

    return this._startSnapshotFetch()
  }

  async focusSession(params: { cwd: string; pid: number }): Promise<void> {
    await this._focusSessionForPlatform({
      cwd: params.cwd,
      pid: params.pid,
      platform: this._resolveFocusPlatform(),
    })
  }

  protected _resolveFocusPlatform(): OsPlatform {
    return osUtil.resolvePlatform()
  }

  protected async _focusSessionForPlatform(params: { cwd: string; pid: number; platform: OsPlatform }): Promise<void> {
    switch (params.platform) {
      case 'linux': {
        return this._focusLinuxSession({ pid: params.pid })
      }

      case 'macos': {
        return this._focusMacOsSession({ cwd: params.cwd, pid: params.pid })
      }

      case 'windows': {
        throw new Error('focusing a session terminal is only supported on macOS and Linux')
      }

      default: {
        throw new Error('focusing a session terminal is not supported on the resolved platform')
      }
    }
  }

  protected async _focusMacOsSession(params: { cwd: string; pid: number }): Promise<void> {
    const bundlePath = await this._resolveAppBundlePath({ hopCount: 0, pid: params.pid })

    await this._activateAppBundle({ bundlePath })

    if (params.cwd !== '' && this._isGhosttyBundle({ bundlePath })) {
      await this._focusGhosttyTab({ cwd: params.cwd })
    }
  }

  protected async _focusLinuxSession(params: { pid: number }): Promise<void> {
    const windowId = await this._resolveLinuxWindowId({ hopCount: 0, pid: params.pid })

    if (windowId === undefined) {
      throw new Error(
        'focusing a session terminal on Linux requires an X11 session with xdotool; Wayland is not supported yet',
      )
    }

    await this._activateLinuxWindow({ windowId })
  }

  protected async _resolveLinuxWindowId(params: { hopCount: number; pid: number }): Promise<string | undefined> {
    if (params.hopCount >= MAX_ANCESTOR_HOPS) {
      return undefined
    }

    const windowId = await this._searchLinuxWindowIdByPid({ pid: params.pid })

    if (windowId !== undefined) {
      return windowId
    }

    if (params.pid <= 1) {
      return undefined
    }

    const entry = await this._resolveProcessEntry({ pid: params.pid })

    if (entry === undefined) {
      return undefined
    }

    return this._resolveLinuxWindowId({ hopCount: params.hopCount + 1, pid: entry.ppid })
  }

  protected async _searchLinuxWindowIdByPid(params: { pid: number }): Promise<string | undefined> {
    try {
      const { stdout } = await execFileAsync('xdotool', ['search', '--pid', String(params.pid)], {
        timeout: XDOTOOL_TIMEOUT_MS,
      })

      return this._parseFirstWindowId({ stdout })
    } catch (error) {
      if (this._isXdotoolMissing({ error })) {
        throw new Error(
          'focusing a session terminal on Linux requires the xdotool tool; install it via the system package manager',
        )
      }

      return undefined
    }
  }

  protected _parseFirstWindowId(params: { stdout: string }): string | undefined {
    const firstLine = params.stdout.trim().split('\n')[0]

    if (firstLine === undefined || firstLine === '') {
      return undefined
    }

    return firstLine
  }

  protected async _activateLinuxWindow(params: { windowId: string }): Promise<void> {
    try {
      await execFileAsync('xdotool', ['windowactivate', '--sync', params.windowId], {
        timeout: XDOTOOL_TIMEOUT_MS,
      })
    } catch (error) {
      throw new Error(`activating window ${params.windowId} failed: ${errorUtil.resolveMessage(error)}`)
    }
  }

  protected _isXdotoolMissing(params: { error: unknown }): boolean {
    return (params.error as { code?: unknown }).code === 'ENOENT'
  }

  protected _startSnapshotFetch(): Promise<ISessionSnapshot> {
    const trackedPromise = this._fetchSnapshot().finally(() => {
      this._inFlightSnapshot = undefined
    })

    this._inFlightSnapshot = trackedPromise

    return trackedPromise
  }

  protected async _fetchSnapshot(): Promise<ISessionSnapshot> {
    const stdout = await this._runAgentsQuery()

    return {
      fetchedAt: Date.now(),
      sessions: sessionsUtil.sortSessions(sessionsUtil.parseSessionEntries({ stdout })),
      unreachableHosts: [],
    }
  }

  protected async _runAgentsQuery(): Promise<string> {
    try {
      const { stdout } = await execFileAsync('claude', ['agents', '--json'], {
        env: this._resolveQueryEnv(),
        timeout: SESSIONS_QUERY_TIMEOUT_MS,
      })

      return stdout
    } catch (error) {
      throw new Error(`running 'claude agents --json' failed: ${this._resolveQueryErrorMessage(error)}`)
    }
  }

  protected _resolveQueryEnv(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env }

    env.PATH = `${homedir()}/.local/bin:${process.env.PATH ?? ''}`

    return env
  }

  protected _resolveQueryErrorMessage(error: unknown): string {
    const stderr = (error as { stderr?: unknown }).stderr

    if (typeof stderr === 'string' && stderr.trim() !== '') {
      return stderr.trim()
    }

    return errorUtil.resolveMessage(error)
  }

  protected async _resolveAppBundlePath(params: { hopCount: number; pid: number }): Promise<string> {
    if (params.hopCount >= MAX_ANCESTOR_HOPS) {
      throw new Error(
        `could not find an application bundle for the session process; the ancestor walk exceeded ${String(MAX_ANCESTOR_HOPS)} hops`,
      )
    }

    const entry = await this._resolveProcessEntry({ pid: params.pid })

    if (entry === undefined) {
      throw new Error(`could not find process ${String(params.pid)}; the session may have ended`)
    }

    const bundlePath = this._resolveAppBundleFromComm({ comm: entry.comm })

    if (bundlePath !== undefined) {
      return bundlePath
    }

    if (params.pid <= 1) {
      throw new Error(
        'could not find an application bundle for the session process; it may not belong to a terminal app',
      )
    }

    return this._resolveAppBundlePath({ hopCount: params.hopCount + 1, pid: entry.ppid })
  }

  protected async _resolveProcessEntry(params: { pid: number }): Promise<IProcessEntry | undefined> {
    try {
      const { stdout } = await execFileAsync('ps', ['-o', 'ppid=,comm=', '-p', String(params.pid)], {
        timeout: PS_QUERY_TIMEOUT_MS,
      })

      return this._parseProcessLine({ line: stdout.trim() })
    } catch {
      return undefined
    }
  }

  protected _parseProcessLine(params: { line: string }): IProcessEntry | undefined {
    const match = PROCESS_LINE_PATTERN.exec(params.line)

    if (match === null) {
      return undefined
    }

    const comm = match[2]

    if (comm === undefined) {
      return undefined
    }

    return { comm, ppid: Number(match[1]) }
  }

  protected _resolveAppBundleFromComm(params: { comm: string }): string | undefined {
    const match = APP_BUNDLE_PATTERN.exec(params.comm)

    if (match === null) {
      return undefined
    }

    return match[1]
  }

  protected async _activateAppBundle(params: { bundlePath: string }): Promise<void> {
    try {
      await execFileAsync('open', ['-a', params.bundlePath], { timeout: OPEN_APP_TIMEOUT_MS })
    } catch (error) {
      throw new Error(`activating '${params.bundlePath}' failed: ${errorUtil.resolveMessage(error)}`)
    }
  }

  protected _isGhosttyBundle(params: { bundlePath: string }): boolean {
    return basename(params.bundlePath) === 'Ghostty.app'
  }

  protected async _focusGhosttyTab(params: { cwd: string }): Promise<void> {
    try {
      await execFileAsync('osascript', ['-e', GHOSTTY_TAB_FOCUS_SCRIPT, '--', params.cwd], {
        timeout: OSASCRIPT_TIMEOUT_MS,
      })
    } catch (error) {
      if (this._isAutomationDenied({ error })) {
        throw new Error(
          'to focus the exact Ghostty tab, allow this app to control Ghostty in System Settings > Privacy & Security > Automation',
        )
      }

      throw new Error(`focusing the Ghostty tab failed: ${this._resolveQueryErrorMessage(error)}`)
    }
  }

  protected _isAutomationDenied(params: { error: unknown }): boolean {
    const message = this._resolveQueryErrorMessage(params.error)

    return message.includes('Not authorized') || message.includes('-1743')
  }
}
