// Supplements: ./sessions-service.contract.yaml
// Covers what contract.yaml cannot express:
// - async rejections of the focus path: the windows platform dispatch error and the Linux
//   window-not-found, Wayland and xdotool-install errors (the contract runner's error
//   strategy catches synchronous throws only)
// - the real xdotool/ps child-process choreography of the Linux ancestor walk via stub
//   binaries prepended to PATH, including the exact windowactivate invocation
// - the real osascript child-process choreography of the macos VS Code window focus via a
//   stub binary prepended to PATH, including the exact bundle-path and window-index argv
// - the macos platform routing with the macOS helpers stubbed on the harness (open and
//   osascript never run)
// - the focus-support flow: the once-per-run xdotool presence check, the missing-tool
//   status, and the install-then-refresh path (pkexec never runs; the harness stubs it)

import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { SessionsServiceContractHarness } from '#src/main/business/service/_sessions-service-contract-harness'

const fakeXdotoolScript = `#!/bin/sh
if [ -n "$USAGE_PULSE_XDOTOOL_ARGS_LOG" ]; then
  IFS='|'
  printf '%s\\n' "$*" >> "$USAGE_PULSE_XDOTOOL_ARGS_LOG"
fi
case "$1" in
  search)
    search_pid=
    is_onlyvisible=false
    previous_arg=
    for arg in "$@"; do
      if [ "$previous_arg" = "--pid" ]; then
        search_pid="$arg"
      fi
      if [ "$arg" = "--onlyvisible" ]; then
        is_onlyvisible=true
      fi
      previous_arg="$arg"
    done
    if [ -n "$USAGE_PULSE_XDOTOOL_WINDOW_PID" ] && [ "$search_pid" = "$USAGE_PULSE_XDOTOOL_WINDOW_PID" ]; then
      if [ "$is_onlyvisible" = true ] && [ "$USAGE_PULSE_XDOTOOL_WINDOW_HIDDEN" = "true" ]; then
        exit 1
      fi
      printf '%s\\n' "$USAGE_PULSE_XDOTOOL_WINDOW_ID"
      exit 0
    fi
    exit 1
    ;;
  *)
    exit 0
    ;;
esac
`

const fakePsScript = `#!/bin/sh
pid="$4"
if [ -n "$USAGE_PULSE_PS_PPID_BY_PID" ]; then
  for pair in $(printf '%s' "$USAGE_PULSE_PS_PPID_BY_PID" | tr ',' ' '); do
    case "$pair" in
      "$pid="*)
        printf '%s /usr/bin/usage-pulse-stub\\n' "\${pair#*=}"
        exit 0
        ;;
    esac
  done
fi
if [ -n "$USAGE_PULSE_PS_DECREMENT_PPID" ]; then
  printf '%s /usr/bin/usage-pulse-stub\\n' "$((pid - 1))"
  exit 0
fi
exit 1
`

const fakeOsascriptScript = `#!/bin/sh
script_arg="$2"
if [ -n "$USAGE_PULSE_OSASCRIPT_ARGS_LOG" ]; then
  shift 2
  IFS='|'
  printf '%s\\n' "$*" >> "$USAGE_PULSE_OSASCRIPT_ARGS_LOG"
fi
case "$script_arg" in
  *"name of every window"*)
    printf '%s\\n' "$USAGE_PULSE_OSASCRIPT_WINDOW_TITLES"
    ;;
esac
exit 0
`

const linuxWindowNotFoundMessage =
  'could not find an X11 window for the session terminal; it may run through a remote VS Code server or tunnel'

const linuxWaylandNotSupportedMessage =
  'focusing a session terminal on Linux is not supported on Wayland yet; the session has no X11 window'

const focusShimEnvKeys = [
  'USAGE_PULSE_PS_DECREMENT_PPID',
  'USAGE_PULSE_PS_PPID_BY_PID',
  'USAGE_PULSE_XDOTOOL_ARGS_LOG',
  'USAGE_PULSE_XDOTOOL_WINDOW_HIDDEN',
  'USAGE_PULSE_XDOTOOL_WINDOW_ID',
  'USAGE_PULSE_XDOTOOL_WINDOW_PID',
] as const

