import { useEffect, useId, useRef, useState } from 'react'
import Icon from '../../../components/ui/Icon'

/**
 * A checkbox list in a dropdown, with a search box.
 *
 * `value` is the array of selected values, in the order they were picked.
 * With `max`, unchecked options are disabled once the limit is reached.
 * `emptyLabel` is what the button says with nothing picked ("Everyone").
 */
export default function MultiSelect({
  label,
  options,
  value,
  onChange,
  max,
  placeholder = 'Search…',
  emptyLabel = 'None selected',
  hint,
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef(null)
  const id = useId()

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selected = new Set(value)
  const full = max ? value.length >= max : false
  const needle = query.trim().toLowerCase()
  const shown = needle
    ? options.filter((option) =>
        `${option.label} ${option.hint || ''}`.toLowerCase().includes(needle),
      )
    : options

  const toggle = (optionValue) => {
    if (selected.has(optionValue)) onChange(value.filter((v) => v !== optionValue))
    else if (!full) onChange([...value, optionValue])
  }

  const summary = !value.length
    ? emptyLabel
    : value.length === 1
      ? options.find((option) => option.value === value[0])?.label || '1 selected'
      : `${value.length} selected`

  return (
    <div className="field relative" ref={rootRef}>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      <button
        id={id}
        type="button"
        className="input flex items-center justify-between gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="truncate">{summary}</span>
        <Icon name="chevronDown" size={16} className="shrink-0 text-muted" />
      </button>
      {hint && <span className="field__hint">{hint}</span>}

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 rounded-drop border border-hairline bg-surface p-2 shadow-lg">
          <input
            className="input mb-2"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            aria-label={`Search ${label}`}
            autoFocus
          />
          <div className="flex items-center justify-between px-1 pb-1 text-[12px] text-muted">
            <span>
              {value.length}
              {max ? ` of ${max}` : ''} selected
            </span>
            {value.length > 0 && (
              <button type="button" className="link-btn" onClick={() => onChange([])}>
                Clear
              </button>
            )}
          </div>
          <ul role="listbox" aria-multiselectable="true" className="max-h-[260px] overflow-y-auto">
            {shown.map((option) => {
              const checked = selected.has(option.value)
              const disabled = !checked && full
              return (
                <li key={option.value}>
                  <label
                    className={`flex cursor-pointer items-start gap-2 rounded-[8px] px-2 py-1.5 text-[13.5px] hover:bg-raised ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      className="mt-[3px]"
                      checked={checked}
                      disabled={disabled}
                      onChange={() => toggle(option.value)}
                    />
                    <span className="min-w-0">
                      <span className="block text-ink">{option.label}</span>
                      {option.hint && <span className="block text-[12px] text-muted">{option.hint}</span>}
                    </span>
                  </label>
                </li>
              )
            })}
            {!shown.length && <li className="px-2 py-3 text-center text-[13px] text-muted">No matches.</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
