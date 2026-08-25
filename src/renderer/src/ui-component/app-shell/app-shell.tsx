import { type ReactElement, useEffect, useState } from 'react'

import { usageClientService } from '#src/renderer/src/business/service/usage-client-service'
import { AboutPage } from '#src/renderer/src/ui-component/about/about-page'
import '#src/renderer/src/ui-component/app-shell/app-shell.css'
import { DashboardPage } from '#src/renderer/src/ui-component/dashboard/dashboard-page'
import { DevelopmentPage } from '#src/renderer/src/ui-component/development/development-page'
import { SchedulingPage } from '#src/renderer/src/ui-component/scheduling/scheduling-page'
import { SessionsPage } from '#src/renderer/src/ui-component/sessions/sessions-page'
import { type ISideMenuItem, SideMenu } from '#src/renderer/src/ui-component/side-menu/side-menu'
import { UsageDashboard } from '#src/renderer/src/ui-component/usage-dashboard/usage-dashboard'
import { developmentPrefsUtil } from '#src/renderer/src/util/development-prefs-util'
import { sideMenuPrefsUtil } from '#src/renderer/src/util/side-menu-prefs-util'
import type { IAppSettings } from '#src/shared/settings-model'

type AppViewId = 'about' | 'dashboard' | 'development' | 'scheduling' | 'sessions' | 'usage'

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
  dashboard: (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <rect height="7" rx="1" width="7" x="3" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="3" />
      <rect height="7" rx="1" width="7" x="14" y="14" />
      <rect height="7" rx="1" width="7" x="3" y="14" />
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
  scheduling: (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  sessions: (
    <svg
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
      viewBox="0 0 24 24"
    >
      <rect height="13" rx="2" width="20" x="2" y="3" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="16" y2="21" />
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

const resolveMenuItems = (params: {
  isDevelopmentUnlocked: boolean
  isSchedulingLive: boolean
  isSessionsLive: boolean
  isUsageLive: boolean
}): ISideMenuItem<AppViewId>[] => {
  const menuItems: ISideMenuItem<AppViewId>[] = [
    { icon: MENU_ICONS.dashboard, id: 'dashboard', label: 'Dashboard' },
    { icon: MENU_ICONS.usage, id: 'usage', isLive: params.isUsageLive, label: 'Usage' },
    { icon: MENU_ICONS.scheduling, id: 'scheduling', isLive: params.isSchedulingLive, label: 'Scheduling' },
    { icon: MENU_ICONS.sessions, id: 'sessions', isLive: params.isSessionsLive, label: 'Sessions' },
    { icon: MENU_ICONS.about, id: 'about', label: 'About' },
  ]

  if (!params.isDevelopmentUnlocked) {
    return menuItems
  }

  return [...menuItems, { icon: MENU_ICONS.development, id: 'development', label: 'Development' }]
}

const resolveIsUsageLive = (params: { settings?: IAppSettings }): boolean => {
  const trackers = params.settings?.trackers ?? []

  return trackers.some((tracker) => {
    return !tracker.isAutoRefreshPaused
  })
}

const resolveIsSchedulingLive = (params: { settings?: IAppSettings }): boolean => {
  return params.settings?.isSchedulingEnabled === true
}

const resolveIsSessionsLive = (params: { settings?: IAppSettings }): boolean => {
  return params.settings?.isSessionsAutoRefreshPaused === false
}

export const AppShell = (): ReactElement => {
  const [activeViewId, setActiveViewId] = useState<AppViewId>('dashboard')
  const [isCollapsed, setIsCollapsed] = useState<boolean>(sideMenuPrefsUtil.loadIsCollapsed)
  const [isDevelopmentUnlocked, setIsDevelopmentUnlocked] = useState<boolean>(developmentPrefsUtil.loadIsUnlocked)
  const [settings, setSettings] = useState<IAppSettings | undefined>(undefined)

  useEffect(() => {
    const loadSettings = async (): Promise<void> => {
      try {
        setSettings(await usageClientService.getSettings())
      } catch {
        return
      }
    }

    void loadSettings()

    return usageClientService.subscribeToSettingsUpdates({
      onUpdate: (nextSettings) => {
        setSettings(nextSettings)
      },
    })
  }, [])

  const handleSelectItem = (viewId: AppViewId): void => {
    setActiveViewId(viewId)
  }

  const handleToggleDevelopmentUnlock = (): void => {
    const nextIsDevelopmentUnlocked = !isDevelopmentUnlocked

    setIsDevelopmentUnlocked(nextIsDevelopmentUnlocked)
    developmentPrefsUtil.saveIsUnlocked({ isUnlocked: nextIsDevelopmentUnlocked })
  }

  const handleToggleCollapse = (): void => {
    const nextIsCollapsed = !isCollapsed

    setIsCollapsed(nextIsCollapsed)
    sideMenuPrefsUtil.saveIsCollapsed({ isCollapsed: nextIsCollapsed })
  }

  const renderActiveView = (): ReactElement => {
    switch (activeViewId) {
      case 'about': {
        return <AboutPage onToggleDevelopmentUnlock={handleToggleDevelopmentUnlock} />
      }

      case 'dashboard': {
        return <DashboardPage onNavigate={handleSelectItem} />
      }

      case 'development': {
        return <DevelopmentPage />
      }

      case 'scheduling': {
        return <SchedulingPage />
      }

      case 'sessions': {
        return <SessionsPage />
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
        items={resolveMenuItems({
          isDevelopmentUnlocked,
          isSchedulingLive: resolveIsSchedulingLive({ settings }),
          isSessionsLive: resolveIsSessionsLive({ settings }),
          isUsageLive: resolveIsUsageLive({ settings }),
        })}
        onSelectItem={handleSelectItem}
        onToggleCollapse={handleToggleCollapse}
        title="Usage Pulse"
      />
      <div className="app-shell-content">{renderActiveView()}</div>
    </div>
  )
}
