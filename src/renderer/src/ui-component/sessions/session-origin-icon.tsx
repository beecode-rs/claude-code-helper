import type { ReactElement } from 'react'

import { LocalIcon } from '#src/renderer/src/ui-component/icon/local-icon'
import { ServerIcon } from '#src/renderer/src/ui-component/icon/server-icon'

export const SessionOriginIcon = (props: { isRemote: boolean }): ReactElement => {
  if (props.isRemote) {
    return <ServerIcon />
  }

  return <LocalIcon />
}
