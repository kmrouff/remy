import { useState } from 'react'
import remyMark from '../assets/remy-mark.png'

const CARDS = [
  {
    eyebrow: 'Meet Remy',
    title: 'Cook with your hands full',
    text: "Remy is your invisible sous-chef. Talk to it out loud while you cook or shop — it reads the steps, tracks your ingredients, and never needs a tap.",
    diagram: (
      <div className="welcome__brand">
        <img src={remyMark} alt="" className="welcome__mark" />
      </div>
    ),
  },
  {
    title: 'Bring in any recipe',
    text: 'Paste a link, snap the cookbook page, or search by name. Remy pulls out the ingredients and steps in seconds.',
    diagram: (
      <div className="welcome__sources">
        {/* abstracted source marks — a link, a photo, a search ring.
            Deliberately geometric, not emoji, to sit with the type. */}
        <div className="welcome__source-stack">
          <span className="welcome__source-icon">
            <i className="welcome__mark-link" />
          </span>
          <span className="welcome__source-icon">
            <i className="welcome__mark-photo" />
          </span>
          <span className="welcome__source-icon">
            <i className="welcome__mark-search" />
          </span>
        </div>
        <span className="welcome__arrow">→</span>
        <div className="welcome__recipe-card">
          <span className="welcome__recipe-card-image" />
          <span className="welcome__recipe-card-line welcome__recipe-card-line--title" />
          <span className="welcome__recipe-card-line" />
          <span className="welcome__recipe-card-line" />
        </div>
      </div>
    ),
  },
  {
    title: 'Pick a mode',
    text: "Shopping gathers your ingredients; Cooking guides you step by step. The whole app takes on that mode's calm colour.",
    diagram: (
      <div className="welcome__modes">
        <div className="welcome__mode-card welcome__mode-card--shopping">
          <span className="welcome__mode-card-label">SHOPPING</span>
          <span className="welcome__mode-card-row" />
          <span className="welcome__mode-card-row" />
          <span className="welcome__mode-card-row" />
        </div>
        <div className="welcome__mode-card welcome__mode-card--cooking">
          <span className="welcome__mode-card-label">COOKING</span>
          <span className="welcome__mode-card-row" />
          <span className="welcome__mode-card-row" />
          <span className="welcome__mode-card-row" />
        </div>
      </div>
    ),
  },
  {
    title: 'Then just talk',
    text: "It's a conversation — completely hands-free. As you shop or cook, talk to Remy the way you would a friend in the kitchen: what you're doing, what you're swapping, what you can't find. It listens and keeps everything on track, so your hands never leave the food.",
    diagram: (
      <div className="welcome__chat">
        <div className="welcome__chat-bubble welcome__chat-bubble--agent">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="welcome__chat-bubble welcome__chat-bubble--user">
          <span className="welcome__chat-line" />
          <span className="welcome__chat-line" style={{ width: '60%' }} />
        </div>
      </div>
    ),
  },
  {
    title: 'Pause whenever',
    text: "Step away and come back later — Remy remembers exactly where you left off, right down to the step.",
    diagram: (
      <div className="welcome__pause">
        <div className="welcome__pause-bars">
          {[16, 30, 22, 40, 26, 36, 18, 28, 14].map((h, i) => (
            <span key={i} style={{ height: h }} className={i >= 3 && i <= 5 ? 'is-cooking' : ''} />
          ))}
        </div>
        <div className="welcome__pause-progress">
          <span style={{ width: '42%' }} />
        </div>
        <div className="welcome__pause-note">Paused at step 3</div>
      </div>
    ),
  },
]

export default function WelcomeCarousel({ onDone }) {
  const [index, setIndex] = useState(0)
  const isLast = index === CARDS.length - 1
  const card = CARDS[index]

  return (
    <div className="welcome">
      <div className={`welcome__top${isLast ? ' has-back' : ''}`}>
        {isLast ? (
          <button type="button" className="iconbtn" onClick={() => setIndex((i) => i - 1)} aria-label="Back">
            ‹
          </button>
        ) : (
          <button type="button" className="welcome__skip" onClick={onDone}>
            Skip
          </button>
        )}
      </div>

      <div className="welcome__body">
        <div className="welcome__diagram">{card.diagram}</div>
        {card.eyebrow && <div className="welcome__eyebrow">{card.eyebrow}</div>}
        <h1 className="welcome__title">{card.title}</h1>
        <p className="welcome__text">{card.text}</p>
      </div>

      <div className="welcome__foot">
        <div className="welcome__dots">
          {CARDS.map((_, i) => (
            <span key={i} className={i === index ? 'active' : ''} />
          ))}
        </div>
        {isLast ? (
          <button type="button" className="welcome__next welcome__next--sage" onClick={onDone}>
            Get started
          </button>
        ) : (
          <button type="button" className="welcome__next" onClick={() => setIndex((i) => i + 1)}>
            Next
          </button>
        )}
      </div>
    </div>
  )
}
