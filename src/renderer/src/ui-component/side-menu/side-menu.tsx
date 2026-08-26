import { type ReactElement } from 'react'

import '#src/renderer/src/ui-component/side-menu/side-menu.css'
import { type MenuStatusDot } from '#src/renderer/src/util/menu-status-util'

export type ISideMenuItem<ItemId extends string> = {
  icon: ReactElement
  id: ItemId
  isLive?: boolean
  label: string
  statusDot?: MenuStatusDot
}

const resolveCollapseToggleTitle = (params: { isCollapsed: boolean }): string | undefined => {
  if (params.isCollapsed) {
    return 'Expand'
  }

  return undefined
}

export const SideMenu = <ItemId extends string>(props: {
  activeItemId: ItemId
  footerItems?: ISideMenuItem<ItemId>[]
  isCollapsed: boolean
  items: ISideMenuItem<ItemId>[]
  onSelectItem: (itemId: ItemId) => void
  onToggleCollapse: () => void
  title: string
}): ReactElement => {
  const { activeItemId, footerItems, isCollapsed, items, onSelectItem, onToggleCollapse, title } = props
  const collapseToggleTitle = resolveCollapseToggleTitle({ isCollapsed })

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

  const resolveStatusDotClassName = (params: { statusDot: MenuStatusDot }): string => {
    return `side-menu-item-status-dot is-${params.statusDot}`
  }

  const renderItem = (params: { item: ISideMenuItem<ItemId> }): ReactElement => {
    return (
      <button
        className={resolveItemClassName({ itemId: params.item.id })}
        key={params.item.id}
        onClick={() => {
          onSelectItem(params.item.id)
        }}
        title={resolveItemTitle({ label: params.item.label })}
        type="button"
      >
        <span className={resolveItemIconClassName({ isLive: params.item.isLive === true })}>
          {params.item.icon}
          {params.item.statusDot !== undefined && (
            <span className={resolveStatusDotClassName({ statusDot: params.item.statusDot })} />
          )}
        </span>
        {!isCollapsed && <span className="side-menu-item-label">{params.item.label}</span>}
      </button>
    )
  }

  const renderFooterItems = (): ReactElement | undefined => {
    if (footerItems === undefined || footerItems.length === 0) {
      return undefined
    }

    return (
      <div className="side-menu-footer">
        {footerItems.map((item) => {
          return renderItem({ item })
        })}
      </div>
    )
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
          return renderItem({ item })
        })}
      </div>
      {renderFooterItems()}
      <button
        aria-label={collapseToggleTitle}
        className="side-menu-collapse-toggle"
        onClick={onToggleCollapse}
        title={collapseToggleTitle}
        type="button"
      >
        {renderCollapseIcon()}
        {!isCollapsed && <span className="side-menu-item-label">Collapse</span>}
      </button>
    </nav>
  )
}
