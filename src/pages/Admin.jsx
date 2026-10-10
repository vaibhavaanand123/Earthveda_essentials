import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../services/apiClient';
import { formatMoney, STATUS_LABELS, STATUS_TRANSITIONS } from '../../shared/commerce';
import AdminProductEditor from '../components/AdminProductEditor';
import AdminSettings from '../components/AdminSettings';
import Field from '../components/Field';
import Seo from '../components/Seo';
async function download(path, name) {
  const r = await apiRequest(path, { raw: true });
  const url = URL.createObjectURL(await r.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function OrderCard({ order, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [trackingCode, setCode] = useState(order.trackingCode || '');
  const [trackingUrl, setUrl] = useState(order.trackingUrl || '');
  async function move(status) {
    if (busy) return;
    setBusy(true);
    try {
      await apiRequest('/admin/orders/' + order.orderNumber, {
        method: 'PATCH',
        body: { status, trackingCode, trackingUrl },
      });
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="admin-order">
      <header>
        <strong>{order.orderNumber}</strong>
        <span className="pill">{STATUS_LABELS[order.status]}</span>
        <strong>{formatMoney(order.total)}</strong>
      </header>
      <p>
        {order.customer.firstName} {order.customer.lastName} · {order.customer.email} ·{' '}
        {order.customer.phone}
      </p>
      <p>
        {order.customer.street}, {order.customer.unit}, {order.customer.postalCode}{' '}
        {order.customer.city}, {order.market}
      </p>
      <ul>
        {order.lines.map((l) => (
          <li key={l.productId}>
            {l.quantity} × {l.name} · {formatMoney(l.lineTotal)}
          </li>
        ))}
      </ul>
      <p>
        Shipping {formatMoney(order.shipping)} · Payment: {order.paymentStatus} · Created:{' '}
        {new Date(order.createdAt).toLocaleString()}
      </p>
      {order.note && <p>Customer note: {order.note}</p>}
      <div className="grid-2">
        <Field
          label="Parcel tracking code"
          value={trackingCode}
          onChange={(e) => setCode(e.target.value)}
        />
        <Field
          label="HTTPS tracking URL"
          type="url"
          value={trackingUrl}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <div className="admin__tools">
        {(STATUS_TRANSITIONS[order.status] || [])
          .filter((s) => s !== 'refund_pending')
          .map((s) => (
            <button key={s} className="btn btn--ink" disabled={busy} onClick={() => move(s)}>
              {STATUS_LABELS[s]}
            </button>
          ))}
        {['confirmed', 'packed', 'shipped', 'delivered', 'refund_pending'].includes(
          order.status,
        ) && (
          <button
            className="btn btn--danger"
            disabled={busy}
            onClick={async () => {
              if (
                !window.confirm(
                  'Issue a full refund for ' +
                    order.orderNumber +
                    '? This will refund the original payment.',
                )
              )
                return;
              setBusy(true);
              try {
                await apiRequest('/admin/orders/' + order.orderNumber + '/refund', {
                  method: 'POST',
                });
                onChanged();
              } catch (e) {
                setError(e.message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Full refund (owner)
          </button>
        )}
      </div>
      {order.refundProviderStatus && <p>Refund provider status: {order.refundProviderStatus}</p>}
      <p role="alert">{error}</p>
    </article>
  );
}
function Team() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: '', password: '', role: 'staff' });
  const [error, setError] = useState('');
  const load = () =>
    apiRequest('/admin/users')
      .then(setUsers)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  return (
    <section>
      <h2>Individual team accounts</h2>
      <ul>
        {users.map((u) => (
          <li key={u.email}>
            {u.email} · {u.role} · {u.active ? 'Active' : 'Disabled'}{' '}
            {u.active === 1 && (
              <button
                className="link"
                onClick={async () => {
                  try {
                    await apiRequest('/admin/users/' + encodeURIComponent(u.email), {
                      method: 'DELETE',
                    });
                    load();
                  } catch (e) {
                    setError(e.message);
                  }
                }}
              >
                Disable
              </button>
            )}
          </li>
        ))}
      </ul>
      <form
        className="track-form"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await apiRequest('/admin/users', { method: 'POST', body: form });
            setForm({ email: '', password: '', role: 'staff' });
            load();
          } catch (err) {
            setError(err.message);
          }
        }}
      >
        <Field
          label="Staff email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
        />
        <Field
          label="Initial password, at least 14 characters"
          type="password"
          required
          minLength={14}
          value={form.password}
          onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
        />
        <label className="field">
          <span>Role</span>
          <select
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            <option value="staff">Staff: products and fulfilment</option>
            <option value="owner">Owner: settings, refunds and access</option>
          </select>
        </label>
        <button className="btn btn--ink">Create account</button>
      </form>
      <p role="alert">{error}</p>
    </section>
  );
}
export default function Admin() {
  const [user, setUser] = useState(null);
  const [login, setLogin] = useState({ email: '', password: '' });
  const [tab, setTab] = useState('orders');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [orders, setOrders] = useState({ orders: [], total: 0 });
  const [products, setProducts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [audit, setAudit] = useState([]);
  const [editing, setEditing] = useState(undefined);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const seen = useRef(null);
  const latest = useRef(0);
  useEffect(() => {
    apiRequest('/admin/me')
      .then((r) => setUser(r.user))
      .catch(() => {});
  }, []);
  const load = useCallback(async () => {
    if (!user) return;
    const seq = ++latest.current;
    try {
      if (tab === 'orders') {
        const r = await apiRequest(
          '/admin/orders?' +
            new URLSearchParams({ status, search, offset: String(offset), limit: '50' }),
        );
        if (seq !== latest.current) return;
        setOrders(r);
        const ids = r.orders.filter((o) => o.paymentStatus === 'paid').map((o) => o.orderNumber);
        if (
          seen.current &&
          r.orders.some((o) => o.paymentStatus === 'paid' && !seen.current.has(o.orderNumber))
        ) {
          setMessage('New paid orders are ready to process.');
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted')
            new Notification('Earthveda: new paid order', {
              body: 'Open the order dashboard to process your order.',
            });
        }
        seen.current = new Set(ids);
      }
      if (tab === 'products') setProducts(await apiRequest('/admin/products'));
      if (tab === 'notifications') setJobs(await apiRequest('/admin/notifications'));
      if (tab === 'withdrawals') setWithdrawals(await apiRequest('/admin/withdrawals'));
      if (tab === 'audit') setAudit(await apiRequest('/admin/audit'));
    } catch (e) {
      if (e.status === 401) setUser(null);
      setMessage(e.message);
    }
  }, [user, tab, status, search, offset]);
  useEffect(() => {
    const timeout = setTimeout(load, search ? 300 : 0);
    const timer = setInterval(load, 30000);
    return () => {
      clearTimeout(timeout);
      clearInterval(timer);
    };
  }, [load, search]);
  return (
    <main className="page container admin">
      <Seo title="Team dashboard" noindex />
      <header className="admin__head">
        <div>
          <p className="eyebrow">Earthveda operations</p>
          <h1>Team dashboard</h1>
          <Link to="/">View shop</Link>
        </div>
        {user && (
          <div className="admin__tools">
            <span>
              {user.email} · {user.role}
            </span>
            <button className="btn btn--ghost" onClick={load}>
              Refresh
            </button>
            <button
              className="btn btn--ghost"
              onClick={async () => {
                await apiRequest('/admin/logout', { method: 'POST' });
                setUser(null);
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </header>
      <p className="admin-toast" role="status">
        {message}
      </p>
      {!user ? (
        <form
          className="track-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              setUser((await apiRequest('/admin/login', { method: 'POST', body: login })).user);
              setLogin({ email: '', password: '' });
              setMessage('');
            } catch (err) {
              setMessage(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field
            label="Email"
            type="email"
            autoComplete="username"
            required
            value={login.email}
            onChange={(e) => setLogin((f) => ({ ...f, email: e.target.value }))}
          />
          <Field
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={login.password}
            onChange={(e) => setLogin((f) => ({ ...f, password: e.target.value }))}
          />
          <button className="btn btn--ink" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      ) : (
        <>
          <nav className="tabs admin-tabs" aria-label="Administration">
            {[
              'orders',
              'products',
              'notifications',
              'withdrawals',
              ...(user.role === 'owner' ? ['settings', 'team', 'audit'] : []),
            ].map((id) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  setEditing(undefined);
                  setMessage('');
                }}
                aria-pressed={tab === id}
                className={tab === id ? 'is-on' : ''}
              >
                {id}
              </button>
            ))}
          </nav>
          {tab === 'orders' && (
            <>
              <div className="admin__tools">
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setOffset(0);
                    seen.current = null;
                  }}
                >
                  <option value="">All statuses</option>
                  {Object.entries(STATUS_LABELS).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="search"
                  placeholder="Order number or email"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setOffset(0);
                    seen.current = null;
                  }}
                />
                <button
                  className="btn btn--ghost"
                  onClick={() =>
                    download('/admin/orders.csv', 'orders.csv').catch((e) => setMessage(e.message))
                  }
                >
                  Export orders
                </button>
                {typeof Notification !== 'undefined' && (
                  <button
                    className="btn btn--ghost"
                    onClick={() => Notification.requestPermission()}
                  >
                    Enable desktop alerts
                  </button>
                )}
                {user.role === 'owner' && (
                  <button
                    className="btn btn--ghost"
                    onClick={() =>
                      apiRequest('/admin/reconcile', { method: 'POST' })
                        .then((r) => {
                          setMessage(
                            r.failures?.length
                              ? 'Some payments need review. Check the provider for orders: ' +
                                  r.failures.map((x) => x.orderNumber).join(', ')
                              : 'Payment reconciliation completed.',
                          );
                          load();
                        })
                        .catch((e) => setMessage(e.message))
                    }
                  >
                    Reconcile payments
                  </button>
                )}
              </div>
              <p>
                {orders.total} orders · Paid orders are ready for fulfilment. Unpaid orders cannot
                be packed or shipped.
              </p>
              {orders.orders.map((o) => (
                <OrderCard key={o.orderNumber + o.updatedAt} order={o} onChanged={load} />
              ))}
              <div className="admin__tools">
                <button
                  className="btn btn--ghost"
                  disabled={offset === 0}
                  onClick={() => setOffset((o) => Math.max(0, o - 50))}
                >
                  Previous
                </button>
                <button
                  className="btn btn--ghost"
                  disabled={offset + 50 >= orders.total}
                  onClick={() => setOffset((o) => o + 50)}
                >
                  Next
                </button>
              </div>
            </>
          )}
          {tab === 'products' &&
            (editing !== undefined ? (
              <AdminProductEditor
                key={editing?.id || 'new'}
                product={editing}
                onClose={() => setEditing(undefined)}
                onSave={() => {
                  setEditing(undefined);
                  load();
                }}
              />
            ) : (
              <>
                <div className="admin__head">
                  <h2>Products</h2>
                  <button className="btn btn--ink" onClick={() => setEditing(null)}>
                    Add product
                  </button>
                </div>
                <div className="admin-product-grid">
                  {products.map((p) => (
                    <article key={p.id}>
                      <img src={p.image} alt="" width="120" height="150" />
                      <h3>{p.name}</h3>
                      <p>
                        {p.sku} · {formatMoney(p.prices.DE)}
                      </p>
                      <p>
                        {p.stock} in stock · {p.reserved} reserved
                      </p>
                      <p>
                        {p.published ? 'Published' : 'Archived / draft'} ·{' '}
                        {p.complianceReady ? 'Verified for sale' : 'Food details pending'}
                      </p>
                      <button className="btn btn--ink" onClick={() => setEditing(p)}>
                        Edit
                      </button>{' '}
                      <button
                        className="btn btn--ghost"
                        onClick={async () => {
                          if (!window.confirm('Archive ' + p.name + '?')) return;
                          try {
                            await apiRequest('/admin/products/' + p.id, {
                              method: 'DELETE',
                              body: { version: p.version },
                            });
                            load();
                          } catch (e) {
                            setMessage(e.message);
                          }
                        }}
                      >
                        Archive
                      </button>
                    </article>
                  ))}
                </div>
              </>
            ))}
          {tab === 'settings' && <AdminSettings />}
          {tab === 'team' && <Team />}
          {tab === 'notifications' && (
            <>
              <h2>Notification delivery</h2>
              <p>
                Sent means the provider accepted the message. Retry failed deliveries after
                correcting provider configuration.
              </p>
              <div className="table-wrap">
                <table className="info-table">
                  <thead>
                    <tr>
                      <th>Message</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Attempts</th>
                      <th>Error</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((j) => (
                      <tr key={j.id}>
                        <td>{j.id}</td>
                        <td>{j.kind}</td>
                        <td>{j.state}</td>
                        <td>{j.attempts}</td>
                        <td>{j.last_error}</td>
                        <td>
                          {j.state === 'failed' && user.role === 'owner' && (
                            <button
                              onClick={() =>
                                apiRequest(
                                  '/admin/notifications/' + encodeURIComponent(j.id) + '/retry',
                                  { method: 'POST' },
                                )
                                  .then(load)
                                  .catch((e) => setMessage(e.message))
                              }
                            >
                              Retry
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {user.role === 'owner' && (
                <button
                  className="btn btn--ghost"
                  onClick={() =>
                    download('/admin/subscribers.csv', 'subscribers.csv').catch((e) =>
                      setMessage(e.message),
                    )
                  }
                >
                  Export confirmed subscribers
                </button>
              )}
            </>
          )}
          {tab === 'withdrawals' && (
            <>
              <h2>Withdrawal declarations</h2>
              {withdrawals.map((w) => (
                <article className="admin-order" key={w.id}>
                  <strong>{w.orderNumber}</strong>
                  <p>
                    {w.name} · {w.email} · {w.receivedAt}
                  </p>
                  <p>{w.details}</p>
                  <p>
                    Reference: {w.id}. Review the applicable withdrawal right and process any refund
                    in Orders.
                  </p>
                </article>
              ))}
            </>
          )}
          {tab === 'audit' && (
            <div className="table-wrap">
              <table className="info-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Entity</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((a) => (
                    <tr key={a.id}>
                      <td>{a.at}</td>
                      <td>{a.actor}</td>
                      <td>{a.action}</td>
                      <td>{a.entity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </main>
  );
}
