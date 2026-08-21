import type { ReactElement } from 'react'

import { PROVIDER_CATALOG } from '#src/shared/provider-catalog'
import {
  ClaudeTokenSource,
  type ITrackerConfig,
  MAX_REFRESH_INTERVAL_MINUTES,
  MIN_REFRESH_INTERVAL_MINUTES,
} from '#src/shared/settings-model'

export const TrackerConfigFields = (props: {
  config: ITrackerConfig
  onChange: (config: ITrackerConfig) => void
}): ReactElement => {
  const { config, onChange } = props
  const catalogEntry = PROVIDER_CATALOG.find((entry) => {
    return entry.id === config.providerId
  })
  const providerDisplayName = catalogEntry?.name ?? config.providerId

  return (
    <>
      <label className="settings-field">
        <span className="settings-field-label">Display name</span>
        <input
          className="settings-field-input"
          onChange={(event) => {
            onChange({ ...config, name: event.target.value })
          }}
          placeholder={providerDisplayName}
          type="text"
          value={config.name}
        />
      </label>
      {config.providerId === 'claude' && (
        <div className="settings-field">
          <span className="settings-field-label">Access token</span>
          <div className="settings-token-source-row">
            <label className="settings-token-source-option">
              <input
                checked={config.tokenSource === ClaudeTokenSource.MANUAL}
                name={`claude-token-source-${config.id}`}
                onChange={() => {
                  onChange({ ...config, tokenSource: ClaudeTokenSource.MANUAL })
                }}
                type="radio"
              />
              Enter manually
            </label>
            <label className="settings-token-source-option">
              <input
                checked={config.tokenSource === ClaudeTokenSource.SYSTEM}
                name={`claude-token-source-${config.id}`}
                onChange={() => {
                  onChange({ ...config, tokenSource: ClaudeTokenSource.SYSTEM })
                }}
                type="radio"
              />
              Use system token (macOS Keychain)
            </label>
          </div>
          {config.tokenSource === ClaudeTokenSource.MANUAL && (
            <input
              className="settings-field-input"
              onChange={(event) => {
                onChange({ ...config, accessToken: event.target.value })
              }}
              placeholder="OAuth access token from claude.ai"
              type="password"
              value={config.accessToken}
            />
          )}
          {config.tokenSource === ClaudeTokenSource.SYSTEM && (
            <p className="settings-hint">
              Reads the OAuth token from the macOS Keychain entry "Claude Code-credentials" on every poll, so it tracks
              the one Claude Code account logged in on this machine. Not available on Linux or Windows yet.
            </p>
          )}
        </div>
      )}
      {config.providerId === 'zai' && (
        <label className="settings-field">
          <span className="settings-field-label">Access token</span>
          <input
            className="settings-field-input"
            onChange={(event) => {
              onChange({ ...config, accessToken: event.target.value })
            }}
            placeholder="ANTHROPIC_AUTH_TOKEN from your GLM coding plan"
            type="password"
            value={config.accessToken}
          />
        </label>
      )}
      <label className="settings-field">
        <span className="settings-field-label">Refresh interval (minutes)</span>
        <input
          className="settings-field-input"
          max={MAX_REFRESH_INTERVAL_MINUTES}
          min={MIN_REFRESH_INTERVAL_MINUTES}
          onChange={(event) => {
            const minutes = Number.parseInt(event.target.value, 10)

            if (!Number.isFinite(minutes)) {
              return
            }

            const clampedMinutes = Math.min(
              Math.max(minutes, MIN_REFRESH_INTERVAL_MINUTES),
              MAX_REFRESH_INTERVAL_MINUTES,
            )

            onChange({ ...config, refreshIntervalSeconds: clampedMinutes * 60 })
          }}
          type="number"
          value={Math.round(config.refreshIntervalSeconds / 60)}
        />
        <span className="settings-hint">How often this tracker refreshes automatically.</span>
      </label>
    </>
  )
}
