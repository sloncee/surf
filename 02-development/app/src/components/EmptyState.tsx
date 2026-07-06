// Честные пустые состояния — design-brief.md, принцип 2.
interface Props {
  title: string
  description?: string
  ctaLabel?: string
  onCta?: () => void
}

export function EmptyState({ title, description, ctaLabel, onCta }: Props) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon" aria-hidden>🪴</span>
      <p className="empty-state__title">{title}</p>
      {description && <p className="empty-state__text">{description}</p>}
      {ctaLabel && onCta && (
        <button type="button" className="btn btn--secondary" onClick={onCta}>
          {ctaLabel}
        </button>
      )}
    </div>
  )
}
