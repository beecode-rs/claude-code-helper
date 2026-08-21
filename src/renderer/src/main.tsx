import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { UsageDashboard } from '#src/renderer/src/ui-component/usage-dashboard/usage-dashboard'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <UsageDashboard />
  </StrictMode>,
)
