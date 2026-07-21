import { useEffect, useState } from 'react'
import { SUPPORT_URL, CONTACT_EMAIL } from '../lib/config'
import { shareApp } from '../lib/share'

const FAQ = [
  {
    q: 'Is this a company?',
    a: "Nope — just one person, building this in spare evenings.",
  },
  {
    q: 'Is my data safe?',
    a: "Signing in is optional. As a guest, nothing ever leaves your device. If you do sign in, your recipes are stored in a secure database — never sold, never reused. Your voice and conversations aren't stored either; I have no need for them.",
  },
  {
    q: 'Why does a cooking app need money?',
    a: "Hosting the site itself is basically free, unless this grows a lot. What actually costs money is the voice interface — I pay for that out of my own pocket right now, so buying a coffee genuinely helps keep it running.",
  },
  {
    q: 'Will you keep building this?',
    a: "As long as it stays fun and useful. No roadmap, no promises — it's a hobby, not a job.",
  },
  {
    q: 'Found a bug or have an idea?',
    a: "Tell me — see Contact.",
  },
]

export default function AppMenu({ open, onClose }) {
  const [view, setView] = useState('menu') // 'menu' | 'mission' | 'faq' | 'contact'
  const [shareStatus, setShareStatus] = useState(null) // null | 'copied' | 'failed'

  // Land back on the main list every time the menu is reopened.
  useEffect(() => {
    if (open) {
      setView('menu')
      setShareStatus(null)
    }
  }, [open])

  async function handleShare() {
    const result = await shareApp()
    if (result === 'copied' || result === 'failed') {
      setShareStatus(result)
      setTimeout(() => setShareStatus(null), 2000)
    }
  }

  useEffect(() => {
    if (!open) return
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <>
      <button
        type="button"
        className={`app-menu__scrim${open ? ' is-open' : ''}`}
        onClick={onClose}
        aria-label="Close menu"
        tabIndex={open ? 0 : -1}
      />
      <div className={`app-menu${open ? ' is-open' : ''}`} aria-hidden={!open}>
        <div className="app-menu__head">
          {view === 'menu' ? (
            <span className="app-menu__brand">
              <span className="app-menu__brand-name">Remy</span>
              <span className="app-menu__brand-tag">Invisible sous-chef</span>
            </span>
          ) : (
            <button type="button" className="iconbtn" onClick={() => setView('menu')} aria-label="Back to menu">
              ‹
            </button>
          )}
          <button type="button" className="app-menu__close" onClick={onClose} aria-label="Close menu">
            ×
          </button>
        </div>

        {view === 'menu' && (
          <nav className="app-menu__list">
            <button type="button" className="app-menu__row" onClick={() => setView('mission')}>
              Mission
              <span aria-hidden="true">›</span>
            </button>
            <button type="button" className="app-menu__row" onClick={() => setView('faq')}>
              FAQ
              <span aria-hidden="true">›</span>
            </button>
            <button type="button" className="app-menu__row" onClick={() => setView('contact')}>
              Contact
              <span aria-hidden="true">›</span>
            </button>
            <a
              href={SUPPORT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="app-menu__row app-menu__row--support"
            >
              Buy me a coffee
              <span aria-hidden="true">↗</span>
            </a>
            <button type="button" className="app-menu__row" onClick={handleShare}>
              {shareStatus === 'copied' ? 'Link copied' : shareStatus === 'failed' ? "Couldn't share" : 'Share Remy with a friend'}
              <span aria-hidden="true">⇗</span>
            </button>
          </nav>
        )}

        {view === 'mission' && (
          <div className="app-menu__page">
            <p>
              Cooking with wet, floury hands and a phone you don't want to touch is annoying. Remy fixes
              that — you talk, it listens, your hands stay on the food.
            </p>
            <p>
              It's a one-person side project, not a company. No investors, no roadmap meetings, no growth
              targets — I built it because I wanted it to exist, and figured other people might want it
              too.
            </p>
          </div>
        )}

        {view === 'faq' && (
          <div className="app-menu__page app-menu__faq">
            {FAQ.map((item) => (
              <div key={item.q} className="app-menu__faq-item">
                <p className="app-menu__faq-q">{item.q}</p>
                <p className="app-menu__faq-a">{item.a}</p>
              </div>
            ))}
          </div>
        )}

        {view === 'contact' && (
          <div className="app-menu__page">
            <p>Bug? Idea? Just want to say hi? I read everything that comes in.</p>
            <a href={`mailto:${CONTACT_EMAIL}`} className="app-menu__contact-link">
              {CONTACT_EMAIL}
            </a>
          </div>
        )}
      </div>
    </>
  )
}
