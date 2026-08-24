import type { OsPlatform } from '#src/shared/os-model'
import { ClaudeTokenSource, type ITrackerConfig } from '#src/shared/settings-model'

export interface ITrackerSystemTokenOption {
  hint: string
  label: string
}

export interface ITrackerTokenSelection {
  selectedTokenSource: ClaudeTokenSource
  systemTokenOption?: ITrackerSystemTokenOption
}

export const trackerTokenSourceUtil = {
  normalizeConfig: (params: { config: ITrackerConfig; osPlatform: OsPlatform }): ITrackerConfig => {
    if (params.config.providerId !== 'claude' || params.osPlatform !== 'windows') {
      return params.config
    }

    if (params.config.tokenSource !== ClaudeTokenSource.SYSTEM) {
      return params.config
    }

    return { ...params.config, tokenSource: ClaudeTokenSource.MANUAL }
  },

  resolveSelection: (params: { config: ITrackerConfig; osPlatform: OsPlatform }): ITrackerTokenSelection => {
    if (params.config.providerId !== 'claude') {
      return { selectedTokenSource: ClaudeTokenSource.MANUAL }
    }

    switch (params.osPlatform) {
      case 'linux': {
        return {
          selectedTokenSource: params.config.tokenSource,
          systemTokenOption: {
            hint: 'Reads the OAuth token from ~/.claude/.credentials.json on every poll, so it tracks the one Claude Code account logged in on this machine.',
            label: 'Use system token (logged-in Claude Code)',
          },
        }
      }

      case 'macos': {
        return {
          selectedTokenSource: params.config.tokenSource,
          systemTokenOption: {
            hint: 'Reads the OAuth token from the macOS Keychain entry "Claude Code-credentials" on every poll, so it tracks the one Claude Code account logged in on this machine. Not available on Windows yet.',
            label: 'Use system token (macOS Keychain)',
          },
        }
      }

      default: {
        return { selectedTokenSource: ClaudeTokenSource.MANUAL }
      }
    }
  },
}
