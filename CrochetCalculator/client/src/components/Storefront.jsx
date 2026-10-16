import { useEffect, useRef, useState } from 'react'
import '../styles/Storefront.css'

const money = (value, currency) => new Intl.NumberFormat('en', { style: 'currency', currency }).format(value)
const safeLink = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : '' } catch { return '' } }

function OrderDialog({ items, quantities, setQuantities, contact, onClose }) {
  const dialog = useRef(null)
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const previous = document.activeElement
    dialog.current.showModal()
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = overflow; previous?.focus() }
  }, [])
  const selected = items.filter(item => quantities[item.id] > 0)
  const totals = selected.reduce((result, item) => ({ ...result, [item.currency]: (result[item.currency] || 0) + item.price * quantities[item.id] }), {})
  const message = ['Hello MZ Crafties! I would like to order:', ...selected.map(item => `${quantities[item.id]} × ${item.name} — ${money(item.price * quantities[item.id], item.currency)}`), '', ...Object.entries(totals).map(([currency, total]) => `Estimated total: ${money(total, currency)}`), '', 'Please confirm availability, delivery options, and the final total. Thank you!'].join('\n')
  const messenger = safeLink(contact.messenger || contact.facebook)
  const email = contact.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email) ? contact.email : ''
  async function copy() {
    try { await navigator.clipboard.writeText(message); setNotice('Order copied. Paste it into your Messenger conversation.') }
    catch { setNotice('Select and copy the order summary below, then paste it into Messenger.') }
  }
  return <dialog className="order-dialog" ref={dialog} aria-labelledby="order-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="order-heading"><div><p className="eyebrow">SOMETHING LOVELY, JUST FOR YOU</p><h2 id="order-title">Your order list</h2></div><button type="button" className="modal-close" onClick={onClose} aria-label="Close order list">×</button></div>
    <p>Choose your favorites and quantities, then contact us to arrange your order.</p>
    <div className="order-items">{items.map(item => <div className="order-row" key={item.id}>
      {item.image ? <img src={item.image} alt="" /> : <span className="order-placeholder" aria-hidden="true">✿</span>}
      <div><strong>{item.name}</strong><span className={`category-tag ${(item.category || 'Crochet') === 'Fuzzy Wire' ? 'category-fuzzy' : 'category-crochet'}`}>{(item.category || 'Crochet') === 'Fuzzy Wire' ? '✨ Fuzzy Wire' : '🧶 Crochet'}</span><small>{money(item.price, item.currency)}</small></div>
      <label>Quantity<input type="number" min="0" max={item.stock} step="1" value={quantities[item.id] || 0} onChange={event => { const value = Math.max(0, Math.min(item.stock, Math.floor(Number(event.target.value) || 0))); setQuantities(previous => ({ ...previous, [item.id]: value })); setNotice('') }} /></label>
    </div>)}</div>
    {selected.length > 0 ? <><div className="order-total">{Object.entries(totals).map(([currency, total]) => <strong key={currency}>Estimated total · {money(total, currency)}</strong>)}</div><label className="order-summary">Your message<textarea readOnly value={message} rows={7} /></label><div className="order-contact-actions"><button type="button" className="secondary" onClick={copy}>Copy order</button>{messenger && <a className="primary" href={messenger} target="_blank" rel="noopener noreferrer">Open Messenger</a>}{email && <a className="primary" href={`mailto:${email}?subject=${encodeURIComponent('MZ Crafties order inquiry')}&body=${encodeURIComponent(message)}`}>Email my order</a>}</div><p className="order-note">For Messenger, copy your order and paste it into the conversation. Your order is confirmed once we reply.</p>{!messenger && !email && <p className="notice">Contact details will be available soon. You can copy your order list for now.</p>}</> : <p className="notice">Select at least one item to prepare your order.</p>}
    <p role="status" className="order-feedback">{notice}</p>
  </dialog>
}

