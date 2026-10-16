import { useEffect, useState } from 'react'

import { request } from '../utils/api'

function StockItem({ item, priceOf, onSaved }) {
  const [quantity, setQuantity] = useState(String(item.stock ?? 0))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  async function save(event) {
    event.preventDefault()
    if (quantity === '' || !Number.isInteger(Number(quantity)) || Number(quantity) < 0 || Number(quantity) > 1000000) { setError('Enter a whole number from 0 to 1,000,000.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await request(`/api/projects/${item.id}/stock`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stock: Number(quantity), previous: item.stock ?? 0 }) })
      onSaved(result); setNotice('Stock saved.')
    } catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  return <article className="inventory-item">
    <div className="inventory-product">
      {item.image ? <img src={item.image} alt="" /> : <span className="inventory-placeholder" aria-hidden="true">✳</span>}
      <div>
        <div className="card-tags" style={{ marginBottom: '6px' }}>
          <span className={`category-tag ${(item.category || 'Crochet') === 'Fuzzy Wire' ? 'category-fuzzy' : 'category-crochet'}`}>
            {(item.category || 'Crochet') === 'Fuzzy Wire' ? '✨ Fuzzy Wire' : '🧶 Crochet'}
          </span>
          <span className={`availability ${item.stock > 0 ? 'available' : ''}`}>
            {item.stock > 0 ? 'Available' : 'Not available'}
          </span>
        </div>
        <h2>{item.name}</h2>
        <p>{priceOf(item)}</p>
      </div>
    </div>
    <form onSubmit={save}><label htmlFor={`stock-${item.id}`}>Stock quantity</label><div className="stock-controls"><input id={`stock-${item.id}`} type="number" inputMode="numeric" min="0" max="1000000" step="1" required value={quantity} disabled={busy} onChange={e => { setQuantity(e.target.value); setNotice('') }} /><button type="submit" className="primary" disabled={busy || quantity === String(item.stock ?? 0)}>{busy ? 'Saving…' : 'Save stock'}</button></div>{error && <p className="stock-error" role="alert">{error}</p>}{notice && <p className="stock-success" role="status">{notice}</p>}</form>
  </article>
}

export default function Inventory({ priceOf, onStockChange }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    request('/api/projects').then(data => {
      if (!Array.isArray(data) || data.some(item => !Number.isInteger(item.stock))) throw new Error('Restart the updated backend to enable inventory.')
      if (active) setItems(data)
    }).catch(err => { if (active) setError(err.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])
  function saved(result) { setItems(list => list.map(item => item.id === result.id ? { ...item, stock: result.stock } : item)); onStockChange(result) }
  const available = items.filter(item => item.stock > 0).length
  const crochetCount = items.filter(item => (item.category || 'Crochet') === 'Crochet').length
  const fuzzyCount = items.filter(item => item.category === 'Fuzzy Wire').length
  const visible = items.filter(item =>
    item.name.toLowerCase().includes(query.toLowerCase()) &&
    (categoryFilter === 'all' || (item.category || 'Crochet') === categoryFilter) &&
    (filter === 'all' || (filter === 'available' ? item.stock > 0 : item.stock === 0))
  )
  return <section aria-labelledby="inventory-title"><div className="section-heading"><div><p className="eyebrow">YOUR PRODUCTS</p><h1 id="inventory-title" className="workspace-page-title">Inventory</h1></div><a href="#dashboard" className="inventory-link">Manage projects →</a></div><p className="page-description">Set the number of items ready to sell. Zero stock means not available.</p>
    {!loading && !error && <div className="inventory-stats"><span><strong>{items.length}</strong> Total Products<br /><small>{crochetCount} Crochet · {fuzzyCount} Fuzzy Wire</small></span><span><strong>{available}</strong> Available to sell</span><span><strong>{items.length - available}</strong> Out of stock</span></div>}
    <div className="inventory-toolbar"><input type="search" aria-label="Search inventory" placeholder="Search products…" value={query} onChange={e => setQuery(e.target.value)} /><select aria-label="Filter by craft classification" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}><option value="all">All crafts ({items.length})</option><option value="Crochet">🧶 Crochet ({crochetCount})</option><option value="Fuzzy Wire">✨ Fuzzy Wire ({fuzzyCount})</option></select><select aria-label="Filter by availability" value={filter} onChange={e => setFilter(e.target.value)}><option value="all">All availability</option><option value="available">Available in stock</option><option value="unavailable">Out of stock</option></select><button type="button" className="modal-close" disabled={loading} onClick={() => { setLoading(true); setError(''); setRevision(value => value + 1) }}>Refresh</button></div>
    {loading ? <p role="status">Loading inventory…</p> : error ? <div className="notice" role="alert">{error}</div> : <div className="inventory-list">{visible.map(item => <StockItem key={`${revision}-${item.id}`} item={item} priceOf={priceOf} onSaved={saved} />)}{visible.length === 0 && <div className="sales-empty"><h2>{items.length ? 'No matching products' : 'Your inventory starts with a project'}</h2><p>{items.length ? 'Try a different search, classification, or availability filter.' : 'Create a project on the dashboard, then set its stock here.'}</p><a href="#dashboard">Go to dashboard</a></div>}</div>}
  </section>
}
