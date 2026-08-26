export interface IUpdateStatus {
  currentVersion: string
  isUpdateAvailable: boolean
  latestVersion?: string
  releaseUrl?: string
}

export type UpdateStatusListener = (status: IUpdateStatus) => void
