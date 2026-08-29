import { app } from 'electron'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const devDesktopEntry = {
  install(): void {
    if (app.isPackaged || process.platform !== 'linux') {
      return
    }

    const entryLines = [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Usage Pulse (Dev)',
      `Exec=${process.execPath} ${app.getAppPath()}`,
      `Icon=${join(app.getAppPath(), 'build/icons/512x512.png')}`,
      `StartupWMClass=${app.getName()}`,
      'Terminal=false',
    ]

    try {
      const applicationsDir = join(app.getPath('home'), '.local/share/applications')
      mkdirSync(applicationsDir, { recursive: true })
      writeFileSync(join(applicationsDir, 'usage-pulse-dev.desktop'), `${entryLines.join('\n')}\n`)
    } catch {
      return
    }
  },
}
