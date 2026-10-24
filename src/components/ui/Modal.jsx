import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'
import styles from './Modal.module.css'

export default function Modal({ open, onClose, title, children, footer, className = '' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  // Portal to <body>: a modal opened from inside an Accordion would otherwise
  // be clipped by its `overflow: hidden`, and its content animation's
  // transform turns `position: fixed` into "fixed to the accordion".
  // The `drop` wrapper keeps the theme tokens; `contents` stops its own
  // min-height and background from rendering.
  return createPortal(
    <div className="drop contents">
      <div className={styles.overlay} data-modal-overlay onClick={onClose} role="presentation">
        <div
          className={`${styles.modal} ${className}`.trim()}
          data-modal
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <div className={styles.header}>
              <h3>{title}</h3>
              <button className="icon-btn" onClick={onClose} aria-label="Close">
                <Icon name="x" size={20} />
              </button>
            </div>
          )}
          <div className={styles.body}>{children}</div>
          {footer && <div className={styles.footer}>{footer}</div>}
        </div>
      </div>
    </div>,
    document.body,
  )
}