const restoreEnvValue = (params: { key: string; value: string | undefined }) => {
  if (params.value === undefined) {
    delete process.env[params.key]
    return
  }

  process.env[params.key] = params.value
}

const forceSessionType = (params: { sessionType: 'wayland' | 'x11' }) => {
  const originalSessionType = process.env.XDG_SESSION_TYPE
  const originalWaylandDisplay = process.env.WAYLAND_DISPLAY

  process.env.XDG_SESSION_TYPE = params.sessionType

  if (params.sessionType === 'wayland') {
    process.env.WAYLAND_DISPLAY = 'wayland-0'
  } else {
    delete process.env.WAYLAND_DISPLAY
  }

  return {
    restoreSessionEnv: () => {
      restoreEnvValue({ key: 'XDG_SESSION_TYPE', value: originalSessionType })
      restoreEnvValue({ key: 'WAYLAND_DISPLAY', value: originalWaylandDisplay })
    },
  }
}

const installLinuxFocusShims = async () => {
  const binDir = await mkdtemp(join(tmpdir(), 'usage-pulse-focus-bin-'))
  const argsLogPath = join(binDir, 'xdotool-args.log')
  const originalPath = process.env.PATH
  const originalValues = focusShimEnvKeys.reduce<Record<string, string | undefined>>((acc, key) => {
    return { ...acc, [key]: process.env[key] }
  }, {})

  await writeFile(join(binDir, 'xdotool'), fakeXdotoolScript, 'utf8')
  await writeFile(join(binDir, 'ps'), fakePsScript, 'utf8')
  await chmod(join(binDir, 'xdotool'), 0o755)
  await chmod(join(binDir, 'ps'), 0o755)
  process.env.PATH = `${binDir}${delimiter}${originalPath}`
  process.env.USAGE_PULSE_XDOTOOL_ARGS_LOG = argsLogPath

  return {
    argsLogPath,
    restoreEnvironment: async () => {
      focusShimEnvKeys.forEach((key) => {
        restoreEnvValue({ key, value: originalValues[key] })
      })
      process.env.PATH = originalPath
      await rm(binDir, { force: true, recursive: true })
    },
    setPsDecrementMode: () => {
      process.env.USAGE_PULSE_PS_DECREMENT_PPID = 'true'
    },
    setPsPpidByPid: (params: { ppidByPid: Record<string, string> }) => {
      process.env.USAGE_PULSE_PS_PPID_BY_PID = Object.entries(params.ppidByPid)
        .map(([pid, ppid]) => {
          return `${pid}=${ppid}`
        })
        .join(',')
    },
    setWindowForPid: (params: { pid: string; windowId: string }) => {
      process.env.USAGE_PULSE_XDOTOOL_WINDOW_PID = params.pid
      process.env.USAGE_PULSE_XDOTOOL_WINDOW_ID = params.windowId
    },
    setWindowHidden: () => {
      process.env.USAGE_PULSE_XDOTOOL_WINDOW_HIDDEN = 'true'
    },
  }
}

const installBinarylessPath = async () => {
  const binDir = await mkdtemp(join(tmpdir(), 'usage-pulse-focus-absent-'))
  const originalPath = process.env.PATH

  process.env.PATH = binDir

  return {
    restoreEnvironment: async () => {
      process.env.PATH = originalPath
      await rm(binDir, { force: true, recursive: true })
    },
  }
}

const installOsascriptShim = async () => {
  const binDir = await mkdtemp(join(tmpdir(), 'usage-pulse-osascript-bin-'))
  const argsLogPath = join(binDir, 'osascript-args.log')
  const originalPath = process.env.PATH
  const originalArgsLog = process.env.USAGE_PULSE_OSASCRIPT_ARGS_LOG
  const originalWindowTitles = process.env.USAGE_PULSE_OSASCRIPT_WINDOW_TITLES

  await writeFile(join(binDir, 'osascript'), fakeOsascriptScript, 'utf8')
  await chmod(join(binDir, 'osascript'), 0o755)
  process.env.PATH = `${binDir}${delimiter}${originalPath}`
  process.env.USAGE_PULSE_OSASCRIPT_ARGS_LOG = argsLogPath
  process.env.USAGE_PULSE_OSASCRIPT_WINDOW_TITLES = ''

  return {
    argsLogPath,
    restoreEnvironment: async () => {
      restoreEnvValue({ key: 'USAGE_PULSE_OSASCRIPT_ARGS_LOG', value: originalArgsLog })
      restoreEnvValue({ key: 'USAGE_PULSE_OSASCRIPT_WINDOW_TITLES', value: originalWindowTitles })
      process.env.PATH = originalPath
      await rm(binDir, { force: true, recursive: true })
    },
    setWindowTitles: (params: { windowTitles: string }) => {
      process.env.USAGE_PULSE_OSASCRIPT_WINDOW_TITLES = params.windowTitles
    },
  }
}

