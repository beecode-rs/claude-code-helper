import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { errorUtil } from '#src/main/util/error-util'
import { objectUtil } from '#src/main/util/object-util'

const execFileAsync = promisify(execFile)

export class ClaudeSystemTokenService {
  async resolveAccessToken(): Promise<string> {
    this._assertMacOsPlatform()

    const keychainJson = await this._readKeychainCredentialsJson()

    return this._extractAccessToken({ keychainJson })
  }

  protected _assertMacOsPlatform(): void {
    if (process.platform !== 'darwin') {
      throw new Error('Reading the Claude token from the system is only supported on macOS for now')
    }
  }

  protected async _readKeychainCredentialsJson(): Promise<string> {
    try {
      const { stdout } = await execFileAsync(
        'security',
        ['find-generic-password', '-s', 'Claude Code-credentials', '-w'],
        { timeout: 30000 },
      )

      return stdout.trim()
    } catch (error) {
      throw new Error(
        `reading 'Claude Code-credentials' from the macOS Keychain failed: ${this._resolveKeychainErrorMessage(error)}`,
      )
    }
  }

  protected _resolveKeychainErrorMessage(error: unknown): string {
    const stderr = (error as { stderr?: unknown }).stderr

    if (typeof stderr === 'string' && stderr.trim() !== '') {
      return stderr.trim()
    }

    return errorUtil.resolveMessage(error)
  }

  protected _extractAccessToken(params: { keychainJson: string }): string {
    const credentialsRecord = this._parseCredentialsRecord({ keychainJson: params.keychainJson })
    const oauthRecord = objectUtil.asRecord(credentialsRecord['claudeAiOauth'])
    const accessToken = oauthRecord?.['accessToken']

    if (typeof accessToken === 'string' && accessToken.trim() !== '') {
      return accessToken.trim()
    }

    throw new Error("'Claude Code-credentials' keychain entry is missing a usable claudeAiOauth.accessToken")
  }

  protected _parseCredentialsRecord(params: { keychainJson: string }): Record<string, unknown> {
    try {
      return JSON.parse(params.keychainJson) as Record<string, unknown>
    } catch {
      throw new Error("'Claude Code-credentials' keychain entry is not valid JSON")
    }
  }
}
