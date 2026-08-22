export type OsPlatform = 'linux' | 'macos' | 'windows'

export const osUtil = {
  resolvePlatform: (): OsPlatform => {
    switch (process.platform) {
      case 'darwin': {
        return 'macos'
      }

      case 'linux': {
        return 'linux'
      }

      case 'win32': {
        return 'windows'
      }

      default: {
        throw new Error(`Unsupported process.platform value: '${process.platform}'`)
      }
    }
  },
}