const readXdotoolInvocations = async (params: { argsLogPath: string }): Promise<string[]> => {
  return (await readFile(params.argsLogPath, 'utf8')).trim().split('\n')
}

const readOsascriptInvocations = async (params: { argsLogPath: string }): Promise<string[]> => {
  const logContent = await readFile(params.argsLogPath, 'utf8').catch(() => {
    return ''
  })

  return logContent.trim() === '' ? [] : logContent.trim().split('\n')
}

describe.skipIf(process.platform === 'win32')('SessionsService [contract supplement]', () => {
  it('activates the first ancestor window found by the Linux walk', async () => {
    const shim = await installLinuxFocusShims()

    try {
      shim.setPsPpidByPid({ ppidByPid: { '4242': '777' } })
      shim.setWindowForPid({ pid: '777', windowId: '123456' })
      const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })
      await service.focusSession({ cwd: '/home/user/project', pid: 4242 })
      const invocations = await readXdotoolInvocations({ argsLogPath: shim.argsLogPath })

      expect(invocations).toEqual([
        'search|--onlyvisible|--pid|4242',
        'search|--pid|4242',
        'search|--onlyvisible|--pid|777',
        'windowactivate|123456',
      ])
    } finally {
      await shim.restoreEnvironment()
    }
  })

  it('falls back to the unfiltered search when the window is off the current workspace', async () => {
    const shim = await installLinuxFocusShims()

    try {
      shim.setPsPpidByPid({ ppidByPid: { '4242': '777' } })
      shim.setWindowForPid({ pid: '777', windowId: '123456' })
      shim.setWindowHidden()
      const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })
      await service.focusSession({ cwd: '/home/user/project', pid: 4242 })
      const invocations = await readXdotoolInvocations({ argsLogPath: shim.argsLogPath })

      expect(invocations).toEqual([
        'search|--onlyvisible|--pid|4242',
        'search|--pid|4242',
        'search|--onlyvisible|--pid|777',
        'search|--pid|777',
        'windowactivate|123456',
      ])
    } finally {
      await shim.restoreEnvironment()
    }
  })

  it('rejects with the xdotool install hint when the xdotool binary is missing', async () => {
    const pathOverride = await installBinarylessPath()

    try {
      const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })

      await expect(service.focusSession({ cwd: '/home/user/project', pid: 4242 })).rejects.toThrow(
        'focusing a session terminal on Linux requires the xdotool tool; install it via the system package manager',
      )
    } finally {
      await pathOverride.restoreEnvironment()
    }
  })

  it('rejects with the window-not-found error when the session pid is already dead', async () => {
    const shim = await installLinuxFocusShims()
    const sessionEnv = forceSessionType({ sessionType: 'x11' })

    try {
      const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })

      await expect(service.focusSession({ cwd: '/home/user/project', pid: 4242 })).rejects.toThrow(
        linuxWindowNotFoundMessage,
      )
      const invocations = await readXdotoolInvocations({ argsLogPath: shim.argsLogPath })

      expect(invocations).toEqual(['search|--onlyvisible|--pid|4242', 'search|--pid|4242'])
    } finally {
      sessionEnv.restoreSessionEnv()
      await shim.restoreEnvironment()
    }
  })

  it('rejects with the Wayland-not-supported error on a Wayland session without an X11 window', async () => {
    const shim = await installLinuxFocusShims()
    const sessionEnv = forceSessionType({ sessionType: 'wayland' })

    try {
      const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })

      await expect(service.focusSession({ cwd: '/home/user/project', pid: 4242 })).rejects.toThrow(
        linuxWaylandNotSupportedMessage,
      )
    } finally {
      sessionEnv.restoreSessionEnv()
      await shim.restoreEnvironment()
    }
  })

  it('rejects with the window-not-found error when the walk reaches init without finding a window', async () => {
    const shim = await installLinuxFocusShims()
    const sessionEnv = forceSessionType({ sessionType: 'x11' })

    try {
      shim.setPsPpidByPid({ ppidByPid: { '4242': '1' } })
      const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })

      await expect(service.focusSession({ cwd: '/home/user/project', pid: 4242 })).rejects.toThrow(
        linuxWindowNotFoundMessage,
      )
      const invocations = await readXdotoolInvocations({ argsLogPath: shim.argsLogPath })

      expect(invocations).toEqual([
        'search|--onlyvisible|--pid|4242',
        'search|--pid|4242',
        'search|--onlyvisible|--pid|1',
        'search|--pid|1',
      ])
    } finally {
      sessionEnv.restoreSessionEnv()
      await shim.restoreEnvironment()
    }
  })

  it('stops the Linux ancestor walk after twelve hops without a window', async () => {
    const shim = await installLinuxFocusShims()
    const sessionEnv = forceSessionType({ sessionType: 'x11' })

    try {
      shim.setPsDecrementMode()
      const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })

      await expect(service.focusSession({ cwd: '/home/user/project', pid: 100 })).rejects.toThrow(
        linuxWindowNotFoundMessage,
      )
      const invocations = await readXdotoolInvocations({ argsLogPath: shim.argsLogPath })
      const firstInvocation = invocations[0]
      const lastInvocation = invocations[invocations.length - 1]

      expect(invocations).toHaveLength(24)
      expect(firstInvocation).toBe('search|--onlyvisible|--pid|100')
      expect(lastInvocation).toBe('search|--pid|89')
    } finally {
      sessionEnv.restoreSessionEnv()
      await shim.restoreEnvironment()
    }
  })

  it('rejects the windows platform with the macOS-and-Linux support error', async () => {
    const service = new SessionsServiceContractHarness({ focusPlatform: 'windows' })

    await expect(service.focusSession({ cwd: 'C:\\Users\\user\\project', pid: 4242 })).rejects.toThrow(
      'focusing a session terminal is only supported on macOS and Linux',
    )
  })

  it('routes a macos platform into the bundle flow and focuses the matching Ghostty tab', async () => {
    const service = new SessionsServiceContractHarness({
      focusPlatform: 'macos',
      macOsBundlePath: '/Applications/Ghostty.app',
    })
    await service.focusSession({ cwd: '/Users/user/project', pid: 4242 })

    expect(service.macOsBundleResolveCalls).toEqual([{ hopCount: 0, pid: 4242 }])
    expect(service.macOsBundleActivateCalls).toEqual([{ bundlePath: '/Applications/Ghostty.app' }])
    expect(service.macOsTabFocusCalls).toEqual([{ cwd: '/Users/user/project' }])
  })

  it('routes a macos platform into the bundle flow but skips the tab focus for other terminals', async () => {
    const service = new SessionsServiceContractHarness({
      focusPlatform: 'macos',
      macOsBundlePath: '/Applications/iTerm.app',
    })
    await service.focusSession({ cwd: '/Users/user/project', pid: 4242 })

    expect(service.macOsBundleActivateCalls).toEqual([{ bundlePath: '/Applications/iTerm.app' }])
    expect(service.macOsTabFocusCalls).toEqual([])
    expect(service.macOsWindowFocusCalls).toEqual([])
  })

  it('routes a macos platform into the bundle flow but skips the tab focus without a cwd', async () => {
    const service = new SessionsServiceContractHarness({
      focusPlatform: 'macos',
      macOsBundlePath: '/Applications/Ghostty.app',
    })
    await service.focusSession({ cwd: '', pid: 4242 })

    expect(service.macOsTabFocusCalls).toEqual([])
    expect(service.macOsWindowFocusCalls).toEqual([])
  })

  it('routes a macos platform into the bundle flow and focuses the matching VS Code window', async () => {
    const service = new SessionsServiceContractHarness({
      focusPlatform: 'macos',
      macOsBundlePath: '/Applications/Visual Studio Code.app',
    })
    await service.focusSession({ cwd: '/Users/user/claude-code-helper', pid: 4242 })

    expect(service.macOsBundleActivateCalls).toEqual([{ bundlePath: '/Applications/Visual Studio Code.app' }])
    expect(service.macOsTabFocusCalls).toEqual([])
    expect(service.macOsWindowFocusCalls).toEqual([
      { bundlePath: '/Applications/Visual Studio Code.app', cwd: '/Users/user/claude-code-helper' },
    ])
  })

  it('raises the VS Code window whose workspace name matches the session cwd', async () => {
    const shim = await installOsascriptShim()

    try {
      shim.setWindowTitles({
        windowTitles: '◐ session-focus-button.tsx — claude-code-helper\nemotify\nGit Graph — bm (Workspace)',
      })
      const service = new SessionsServiceContractHarness({
        focusPlatform: 'macos',
        macOsBundlePath: '/Applications/Visual Studio Code.app',
      })
      service.isMacOsWindowFocusStubbed = false
      await service.focusSession({ cwd: '/Users/milos/code/claude-code-helper', pid: 4242 })
      const invocations = await readOsascriptInvocations({ argsLogPath: shim.argsLogPath })

      expect(invocations).toHaveLength(2)
      expect(invocations[0]).toContain('--|/Applications/Visual Studio Code.app')
      expect(invocations[1]).toContain('--|/Applications/Visual Studio Code.app|1')
    } finally {
      await shim.restoreEnvironment()
    }
  })

  it('skips the VS Code raise call when no window matches the session cwd', async () => {
    const shim = await installOsascriptShim()

    try {
      shim.setWindowTitles({ windowTitles: 'emotify\nGit Graph — bm (Workspace)' })
      const service = new SessionsServiceContractHarness({
        focusPlatform: 'macos',
        macOsBundlePath: '/Applications/Visual Studio Code.app',
      })
      service.isMacOsWindowFocusStubbed = false
      await service.focusSession({ cwd: '/Users/milos/code/claude-code-helper', pid: 4242 })
      const invocations = await readOsascriptInvocations({ argsLogPath: shim.argsLogPath })

      expect(invocations).toHaveLength(1)
    } finally {
      await shim.restoreEnvironment()
    }
  })
})

