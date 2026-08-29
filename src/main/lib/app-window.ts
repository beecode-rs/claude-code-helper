import { BrowserWindow, app, shell } from 'electron'
import { join } from 'node:path'

export type WindowVisibilityChangeListener = (params: { isVisible: boolean }) => void

export const appWindow = {
  _resolveWindowIconPath(): string | undefined {
    switch (process.platform) {
      case 'linux': {
        return join(__dirname, '../../build/icons/512x512.png')
      }
      case 'win32': {
        return join(__dirname, '../../build/icons/256x256.png')
      }
      default: {
        return undefined
      }
    }
  },

  _setDevelopmentDockIcon(): void {
    if (app.isPackaged || process.platform !== 'darwin') {
      return
    }

    app.dock?.setIcon(join(__dirname, '../../build/icons/512x512.png'))
  },

  _watchVisibility(params: { browserWindow: BrowserWindow; onVisibilityChange: WindowVisibilityChangeListener }): void {
    const notifyVisible = (): void => {
      params.onVisibilityChange({ isVisible: true })
    }

    const notifyHidden = (): void => {
      params.onVisibilityChange({ isVisible: false })
    }

    params.browserWindow.on('show', notifyVisible)
    params.browserWindow.on('restore', notifyVisible)
    params.browserWindow.on('hide', notifyHidden)
    params.browserWindow.on('minimize', notifyHidden)
  },

  create: (params?: { onVisibilityChange?: WindowVisibilityChangeListener }): BrowserWindow => {
    appWindow._setDevelopmentDockIcon()

    const browserWindow = new BrowserWindow({
      height: 680,
      icon: appWindow._resolveWindowIconPath(),
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

    if (params?.onVisibilityChange !== undefined) {
      appWindow._watchVisibility({ browserWindow, onVisibilityChange: params.onVisibilityChange })
    }

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
