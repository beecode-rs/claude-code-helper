# Research: OS-level task scheduling for Usage Pulse

**Goal:** trigger a lightweight "cloud ping" (a trivial API call to the configured providers, e.g. asking *"What is your name?"*) at configurable times of day — at least 3×/day on weekdays, optionally on weekends — with the schedule fully controllable from the app (add/remove/change times, pause), plus a visible history of when pings actually fired.

**Date:** 2026-08-23
**Context:** Usage Pulse is an Electron app (`electron-vite` + React + TS + pnpm). Today the main process quits when the window closes (`src/main/index.ts:12` — `window-all-closed` → `app.quit()`), there is no tray/background mode, and all state lives in JSON files under `app.getPath('userData')` via `SettingsRepo` / `UsageSnapshotRepo`.

---

## 1. TL;DR recommendation

| Question | Answer |
|---|---|
| Is a crontab the right tool? | On Linux, yes (or better: a systemd **user** timer). On macOS, use **launchd** (LaunchAgent) — cron still works but is legacy and skips jobs missed during sleep. On Windows, use **Task Scheduler** (`schtasks`). |
| Is there one Node library that manages all three? | **No maintained one.** `node-crontab` on npm is abandoned (11 years old, in-process only). The `node-windows`/`node-mac`/`node-linux` trio targets services/daemons, not calendar schedules. In-process libs (`croner`, `node-cron`) don't touch the OS at all. |
| What do we build then? | A thin per-OS **scheduler adapter** (~100–150 LOC each) behind one interface, shelling out to `launchctl` / `schtasks` / `systemctl --user` (cron fallback). No library needed — all three OSes have stable, scriptable, user-level CLIs that need **no admin/root**. |
| What does the OS schedule run? | The app binary itself in a **headless worker mode** (`Usage Pulse --ping`): no window, reads settings, fires the ping, appends to an app-owned JSONL log, exits. This reuses all existing provider/HTTP code. |
| Coarse or fine OS schedule? | **Coarse.** Register only the union of time-of-day slots (daily). Keep weekday/weekend/paused logic in the worker, which reads the same settings JSON as the GUI. Toggling weekends then requires **zero** OS interaction; only changing/adding/removing *times* rewrites OS entries. |
| Where do "logs of when it fired" live? | In **our own** `usage-pulse-ping-log.jsonl` (userData), written by the worker and rendered in a History list in the app. OS-native logs are inconsistent (excellent on systemd, off-by-default on Windows, effectively absent on macOS) — fine for debugging, not for the product feature. |
| Simpler fallback worth shipping too? | An **"only while the app is running"** mode using `croner` in the main process (plus tray + "start at login"). Much less code, but pings stop whenever the app isn't running. Good as a low-friction default before the OS adapters land. |

---

## 2. The fundamental decision: in-app timer vs OS scheduler

The single question that drives everything: **must pings fire when the app is NOT running?**

**Option A — in-process scheduler (`croner` / `node-cron` / `node-schedule` in the main process)**
- ✅ Trivial to implement, trivially "controlled through the app", no OS permissions, identical on all platforms.
- ❌ Fires only while the app runs. Today the app quits on window close — pings would silently stop. Rescuing this needs: tray/background mode (`window-all-closed` no longer quits), "start at login" (`app.setLoginItemSettings`), and even then a reboot where the user never opens the app = missed pings.
- ❌ Sleep/wake behavior is library-dependent: `croner` re-evaluates wall-clock after wake and catches up; `node-cron`/`node-schedule` are timer-based and can miss intervals across sleep.

**Option B — OS-native scheduler entries that invoke the app headlessly**
- ✅ Fires per calendar time regardless of whether the GUI is open (assuming the user is logged in; details per OS below).
- ✅ Survives app updates as long as the executable path is stable.
- ✅ Each OS also gives catch-up-on-wake semantics *if configured correctly* (launchd does it natively; Windows needs `StartWhenAvailable`; systemd needs `Persistent=true`; plain cron never does).
- ❌ More code: three adapters, plus a headless worker mode in the main process.

For a usage/keep-alive ping whose whole point is "happened at 9:00, 13:00, 17:00 today", **Option B is the honest answer** — with Option A as a first increment or a user-selectable fallback mode. Everything below details Option B per OS.

---

## 3. Per-OS deep dive

### 3.1 macOS — launchd (LaunchAgent)

`launchd` is the native scheduler; cron still exists but is legacy and, like classic cron everywhere, **skips** runs missed while the machine sleeps. launchd instead **coalesces missed runs and fires once on wake** — exactly what a ping wants.

