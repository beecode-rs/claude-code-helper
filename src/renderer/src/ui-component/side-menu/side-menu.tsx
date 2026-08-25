import { type ReactElement } from 'react'

import '#src/renderer/src/ui-component/side-menu/side-menu.css'

export type ISideMenuItem<ItemId extends string> = {
  icon: ReactElement
  id: ItemId
  isLive?: boolean
  label: string
}

export const SideMenu = <ItemId extends string>(props: {
  activeItemId: ItemId
  isCollapsed: boolean
  items: ISideMenuItem<ItemId>[]
  onSelectItem: (itemId: ItemId) => void
  onToggleCollapse: () => void
  title: string
}): ReactElement => {
  const { activeItemId, isCollapsed, items, onSelectItem, onToggleCollapse, title } = props

  const resolveMenuClassName = (): string => {
    if (isCollapsed) {
      return 'side-menu side-menu-collapsed'
    }

    return 'side-menu'
  }

  const resolveItemClassName = (params: { itemId: ItemId }): string => {
    if (params.itemId === activeItemId) {
      return 'side-menu-item side-menu-item-active'
    }

    return 'side-menu-item'
  }

  const resolveItemTitle = (params: { label: string }): string | undefined => {
    if (isCollapsed) {
      return params.label
    }

    return undefined
  }

  const resolveItemIconClassName = (params: { isLive: boolean }): string => {
    if (params.isLive) {
      return 'side-menu-item-icon side-menu-item-icon-live'
    }

    return 'side-menu-item-icon'
  }

  const renderCollapseIcon = (): ReactElement => {
    if (isCollapsed) {
      return (
        <svg
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )
    }

    return (
      <svg
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        viewBox="0 0 24 24"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    )
  }

  return (
    <nav aria-label="Main navigation" className={resolveMenuClassName()}>
      <div className="side-menu-brand">
        <span className="side-menu-brand-dot" />
        {!isCollapsed && <span className="side-menu-brand-label">{title}</span>}
      </div>
      <div className="side-menu-items">
        {items.map((item) => {
          return (
            <button
              className={resolveItemClassName({ itemId: item.id })}
              key={item.id}
              onClick={() => {
                onSelectItem(item.id)
              }}
              title={resolveItemTitle({ label: item.label })}
              type="button"
            >
              <span className={resolveItemIconClassName({ isLive: item.isLive === true })}>{item.icon}</span>
              {!isCollapsed && <span className="side-menu-item-label">{item.label}</span>}
            </button>
          )
        })}
      </div>
      <button className="side-menu-collapse-toggle" onClick={onToggleCollapse} type="button">
        {renderCollapseIcon()}
        {!isCollapsed && <span className="side-menu-item-label">Collapse</span>}
      </button>
    </nav>
  )
}
