const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { Part, Discount, User, Order, SiteConfig, Review, AuditLog, StockAlert, B2BRequest, Store, Workshop } = require('../models');
const { admin } = require('../middleware');
const { audit } = require('../audit');
const { paginate, sendLowStockAlert, notifyBackInStock, pruneAuditLogs } = require('../services');
const { releaseReservation } = require('../services');
const mailer = require('../mailer');
const logger = require('../logger');
const { validate } = require('../validators');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Matriz de transiciones de estado válidas.
const TRANSITIONS = {
  pending: ['paid', 'cancelled'],
  paid: ['dispatched', 'delivered', 'cancelled', 'refunded'],
  dispatched: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: []
};

router.get('/api/admin/reports', admin, async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = req.query.to ? new Date(req.query.to) : new Date();
  if (req.query.to && !String(req.query.to).includes('T')) to.setDate(to.getDate() + 1);
  const match = { status: { $in: ['paid', 'dispatched', 'delivered'] }, createdAt: { $gte: from, $lte: to } };
  const [totals, byDay, byStatus] = await Promise.all([
    Order.aggregate([{ $match: match }, { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: '$total' }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Order.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }])
  ]);
  res.json({ from: from.toISOString(), to: to.toISOString(), totals: totals[0] || { revenue: 0, count: 0 }, byDay, byStatus });
});

router.get('/api/admin/audit', admin, async (req, res) => {
  const total = await AuditLog.countDocuments();
  const { skip, limit, page, pages } = paginate(total, req.query.page, req.query.limit || 20);
  const items = await AuditLog.find().populate('user', 'email').sort({ createdAt: -1 }).skip(skip).limit(limit);
  res.json({ items, total, page, pages });
});

// Retención de auditoría (por defecto 180 días).
router.post('/api/admin/audit/prune', admin, async (req, res) => {
  const days = Math.max(Number(req.body.days) || 0, 0);
  const before = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null;
  const deleted = await pruneAuditLogs(before);
  await audit(req, 'admin.audit.prune', { details: { deleted, before: before || 'default' } });
  res.json({ deleted });
});

router.get('/api/admin/stock-alerts', admin, async (req, res) => {
  const alerts = await StockAlert.find().populate('part', 'name sku stock').sort({ createdAt: -1 }).limit(100);
  res.json(alerts);
});

router.get('/api/admin/site-config', admin, async (req, res) => {
  let config = await SiteConfig.findOne();
  if (!config) config = await SiteConfig.create({});
  res.json(config);
});

router.put('/api/admin/site-config', admin, async (req, res) => {
  const { _id, createdAt, updatedAt, __v, ...data } = req.body;
  if (data.billing && data.billing.folioDesde != null) {
    const desde = Number(data.billing.folioDesde) || 0;
    const hasta = data.billing.folioHasta != null ? Number(data.billing.folioHasta) || 0 : 0;
    const actual = data.billing.folioActual != null ? Number(data.billing.folioActual) : 0;
    data.billing.folioDesde = desde;
    data.billing.folioHasta = hasta;
    data.billing.folioActual = Math.max(actual, desde - 1);
    if (hasta > 0 && data.billing.folioActual > hasta) data.billing.folioActual = hasta;
  }
  const config = await SiteConfig.findOneAndUpdate({}, data, { new: true, upsert: true, runValidators: true });
  await audit(req, 'config.update', { details: { credentialsChanged: Boolean(data.credentials), billingChanged: Boolean(data.billing) } });
  res.json(config);
});

