import { type ReactElement, useState } from 'react'

import { AboutPage } from '#src/renderer/src/ui-component/about/about-page'
import '#src/renderer/src/ui-component/app-shell/app-shell.css'
import { DevelopmentPage } from '#src/renderer/src/ui-component/development/development-page'
import { type ISideMenuItem, SideMenu } from '#src/renderer/src/ui-component/side-menu/side-menu'
import { UsageDashboard } from '#src/renderer/src/ui-component/usage-dashboard/usage-dashboard'
import { envUtil } from '#src/renderer/src/util/env-util'
import { sideMenuPrefsUtil } from '#src/renderer/src/util/side-menu-prefs-util'

type AppViewId = 'about' | 'development' | 'usage'

const MENU_ICONS: Record<AppViewId, ReactElement> = {
  about: (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="16" y2="12" />
      <line x1="12" x2="12.01" y1="8" y2="8" />
    </svg>
  ),
  development: (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  ),
  usage: (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <polyline points="3 12 7 12 10 5 14 19 17 12 21 12" />
    </svg>
  ),
}

const BASE_MENU_ITEMS: ISideMenuItem<AppViewId>[] = [
  { icon: MENU_ICONS.usage, id: 'usage', label: 'Usage' },
  { icon: MENU_ICONS.about, id: 'about', label: 'About' },
]

const resolveMenuItems = (): ISideMenuItem<AppViewId>[] => {
  if (!envUtil.isDevelopment) {
    return BASE_MENU_ITEMS
  }

  return [...BASE_MENU_ITEMS, { icon: MENU_ICONS.development, id: 'development', label: 'Development' }]
}

const MENU_ITEMS = resolveMenuItems()

export const AppShell = (): ReactElement => {
  const [activeViewId, setActiveViewId] = useState<AppViewId>('usage')
  const [isCollapsed, setIsCollapsed] = useState<boolean>(sideMenuPrefsUtil.loadIsCollapsed)

  const handleSelectItem = (viewId: AppViewId): void => {
    setActiveViewId(viewId)
  }

  const handleToggleCollapse = (): void => {
    const nextIsCollapsed = !isCollapsed

    setIsCollapsed(nextIsCollapsed)
    sideMenuPrefsUtil.saveIsCollapsed({ isCollapsed: nextIsCollapsed })
  }

  const renderActiveView = (): ReactElement => {
    switch (activeViewId) {
      case 'about': {
        return <AboutPage />
      }

      case 'development': {
        return <DevelopmentPage />
      }

      case 'usage': {
        return <UsageDashboard />
      }

      default: {
        throw new Error(`unsupported view: ${String(activeViewId)}`)
      }
    }
  }

  return (
    <div className="app-shell">
      <SideMenu
        activeItemId={activeViewId}
        isCollapsed={isCollapsed}
        items={MENU_ITEMS}
        onSelectItem={handleSelectItem}
        onToggleCollapse={handleToggleCollapse}
        title="Usage Pulse"
      />
      <div className="app-shell-content">{renderActiveView()}</div>
    </div>
  )
}
