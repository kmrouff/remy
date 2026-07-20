export default function ModeToggle({ mode, onChange }) {
  return (
    <div className="mode-toggle" role="group" aria-label="Conversation mode">
      <button
        type="button"
        className={`mode-toggle__option${mode === 'shopping' ? ' is-active' : ''}`}
        onClick={() => onChange('shopping')}
      >
        Shopping
      </button>
      <button
        type="button"
        className={`mode-toggle__option${mode === 'cooking' ? ' is-active' : ''}`}
        onClick={() => onChange('cooking')}
      >
        Cooking
      </button>
      <span className={`mode-toggle__thumb mode-toggle__thumb--${mode}`} aria-hidden="true" />
    </div>
  )
}