An agent is a plist dropped in `~/Library/LaunchAgents/` — user-level, **no root, no privileges** needed. Multiple times per day is natively supported via an **array** under `StartCalendarInterval`:

```xml
<!-- ~/Library/LaunchAgents/com.usage-pulse.ping.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.usage-pulse.ping</string>

  <key>ProgramArguments</key>
  <array>
    <string>/Applications/Usage Pulse.app/Contents/MacOS/Usage Pulse</string>
    <string>--ping</string>
  </array>

  <!-- one dict per time-of-day slot; Weekday key exists but we keep schedules coarse -->
  <key>StartCalendarInterval</key>
  <array>
    <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Hour</key><integer>13</integer><key>Minute</key><integer>0</integer></dict>
    <dict><key>Hour</key><integer>17</integer><key>Minute</key><integer>0</integer></dict>
  </array>

  <!-- belt-and-braces stdout/stderr capture; the worker also writes structured JSONL -->
  <key>StandardOutPath</key>
  <string>/Users/USERNAME/Library/Application Support/usage-pulse/ping-launchd.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/USERNAME/Library/Application Support/usage-pulse/ping-launchd.err.log</string>
</dict>
</plist>
```

Programmatic control from the app (all via `node:child_process.execFile`, no sudo):

```bash
# register / update
launchctl bootout  gui/$(id -u) ~/Library/LaunchAgents/com.usage-pulse.ping.plist 2>/dev/null || true
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.usage-pulse.ping.plist

# inspect (is it loaded?)
launchctl print gui/$(id -u)/com.usage-pulse.ping

# remove
launchctl bootout gui/$(id -u)/~/Library/LaunchAgents/com.usage-pulse.ping.plist
rm ~/Library/LaunchAgents/com.usage-pulse.ping.plist
```

Notes:
- `StartCalendarInterval` also supports a `Weekday` key (0 and 7 = Sunday, 1 = Monday …), so "weekdays only" *is* expressible in the plist. We deliberately don't use it — see §5 (coarse schedule, smart worker).
- **No built-in run history.** There's no user-facing "last ran" for launchd jobs (only unified logging: `log show --predicate 'process == "launchd"'`, impractical). Our own JSONL log is the audit trail.
- On sleep: missed intervals coalesce into **one** firing on wake. If a stale 09:00 ping firing at 11:47 bothers us, the worker can compare "now" vs the slot and exit early — cheap, since it already loads settings.

### 3.2 Windows — Task Scheduler (`schtasks`)

Windows Task Scheduler is the native mechanism and has a first-class CLI. Current-user tasks need **no elevation**.

```bat
:: create one task per time slot (weekly on weekdays)
schtasks /create /tn "UsagePulse Ping 0900" /tr "\"C:\Users\USERNAME\AppData\Local\Programs\Usage Pulse\Usage Pulse.exe\" --ping" /sc weekly /d MON,TUE,WED,THU,FRI /st 09:00 /f

schtasks /create /tn "UsagePulse Ping 1300" /tr "..." /sc weekly /d MON,TUE,WED,THU,FRI /st 13:00 /f

:: list our tasks with last/next run time and last exit code
schtasks /query /tn "UsagePulse Ping 0900" /v /fo list

:: remove
schtasks /delete /tn "UsagePulse Ping 0900" /f
```

Notes:
- `schtasks /create` supports exactly **one trigger per task** → one task per time slot, named deterministically (`UsagePulse Ping HHMM`) so add/remove/list is a simple prefix match. If we ever want multi-trigger single tasks, PowerShell's `Register-ScheduledTask` accepts an **array** of triggers — but N tiny tasks are simpler to reason about and to clean up.
- **Missed-run catch-up is opt-in**: set "Run task as soon as possible after a scheduled start is missed" (`StartWhenAvailable`). Not exposed by basic `schtasks` flags — set it via PowerShell or by importing XML. Same for power conditions: on laptops, tasks default to *AC power only* + *no wake*; a battery-running machine silently skips. For a ping app we should clear the AC-only condition.
- **History is off by default**: Task Scheduler's Event Viewer history must be enabled manually per machine. `schtasks /query /v` at least reports `Last Run Time`, `Next Run Time`, `Last Result` per task — enough for a health check, not a real log. Again: app-owned JSONL is the answer.
- macOS-equiv note: there is no sleep on desktop Windows in the laptop-lid sense worth designing around beyond the above; wake-from-scheduled-sleep requires `wake to run` which we should NOT enable for a ping app.

### 3.3 Linux — systemd user timer (preferred), cron (fallback)

**systemd user timers** are the modern answer: no root, calendar syntax that expresses "weekdays, three times" in **one line**, missed-run recovery, and journald logging per unit.