router.get('/api/admin/dashboard', admin, async (req, res) => {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [sales, lowStock, orders, totalUsers, pendingOrders, totalProducts] = await Promise.all([
    Order.aggregate([{ $match: { status: { $in: ['paid', 'dispatched', 'delivered'] }, createdAt: { $gte: thirtyDaysAgo } } }, { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Part.find({ $expr: { $lte: ['$stock', '$lowStockThreshold'] }, active: true }).sort({ stock: 1 }),
    Order.find().sort({ createdAt: -1 }).limit(8),
    User.countDocuments({ role: 'customer' }),
    Order.countDocuments({ status: { $in: ['pending', 'paid'] }, trackingNumber: { $exists: false } }),
    Part.countDocuments({ active: true })
  ]);
  res.json({ sales: sales[0] || { revenue: 0, count: 0 }, lowStock, orders, metrics: { users: totalUsers, pendingOrders, products: totalProducts } });
});

router.get('/api/admin/customers', admin, async (req, res) => {
  const pipeline = [
    { $match: { role: 'customer' } },
    {
      $lookup: {
        from: 'orders',
        let: { email: '$email' },
        pipeline: [
          { $match: { $expr: { $and: [{ $eq: ['$customerInfo.email', '$$email'] }, { $eq: ['$status', 'paid'] }] } } }
        ],
        as: 'userOrders'
      }
    },
    {
      $addFields: {
        ordersCount: { $size: '$userOrders' },
        totalSpent: { $sum: '$userOrders.total' }
      }
    },
    { $project: { userOrders: 0, password: 0 } },
    { $sort: { createdAt: -1 } }
  ];

  const customers = await User.aggregate(pipeline);

  if (req.query.page) {
    const { skip, limit, page, pages } = paginate(customers.length, req.query.page, req.query.limit);
    return res.json({ items: customers.slice(skip, skip + limit), total: customers.length, page, pages });
  }
  res.json(customers);
});

router.get('/api/admin/export/:type', admin, async (req, res) => {
  const { type } = req.params;
  await audit(req, 'admin.export', { details: { type } });
  let data = [];
  if (type === 'orders') {
    const orders = await Order.find().lean();
    data = orders.map(o => ({ ID: o._id, Fecha: o.createdAt, Cliente: o.customerInfo?.name, Email: o.customerInfo?.email, Total: o.total, Estado: o.status }));
  } else if (type === 'parts') {
    const parts = await Part.find().lean();
    data = parts.map(p => ({ SKU: p.sku, Nombre: p.name, Marca: p.brand, Stock: p.stock, Precio: p.price }));
  } else if (type === 'customers') {
    const users = await User.find({ role: 'customer' }).lean();
    data = users.map(u => ({ Email: u.email, FechaRegistro: u.createdAt }));
  }
  if (data.length === 0) return res.send('No hay datos');
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(',')).join('\n');
  res.header('Content-Type', 'text/csv');
  res.attachment(`${type}.csv`);
  res.send(`${headers}\n${rows}`);
});

// ---------- Reseñas ----------
router.get('/api/admin/reviews', admin, async (req, res) => {
  if (req.query.page) {
    const total = await Review.countDocuments();
    const { skip, limit, page, pages } = paginate(total, req.query.page, req.query.limit);
    const items = await Review.find().populate('user', 'email').populate('part', 'name sku').sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.json({ items, total, page, pages });
  }
  const reviews = await Review.find().populate('user', 'email').populate('part', 'name sku').sort({ createdAt: -1 });
  res.json(reviews);
});

router.put('/api/admin/reviews/:id/status', admin, async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  await audit(req, 'review.moderate', { targetType: 'review', targetId: review?._id, details: { status: req.body.status } });
  res.json(review);
});

// ---------- Repuestos ----------
router.get('/api/admin/parts', admin, async (req, res) => {
  const filter = { active: true };
  if (req.query.stockStatus === 'low') filter.$expr = { $lte: ['$stock', '$lowStockThreshold'] };
  if (req.query.page) {
    const total = await Part.countDocuments(filter);
    const { skip, limit, page, pages } = paginate(total, req.query.page, req.query.limit);
    const items = await Part.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit);
    return res.json({ items, total, page, pages });
  }
  res.json(await Part.find(filter).sort({ updatedAt: -1 }));
});

router.post('/api/admin/parts', admin, async (req, res) => {
  try {
    const part = await Part.create(req.body);
    await audit(req, 'part.create', { targetType: 'part', targetId: part._id, details: { sku: part.sku, name: part.name } });
    res.status(201).json(part);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Ya existe un repuesto con ese SKU' });
    throw err;
  }
});

router.put('/api/admin/parts/:id', admin, async (req, res) => {
  try {
    const part = await Part.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!part) return res.status(404).json({ error: 'No encontrado' });
    if (part.stock <= part.lowStockThreshold) sendLowStockAlert([part]);
    await audit(req, 'part.update', { targetType: 'part', targetId: part._id, details: { sku: part.sku, stock: part.stock } });
    await notifyBackInStock(part);
    res.json(part);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: 'Ya existe un repuesto con ese SKU' });
    throw err;
  }
});

router.delete('/api/admin/parts/:id', admin, async (req, res) => {
  const part = await Part.findByIdAndUpdate(req.params.id, { active: false }, { new: true });
  if (!part) return res.status(404).json({ error: 'No encontrado' });
  await audit(req, 'part.delete', { targetType: 'part', targetId: part._id, details: { sku: part.sku } });
  res.sendStatus(204);
});

// ---------- Descuentos ----------
router.get('/api/admin/discounts', admin, async (req, res) => res.json(await Discount.find().sort({ createdAt: -1 })));

router.post('/api/admin/discounts', admin, validate('discount'), async (req, res) => {
  const discount = await Discount.create(req.body);
  await audit(req, 'discount.create', { targetType: 'discount', targetId: discount._id, details: { code: discount.code } });
  res.status(201).json(discount);
});

router.put('/api/admin/discounts/:id', admin, validate('discount'), async (req, res) => {
  const discount = await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  await audit(req, 'discount.update', { targetType: 'discount', targetId: discount._id });
  res.json(discount);
});

