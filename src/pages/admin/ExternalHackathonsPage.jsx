import { useState } from 'react'
import { Link } from 'react-router-dom'
import { externalHackathonsAdminApi } from '../../api/externalHackathons'
import ExternalHackathonFormModal from '../../components/admin/ExternalHackathonFormModal'
import { ExternalStatusBadge } from '../../components/admin/ExternalHackathonLinkPanel'
import { WRAP_APP } from '../../components/drop/theme'
import PageHeader from '../../components/layout/PageHeader'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Card, { CardBody } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Icon from '../../components/ui/Icon'
import { LoadingBlock } from '../../components/ui/Spinner'
import { useAuth } from '../../hooks/useAuth'
import { useAsync } from '../../hooks/useAsync'
import { adminPath } from '../../utils/access'
import { formatDateTime } from '../../utils/format'

const listOf = (data) => (Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [])

/**
 * Hackathons run on another platform (Launchpad) whose teams submit through a
 * Challazo form. Separate records from /hackathons.
 */
export default function ExternalHackathonsPage() {
  const { user } = useAuth()
  const { data, loading, error, setData } = useAsync(() => externalHackathonsAdminApi.list())
  const [creating, setCreating] = useState(false)
  const hackathons = listOf(data)

  const created = (saved) => {
    setData((current) => [saved, ...listOf(current)])
    setCreating(false)
  }

  return (
    <div className={`${WRAP_APP} py-7 md:py-10`}>
      <PageHeader
        eyebrow="Hackathon setup"
        title="External hackathons"
        description="Submission forms for teams formed on another platform, such as Launchpad."
        actions={
          <Button variant="accent" onClick={() => setCreating(true)} leftIcon={<Icon name="plus" size={17} />}>
            Create external hackathon
          </Button>
        }
      />

      {error && (
        <Alert variant="danger" title="Unable to load external hackathons">
          {error.message}
        </Alert>
      )}

      {loading && !data ? (
        <LoadingBlock label="Loading external hackathons…" />
      ) : hackathons.length ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Platform</th>
                <th>Visibility</th>
                <th>Deadline</th>
                <th>Themes</th>
                <th>Status</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {hackathons.map((hackathon) => (
                <tr key={hackathon.id}>
                  <td>
                    <strong>{hackathon.name}</strong>
                  </td>
                  <td>{hackathon.source_platform || '—'}</td>
                  <td className="capitalize">{hackathon.visibility}</td>
                  <td>{formatDateTime(hackathon.submission_deadline)}</td>
                  <td>{hackathon.themes?.length ?? 0}</td>
                  <td>
                    <ExternalStatusBadge status={hackathon.status} />
                  </td>
                  <td className="text-right">
                    <Button
                      as={Link}
                      to={adminPath(`/admin/external-hackathons/${hackathon.id}`, user)}
                      variant="secondary"
                      size="sm"
                    >
                      Open
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !error ? (
        <Card>
          <CardBody>
            <EmptyState
              icon="trophy"
              title="No external hackathons yet"
              description="Create a draft, add themes and a deadline, then publish to get the form link."
              action={
                <Button variant="accent" onClick={() => setCreating(true)}>
                  Create external hackathon
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : null}

      {creating && (
        <ExternalHackathonFormModal open onClose={() => setCreating(false)} onSaved={created} />
      )}
    </div>
  )
}
