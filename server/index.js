import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';
import { initDb, dbEnabled, query, withTransaction } from './db.js';
import { bootstrapOwner, createAdminUser, login, requireAuth, requireAnyRole } from './auth.js';
import { buildOrderFromItems, searchCatalog } from './catalog.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const app = express();
const port = Number(process.env.PORT || 3000);
const TERMS_VERSION = '2026-10-01-v1';
const ORDER_STATUSES = new Set(['new','paid','purchased','us_warehouse','international','last_mile','delivered','cancelled']);

app.set('trust proxy', 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '1mb' }));

const publicLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60_000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false });
app.use('/api', publicLimiter);

function requireDb(req, res, next) {
  if (!dbEnabled) return res.status(503).json({ error: 'database_not_configured' });
  next();
}

function orderNumber() {
  const d = new Date();
  const date = [d.getUTCFullYear().toString().slice(-2), String(d.getUTCMonth()+1).padStart(2,'0'), String(d.getUTCDate()).padStart(2,'0')].join('');
  return `US${date}-${randomInt(100000, 999999)}`;
}

function customerFrom(body = {}) {
  return {
    firstName: String(body.firstName || '').trim(),
    lastName: String(body.lastName || '').trim(),
    phone: String(body.phone || '').trim(),
    email: String(body.email || '').trim(),
    city: String(body.city || '').trim(),
    delivery: String(body.delivery || '').trim(),
    address: String(body.address || '').trim(),
    comment: String(body.comment || '').trim()
  };
}

app.get('/api/health', (req, res) => res.json({ ok: true, database: dbEnabled, service: 'us-deals-ua', time: new Date().toISOString() }));

app.get('/api/search', async (req, res, next) => {
  try {
    const result = await searchCatalog({ q: req.query.q, cat: req.query.cat, source: req.query.source, limit: req.query.limit });
    res.json(result);
  } catch (error) { next(error); }
});

app.post('/api/auth/login', authLimiter, requireDb, async (req, res, next) => {
  try {
    const result = await login(req.body?.email, req.body?.password);
    if (!result) return res.status(401).json({ error: 'invalid_credentials' });
    res.json(result);
  } catch (error) { next(error); }
});

app.post('/api/orders', requireDb, async (req, res, next) => {
  try {
    const customer = customerFrom(req.body?.customer);
    if (!customer.firstName || !customer.lastName || !customer.phone || !customer.city || !customer.address) {
      return res.status(400).json({ error: 'customer_fields_required' });
    }
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ error: 'items_required' });
    if (req.body?.acceptance?.accepted !== true) return res.status(400).json({ error: 'terms_acceptance_required' });

    const calculated = await buildOrderFromItems(items);
    if (calculated.goodsEur > calculated.customsLimitEur) {
      return res.status(409).json({ error: 'customs_limit_exceeded', goodsEur: calculated.goodsEur, limitEur: calculated.customsLimitEur });
    }

    const acceptedAt = new Date().toISOString();
    const acceptance = {
      accepted: true,
      acceptedAt,
      termsVersion: String(req.body?.acceptance?.termsVersion || TERMS_VERSION),
      offerUrl: 'offer.html'
    };
    const no = orderNumber();

    const created = await withTransaction(async client => {
      const inserted = await client.query(
        `INSERT INTO orders (order_number,status,customer,financials,goods_eur,acceptance,source_meta)
         VALUES ($1,'new',$2::jsonb,$3::jsonb,$4,$5::jsonb,$6::jsonb)
         RETURNING id,order_number,status,customer,financials,goods_eur,acceptance,created_at`,
        [no, JSON.stringify(customer), JSON.stringify(calculated.financials), calculated.goodsEur, JSON.stringify(acceptance), JSON.stringify(req.body?.sourceMeta || {})]
      );
      const order = inserted.rows[0];
      for (const item of calculated.snapshots) {
        await client.query(
          'INSERT INTO order_items (order_id,product_id,qty,snapshot) VALUES ($1,$2,$3,$4::jsonb)',
          [order.id, item.productId, item.qty, JSON.stringify(item)]
        );
      }
      await client.query(
        `INSERT INTO order_events (order_id,event_type,label,payload)
         VALUES ($1,'order_created','Заказ создан',$2::jsonb)`,
        [order.id, JSON.stringify({ acceptedAt, termsVersion: acceptance.termsVersion })]
      );
      return order;
    });

    res.status(201).json({ order: created, items: calculated.snapshots });
  } catch (error) { next(error); }
});

