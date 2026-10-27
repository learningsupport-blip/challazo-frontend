import { useState } from 'react'
import { evaluationRequirementsApi } from '../../api/evaluationRequirements'
import { externalHackathonsAdminApi } from '../../api/externalHackathons'
import { useAsync } from '../../hooks/useAsync'
import { queryKeys } from '../../lib/queryKeys'
import { APP_TIMEZONE } from '../../utils/format'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Icon from '../ui/Icon'
import Input, { Select, Textarea } from '../ui/Input'
import Modal from '../ui/Modal'
import { modalWide } from '../ui/uiClasses'

/** API datetime → `YYYY-MM-DDTHH:mm` in IST for a datetime-local input. */
function toInputValue(value) {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) return ''
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: APP_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`
}

/** The input is read as IST, the platform timezone. */
const fromInputValue = (value) => (value ? `${value}:00+05:30` : null)

const blankTheme = () => ({ name: '', description: '' })

function formOf(hackathon) {
  return {
    name: hackathon?.name || '',
    description: hackathon?.description || '',
    source_platform: hackathon?.source_platform || 'launchpad',
    source_platform_url: hackathon?.source_platform_url || '',
    visibility: hackathon?.visibility || 'restricted',
    submission_deadline: toInputValue(hackathon?.submission_deadline),
    evaluation_requirement_id: hackathon?.evaluation_requirement_id || '',
    themes: hackathon?.themes?.length
      ? hackathon.themes.map((theme) => ({
          ...(theme.id ? { id: theme.id } : {}),
          name: theme.name || '',
          description: theme.description || '',
        }))
      : [blankTheme()],
  }
}

/** The request body for a form: trimmed, with empty themes dropped. */
function payloadOf(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    source_platform: form.source_platform.trim(),
    source_platform_url: form.source_platform_url.trim(),
    visibility: form.visibility,
    submission_deadline: fromInputValue(form.submission_deadline),
    evaluation_requirement_id: form.evaluation_requirement_id || null,
    themes: form.themes
      .filter((theme) => theme.name.trim())
      .map((theme) => ({
        ...(theme.id ? { id: theme.id } : {}),
        name: theme.name.trim(),
        description: theme.description.trim(),
      })),
  }
}

/**
 * Create a draft external hackathon, or edit one. An edit sends only the
 * fields that changed.
 */
export default function ExternalHackathonFormModal({ open, hackathon, onClose, onSaved }) {
  const editing = Boolean(hackathon?.id)
  const [form, setForm] = useState(() => formOf(hackathon))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const { data: requirements } = useAsync(() => evaluationRequirementsApi.list(), {
    key: queryKeys.evaluationRequirements,
    enabled: open,
  })

  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  const setTheme = (index, field) => (event) =>
    setForm((current) => ({
      ...current,
      themes: current.themes.map((theme, i) =>
        i === index ? { ...theme, [field]: event.target.value } : theme,
      ),
    }))

  const addTheme = () => setForm((current) => ({ ...current, themes: [...current.themes, blankTheme()] }))

  const removeTheme = (index) =>
    setForm((current) => ({ ...current, themes: current.themes.filter((_, i) => i !== index) }))

  const save = async () => {
    if (!form.name.trim()) {
      setError('Name is required.')
      return
    }
    if (form.themes.some((theme) => !theme.name.trim() && theme.description.trim())) {
      setError('Every theme with a description needs a name.')
      return
    }
    const payload = payloadOf(form)
    let body = payload
    if (editing) {
      const before = payloadOf(formOf(hackathon))
      body = Object.fromEntries(
        Object.entries(payload).filter(
          ([field, value]) => JSON.stringify(value) !== JSON.stringify(before[field]),
        ),
      )
      if (!Object.keys(body).length) {
        onClose()
        return
      }
    }
    setSaving(true)
    setError('')
    try {
      const saved = editing
        ? await externalHackathonsAdminApi.update(hackathon.id, body)
        : await externalHackathonsAdminApi.create(body)
      onSaved(saved)
    } catch (saveError) {
      setError(saveError.message || 'Unable to save the external hackathon.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title={editing ? 'Edit external hackathon' : 'Create external hackathon'}
      className={modalWide}
      footer={
        <>
          <Button variant="ghost" disabled={saving} onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" loading={saving} onClick={save}>
            {editing ? 'Save changes' : 'Create draft'}
          </Button>
        </>
      }
    >
      <div className="stack-md">
        {error && <Alert variant="danger">{error}</Alert>}
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-3">
          <div className="sm:col-span-2">
            <Input
              label="Name"
              required
              maxLength={200}
              value={form.name}
              onChange={set('name')}
              placeholder="Launchpad Cup"
            />
          </div>
          <Select label="Visibility" value={form.visibility} onChange={set('visibility')}>
            <option value="restricted">Restricted (signed link)</option>
            <option value="public">Public</option>
          </Select>
          <div className="sm:col-span-3">
            <Textarea
              label="Description"
              rows={2}
              maxLength={5000}
              value={form.description}
              onChange={set('description')}
              placeholder="Submit after your team is formed on Launchpad."
            />
          </div>
          <Input
            label="Source platform"
            maxLength={100}
            value={form.source_platform}
            onChange={set('source_platform')}
          />
          <div className="sm:col-span-2">
            <Input
              label="Source platform URL"
              type="url"
              value={form.source_platform_url}
              onChange={set('source_platform_url')}
              placeholder="https://"
            />
          </div>
          <Input
            label="Submission deadline (IST)"
            type="datetime-local"
            value={form.submission_deadline}
            onChange={set('submission_deadline')}
          />
          <div className="sm:col-span-2">
            <Select
              label="Evaluation rubric"
              value={form.evaluation_requirement_id}
              onChange={set('evaluation_requirement_id')}
            >
              <option value="">No rubric (video report only)</option>
              {(Array.isArray(requirements) ? requirements : []).map((requirement) => (
                <option key={requirement.id} value={requirement.id}>
                  {requirement.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="-mt-1 text-[12.5px] text-muted">
          {form.visibility === 'restricted'
            ? 'Restricted: team details arrive on a signed link and are read-only on the form.'
            : 'Public: anyone with the link types their team name and team ID.'}
        </p>

        <fieldset className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-3">
            <legend className="label">Themes</legend>
            <Button
              variant="secondary"
              size="sm"
              onClick={addTheme}
              leftIcon={<Icon name="plus" size={15} />}
            >
              Add theme
            </Button>
          </div>
          <div className="stack-sm">
            {form.themes.map((theme, index) => (
              <div
                key={theme.id || index}
                className="grid grid-cols-[1fr_auto] items-center gap-2 sm:grid-cols-[1fr_2fr_auto]"
              >
                <input
                  className="input"
                  aria-label={`Theme ${index + 1} name`}
                  maxLength={200}
                  value={theme.name}
                  onChange={setTheme(index, 'name')}
                  placeholder={`Theme ${index + 1} name`}
                />
                <input
                  className="input col-span-1 row-start-2 sm:row-start-auto"
                  aria-label={`Theme ${index + 1} description`}
                  maxLength={2000}
                  value={theme.description}
                  onChange={setTheme(index, 'description')}
                  placeholder="Description"
                />
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
                  onClick={() => removeTheme(index)}
                  aria-label={`Remove theme ${index + 1}`}
                >
                  <Icon name="trash" size={17} />
                </button>
              </div>
            ))}
            {!form.themes.length && (
              <p className="text-[13px] text-muted">Add at least one theme before publishing.</p>
            )}
          </div>
        </fieldset>
      </div>
    </Modal>
  )
}
