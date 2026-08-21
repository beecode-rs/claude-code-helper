import { type ReactElement } from 'react'

import '#src/renderer/src/ui-component/about/about-page.css'
import { PROVIDER_CATALOG } from '#src/shared/provider-catalog'

export const AboutPage = (): ReactElement => {
  return (
    <div className="about-page">
      <header>
        <h1 className="about-page-title">Usage Pulse</h1>
        <p className="about-page-tagline">Desktop tracker for Claude and z.ai coding-plan usage limits.</p>
        <p className="about-page-version">Version {appVersion}</p>
      </header>
      <section className="about-page-section">
        <h2 className="about-page-section-title">What it does</h2>
        <p className="about-page-text">
          Usage Pulse polls each configured tracker at a fixed interval and shows how much of your plan&apos;s usage
          allowance has been consumed across the current billing and session windows.
        </p>
      </section>
      <section className="about-page-section">
        <h2 className="about-page-section-title">Supported providers</h2>
        <ul className="about-page-provider-list">
          {PROVIDER_CATALOG.map((catalogEntry) => {
            return (
              <li className="about-page-provider" key={catalogEntry.id}>
                <span className="about-page-provider-name">{catalogEntry.name}</span>
                <span className="about-page-provider-description">{catalogEntry.description}</span>
              </li>
            )
          })}
        </ul>
      </section>
      <section className="about-page-section">
        <h2 className="about-page-section-title">Privacy</h2>
        <p className="about-page-text">
          Access tokens and usage data stay on this machine — requests go straight from the app to each provider, with
          no intermediary servers.
        </p>
      </section>
    </div>
  )
}