describe.skipIf(process.platform === 'win32')('SessionsService focus support [contract supplement]', () => {
  it('reports ready focus support off linux without touching the install path', async () => {
    const service = new SessionsServiceContractHarness({ focusPlatform: 'macos' })

    await expect(service.getFocusSupport()).resolves.toEqual({ status: 'ready' })
    expect(service.linuxFocusToolInstallAttemptCount).toBe(0)
  })

  it('checks the xdotool binary only once per app run', async () => {
    const shim = await installLinuxFocusShims()

    try {
      const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })
      await expect(service.getFocusSupport()).resolves.toEqual({ status: 'ready' })
      await expect(service.getFocusSupport()).resolves.toEqual({ status: 'ready' })
      const invocations = await readXdotoolInvocations({ argsLogPath: shim.argsLogPath })

      expect(invocations).toEqual(['version'])
    } finally {
      await shim.restoreEnvironment()
    }
  })

  it('reports missing-tool focus support when the xdotool binary is absent', async () => {
    const pathOverride = await installBinarylessPath()

    try {
      const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })

      await expect(service.getFocusSupport()).resolves.toEqual({ status: 'missing-tool' })
    } finally {
      await pathOverride.restoreEnvironment()
    }
  })

  it('refreshes the cached focus support after installing the tool', async () => {
    const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })
    service.isLinuxFocusToolInstalled = false

    await expect(service.getFocusSupport()).resolves.toEqual({ status: 'missing-tool' })

    service.isLinuxFocusToolInstalled = true

    await expect(service.installFocusTool()).resolves.toEqual({ status: 'ready' })
    expect(service.linuxFocusToolInstallAttemptCount).toBe(1)
  })

  it('rejects with a wrapped message when the focus tool install fails', async () => {
    const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })
    service.linuxFocusToolInstallError = new Error('polkit dismissed the prompt')

    await expect(service.installFocusTool()).rejects.toThrow('installing xdotool failed: polkit dismissed the prompt')
  })
})
