const STORAGE_KEY = 'development.is-unlocked'

export const developmentPrefsUtil = {
  loadIsUnlocked: (): boolean => {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  },
  saveIsUnlocked: (params: { isUnlocked: boolean }): void => {
    window.localStorage.setItem(STORAGE_KEY, String(params.isUnlocked))
  },
}
