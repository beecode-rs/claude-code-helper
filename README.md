# Usage Pulse

A small Electron + TypeScript desktop app that continuously pings your coding-plan providers and shows how much of your usage limits you have consumed — the 5-hour window as a ring, and the longer window (weekly for Claude, monthly for z.ai) as a bar.

## Trackers

The dashboard starts empty. **+ Add** in the header opens a dialog that first asks which provider you want, then configures it. You can add any number of trackers, including several for the same provider (e.g. two Claude accounts with different tokens) — each tracker is a card with its own configuration behind the card's gear button (display name, token, remove).

Each tracker is stored in `settings.trackers` as an `ITrackerConfig` (a discriminated union on `providerId`) with a unique `id` that also keys the usage snapshots. Settings saved in the old flat shape (one Claude + one z.ai token) are migrated automatically on first launch.

The app uses the **strategy pattern** (`src/main/business/service/usage-provider/`). Providers are stateless and held in a `Record<ProviderId, IUsageProvider>` registry; the poll service resolves the provider per tracker and passes that tracker's token on every `fetchUsage` call:

| Provider | Endpoint | 5-hour window | Long window |
| --- | --- | --- | --- |
| Claude | `GET https://api.anthropic.com/api/oauth/usage` (undocumented, OAuth bearer) | `five_hour.utilization` + `resets_at` | `seven_day.utilization` (weekly) |
| z.ai | `GET https://api.z.ai/api/monitor/usage/quota/limit` | `limits[].type === 'TOKENS_LIMIT'` → `percentage` | `limits[].type === 'TIME_LIMIT'` → `percentage` (monthly) |

To add a provider kind: extend `ProviderId` and `PROVIDER_CATALOG` (`src/shared/provider-catalog.ts`), create a class implementing `IUsageProvider` in the `usage-provider/` folder, and register it in `UsagePollService._createDefaultProviders()`.

### Getting tokens

- **Claude** — two options in the tracker's settings:
  - **Enter manually**: paste the OAuth access token your Claude Code installation uses.
  - **Use system token** (macOS only for now): reads `claudeAiOauth.accessToken` from the Keychain entry `Claude Code-credentials` on every poll, so it stays current when Claude Code refreshes the token. On Linux/WSL Claude Code stores it in `~/.claude/.credentials.json` instead — system reading for those platforms is not implemented yet. The Keychain holds a single Claude Code login, so multiple system-source trackers all reflect that one account.

  The endpoint is undocumented and rate-limited per access token — keep the poll interval at 60s or higher, and remember each tracker polls independently.
- **z.ai**: the `ANTHROPIC_AUTH_TOKEN` from your GLM Coding Plan (the same token you pass to `https://api.z.ai/api/anthropic`).

Tokens are stored only in `usage-pulse-settings.json` inside the app's userData folder and are sent exclusively to the provider their tracker belongs to.

## Development

```bash
pnpm install
pnpm dev
```

Other scripts:

- `pnpm build` — build main/preload/renderer into `out/`
- `pnpm start` — run the built app
- `pnpm typecheck` — typecheck the node and web projects
- `pnpm lint` / `pnpm lint-fix` — ESLint + Prettier + json-sort-cli

## Architecture

```
src/
├── shared/                     # cross-process models (main + preload + renderer)
│   ├── ipc-channel.ts          # IPC channel names
│   ├── provider-catalog.ts     # PROVIDER_CATALOG (kind → name/description)
│   ├── settings-model.ts       # IAppSettings, ITrackerConfig, poll interval bounds
│   └── usage-model.ts          # usage snapshots, provider types, renderer API contract
├── main/
│   ├── index.ts                # app boot (+ one-time settings migration write-back)
│   ├── lib/app-window.ts       # BrowserWindow creation
│   ├── controller/ipc-controller.ts   # IPC handlers + update push
│   └── business/
│       ├── repo/settings-repo.ts       # settings persistence (userData JSON)
│       └── service/
│           ├── claude-system-token-service.ts  # Claude Code token from macOS Keychain
│           ├── settings-service.ts     # defaults, sanitizing, legacy migration
│           ├── usage-poll-service.ts   # interval polling per tracker, snapshot fan-out
│           └── usage-provider/         # strategy implementations (stateless registry)
│               ├── usage-provider.ts   # IUsageProvider interface
│               ├── claude.ts           # UsageProviderClaude
│               └── zai.ts              # UsageProviderZai
├── preload/index.ts            # contextBridge API (window.usageApi)
└── renderer/
    └── src/
        ├── business/service/usage-client-service.ts
        ├── ui-component/            # dashboard, provider card, ring, bar, settings
        │   ├── settings/            # global settings (poll interval)
        │   ├── tracker/             # add-tracker dialog, per-tracker settings dialog
        │   └── usage-dashboard/     # dashboard, cards, footer
        └── util/                    # severity thresholds, status text, formatting
```
