import { formatMoney, STATUS_LABELS } from '../../shared/commerce.js';
export const escapeHtml = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );
export function emailFor(job, settings, config) {
  const e = escapeHtml;
  const data = job.data;
  const o = data.order;
  const de = o?.language === 'de';
  const label = de
    ? {
        pending_payment: 'Zahlung ausstehend',
        confirmed: 'Bestellung bestätigt',
        packed: 'Bestellung gepackt',
        shipped: 'Bestellung versendet',
        delivered: 'Bestellung zugestellt',
        refunded: 'Zahlung erstattet',
      }[o.status] || STATUS_LABELS[o.status]
    : o && STATUS_LABELS[o.status];
  let subject = 'Earthveda Essentials';
  let content = '';
  if (o) {
    subject = `${o.orderNumber}: ${label}`;
    const track = `${config.publicSiteUrl}/order/${o.orderNumber}?token=${data.token || ''}`;
    content = `<h1>${e(subject)}</h1><p>${de ? 'Hallo' : 'Hello'} ${e(o.customer.firstName)},</p><p>${e(label)}</p><table style="width:100%;border-collapse:collapse">${o.lines.map((l) => `<tr><td style="padding:8px 0;border-bottom:1px solid #ddd">${l.quantity} × ${e(l.name)}</td><td style="text-align:right">${e(formatMoney(l.lineTotal))}</td></tr>`).join('')}<tr><td>${de ? 'Versand' : 'Shipping'}</td><td style="text-align:right">${e(formatMoney(o.shipping))}</td></tr><tr><td><strong>${de ? 'Gesamt, inkl. Steuern' : 'Total, taxes included'}</strong></td><td style="text-align:right"><strong>${e(formatMoney(o.total))}</strong></td></tr></table><p>${de ? 'Lieferung an' : 'Deliver to'}: ${e(o.customer.firstName)} ${e(o.customer.lastName)}, ${e(o.customer.street)}, ${e(o.customer.unit)}, ${e(o.customer.postalCode)} ${e(o.customer.city)}, ${e(o.market)}</p>${o.trackingUrl ? `<p><a href="${e(o.trackingUrl)}">${de ? 'Paket verfolgen' : 'Track parcel'} ${e(o.trackingCode)}</a></p>` : ''}<p><a style="background:#193e2b;color:#fff;padding:12px 20px;display:inline-block;border-radius:8px" href="${e(track)}">${de ? 'Bestellung ansehen' : 'View order'}</a></p><p>${de ? 'AGB und Widerrufsinformationen zum Kaufzeitpunkt' : 'Terms and withdrawal information at time of purchase'} (${de ? 'Version' : 'version'} ${e(o.policyVersion)}):</p><div style="white-space:pre-wrap;font-size:12px">${e(o.policySnapshot?.terms)}
${e(o.policySnapshot?.withdrawal)}</div>`;
  }
  if (job.kind === 'newsletter-confirm') {
    subject = data.language === 'de' ? 'Newsletter bestätigen' : 'Confirm your subscription';
    const link = `${config.publicSiteUrl}/newsletter-confirm?token=${data.token}`;
    content = `<h1>${e(subject)}</h1><p>${data.language === 'de' ? 'Bitte bestätige deine Anmeldung.' : 'Please confirm your subscription.'}</p><a href="${e(link)}">${data.language === 'de' ? 'Anmeldung bestätigen' : 'Confirm subscription'}</a><p>${data.language === 'de' ? 'Dieser Link ist 24 Stunden gültig. Falls du dich nicht angemeldet hast, ignoriere diese E-Mail.' : 'This link expires after 24 hours. If you did not request it, ignore this email.'}</p><p><a href="${e(config.publicSiteUrl + '/unsubscribe?token=' + data.token)}">${data.language === 'de' ? 'Abmelden' : 'Unsubscribe'}</a></p>`;
  }
  if (job.kind === 'withdrawal-email') {
    subject = `Withdrawal received: ${data.orderNumber}`;
    content = `<h1>Withdrawal received / Widerruf eingegangen</h1><p>${e(data.name)}</p><p>Contract: ${e(data.orderNumber)}</p><p>${e(data.details)}</p><p>Received: ${e(data.receivedAt)}</p><p>Reference: ${e(data.id)}</p><p>This confirms receipt of your declaration. Our team will process the return and any applicable refund.</p>`;
  }
  return {
    subject,
    html: `<!doctype html><html><body style="margin:0;background:#f4f2e9;font:16px Arial;color:#193e2b"><div style="max-width:600px;margin:24px auto;background:white;border-radius:16px;padding:28px"><p style="letter-spacing:2px;font-weight:bold">EARTHVEDA ESSENTIALS</p>${content}<hr><p style="font-size:12px">${e(settings.legalName)} · ${e(settings.address)}<br>${e(settings.email)}</p></div></body></html>`,
  };
}
export function createNotificationWorker(store, config, logger, { fetcher = fetch } = {}) {
  let running = false;
  let timer;
  async function deliver(job) {
    const settings = store.settings();
    if (job.kind === 'whatsapp') {
      if (!config.WHATSAPP_ACCESS_TOKEN || !config.WHATSAPP_PHONE_ID)
        throw new Error('WhatsApp configuration missing');
      const o = job.data.order;
      const r = await fetcher(
        `https://graph.facebook.com/${config.WHATSAPP_GRAPH_VERSION}/${config.WHATSAPP_PHONE_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: job.data.to,
            type: 'template',
            template: {
              name: config.WHATSAPP_TEMPLATE,
              language: { code: config.WHATSAPP_TEMPLATE_LANG },
              components: [
                {
                  type: 'body',
                  parameters: [
                    { type: 'text', text: o.customer.firstName },
                    { type: 'text', text: o.orderNumber },
                    { type: 'text', text: STATUS_LABELS[o.status] },
                    { type: 'text', text: formatMoney(o.total) },
                  ],
                },
              ],
            },
          }),
          signal: AbortSignal.timeout(12000),
        },
      );
      if (!r.ok) throw new Error(`WhatsApp provider HTTP ${r.status}`);
      return;
    }
    if (!config.RESEND_API_KEY || !config.EMAIL_FROM)
      throw new Error('Email configuration missing');
    const message = emailFor(job, settings, config);
    const r = await fetcher('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': job.id,
      },
      body: JSON.stringify({
        from: config.EMAIL_FROM,
        to: [job.data.to],
        reply_to: settings.email || undefined,
        ...message,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) throw new Error(`Email provider HTTP ${r.status}`);
  }
  return {
    async drain() {
      if (running) return;
      running = true;
      try {
        for (let n = 0; n < 20; n++) {
          const job = store.tx(() => {
            const row = store.db
              .prepare(
                "SELECT * FROM outbox WHERE (state='pending' AND next_at<=?) OR (state='processing' AND lease_until<?) ORDER BY created_at LIMIT 1",
              )
              .get(Date.now(), Date.now());
            if (!row) return null;
            store.db
              .prepare(
                "UPDATE outbox SET state='processing',attempts=attempts+1,lease_until=? WHERE id=?",
              )
              .run(Date.now() + 120000, row.id);
            return { ...row, data: JSON.parse(row.data), attempts: row.attempts + 1 };
          });
          if (!job) break;
          try {
            await deliver(job);
            store.db
              .prepare("UPDATE outbox SET state='sent',lease_until=0,last_error=NULL WHERE id=?")
              .run(job.id);
          } catch (err) {
            store.db
              .prepare('UPDATE outbox SET state=?,next_at=?,lease_until=0,last_error=? WHERE id=?')
              .run(
                job.attempts >= 10 ? 'failed' : 'pending',
                Date.now() + Math.min(3600000, 15000 * 2 ** job.attempts),
                String(err.message).slice(0, 200),
                job.id,
              );
            logger.warn('notification retry', { jobId: job.id, attempt: job.attempts });
          }
        }
      } finally {
        running = false;
      }
    },
    start() {
      timer = setInterval(
        () => this.drain().catch((e) => logger.error('outbox drain failed', { err: e })),
        10000,
      );
      timer.unref();
    },
    stop() {
      clearInterval(timer);
    },
    queueStatus() {
      return store.db
        .prepare(
          'SELECT id,kind,state,attempts,last_error,created_at FROM outbox ORDER BY created_at DESC LIMIT 200',
        )
        .all();
    },
  };
}
