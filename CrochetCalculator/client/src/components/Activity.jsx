import { useEffect, useState } from 'react'
import { request } from '../utils/api'

const labels = { created: 'Created project', edited: 'Edited project', deleted: 'Deleted project', stock_updated: 'Updated stock' }
export default function Activity() {
  const [entries, setEntries] = useState([])
  const [more, setMore] = useState(false)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    request('/api/activity').then(data => { if (active) { setEntries(data.entries); setMore(data.hasMore) } }).catch(err => { if (active) setError(err.message) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [revision])
  async function loadMore() {
    setBusy(true); setError('')
    try { const data = await request(`/api/activity?before=${entries.at(-1).id}`); setEntries(list => [...list, ...data.entries]); setMore(data.hasMore) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <section aria-labelledby="activity-title"><div className="section-heading"><div><p className="eyebrow">SHARED WORKSPACE ACTIVITY</p><h1 id="activity-title" className="workspace-page-title">Activity history</h1></div><button type="button" className="modal-close" disabled={busy} onClick={() => { setBusy(true); setError(''); setEntries([]); setMore(false); setRevision(value => value + 1) }}>Refresh</button></div><p className="page-description">Project and inventory changes by all admins. Each entry shows who made the change.</p>
    {error && <div className="notice" role="alert">{error}</div>}
    <ol className="activity-list">{entries.map(entry => <li key={entry.id}><span className={`activity-dot ${entry.action}`} aria-hidden="true" /><div><span className="activity-label">{labels[entry.action] || entry.action}</span><h2>{entry.name}</h2><p>{entry.detail}</p><p>By {entry.actor}</p></div><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}</time></li>)}</ol>
    {busy && <p role="status">Loading activity…</p>}
    {!busy && !error && entries.length === 0 && <div className="sales-empty"><h2>No activity yet</h2><p>All admins' project and stock changes will appear here automatically.</p></div>}
    {more && <button type="button" className="primary" disabled={busy} onClick={loadMore}>Load older activity</button>}
  </section>
}