router.delete('/api/admin/discounts/:id', admin, async (req, res) => {
  const discount = await Discount.findById(req.params.id);
  await Discount.findByIdAndDelete(req.params.id);
  await audit(req, 'discount.delete', { targetType: 'discount', targetId: discount?._id, details: discount ? { code: discount.code } : undefined });
  res.sendStatus(204);
});

// ---------- Carga de imágenes ----------
router.post('/api/admin/upload', admin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

// ---------- Pedidos ----------
router.get('/api/admin/orders', admin, async (req, res) => {
  if (req.query.page) {
    const total = await Order.countDocuments();
    const { skip, limit, page, pages } = paginate(total, req.query.page, req.query.limit);
    const items = await Order.find().sort({ createdAt: -1 }).skip(skip).limit(limit);
    return res.json({ items, total, page, pages });
  }
  res.json(await Order.find().sort({ createdAt: -1 }));
});

router.get('/api/admin/orders/:id', admin, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

router.put('/api/admin/orders/:id/tracking', admin, async (req, res) => {
  const { trackingNumber } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });

  order.trackingNumber = trackingNumber;
  await order.save();
  await audit(req, 'order.tracking.update', { targetType: 'order', targetId: order._id, details: { trackingNumber } });

  const config = await SiteConfig.findOne();
  const siteConfig = config?.toObject?.() || config;
  try {
    await mailer.sendDispatchNotification(order, trackingNumber, siteConfig);
  } catch (err) {
    logger.error({ err: err.message }, 'Error enviando correo de seguimiento');
  }
  res.json(order);
});

router.put('/api/admin/orders/:id/status', admin, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });

  const to = req.body.status;
  const from = order.status;
  if (to && to !== from) {
    if (!(TRANSITIONS[from] || []).includes(to)) {
      return res.status(400).json({ error: `Transición inválida de ${from} a ${to}` });
    }
    const wasReserved = Boolean(order.stockReservedAt) && from === 'pending';
    order.status = to;
    order.statusHistory = order.statusHistory || [];
    order.statusHistory.push({ status: to, at: new Date(), by: req.user.email });
    await order.save();
    if (wasReserved && to === 'cancelled') await releaseReservation(order);
    await audit(req, 'order.status.change', { targetType: 'order', targetId: order._id, details: { from, to } });
  }
  if (req.body.trackingNumber !== undefined) {
    order.trackingNumber = req.body.trackingNumber;
    await order.save();
  }

  const config = await SiteConfig.findOne();
  const siteConfig = config?.toObject?.() || config;
  try {
    if (to === 'dispatched') {
      await mailer.sendDispatchNotification(order, order.trackingNumber, siteConfig);
    } else if (to === 'delivered') {
      await mailer.sendDeliveryNotification(order, siteConfig);
    }
  } catch (err) {
    logger.error({ err: err.message }, 'Error al enviar correo de estado');
  }

  res.json(order);
});

router.get('/api/admin/orders/:id/invoice', admin, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  if (!['paid', 'dispatched', 'delivered'].includes(order.status)) return res.status(400).json({ error: 'La orden no está pagada' });
  const siteConfig = await SiteConfig.findOne();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Boleta-${order.folio || order._id.toString().slice(-6)}.pdf`);
  require('../invoice').buildInvoicePDF(res, order, siteConfig);
});

// B2B Requests
router.get('/api/admin/b2b-requests', admin, async (req, res) => {
  res.json(await B2BRequest.find().sort({ createdAt: -1 }));
});
router.put('/api/admin/b2b-requests/:id/status', admin, async (req, res) => {
  const request = await B2BRequest.findByIdAndUpdate(req.params.id, { status: req.body.status, notes: req.body.notes }, { new: true });
  res.json(request);
});

// Stores
router.get('/api/admin/stores', admin, async (req, res) => {
  res.json(await Store.find().sort({ nombre: 1 }));
});
router.post('/api/admin/stores', admin, async (req, res) => {
  res.status(201).json(await Store.create(req.body));
});
router.put('/api/admin/stores/:id', admin, async (req, res) => {
  res.json(await Store.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});
router.delete('/api/admin/stores/:id', admin, async (req, res) => {
  await Store.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// Workshops
router.get('/api/admin/workshops', admin, async (req, res) => {
  res.json(await Workshop.find().sort({ nombre: 1 }));
});
router.post('/api/admin/workshops', admin, async (req, res) => {
  res.status(201).json(await Workshop.create(req.body));
});
router.put('/api/admin/workshops/:id', admin, async (req, res) => {
  res.json(await Workshop.findByIdAndUpdate(req.params.id, req.body, { new: true }));
});
router.delete('/api/admin/workshops/:id', admin, async (req, res) => {
  await Workshop.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