export default function Storefront() {
  const [items, setItems] = useState([])
  const [contact, setContact] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [open, setOpen] = useState(false)
  const [quantities, setQuantities] = useState({})
  const [categoryFilter, setCategoryFilter] = useState('all')
  useEffect(() => {
    let active = true
    fetch('/api/catalog').then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data }).then(data => { if (active) { setItems(data.items); setContact(data.contact) } }).catch(() => { if (active) setError('Our collection is temporarily unavailable. Please try again soon.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [revision])
  const facebook = safeLink(contact.facebook)
  const crochetCount = items.filter(i => (i.category || 'Crochet') === 'Crochet').length
  const fuzzyCount = items.filter(i => i.category === 'Fuzzy Wire').length
  const visibleItems = items.filter(i => categoryFilter === 'all' || (i.category || 'Crochet') === categoryFilter)

  return <div className="app-shell storefront">
    <header className="topbar shop-topbar"><a className="brand" href="#shop"><span className="brand-mark" aria-hidden="true">MZ</span><span>MZ Crafties<span className="brand-sub">Mari&amp;Zect Crafties</span></span></a><a className="admin-login" href="#admin">Login as admin <span aria-hidden="true">↗</span></a></header>
    <main><section className="shop-hero"><div><p className="eyebrow">A LITTLE JOY. A LOT OF HEART.</p><h1>Little treasures,<br /><em>lovingly handmade.</em></h1><p>Meet your next favorite from MZ Crafties. Made with care, ready to brighten your everyday.</p><a className="primary" href="#shop-products">Explore the collection <span aria-hidden="true">↓</span></a></div><div className="shop-hero-art" aria-hidden="true"><span>✿</span><p>Every stitch,<br />a little love.</p><small>MARI &amp; ZECT CRAFTIES</small></div></section>
      <section className="shop-collection" id="shop-products" aria-labelledby="collection-title"><div className="section-heading"><div><p className="eyebrow">FIND SOMETHING YOU LOVE</p><h2 id="collection-title">Our handmade collection</h2></div>{Object.values(quantities).some(value => value > 0) && <button type="button" className="secondary" onClick={() => setOpen(true)}>View my order</button>}</div>
        {loading ? <p className="shop-empty" role="status">Gathering our little treasures…</p> : error ? <div className="notice" role="alert">{error}<button onClick={() => { setLoading(true); setError(''); setRevision(value => value + 1) }}>Retry</button></div> : items.length === 0 ? <p className="shop-empty">New handmade treasures are on their way. Check back soon!</p> : <>
          <div className="category-filter-bar storefront-filter-bar">
            <button type="button" className={`cat-btn ${categoryFilter === 'all' ? 'active' : ''}`} onClick={() => setCategoryFilter('all')}>All crafts ({items.length})</button>
            <button type="button" className={`cat-btn ${categoryFilter === 'Crochet' ? 'active' : ''}`} onClick={() => setCategoryFilter('Crochet')}>🧶 Crochet ({crochetCount})</button>
            <button type="button" className={`cat-btn ${categoryFilter === 'Fuzzy Wire' ? 'active' : ''}`} onClick={() => setCategoryFilter('Fuzzy Wire')}>✨ Fuzzy Wire ({fuzzyCount})</button>
          </div>
          {visibleItems.length === 0 ? <p className="shop-empty">No items in this category yet.</p> : <div className="shop-grid">{visibleItems.map(item => <article className="shop-card" key={item.id}>{item.image ? <img src={item.image} alt={item.name} loading="lazy" /> : <div className="shop-no-photo" aria-hidden="true">✿</div>}<div className="shop-card-details"><div className="card-tags"><span className={`category-tag ${(item.category || 'Crochet') === 'Fuzzy Wire' ? 'category-fuzzy' : 'category-crochet'}`}>{(item.category || 'Crochet') === 'Fuzzy Wire' ? '✨ Fuzzy Wire' : '🧶 Crochet'}</span></div><h3>{item.name}</h3><p>{money(item.price, item.currency)}</p><button type="button" className="primary" onClick={() => { setQuantities(previous => ({ ...previous, [item.id]: previous[item.id] || 1 })); setOpen(true) }}>I want to Order</button></div></article>)}</div>}
        </>}
      </section><section className="shop-contact"><span aria-hidden="true">♡</span><div><h2>Let’s make it yours.</h2><p>Have a question or a special request? We’d love to hear from you.</p></div><div>{facebook && <a className="secondary" href={facebook} target="_blank" rel="noopener noreferrer">Visit our FB Page</a>}{contact.email && <a className="secondary" href={`mailto:${contact.email}`}>Email us</a>}</div></section>
    </main><footer>MZ Crafties <span>Handmade with love by Mari &amp; Zect.</span></footer>
    {open && <OrderDialog items={items} quantities={quantities} setQuantities={setQuantities} contact={contact} onClose={() => setOpen(false)} />}
  </div>
}
