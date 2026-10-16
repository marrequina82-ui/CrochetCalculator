import { useEffect, useRef, useState } from 'react'

function SaleModal({ onClose, saving, children }) {
  const dialogRef = useRef(null)
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    const prev = document.activeElement
    dialog.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      dialog.close()
      document.body.style.overflow = overflow
      prev?.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialogRef}
      className="project-modal sale-modal"
      onCancel={e => {
        e.preventDefault()
        if (!saving) onClose()
      }}
    >
      {children}
    </dialog>
  )
}

export default function Sales({ projects, money, costs, onUpdateProject }) {
  const [categoryView, setCategoryView] = useState('combined') // 'combined' | 'Crochet' | 'Fuzzy Wire'
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id || '')
  const [quantity, setQuantity] = useState('1')
  const [salePrice, setSalePrice] = useState('')
  const [saleNote, setSaleNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Calculate stats per category and combined
  const calculateCategoryStats = (filterCategory) => {
    const list = filterCategory === 'combined'
      ? projects
      : projects.filter(p => (p.category || 'Crochet') === filterCategory)

    let totalRevenue = 0
    let totalSold = 0
    let totalProfit = 0
    let inventoryValue = 0

    list.forEach(p => {
      const breakdown = costs(p)
      const sold = Number(p.sold || 0)
      const stock = Number(p.stock || 0)
      const price = breakdown.total
      const profitPerUnit = breakdown.profit

      // Custom recorded sales or default unit price
      const projectSales = Array.isArray(p.sales) ? p.sales : []
      if (projectSales.length > 0) {
        projectSales.forEach(s => {
          const qty = Number(s.quantity || 1)
          const sPrice = Number(s.price || price)
          totalRevenue += sPrice * qty
          totalProfit += profitPerUnit * qty
        })
      } else if (sold > 0) {
        totalRevenue += price * sold
        totalProfit += profitPerUnit * sold
      }

      totalSold += sold
      inventoryValue += price * stock
    })

    return { totalRevenue, totalSold, totalProfit, inventoryValue, count: list.length }
  }

  const combinedStats = calculateCategoryStats('combined')
  const crochetStats = calculateCategoryStats('Crochet')
  const fuzzyStats = calculateCategoryStats('Fuzzy Wire')

  const currentStats = categoryView === 'combined'
    ? combinedStats
    : categoryView === 'Crochet'
      ? crochetStats
      : fuzzyStats

  // Gather all sales records into a timeline
  const allSales = []
  projects.forEach(p => {
    const pCategory = p.category || 'Crochet'
    const breakdown = costs(p)
    const salesList = Array.isArray(p.sales) ? p.sales : []
    salesList.forEach(s => {
      allSales.push({
        id: s.id || `${p.id}-${s.date}`,
        projectId: p.id,
        projectName: p.name,
        category: pCategory,
        currency: p.currency,
        quantity: Number(s.quantity || 1),
        price: Number(s.price || breakdown.total),
        total: Number(s.price || breakdown.total) * Number(s.quantity || 1),
        profit: breakdown.profit * Number(s.quantity || 1),
        date: s.date || new Date().toISOString(),
        note: s.note || '',
      })
    })
  })

  // Sort newest first
  allSales.sort((a, b) => new Date(b.date) - new Date(a.date))

  const filteredSales = categoryView === 'combined'
    ? allSales
    : allSales.filter(s => s.category === categoryView)

  // Open modal and prefill price
  const openRecordModal = () => {
    const first = projects.find(p => categoryView === 'combined' || (p.category || 'Crochet') === categoryView) || projects[0]
    if (first) {
      setSelectedProjectId(first.id)
      setSalePrice(String(costs(first).total.toFixed(2)))
    }
    setQuantity('1')
    setSaleNote('')
    setError('')
    setSuccess('')
    setModalOpen(true)
  }

  const handleProjectSelect = (id) => {
    setSelectedProjectId(id)
    const p = projects.find(item => item.id === Number(id))
    if (p) setSalePrice(String(costs(p).total.toFixed(2)))
  }

  const handleRecordSale = async (e) => {
    e.preventDefault()
    const target = projects.find(p => p.id === Number(selectedProjectId))
    if (!target) { setError('Select a valid project.'); return }

    const qty = Number(quantity)
    if (!Number.isInteger(qty) || qty <= 0) { setError('Enter a quantity of at least 1.'); return }

    const unitPrice = Number(salePrice)
    if (!Number.isFinite(unitPrice) || unitPrice < 0) { setError('Enter a valid selling price.'); return }

    setSaving(true)
    setError('')
    try {
      const newSale = {
        id: Date.now().toString(),
        quantity: qty,
        price: unitPrice,
        date: new Date().toISOString(),
        note: saleNote.trim(),
      }

      const updatedSales = [...(Array.isArray(target.sales) ? target.sales : []), newSale]
      const updatedSold = Number(target.sold || 0) + qty
      const updatedStock = Math.max(0, Number(target.stock || 0) - qty)

      const updatedProject = {
        ...target,
        sold: updatedSold,
        sales: updatedSales,
        stock: updatedStock,
      }

      const res = await fetch(`/api/projects/${target.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedProject),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Failed to record sale.')
      }

      const saved = await res.json()
      onUpdateProject(saved)
      setSuccess(`Recorded sale for ${qty} × ${target.name}!`)
      setTimeout(() => setModalOpen(false), 800)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // Currency helper (use PHP or first project's currency)
  const currency = projects[0]?.currency || 'PHP'

  // Percentage shares for combined bar
  const totalRev = combinedStats.totalRevenue || 1
  const crochetShare = Math.round((crochetStats.totalRevenue / totalRev) * 100)
  const fuzzyShare = 100 - crochetShare

  return (
    <section className="sales-section" aria-labelledby="sales-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">REVENUE &amp; PERFORMANCE</p>
          <h1 id="sales-title" className="workspace-page-title">Sales Tracking</h1>
        </div>
        <button type="button" className="primary" onClick={openRecordModal} disabled={projects.length === 0}>
          + Record a sale
        </button>
      </div>

      <p className="page-description">
        Track individual sales for Crochet and Fuzzy Wire crafts, with combined totals and inventory valuation.
      </p>



      {/* KPI Cards */}
      <div className="sales-kpi-grid">
        <div className="sales-kpi-card">
          <span className="kpi-label">
            {categoryView === 'combined' ? 'Combined Revenue' : `${categoryView} Revenue`}
          </span>
          <strong className="kpi-value">{money(currentStats.totalRevenue, currency)}</strong>
          {categoryView === 'combined' && (
            <span className="kpi-breakdown">
              Crochet: {money(crochetStats.totalRevenue, currency)} · Fuzzy: {money(fuzzyStats.totalRevenue, currency)}
            </span>
          )}
        </div>

        <div className="sales-kpi-card">
          <span className="kpi-label">Units Sold</span>
          <strong className="kpi-value">{currentStats.totalSold}</strong>
          {categoryView === 'combined' && (
            <span className="kpi-breakdown">
              Crochet: {crochetStats.totalSold} sold · Fuzzy: {fuzzyStats.totalSold} sold
            </span>
          )}
        </div>

        <div className="sales-kpi-card">
          <span className="kpi-label">Estimated Profit</span>
          <strong className="kpi-value kpi-profit">{money(currentStats.totalProfit, currency)}</strong>
          <span className="kpi-breakdown">From completed sales markups</span>
        </div>

        <div className="sales-kpi-card">
          <span className="kpi-label">In-Stock Retail Value</span>
          <strong className="kpi-value">{money(currentStats.inventoryValue, currency)}</strong>
          <span className="kpi-breakdown">Ready-to-sell inventory</span>
        </div>
      </div>

      {/* Visual Share Bar (Only in Combined view) */}
      {categoryView === 'combined' && combinedStats.totalRevenue > 0 && (
        <div className="sales-share-box">
          <div className="share-labels">
            <span>🧶 Crochet: {crochetShare}% ({money(crochetStats.totalRevenue, currency)})</span>
            <span>✨ Fuzzy Wire: {fuzzyShare}% ({money(fuzzyStats.totalRevenue, currency)})</span>
          </div>
          <div className="share-bar">
            <div className="share-segment crochet" style={{ width: `${crochetShare}%` }} />
            <div className="share-segment fuzzy" style={{ width: `${fuzzyShare}%` }} />
          </div>
        </div>
      )}

      {/* Sales History Log */}
      <div className="sales-log-section">
        <div className="section-heading">
          <h2>
            {categoryView === 'combined' ? 'All Recent Sales' : `${categoryView} Sales History`}
            <span className="count">{filteredSales.length}</span>
          </h2>
          <div className="sales-filter-dropdown">
            <select
              id="sales-category-select"
              className="sales-category-select"
              value={categoryView}
              onChange={e => setCategoryView(e.target.value)}
              aria-label="Filter sales by craft classification"
            >
              <option value="combined">🌟 Combined Sales ({combinedStats.count} items)</option>
              <option value="Crochet">🧶 Crochet Sales ({crochetStats.count} items)</option>
              <option value="Fuzzy Wire">✨ Fuzzy Wire Sales ({fuzzyStats.count} items)</option>
            </select>
          </div>
        </div>

        {filteredSales.length === 0 ? (
          <div className="sales-empty">
            <div className="sales-icon">🏷️</div>
            <h3>No {categoryView === 'combined' ? '' : categoryView} sales recorded yet</h3>
            <p>Click &ldquo;+ Record a sale&rdquo; above whenever you complete an order or sale.</p>
          </div>
        ) : (
          <div className="sales-table-wrapper">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Classification</th>
                  <th>Qty</th>
                  <th>Unit Price</th>
                  <th>Total</th>
                  <th>Profit</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map(sale => (
                  <tr key={sale.id}>
                    <td>{new Date(sale.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                    <td><strong>{sale.projectName}</strong></td>
                    <td>
                      <span className={`category-pill ${sale.category === 'Fuzzy Wire' ? 'fuzzy' : 'crochet'}`}>
                        {sale.category === 'Fuzzy Wire' ? '✨ Fuzzy Wire' : '🧶 Crochet'}
                      </span>
                    </td>
                    <td>{sale.quantity}</td>
                    <td>{money(sale.price, sale.currency)}</td>
                    <td><strong>{money(sale.total, sale.currency)}</strong></td>
                    <td className="profit-cell">+{money(sale.profit, sale.currency)}</td>
                    <td className="note-cell">{sale.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Sale Modal */}
      {modalOpen && (
        <SaleModal onClose={() => setModalOpen(false)} saving={saving}>
          <div className="modal-toolbar">
            <span className="eyebrow">NEW TRANSACTION</span>
            <button type="button" className="modal-close" onClick={() => setModalOpen(false)} disabled={saving}>
              Close &times;
            </button>
          </div>

          <h2>Record a Sale</h2>
          <p className="page-description">
            Records customer revenue, computes profit, and automatically decrements stock.
          </p>

          {error && <div className="notice" role="alert">{error}</div>}
          {success && <div className="notice" style={{ background: '#ecfdf5', color: '#065f46' }}>{success}</div>}

          <form onSubmit={handleRecordSale}>
            <div className="detail-fields">
              <label>
                Select Item
                <select
                  value={selectedProjectId}
                  onChange={e => handleProjectSelect(e.target.value)}
                  disabled={saving}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      [{p.category || 'Crochet'}] {p.name} — {money(costs(p).total, p.currency)} (Stock: {p.stock ?? 0})
                    </option>
                  ))}
                </select>
              </label>

              <div className="cost-fields">
                <label>
                  Quantity Sold
                  <input
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    required
                    value={quantity}
                    onChange={e => setQuantity(e.target.value)}
                    disabled={saving}
                  />
                </label>

                <label>
                  Selling Price per Unit ({currency})
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={salePrice}
                    onChange={e => setSalePrice(e.target.value)}
                    disabled={saving}
                  />
                </label>
              </div>

              <label>
                Sale Note / Customer Channel (Optional)
                <input
                  type="text"
                  placeholder="e.g. Facebook Messenger order, Walk-in bazaar"
                  value={saleNote}
                  onChange={e => setSaleNote(e.target.value)}
                  disabled={saving}
                />
              </label>

              <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                <button type="button" className="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={saving}>
                  {saving ? 'Recording…' : 'Record Sale'}
                </button>
              </div>
            </div>
          </form>
        </SaleModal>
      )}
    </section>
  )
}
