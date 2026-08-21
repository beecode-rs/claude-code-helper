import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import { SettingsService } from '#src/main/business/service/settings-service'
import { type IAppSettings } from '#src/shared/settings-model'

export class SettingsRepo {
  protected readonly _settingsFilePath: string

  constructor(params: { settingsFilePath: string }) {
    this._settingsFilePath = params.settingsFilePath
  }

  async load(): Promise<IAppSettings> {
    const fileContent = await this._readFileContent()

    if (fileContent === undefined) {
      return new SettingsService().createDefaultSettings()
    }

    return new SettingsService().sanitizeSettings({ rawSettings: this._parseJsonContent({ content: fileContent }) })
  }

  async save(params: { settings: IAppSettings }): Promise<void> {
    await mkdir(dirname(this._settingsFilePath), { recursive: true })
    await writeFile(this._settingsFilePath, `${JSON.stringify(params.settings, null, 2)}\n`, 'utf8')
  }

  protected async _readFileContent(): Promise<string | undefined> {
    try {
      return await readFile(this._settingsFilePath, 'utf8')
    } catch (error) {
      if (this._isNotFoundError(error)) {
        return undefined
      }

      throw error
    }
  }

  protected _isNotFoundError(error: unknown): boolean {
    const errnoException = error as NodeJS.ErrnoException

    return errnoException.code === 'ENOENT'
  }

  protected _parseJsonContent(params: { content: string }): unknown {
    try {
      return JSON.parse(params.content)
    } catch {
      return undefined
    }
  }
}