app.get('/api/admin/orders', requireDb, requireAuth, requireAnyRole('owner','operator','buyer','logistics','finance'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT o.*,
        COALESCE((SELECT json_agg(oi.snapshot ORDER BY oi.id) FROM order_items oi WHERE oi.order_id=o.id),'[]'::json) AS items
       FROM orders o ORDER BY o.created_at DESC LIMIT 500`
    );
    res.json({ orders: result.rows });
  } catch (error) { next(error); }
});

app.get('/api/admin/orders/:number', requireDb, requireAuth, requireAnyRole('owner','operator','buyer','logistics','finance'), async (req, res, next) => {
  try {
    const result = await query(
      `SELECT o.*,
        COALESCE((SELECT json_agg(oi.snapshot ORDER BY oi.id) FROM order_items oi WHERE oi.order_id=o.id),'[]'::json) AS items,
        COALESCE((SELECT json_agg(e ORDER BY e.created_at DESC) FROM order_events e WHERE e.order_id=o.id),'[]'::json) AS events,
        COALESCE((SELECT json_agg(d ORDER BY d.created_at DESC) FROM order_documents d WHERE d.order_id=o.id),'[]'::json) AS documents
       FROM orders o WHERE o.order_number=$1 LIMIT 1`,
      [req.params.number]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'order_not_found' });
    res.json({ order: result.rows[0] });
  } catch (error) { next(error); }
});

app.patch('/api/admin/orders/:number', requireDb, requireAuth, requireAnyRole('owner','operator','buyer','logistics'), async (req, res, next) => {
  try {
    const current = await query('SELECT * FROM orders WHERE order_number=$1 LIMIT 1', [req.params.number]);
    if (!current.rowCount) return res.status(404).json({ error: 'order_not_found' });
    const old = current.rows[0];

    const status = req.body?.status == null ? old.status : String(req.body.status);
    if (!ORDER_STATUSES.has(status)) return res.status(400).json({ error: 'invalid_status' });

    const role = req.user.role;
    const purchase = ['owner','operator','buyer'].includes(role) && req.body?.purchase ? req.body.purchase : old.purchase;
    const warehouse = ['owner','operator','logistics'].includes(role) && req.body?.warehouse ? req.body.warehouse : old.warehouse;
    const shipping = ['owner','operator','logistics'].includes(role) && req.body?.shipping ? req.body.shipping : old.shipping;

    if (role === 'buyer' && !['paid','purchased','us_warehouse'].includes(status)) return res.status(403).json({ error: 'buyer_status_not_allowed' });
    if (role === 'logistics' && !['purchased','us_warehouse','international','last_mile','delivered'].includes(status)) return res.status(403).json({ error: 'logistics_status_not_allowed' });

    const result = await withTransaction(async client => {
      const updated = await client.query(
        `UPDATE orders SET status=$2,purchase=$3::jsonb,warehouse=$4::jsonb,shipping=$5::jsonb,updated_at=now()
         WHERE order_number=$1 RETURNING *`,
        [req.params.number, status, JSON.stringify(purchase || {}), JSON.stringify(warehouse || {}), JSON.stringify(shipping || {})]
      );
      await client.query(
        `INSERT INTO order_events (order_id,actor_user_id,event_type,label,payload)
         VALUES ($1,$2,'admin_update','Операционные данные обновлены',$3::jsonb)`,
        [old.id, req.user.sub, JSON.stringify({ fromStatus: old.status, toStatus: status })]
      );
      await client.query(
        `INSERT INTO audit_log (actor_user_id,action,entity_type,entity_id,payload)
         VALUES ($1,'order.update','order',$2,$3::jsonb)`,
        [req.user.sub, req.params.number, JSON.stringify({ status })]
      );
      return updated.rows[0];
    });
    res.json({ order: result });
  } catch (error) { next(error); }
});

app.post('/api/admin/orders/:number/documents', requireDb, requireAuth, requireAnyRole('owner','operator','buyer','logistics','finance'), async (req, res, next) => {
  try {
    const order = await query('SELECT id FROM orders WHERE order_number=$1 LIMIT 1', [req.params.number]);
    if (!order.rowCount) return res.status(404).json({ error: 'order_not_found' });
    const type = String(req.body?.documentType || '').trim();
    const label = String(req.body?.label || '').trim();
    if (!type || !label) return res.status(400).json({ error: 'document_fields_required' });
    const result = await query(
      `INSERT INTO order_documents (order_id,document_type,label,external_url,storage_key,metadata,created_by)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)
       RETURNING *`,
      [order.rows[0].id, type, label, req.body?.externalUrl || null, req.body?.storageKey || null, JSON.stringify(req.body?.metadata || {}), req.user.sub]
    );
    res.status(201).json({ document: result.rows[0] });
  } catch (error) { next(error); }
});

app.get('/api/admin/team', requireDb, requireAuth, requireAnyRole('owner'), async (req, res, next) => {
  try {
    const result = await query('SELECT id,name,email,role,active,created_at,updated_at FROM admin_users ORDER BY created_at');
    res.json({ users: result.rows });
  } catch (error) { next(error); }
});

app.post('/api/admin/team', requireDb, requireAuth, requireAnyRole('owner'), async (req, res, next) => {
  try {
    const user = await createAdminUser(req.body || {});
    await query(
      `INSERT INTO audit_log (actor_user_id,action,entity_type,entity_id,payload)
       VALUES ($1,'admin_user.create','admin_user',$2,$3::jsonb)`,
      [req.user.sub, user.id, JSON.stringify({ role: user.role, email: user.email })]
    );
    res.status(201).json({ user });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ error: 'email_exists' });
    if (['invalid_role','password_too_short','email_required'].includes(error.message)) return res.status(400).json({ error: error.message });
    next(error);
  }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'api_not_found' }));

const blocked = ['/server/', '/package.json', '/package-lock.json', '/BACKEND_DEPLOY.md', '/ADMIN_ARCHITECTURE.md', '/MARKETPLACE_SEARCH_SPEC.md'];
app.use((req, res, next) => {
  if (blocked.some(prefix => req.path === prefix || req.path.startsWith(prefix))) return res.sendStatus(404);
  next();
});
app.use(express.static(ROOT, { dotfiles: 'deny', index: 'index.html', extensions: ['html'] }));

app.use((error, req, res, next) => {
  console.error(error);
  const message = process.env.NODE_ENV === 'production' ? 'internal_error' : String(error.message || error);
  res.status(500).json({ error: message });
});

async function start() {
  if (dbEnabled) {
    await initDb();
    await bootstrapOwner();
  } else {
    console.warn('DATABASE_URL is not set. Search works, but orders/admin APIs are disabled.');
  }
  app.listen(port, () => console.log(`US deals UA server listening on :${port}`));
}

start().catch(error => {
  console.error('Fatal startup error:', error);
  process.exit(1);
});
