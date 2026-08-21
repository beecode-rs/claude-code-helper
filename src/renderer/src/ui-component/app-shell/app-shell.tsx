import { type ReactElement, useState } from 'react'

import { AboutPage } from '#src/renderer/src/ui-component/about/about-page'
import '#src/renderer/src/ui-component/app-shell/app-shell.css'
import { SettingsPanel } from '#src/renderer/src/ui-component/settings/settings-panel'
import { type ISideMenuItem, SideMenu } from '#src/renderer/src/ui-component/side-menu/side-menu'
import { UsageDashboard } from '#src/renderer/src/ui-component/usage-dashboard/usage-dashboard'
import { sideMenuPrefsUtil } from '#src/renderer/src/util/side-menu-prefs-util'

type AppViewId = 'about' | 'settings' | 'usage'

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
  settings: (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

const MENU_ITEMS: ISideMenuItem<AppViewId>[] = [
  { icon: MENU_ICONS.usage, id: 'usage', label: 'Usage' },
  { icon: MENU_ICONS.settings, id: 'settings', label: 'Settings' },
  { icon: MENU_ICONS.about, id: 'about', label: 'About' },
]

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

      case 'settings': {
        return <SettingsPanel />
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
