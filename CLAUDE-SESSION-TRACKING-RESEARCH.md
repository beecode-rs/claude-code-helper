# Research: Tracking all active Claude Code sessions on the OS

**Goal:** enumerate every *currently running* Claude Code CLI session on this Mac — Ghostty terminals, iTerm, VS Code integrated terminal — with live state (busy/idle), project path, session identity; and determine what is (and isn't) trackable for sessions launched from a VS Code **Remote-SSH** terminal, where the CLI actually runs on another machine.

**Date:** 2026-08-23
**Verified against:** Claude Code **2.1.240 / 2.1.241** (native installer, `~/.local/share/claude/versions/`), macOS. Everything in §2 was executed live on this machine during research — paths, schemas, and commands below are observed, not guessed.

---

## 1. TL;DR recommendation

| Question | Answer |
|---|---|
| Best primary source? | **`~/.claude/sessions/<pid>.json`** — Claude Code's own live session registry. One JSON file per *running* process, named by PID, containing `sessionId`, `cwd`, `status` (`busy`/`idle`), `startedAt`, version, entrypoint, display name, and an `updatedAt` heartbeat that refreshes continuously (observed flipping `idle → busy` in real time). Watch the directory with `fs.watch` → push-style live updates, no polling loop needed. |
| Official / stable contract? | **`claude agents --json`** — documented CLI command printing the same list (`pid`, `cwd`, `kind`, `startedAt`, `sessionId`, `name`, `status`; `--all` adds completed background sessions, `--cwd` filters). Costs a ~1–2 s process spawn per call, so use it as a periodic cross-check/fallback, not the hot path. |
| Do headless runs register? | **Yes.** A test `claude -p` run registered with `entrypoint: "sdk-cli"`. Interactive terminal runs show `entrypoint: "cli"`. Background sessions show `kind: "background"`. |
| Which terminal hosts a session? | Walk the **PPID chain** from the session's PID up to an `.app` bundle. Verified live: `claude → zsh → login → Ghostty.app` / `→ iTerm.app` / `→ …Code.app`. One `ps -axo pid,ppid,comm` snapshot per refresh is enough to resolve all sessions in memory. |
| VS Code correlation? | `~/.claude/ide/<port>.lock` files (created by the VS Code/JetBrains extension) map an IDE instance → `{pid, workspaceFolders, ideName, transport, authToken}`. Correlate a session's `cwd` against `workspaceFolders` to label "VS Code workspace X". A Ghostty session creates **no** lock file — absence is itself signal. |
| Stale entries? | The file is deleted when the process exits gracefully. After a crash/`kill -9` it can linger → always verify with `process.kill(pid, 0)` and (against PID reuse) compare the registry's `procStart` string to the live process start time. |
| **Remote (VS Code Remote-SSH)?** | **Not locally trackable.** The CLI process *and* its `~/.claude` live on the remote host; the Mac only sees an `ssh` process (sometimes not even that). Options: run a poller on the remote that pushes to the app, SSH-poll (`ssh host claude agents --json`), or accept the blind spot and show "remote — untracked". Details in §6. |
| Claude Desktop (Cowork) sessions? | Separate silo (`~/Library/Application Support/Claude`). They do **not** appear in this registry. Out of scope. |
| Recommended shape | `SessionTracker` in the Electron main process: `fs.watch` on `~/.claude/sessions` + PPID-walk enrichment + liveness guard; 30 s reconcile poll (`pgrep` + occasional `claude agents --json`) for robustness. ~150 LOC, no dependencies, no config changes to the user's Claude setup. |

---

## 2. The evidence: what exists on disk (all verified live)

### 2.1 The live registry — `~/.claude/sessions/<pid>.json` ★

Observed while 3 interactive sessions + 1 test headless session were running. Directory listing matched the running `claude` PIDs **exactly** — files are created at session start, updated during the session, and removed at exit.

Real example (this project, captured mid-research):

```json
{
  "pid": 69349,
  "sessionId": "f8f8f776-a966-49ee-a627-4a990dd257bb",
  "cwd": "/Users/milos/code/claude-code-helper",
  "startedAt": 1787496450676,
  "procStart": "Sun Aug 23 14:47:30 2026",   // note: UTC, local was 16:47
  "version": "2.1.241",
  "peerProtocol": 1,
  "peerFeatures": ["notify_idle"],
  "kind": "interactive",                     // "interactive" | "background"
  "entrypoint": "cli",                       // "cli" | "sdk-cli" (observed; likely also "ide", "sdk")
  "name": "claude-code-helper-18",           // display name (cwd-derived default or user /rename)
  "nameSource": "derived",                   // "derived" | (user-set)
  "nameSince": 1787496450676,
  "status": "busy",                          // "busy" | "idle" | "waiting" ← live activity state
  "updatedAt": 1787500349994,                // epoch ms, refreshes continuously (heartbeat)
  "statusUpdatedAt": 1787500349994,
  "formerNames": [ ... ]                     // optional, rename history
}
```

Key behaviors observed:

- **Real-time status**: one file flipped `idle → busy` while being read between two commands. `updatedAt` advances even while idle — a heartbeat, so mtime of the file itself is a liveness proxy.
- **All entrypoints register**: interactive (`cli`) and headless `claude -p` (`sdk-cli`) alike. (Headless runs registered despite the docs excluding them from the *resume picker* — the registry is about *processes*, not resumability.)
- **Cleanup**: removed on exit. A `claude -p` test file persisted while its process was still alive (lingering MCP shutdown), disappeared once the process exited — consistent with delete-on-exit. Crash leftovers are swept on the next `claude` launch; the registry is *not* subject to the 30-day age sweep that applies to transcripts.
- The registry is per-config-dir: it lives under `$CLAUDE_CONFIG_DIR` (default `~/.claude`); embedders using a custom config dir get their own registry.

Caveats:

- **Undocumented internal format.** The docs explicitly warn that on-disk formats change between versions; tolerate unknown/missing fields, never write to these files.
- **Version floor**: verified on 2.1.240/2.1.241 (Aug 2026). `claude agents --json` and agent view are recent 2.1.x features. If an *older* CLI version is still running (e.g. `npx @anthropic-ai/claude-code` pinned in some project), it may not write registry files — see the reconcile poll in §5.

### 2.2 The official query — `claude agents --json`

```console
$ claude agents --json
[
  { "pid": 37154, "cwd": "/Users/milos/code/claude-code-helper", "kind": "interactive",
    "startedAt": 1787492800526, "sessionId": "a96dd17a-…", "name": "per-trigger-run-logs", "status": "idle" },
  { "pid": 64508, "cwd": "/Users/milos/Library/LaunchAgents", "kind": "interactive",
    "startedAt": 1787496042998, "sessionId": "ce4da317-…", "name": "launchagents-7d", "status": "idle" },
  { "pid": 69349, "cwd": "/Users/milos/code/claude-code-helper", "kind": "interactive",
    "startedAt": 1787496450676, "sessionId": "f8f8f776-…", "name": "claude-code-helper-18", "status": "busy" }
]
```

Documented in the sessions/agent-view docs ("print active sessions — interactive and background — as a JSON array"). Flags: `--all` (also completed background sessions), `--cwd <path>` (filter). It is a snapshot of the same registry — treated as the *supported* interface; the raw files are the *fast* interface.

### 2.3 IDE lock files — `~/.claude/ide/<port>.lock`

Written by the VS Code / JetBrains extension's lock-server (not by terminal CLIs):

```json
// ~/.claude/ide/49031.lock  — filename is the WebSocket port
{ "pid": 99631,
  "workspaceFolders": ["/Users/milos/code/claude-code-helper"],
  "ideName": "Visual Studio Code",
  "transport": "ws",
  "runningInWindows": false,
  "authToken": "7f025ddf-…" }
```

Verified `pid 99631` = `/Applications/Visual Studio Code.app/Contents/MacOS/Code`. Ports are random in 10000–65535, bound to `127.0.0.1` only, not configurable (observed 49031; older builds used a 7120+ range — don't hard-code). The CLI auto-pairs with a matching lock file when `autoConnectIde` is true (default, in `~/.claude.json`). Lock files have no documented cleanup and can outlive the IDE — verify their `pid` is alive before displaying. Treat as "which IDE windows/workspaces are open and connectable". Correlation rule: session `cwd` ∈ some lock's `workspaceFolders` ⇒ "running in VS Code on <workspace>"; plus PPID walk (§2.4) distinguishes extension-hosted vs integrated-terminal.

### 2.4 Process shape and the PPID walk (host-terminal attribution)

Running CLI processes appear in `ps` as (native binary, no node wrapper):

```text
69349  …  claude --dangerously-skip-permissions
```

Distinguish from noise: Claude **Desktop** helpers (`/Applications/Claude.app/…`), and this repo's Electron dev helpers (`Electron Helper …`) — filter by exact `comm`/argv match on `claude` (resolve `~/.local/bin/claude` symlink → `~/.local/share/claude/versions/<v>`).

Parent chains, captured live:

```text
69349 claude ← zsh ← /usr/bin/login ← /Applications/Ghostty.app/…/ghostty  ← launchd
64508 claude ← zsh ← /usr/bin/login ← iTermServer-3.6.11 ← /Applications/iTerm.app ← launchd
```

So: `ps -axo pid,ppid,comm` once → build pid→ppid map in memory → walk up from each session pid until the path contains `.app/` (or hits pid 1) → terminal app for the UI icon (Ghostty / iTerm2 / VS Code / Cursor / Electron). Caveat: VS Code integrated terminals also spawn via `login`, so the walk correctly lands on `Code.app`; a session started by the *extension* (panel) has the extension-host process as ancestor — still resolves to `Code.app`. `lsof -p <pid> | grep cwd` also yields the project dir directly (the transcript file is NOT held open — appends are open-write-close).

### 2.5 Transcripts — `~/.claude/projects/<munged-cwd>/<sessionId>.jsonl`

- Project dir = cwd with non-alphanumerics → `-` (e.g. `-Users-milos-code-claude-code-helper`); >200 chars → truncate + hash suffix. Renameable via `CLAUDE_CODE_PROJECT_DIR_NAME` (v2.1.234+), relocatable via `CLAUDE_CONFIG_DIR`.
- One JSONL per session, appended as the session works. Line schema is internal and version-dependent (warned in docs) — only rely on it for mtime/size heuristics, or via `/export`, hooks' `transcript_path`, or `claude -p --resume <id> --output-format json`. Observed event types: `ai-title`, `agent-name`, `mode`, `user`, `assistant`, `system`, `attachment`, `file-history-snapshot`, `file-history-delta`, `last-prompt`, `atis-latch`. Fields include `sessionId`, `timestamp`, `uuid`/`parentUuid`, `sessionKind` (`interactive` | `bg`), `isSidechain` — but **not** per-event `cwd`/`version`/`gitBranch` (cwd is implicit in the directory name). The `--resume` picker gets its titles from the `ai-title`/`agent-name` events.
- Retention: default 30 days (`cleanupPeriodDays` in settings.json) — fine for "active" tracking, relevant if we ever show history.
- **mtime as a fallback heartbeat**: file touched within N minutes ⇒ recently active session. Cannot distinguish "open but idle" from "closed 2 min ago" — only the registry can. This is the classic approach (ccusage-style) and the right fallback for old CLI versions.

### 2.6 Supporting state

| Path | Use |
|---|---|
| `~/.claude.json` → `projects["<abs cwd>"].lastSessionId`, `lastStartTime`, token counters | cwd → most recent session mapping (history views) |
| `~/.claude/session-env/<sessionId>/` | per-session env snapshots; created/cleaned with the session (was empty for idle session) — secondary liveness signal |
| `~/.claude/history.jsonl` | global prompt history with `project` + timestamp |
| `~/.claude/daemon/` (`roster.json`, supervisor) | the auto-update / supervisor daemon's own roster — *not* session tracking; don't build on it |
| `~/.claude/jobs/<id>/state.json` | background-job state (agent view / dispatched sessions) |
| `/tmp/cc-daemon-<uid>/control.sock` | supervisor's Unix socket — present iff the supervisor is running (`claude daemon status`); not a session list |
| `/tmp/claude-<uid>/…` | per-session scratch space; persists across sessions — not a live signal |

---

## 3. Approaches compared

| # | Approach | Live status | Sees all entrypoints | Effort | Robustness | Verdict |
|---|---|---|---|---|---|---|
| A | **Read + `fs.watch` `~/.claude/sessions/`** | ✅ busy/idle + heartbeat | ✅ (incl. `-p`, background) | trivial | high (internal format — parse leniently) | **Primary** |
| B | **`claude agents --json`** poll | ✅ | ✅ | trivial | highest (documented CLI) | **Periodic cross-check** (spawn cost) |
| C | `ps`/`pgrep` process scan + PPID walk | ❌ (exists only) | ✅ any version | small | high | **Enrichment + reconcile** (terminal attribution; catches pre-registry versions) |
| D | Transcript mtime scan (`~/.claude/projects/**`) | ⚠️ coarse | ✅ any version | small | med (30-day files, many dirs) | Fallback for old versions; history |
| E | Hooks (`SessionStart`/`Stop`/`SessionEnd`/`PreToolUse`…) writing our own registry | ✅ | ✅ | medium | high *if configured* — but requires editing the user's `~/.claude/settings.json` (invasive; breaks if user edits/clears it) | Skip for passive tracking; good for *event* features (per-session activity feed). Prior art: `eyes-on-claude-code` menubar app is built entirely on this |
| F | Statusline command tap | ✅ | ⚠️ | medium | low (only sessions with a statusline) | No |
| G | Daemon/peer-protocol internals | — | — | — | undocumented | No |

Notes on E (verified payload details): every hook receives JSON on stdin with `session_id` (underscore naming), `prompt_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name` — no `gitBranch` (derive from `cwd`). `SessionStart` matchers: `startup`/`resume`/`clear`/`compact`/`fork`; `SessionEnd` matchers: `clear`/`resume`/`logout`/`prompt_input_exit`/`other`. Docs state hooks fire in *all* hosts: terminal, IDE extensions, Desktop app, web — so a `SessionStart`/`SessionEnd` pair could maintain a perfect registry. But Usage Pulse shouldn't need to mutate the user's Claude config just to *observe* it; keep as an opt-in "deep activity feed" later.

Also confirmed: the **Agent SDK has no cross-session listing API** (each SDK instance manages only its own session) — reading the registry files / `claude agents --json` is genuinely the only external enumeration path.

---

## 4. What each signal gives the UI

Per session (all from one registry read + one `ps` snapshot):

- **Identity**: `sessionId`, display `name` (+ `nameSource`, `formerNames`)
- **Project**: `cwd` → project label; basename for compact display
- **State**: `status` (busy/idle), `updatedAt`/`statusUpdatedAt` → "last activity Xs ago", idle detection
- **Lifetime**: `startedAt` → uptime; `kind` + `entrypoint` → badge (terminal / headless / background / bg)
- **Host**: terminal app via PPID walk (Ghostty / iTerm2 / VS Code icon — we already have `renderTerminalIcon` in the scheduling page); VS Code workspace correlation via `ide/*.lock`
- **Version**: `version` per session (user runs mixed 2.1.240/2.1.241 today)

---

## 5. Recommended design for Usage Pulse

```ts
// main process, ~150 LOC, no deps
SessionTracker {
  // 1. live: watch the registry
  fs.watch(`${claudeConfigDir}/sessions`)         // add/change/unlink → parse <pid>.json
    → sessions.set(pid, parsed)                    // lenient parse: unknown fields ignored

  // 2. guard against stale/crashed entries (every event + 30s)
  for each session: process.kill(pid, 0)           // ESRCH ⇒ drop
    optional: match procStart vs ps lstart field   // PID-reuse guard

  // 3. enrich (cached ps snapshot per refresh, ~50ms)
  ps -axo pid,ppid,comm → walk ppid chain to *.app → terminalApp
  read ide/*.lock (debounced) → vscodeWorkspace correlation

  // 4. reconcile every 30s
  pgrep -x claude (resolve symlinks) vs registry keys
    → processes without registry file: emit minimal entry {pid, cwd via lsof, terminal}
      (covers old CLI versions)
  every 5 min: claude agents --json → assert parity; log drift
}
```

- Respect `CLAUDE_CONFIG_DIR` (env override; default `~/.claude`) — same code then also works for embedders' custom dirs.
- The dir is `0700` but same-user — an Electron main process reads it fine; no permissions prompt on macOS. (Sandboxed app would need `com.apple.security.temporary-exception.files.absolute-path` — Usage Pulse is unsandboxed.)
- Never write to anything under `~/.claude`.
- UI: idle sessions dim / busy sessions highlighted; "last activity" from `updatedAt`; per-session busy-time feeds the existing usage views naturally.

## 6. Remote (VS Code Remote-SSH) — the honest limits

What actually happens with `code --remote ssh://…` + claude in the integrated terminal:

- The CLI process runs **on the remote host** (inside its `~/.vscode-server` environment). Nothing named `claude` ever runs on the Mac.
- `~/.claude` (registry, transcripts, lock files) lives in the **remote** home directory. The `ide/*.lock` for that window is written on the **remote** FS too (the extension host runs remotely).
- Local traces on the Mac: the `ssh` transport process (VS Code's `code` / `ssh` child, often with `-D`/forwarded ports), and VS Code's port-forward UI. There is **no local port to probe** — the CLI doesn't listen on any socket (verified: `lsof -iTCP -a -p <claude-pid>` shows only outbound HTTPS).

So local detection is impossible by construction. Realistic options, best first:

1. **Accept + label**: detect "VS Code window with an SSH remote is open" (lock files are absent, but `ps` shows the `ssh`/remote-CLI processes) and show a "remote session (untracked)" hint. Cheapest, honest.
2. **SSH polling from the app**: user registers remotes (host aliases from `~/.ssh/config`); tracker runs `ssh <host> claude agents --json` (or `ls ~/.claude/sessions/`) on an interval. Requires key-based auth + the CLI installed remotely. Display with a `remote:` badge and the host name. Works well in Electron main process; ~30–60 s cadence.
3. **Push from the remote**: tiny cron/launchd *on the remote* that POSTs `claude agents --json` to the app's local HTTP listener (needs the Mac reachable from the remote — usually isn't from laptops). Only sensible if remotes are on LAN.

Recommendation: ship (1) now, add (2) behind a "Remotes" settings section if remote visibility matters day-to-day.

## 7. Prior art

- [eyes-on-claude-code](https://github.com/joe-re/eyes-on-claude-code) — menubar dashboard, built on Claude Code **hooks** (approach E)
- [claude-code-monitor](https://github.com/onikan27/claude-code-monitor) — real-time multi-session TUI monitor
- [agtrace](https://www.reddit.com/r/ClaudeAI/comments/1q10up0/) — local terminal dashboard for live sessions
- JetBrains "Claude Code Sessions" plugin — IDE-side session list
- ccusage (npm) — transcript-based usage analytics (approach D), not live-session focused
- Official docs: [sessions](https://code.claude.com/docs/en/sessions) · [agent view](https://code.claude.com/docs/en/agent-view) · [hooks](https://code.claude.com/docs/en/hooks) · [statusline](https://code.claude.com/docs/en/statusline)

## 8. Open questions

- Exact version floor for the registry / `claude agents --json` (verified 2.1.240+; agent-view docs suggest ~2.1.2xx era). Mitigation: approaches B+C already cover older versions.
- Whether extension-panel sessions (VS Code sidebar) use a distinct `entrypoint` value (`ide`/`vscode`? — not observed locally; docs research suggests such values exist). The lenient parser handles it either way.
- Windows/Linux parity: same `~/.claude` layout under `%USERPROFILE%\.claude` / `~/.claude`; PPID walk needs `wmic`/`/proc` equivalents — fine to ship macOS-first.

---

*Sources: live inspection on this machine (2026-08-23, Claude Code 2.1.240/2.1.241) + official docs — [sessions](https://code.claude.com/docs/en/sessions), [claude-directory](https://code.claude.com/docs/en/claude-directory), [hooks](https://code.claude.com/docs/en/hooks), [agent view](https://code.claude.com/docs/en/agent-view), [VS Code](https://code.claude.com/docs/en/vs-code).*
