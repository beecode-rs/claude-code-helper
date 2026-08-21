import { BrowserWindow, shell } from 'electron'
import { join } from 'node:path'

export const appWindow = {
  create: (): BrowserWindow => {
    const browserWindow = new BrowserWindow({
      height: 680,
      minHeight: 560,
      minWidth: 760,
      show: false,
      title: 'Usage Pulse',
      webPreferences: {
        contextIsolation: true,
        preload: join(__dirname, '../preload/index.mjs'),
        sandbox: false,
      },
      width: 1000,
    })

    browserWindow.on('ready-to-show', () => {
      browserWindow.show()
    })

    browserWindow.webContents.setWindowOpenHandler((details) => {
      void shell.openExternal(details.url)

      return { action: 'deny' }
    })

    if (process.env.ELECTRON_RENDERER_URL !== undefined) {
      void browserWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
    } else {
      void browserWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return browserWindow
  },
}