```ini
# ~/.config/systemd/user/usage-pulse-ping.service
[Unit]
Description=Usage Pulse scheduled ping

[Service]
Type=oneshot
ExecStart=/usr/local/bin/usage-pulse --ping
# journald captures stdout/stderr of every run automatically
```

```ini
# ~/.config/systemd/user/usage-pulse-ping.timer
[Unit]
Description=Run Usage Pulse ping on schedule

[Timer]
# weekdays only, 09:00 13:00 17:00 — one line
OnCalendar=Mon..Fri 09:00,13:00,17:00
# catch up a missed run (e.g. machine was off) at next opportunity
Persistent=true

[Install]
WantedBy=timers.target
```

```bash
systemctl --user daemon-reload
systemctl --user enable --now usage-pulse-ping.timer

systemctl --user list-timers usage-pulse-ping.timer     # next/last elapse
journalctl --user -u usage-pulse-ping.service           # full per-run logs

# remove
systemctl --user disable --now usage-pulse-ping.timer
rm ~/.config/systemd/user/usage-pulse-ping.{service,timer} && systemctl --user daemon-reload
```

Notes:
- During suspend, timers don't fire; on wake, a missed realtime `OnCalendar` fires once (coalesced), and `Persistent=true` additionally recovers runs missed while the machine was off.
- User units run while the user has a session; `loginctl enable-linger $USER` makes them run from boot even before login — optional hardening, probably unnecessary for a desktop ping app.
- **cron fallback** (non-systemed distros, rare in 2026): manage a marked block in the user crontab so we're a polite citizen:

```bash
# read current, splice our block between markers, write back
( crontab -l 2>/dev/null | grep -v '#usage-pulse:begin' ... ) — or simply:
# 0 9,13,17 * * 1-5  /usr/local/bin/usage-pulse --ping  # inside marker block
```

Plain cron **skips** runs missed during sleep — acceptable fallback, and another reason the worker-side stale-check exists. cron logs go to syslog only; no per-job history.

---

## 4. Cross-platform libraries evaluated (and why they lose to ~400 LOC of adapters)

