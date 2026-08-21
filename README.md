# Usage Pulse

A small Electron + TypeScript desktop app that continuously pings your coding-plan providers and shows how much of your usage limits you have consumed — the 5-hour window as a ring, and the longer window (weekly for Claude, monthly for z.ai) as a bar.

## Providers

The app uses the **strategy pattern** (`src/main/business/service/usage-provider/`). Each provider implements `IUsageProvider` and receives the access token on every `fetchUsage` call:

| Provider | Endpoint | 5-hour window | Long window |
| --- | --- | --- | --- |
| Claude | `GET https://api.claude.com/api/usage` (undocumented) | `five_hour_slot_usage_percentage` | `seven_day_window_usage_percentage` (weekly) |
| z.ai | `GET https://api.z.ai/api/monitor/usage/quota/limit` | `limits[].type === 'TOKENS_LIMIT'` → `percentage` | `limits[].type === 'TIME_LIMIT'` → `percentage` (monthly) |

To add a provider: create a class implementing `IUsageProvider` in the `usage-provider/` folder and add it to the default list in `UsagePollService`.

### Getting tokens

- **Claude**: the OAuth access token your Claude Code installation uses (`claudeCodeOAuthAccessToken` in `~/.claude/.credentials.json` on Linux/WSL, or the Keychain entry `Claude Code-credentials` on macOS). The endpoint is undocumented and rate-limited per access token — keep the poll interval at 60s or higher.
- **z.ai**: the `ANTHROPIC_AUTH_TOKEN` from your GLM Coding Plan (the same token you pass to `https://api.z.ai/api/anthropic`).

Tokens are stored only in `usage-pulse-settings.json` inside the app's userData folder and are sent exclusively to the provider they belong to.

## Development

```bash
npm install
npm run dev
```

Other scripts:

- `npm run build` — build main/preload/renderer into `out/`
- `npm start` — run the built app
- `npm run typecheck` — typecheck the node and web projects
- `npm run lint` / `npm run lint-fix` — ESLint + Prettier + json-sort-cli

## Architecture

```
src/
├── shared/                     # cross-process models (main + preload + renderer)
│   ├── ipc-channel.ts          # IPC channel names
│   ├── settings-model.ts       # IAppSettings + poll interval bounds
│   └── usage-model.ts          # usage snapshots, provider types, renderer API contract
├── main/
│   ├── index.ts                # app boot
│   ├── lib/app-window.ts       # BrowserWindow creation
│   ├── controller/ipc-controller.ts   # IPC handlers + update push
│   └── business/
│       ├── repo/settings-repo.ts       # settings persistence (userData JSON)
│       └── service/
│           ├── settings-service.ts     # defaults + sanitizing
│           ├── usage-poll-service.ts   # interval polling, snapshot fan-out
│           └── usage-provider/         # strategy implementations
│               ├── usage-provider.ts   # IUsageProvider interface
│               ├── claude.ts           # UsageProviderClaude
│               └── zai.ts              # UsageProviderZai
├── preload/index.ts            # contextBridge API (window.usageApi)
└── renderer/
    └── src/
        ├── business/service/usage-client-service.ts
        ├── ui-component/            # dashboard, provider card, ring, bar, settings
        └── util/                    # severity thresholds, status text, formatting
```
