const express = require('express');
const { Part, Order, User, SiteConfig } = require('../models');
const { auth, optAuth } = require('../middleware');
const { validate } = require('../validators');
const { currentDiscount, nextOrderNumber, reserveStock, releaseReservation, computeShippingCost } = require('../services');
const { createPayment } = require('../payments');
const logger = require('../logger');

const router = express.Router();

router.post('/api/orders/quote', validate('quote'), async (req, res) => {
  const items = req.body.items || [];
  const parts = await Part.find({ _id: { $in: items.map(i => i.partId) }, active: true });
  let subtotal = 0;
  const normalized = items.map(i => {
    const p = parts.find(x => String(x._id) === i.partId);
    if (!p || i.qty > p.stock) throw Object.assign(new Error(`Stock insuficiente para ${p ? p.name : 'un producto'}`), { status: 400 });
    const pPrice = p.discountPercent > 0 ? Math.round(p.price * (1 - p.discountPercent / 100)) : p.price;
    subtotal += pPrice * i.qty;
    return { part: p, qty: i.qty, finalPrice: pPrice };
  });
  const discount = await currentDiscount(req.body.discountCode);
  let amount = 0;
  if (discount && subtotal >= (discount.minimumAmount || 0)) amount = Math.min(subtotal, discount.type === 'percent' ? subtotal * discount.value / 100 : discount.value);
  res.json({
    items: normalized.map(x => ({ partId: x.part._id, name: x.part.name, qty: x.qty, unitPrice: x.finalPrice })),
    subtotal,
    discount: discount ? { code: discount.code, amount } : null,
    total: subtotal - amount
  });
});

// Checkout con y sin sesión (invitados). El stock se reserva y el envío se calcula en el servidor.
router.post('/api/orders/checkout', optAuth, validate('checkout'), async (req, res) => {
  const { items, customerInfo, deliveryMethod, discountCode } = req.body;
  const parts = await Part.find({ _id: { $in: items.map(i => i.partId) }, active: true });
  if (!items.length || parts.length !== items.length) return res.status(400).json({ error: 'Carrito inválido' });

  let subtotal = 0;
  const orderItems = items.map(i => {
    const p = parts.find(x => String(x._id) === i.partId);
    const pPrice = p.discountPercent > 0 ? Math.round(p.price * (1 - p.discountPercent / 100)) : p.price;
    subtotal += pPrice * i.qty;
    return { part: p._id, sku: p.sku, name: p.name, qty: i.qty, unitPrice: pPrice };
  });

  const config = await SiteConfig.findOne();
  const d = await currentDiscount(discountCode);
  const amount = d && subtotal >= (d.minimumAmount || 0) ? Math.min(subtotal, d.type === 'percent' ? subtotal * d.value / 100 : d.value) : 0;
  const shippingCost = computeShippingCost(subtotal, config, deliveryMethod || 'delivery', customerInfo?.region);

  if (req.user && customerInfo) {
    const updatePayload = {};
    if (customerInfo.rut) updatePayload.rut = customerInfo.rut;
    if (customerInfo.phone) updatePayload.phone = customerInfo.phone;
    if (customerInfo.address) updatePayload.address = customerInfo.address;
    if (Object.keys(updatePayload).length) await User.findByIdAndUpdate(req.user.id, updatePayload);
  }

  let order = null;
  try {
    await reserveStock(orderItems); // descuento atómico del stock
    order = await Order.create({
      orderNumber: await nextOrderNumber(),
      customer: req.user ? req.user.id : undefined,
      customerInfo,
      items: orderItems,
      subtotal,
      shippingCost,
      discount: d ? { code: d.code, amount } : undefined,
      total: subtotal - amount + shippingCost,
      deliveryMethod: deliveryMethod || 'delivery',
      stockReservedAt: new Date()
    });
  } catch (e) {
    if (!order) for (const it of orderItems) await Part.updateOne({ _id: it.part }, { $inc: { stock: it.qty } });
    else await releaseReservation(order);
    if (e.status) return res.status(e.status).json({ error: e.message });
    throw e;
  }

  try {
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const payment = await createPayment(order, orderItems, shippingCost, amount, config, baseUrl);
    return res.status(201).json({ orderId: order._id, orderNumber: order.orderNumber, checkoutUrl: payment.checkoutUrl, provider: payment.provider, token: payment.token });
  } catch (e) {
    await releaseReservation(order);
    order.paymentStatus = 'error';
    await order.save().catch(() => {});
    if (e.status) return res.status(e.status).json({ error: e.message, orderId: order._id });
    throw e;
  }
});

router.get('/api/orders/me', auth, async (req, res) => {
  res.json(await Order.find({ customer: req.user.id }).sort({ createdAt: -1 }));
});

router.get('/api/orders/:id/invoice', auth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  if (String(order.customer) !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  if (!['paid', 'dispatched', 'delivered'].includes(order.status)) return res.status(400).json({ error: 'La orden no está pagada' });
  const siteConfig = await SiteConfig.findOne();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Boleta-${order.folio || order._id.toString().slice(-6)}.pdf`);
  require('../invoice').buildInvoicePDF(res, order, siteConfig);
});

router.get('/api/orders/track/:orderNumber', async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) return res.status(404).json({ message: 'No se encontró ninguna orden con ese número.' });
  // Solo devolvemos datos seguros, no exponer datos del cliente completos
  res.json({
    _id: order._id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt,
    total: order.total,
    status: order.status,
    trackingNumber: order.trackingNumber,
    items: order.items.map(item => ({ name: item.name, qty: item.qty, unitPrice: item.unitPrice }))
  });
});

module.exports = router;