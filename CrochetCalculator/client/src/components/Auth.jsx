import { useEffect, useState } from 'react'

async function authRequest(path, body) {
  const response = await fetch(`/api/auth/${path}`, body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  } : undefined)
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error || 'Unable to reach your account. Please retry.')
  return data
}

export default function Auth({ children }) {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    fetch('/api/auth/me').then(async response => {
      if (response.status === 401) return null
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'Account storage is unavailable.')
      return body
    }).then(value => { if (active) setUser(value) })
      .catch(() => { if (active) setError('Unable to restore your session. Check that the backend is running, then log in.') })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [])
  async function submit(event) {
    event.preventDefault()
    if (!/^[0-9]{6}$/.test(pin)) { setError('Enter your six-digit PIN.'); return }
    setBusy(true); setError('')
    try {
      setUser(await authRequest('login', { pin }))
      setPin('')
    } catch (err) { setError(err.message === 'Failed to fetch' ? 'Cannot reach the backend. Please start it and try again.' : err.message) }
    finally { setBusy(false) }
  }
  async function logout() {
    setBusy(true); setError('')
    try { await authRequest('logout', {}); setUser(null) }
    catch (err) { setError(err.message) }
    finally { setBusy(false) }
  }
  if (checking) return <div className="auth-loading" role="status">Opening your crochet workspace…</div>
  if (user) return <>{error && <div className="notice" role="alert">{error}</div>}{children(user, logout)}</>
  return <div className="app-shell auth-shell">
    <a className="back-to-shop" href="#shop">← Back to the shop</a>
    <main className="auth-layout woodland-login">
      <div className="woodland-scenery" aria-hidden="true"><span className="woodland-sun" /><span className="woodland-hill hill-back" /><span className="woodland-hill hill-front" /><span className="woodland-branch branch-left" /><span className="woodland-branch branch-right" /><span className="woodland-petal petal-one" /><span className="woodland-petal petal-two" /><span className="woodland-petal petal-three" /></div>
      <div className="login-composition">
        <div className="login-wordmark"><span className="wordmark-sprig" aria-hidden="true">&#10087;</span><p className="wordmark-kicker">A LITTLE HOME FOR HANDMADE</p><h1>MZ <em>Crafties</em></h1><p className="wordmark-subtitle">Mari&amp;Zect Crafties</p></div>
      <section className="auth-card" aria-labelledby="auth-title"><p className="eyebrow">LET’S MAKE SOMETHING LOVELY</p><h2 id="auth-title">Welcome back.</h2><p>Your next creation starts here. Log in to your workspace.</p>
        <form onSubmit={submit}><fieldset disabled={busy} className="auth-fields">
          <label className="pin-label" htmlFor="login-pin">Your 6-digit PIN</label>
          <input id="login-pin" className="pin-input" type="password" inputMode="numeric" autoComplete="current-password" pattern="[0-9]{6}" required minLength={6} maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))} aria-describedby="pin-help" placeholder="••••••" />
          <small id="pin-help">Enter the PIN assigned to you to open your workspace.</small>
          {error && <div className="notice" role="alert">{error}</div>}
          <button type="submit" className="primary">{busy ? 'One moment…' : 'Log in'}</button>
        </fieldset></form><p className="assigned-account-note">Need a PIN? Contact the MZ Crafties workspace owner.</p>
      </section>
      <p className="woodland-signoff">Made slowly. Kept with love.</p>
      </div>
    </main>
  </div>
}
