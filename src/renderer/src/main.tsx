import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { AppShell } from '#src/renderer/src/ui-component/app-shell/app-shell'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppShell />
  </StrictMode>,
)