| Library | What it actually is | Verdict |
|---|---|---|
| [`node-crontab`](https://www.npmjs.com/package/node-crontab) | Despite the name: an **in-process** cron-syntax scheduler, last published **11 years ago** (v0.0.8), CommonJS, effectively abandoned | ❌ Dead, and doesn't touch the OS crontab anyway |
| [`node-windows`](https://github.com/coreybutler/node-windows) + `node-mac`/`node-linux` | Wrappers for **services/daemons/event logs** (Windows services, launchd daemons, init.d) | ❌ Wrong abstraction — long-running services, not calendar-scheduled one-shots; heterogeneous APIs |
| [`croner`](https://www.npmjs.com/package/croner) / [`node-cron`](https://www.npmjs.com/package/node-cron) / `node-schedule` | In-process schedulers (croner: zero-dep, actively maintained, handles post-sleep catch-up correctly; node-schedule stale since 2023) | ✅ Perfect for **Option A** ("only while app runs" mode) — irrelevant for OS-level scheduling |
| `pm2` / Agenda / BullMQ | Process manager / persistence-backed job queues | ❌ Requires a daemon we'd have to install and babysit on user machines; massive overkill for 3 pings/day |

**Conclusion:** there is no credible "one dependency, three OSes, real OS scheduler" library. But the underlying CLIs (`launchctl`, `schtasks`, `systemctl --user`) are stable, documented, user-level, and parseable — a per-platform adapter is small, testable, and dependency-free. This also matches the app's existing clean architecture (see §5).

---

## 5. Recommended architecture for Usage Pulse

### 5.1 Headless worker mode (`--ping`)

The OS scheduler starts the app binary itself with a flag. In `src/main/index.ts`, parse `process.argv` **before** `app.whenReady()`:

```ts
if (process.argv.includes('--ping')) {
  void runPingWorker()          // no BrowserWindow, ever
    .catch(handleBootstrapError)
    .finally(() => app.exit(0)) // explicit exit; never falls through to GUI boot
} else {
  void app.whenReady().then(bootstrapApp).catch(handleBootstrapError)
}
```

The worker:
1. `app.dock?.hide()` (macOS — no Dock bounce).
2. Loads settings via the existing `SettingsRepo` (path: `userData/usage-pulse-settings.json`).
3. Applies the **fine-grained rules the OS doesn't know about**: schedule enabled? does today's weekday/weekend list include this slot? is the slot stale (now ≫ slot time, e.g. wake-catch-up at 11:47 for a 09:00 slot — skip if > ~30 min late)? which trackers/providers to ping?
4. Sends the trivial prompt (e.g. *"What is your name?"*) to each configured provider, reusing `httpUtil` / the provider endpoints already used for usage polling.
5. Appends one structured line to `userData/usage-pulse-ping-log.jsonl`:

```json
{"timestamp":"2026-08-24T09:00:03+02:00","slot":"09:00","trigger":"os-schedule","provider":"claude","ok":true,"durationMs":812,"error":null}
{"timestamp":"2026-08-24T09:00:04+02:00","slot":"09:00","trigger":"os-schedule","provider":"zai","ok":false,"durationMs":15001,"error":"timeout"}
```

6. `app.exit(0)` (non-zero on failure — gives `schtasks Last Result` / systemd something truthful to report).

This design means: the "what days, is it paused, what question, which providers" controls are **pure app settings** — the UI changes behavior instantly with no OS calls. Only the **set of time-of-day slots** is registered with the OS (as the *union* of weekday + weekend times, firing daily; the worker filters by day-type).

### 5.2 Scheduler adapter (fits the existing service/repo layout)

```
src/main/business/service/
  ping-schedule-service.ts        # owns settings ↔ adapter orchestration, run-log repo access
src/main/business/repo/
  ping-run-log-repo.ts            # append/read JSONL (mirror of usage-snapshot-repo)
src/main/infra/scheduler/
  os-scheduler-adapter.ts         # interface + platform factory (process.platform)
  launchd-scheduler-adapter.ts    # write plist + launchctl bootstrap/bootout
  task-scheduler-adapter.ts       # schtasks /create /query /delete (one task per slot)
  systemd-scheduler-adapter.ts    # write user units + systemctl --user
```

```ts
export interface IOsSchedulerAdapter {
  /** register the union of daily HH:MM slots (idempotent full replace) */
  applySlots(params: { slots: string[] }): Promise<void>
  removeSchedule(): Promise<void>
  /** health check for the UI: registered? last OS-side run/result if knowable */
  inspectSchedule(): Promise<IOsScheduleInspection>
}
```

Executable path resolution: `process.execPath` when `app.isPackaged`; in dev, `[process.execPath, app.getAppPath(), '--ping']` (electron binary + repo). The GUI shows the resolved command so users can see exactly what will run.

### 5.3 Settings model + IPC + UI

`settings-model.ts` addition:

```ts
export interface IPingScheduleConfig {
  enabled: boolean
  mode: 'os-schedule' | 'app-running'   // Option B vs Option A
  prompt: string                        // default: "What is your name?"
  weekdayTimes: string[]                // ['09:00', '13:00', '17:00']
  weekendTimes: string[]                // [] = no weekend pings
  skipIfLateMinutes: number             // stale-slot guard, default 30
}
```

`ipc-channel.ts` additions: `PING_SCHEDULE_GET`, `PING_SCHEDULE_SAVE`, `PING_LOG_LIST` (paged read of the JSONL tail), `PING_RUN_NOW` (manual trigger — also great for testing the worker), `PING_OS_INSPECT`.

UI: a new side-menu page — schedule editor (time chips per day-type, enable toggle, mode toggle) + History table (timestamp, slot, provider, ok/error, duration) fed by the run-log repo. The "3×/day weekdays, maybe weekends" requirement is literally two chip lists.

### 5.4 Optional Option A mode ("only while app is running")

If `mode === 'app-running'`: a `PingTimerService` in the main process uses `croner` (zero-dep, correct post-sleep catch-up) with the same settings/log writer, and the adapter is never installed (any existing OS schedule is removed). This mode pairs naturally with a future tray/background mode — but as of today, with the app quitting on window close, it should be clearly labeled "pings only fire while Usage Pulse is open".

---

## 6. Behavior matrices

### Missed runs (sleep / powered off)

| Mechanism | While asleep | After wake / power-on |
|---|---|---|
| launchd `StartCalendarInterval` | doesn't fire | ✅ fires missed job **once** (coalesced) on wake |
| Windows Task Scheduler | doesn't fire | ⚠️ only with `StartWhenAvailable` set; ⚠️ default AC-power-only condition silently skips laptops on battery |
| systemd user timer + `Persistent=true` | doesn't fire | ✅ coalesced catch-up on wake; catches machine-was-off runs |
| plain cron (any OS) | doesn't fire | ❌ run is simply lost |
| croner (in-process) | n/a (app suspended too) | ✅ re-evaluates and catches up, app running required |

### Where "when did it fire" is visible

| Mechanism | Native log of runs |
|---|---|
| launchd | effectively none (unified log only) |
| schtasks | `Last Run Time` / `Last Result` via `/query /v`; History in Event Viewer **disabled by default** |
| systemd | ✅ `journalctl --user -u <unit>` — excellent |
| cron | syslog (+ mail) |
| **app-owned JSONL** | ✅ uniform on all three OSes, structured, and already what the History UI reads |

This is why the log is worker-written, not scraped from the OS.

---

## 7. Gotchas checklist

- **Dev vs packaged path** — the adapter must resolve the real executable (`process.execPath` + `app.isPackaged`); a plist/schtasks entry pointing at `node_modules/electron/...` breaks after packaging. Show the resolved command in the UI.
- **Single-instance lock** — the app doesn't use `requestSingleInstanceLock` today; if it ever does, worker mode must bypass or handle it (ping the running instance instead of exiting).
- **Settings written by GUI must be seen by worker** — both use the same `SettingsRepo` file; keep writes atomic (temp file + rename) so a 09:00 worker never reads a half-written JSON.
- **Timezone/DST** — all these schedulers use local wall-clock time; a slot during the repeated/skipped DST hour shifts or doubles once a year. Irrelevant at 3×/day granularity; not worth code.
- **Windows quoting** — `/tr` needs nested quotes around a path with spaces (`\"...exe\" --ping`); test on a real Windows box, not just docs.
- **macOS first-run** — LaunchAgents under `~/Library/LaunchAgents` need no approval dialog (unlike LaunchDaemons); no notarization concerns since we're not installing system-level anything.
- **Uninstall hygiene** — ship removal of OS entries (or at least document the labels/paths: plist label `com.usage-pulse.ping`, task prefix `UsagePulse Ping`, units `usage-pulse-ping.*`) so users can clean up manually.
- **Overlap** — pings are ~1s HTTP calls; a slot overlapping app-start polling is harmless. If the prompt ever grows, add per-provider in-flight dedupe in the worker.

---

## 8. Suggested rollout

1. **Worker mode + run-log repo + History UI** (`--ping`, JSONL, `PING_RUN_NOW`) — testable entirely from the app, no OS involvement yet. Option A `croner` service can ship here as the interim mode.
2. **launchd adapter** (primary dev platform) + schedule editor UI + `PING_OS_INSPECT`.
3. **Task Scheduler adapter** (verify quoting + `StartWhenAvailable` + power conditions on real hardware).
4. **systemd adapter + cron fallback**.
5. Optional: tray/background/auto-launch to make `app-running` mode genuinely useful.

---

## Sources

- [launchd.plist(5) man page — StartCalendarInterval, sleep/wake coalescing](https://www.manpagez.com/man/5/launchd.plist/)
- [Using launchd for scheduling tasks in macOS (seamusdemora)](https://github.com/seamusdemora/seamusdemora.github.io/blob/master/UsingLaunchdForSchedulingTasks.md)
- [launchd examples — StartInterval/StartCalendarInterval (Alvin Alexander)](https://alvinalexander.com/mac-os-x/launchd-plist-examples-startinterval-startcalendarinterval/)
- [Ask Different: launchctl starts job later than StartCalendarInterval](https://apple.stackexchange.com/questions/214696/launchctl-starts-my-plist-job-much-later-than-startcalendarinterval)
- [Super User: launchd — skip invocations after waking from sleep](https://superuser.com/questions/169173/launchd-how-to-skip-invocations-after-waking-from-sleep)
- [Microsoft Learn: schtasks create](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/schtasks-create) · [schtasks delete](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/schtasks-delete)
- [SS64: schtasks reference](https://ss64.com/nt/schtasks.html)
- [ArchWiki: systemd/Timers (OnCalendar, user timers, Persistent)](https://wiki.archlinux.org/title/Systemd/Timers)
- [Unix StackExchange: cron vs systemd timers](https://unix.stackexchange.com/questions/278564/cron-vs-systemd-timers)
- [node-crontab (npm) — abandoned in-process scheduler](https://www.npmjs.com/package/node-crontab)
- [node-windows (coreybutler) — services, not scheduled tasks](https://github.com/coreybutler/node-windows)
- [node-cron (npm)](https://www.npmjs.com/package/node-cron) · [croner (npm)](https://www.npmjs.com/package/croner) · [node-schedule (GitHub)](https://github.com/node-schedule/node-schedule)
- [pkgpulse: node-cron vs node-schedule vs Agenda (2026)](https://www.pkgpulse.com/guides/node-cron-vs-node-schedule-vs-agenda-job-scheduling-2026)
- [LogRocket: comparing Node.js schedulers](https://blog.logrocket.com/comparing-best-node-js-schedulers/)
