// Supplements: ./sessions-service.contract.yaml
// Covers what contract.yaml cannot express:
// - async rejections of the focus path: the windows platform dispatch error and the Linux
//   X11/Wayland and xdotool-install errors (the contract runner's error strategy catches
//   synchronous throws only)
// - the real xdotool/ps child-process choreography of the Linux ancestor walk via stub
//   binaries prepended to PATH, including the exact windowactivate invocation
// - the macos platform routing with the macOS helpers stubbed on the harness (open and
//   osascript never run)

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
    if [ -n "$USAGE_PULSE_XDOTOOL_WINDOW_PID" ] && [ "$3" = "$USAGE_PULSE_XDOTOOL_WINDOW_PID" ]; then
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

const linuxWaylandErrorMessage =
  'focusing a session terminal on Linux requires an X11 session with xdotool; Wayland is not supported yet'

const focusShimEnvKeys = [
  'USAGE_PULSE_PS_DECREMENT_PPID',
  'USAGE_PULSE_PS_PPID_BY_PID',
  'USAGE_PULSE_XDOTOOL_ARGS_LOG',
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

const readXdotoolInvocations = async (params: { argsLogPath: string }): Promise<string[]> => {
  return (await readFile(params.argsLogPath, 'utf8')).trim().split('\n')
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

      expect(invocations).toEqual(['search|--pid|4242', 'search|--pid|777', 'windowactivate|--sync|123456'])
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

  it('rejects with the X11/Wayland error when the session pid is already dead', async () => {
    const shim = await installLinuxFocusShims()

    try {
      const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })

      await expect(service.focusSession({ cwd: '/home/user/project', pid: 4242 })).rejects.toThrow(
        linuxWaylandErrorMessage,
      )
      const invocations = await readXdotoolInvocations({ argsLogPath: shim.argsLogPath })

      expect(invocations).toEqual(['search|--pid|4242'])
    } finally {
      await shim.restoreEnvironment()
    }
  })

  it('rejects with the X11/Wayland error when the walk reaches init without finding a window', async () => {
    const shim = await installLinuxFocusShims()

    try {
      shim.setPsPpidByPid({ ppidByPid: { '4242': '1' } })
      const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })

      await expect(service.focusSession({ cwd: '/home/user/project', pid: 4242 })).rejects.toThrow(
        linuxWaylandErrorMessage,
      )
      const invocations = await readXdotoolInvocations({ argsLogPath: shim.argsLogPath })

      expect(invocations).toEqual(['search|--pid|4242', 'search|--pid|1'])
    } finally {
      await shim.restoreEnvironment()
    }
  })

  it('stops the Linux ancestor walk after twelve hops without a window', async () => {
    const shim = await installLinuxFocusShims()

    try {
      shim.setPsDecrementMode()
      const service = new SessionsServiceContractHarness({ focusPlatform: 'linux' })

      await expect(service.focusSession({ cwd: '/home/user/project', pid: 100 })).rejects.toThrow(
        linuxWaylandErrorMessage,
      )
      const invocations = await readXdotoolInvocations({ argsLogPath: shim.argsLogPath })
      const firstInvocation = invocations[0]
      const lastInvocation = invocations[invocations.length - 1]

      expect(invocations).toHaveLength(12)
      expect(firstInvocation).toBe('search|--pid|100')
      expect(lastInvocation).toBe('search|--pid|89')
    } finally {
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
  })

  it('routes a macos platform into the bundle flow but skips the tab focus without a cwd', async () => {
    const service = new SessionsServiceContractHarness({
      focusPlatform: 'macos',
      macOsBundlePath: '/Applications/Ghostty.app',
    })
    await service.focusSession({ cwd: '', pid: 4242 })

    expect(service.macOsTabFocusCalls).toEqual([])
  })
})
