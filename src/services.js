const { Part, Order, SiteConfig, AuditLog, Counter, StockAlert } = require('./models');
const mailer = require('./mailer');
const logger = require('./logger');

const STOCK_RESERVATION_MINUTES = Number(process.env.STOCK_RESERVATION_MINUTES) || 30;
const AUDIT_RETENTION_DAYS = Number(process.env.AUDIT_RETENTION_DAYS) || 180;

const currentDiscount = async code => {
  if (!code) return null;
  const now = new Date();
  return require('./models').Discount.findOne({ code: code.toUpperCase(), active: true, startsAt: { $lte: now }, endAt: { $gte: now } });
};

const paginate = (total, page, limit) => {
  const p = Math.max(Number(page) || 1, 1);
  const l = Math.min(Math.max(Number(limit) || 12, 1), 100);
  return { skip: (p - 1) * l, limit: l, page: p, pages: Math.max(1, Math.ceil(total / l)), total };
};

// Número de pedido secuencial y legible (AP-000123)
async function nextOrderNumber() {
  const counter = await Counter.findOneAndUpdate({ key: 'order' }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return `AP-${String(counter.seq).padStart(6, '0')}`;
}

// Reserva stock y devuelve los ítems normalizados. Lanza si falta stock.
async function reserveStock(orderItems) {
  const changed = [];
  for (const item of orderItems) {
    const result = await Part.updateOne({ _id: item.part, stock: { $gte: item.qty } }, { $inc: { stock: -item.qty } });
    if (!result.modifiedCount) {
      for (const c of changed) await Part.updateOne({ _id: c.part }, { $inc: { stock: c.qty } });
      throw Object.assign(new Error(`Stock insuficiente para ${item.name || 'un artículo'}`), { status: 400 });
    }
    changed.push(item);
  }
  return changed;
}

// Libera una reserva (restituye stock) exactamente una vez.
async function releaseReservation(order) {
  if (!order || !order.stockReservedAt) return;
  const released = await Order.findOneAndUpdate(
    { _id: order._id, status: { $in: ['pending', 'cancelled'] }, stockReservedAt: { $ne: null } },
    { $set: { stockReservedAt: null } },
    { new: true }
  );
  if (!released) return;
  for (const item of order.items) {
    await Part.updateOne({ _id: item.part }, { $inc: { stock: item.qty } });
  }
}

// Relibera reservas que expiraron (pago abandonado).
async function releaseExpiredReservations(maxMinutes = STOCK_RESERVATION_MINUTES) {
  const cutoff = new Date(Date.now() - maxMinutes * 60 * 1000);
  const expired = await Order.find({ status: 'pending', stockReservedAt: { $ne: null, $lte: cutoff } });
  if (!expired.length) return expired.length;
  const released = [];
  for (const order of expired) {
    const adopted = await Order.findOneAndUpdate(
      { _id: order._id, status: 'pending', stockReservedAt: { $ne: null } },
      { $set: { status: 'cancelled', stockReservedAt: null }, $push: { statusHistory: { status: 'cancelled', at: new Date(), by: 'system' } } },
      { new: true }
    );
    if (!adopted) continue;
    for (const item of order.items) await Part.updateOne({ _id: item.part }, { $inc: { stock: item.qty } });
    released.push(order._id);
  }
  if (released.length) logger.info({ released }, 'Reservas de stock expiradas liberadas');
  return released.length;
}

// Folio SII siguiente (atómico). null si no hay rango o está agotado.
async function assignFolio() {
  try {
    const config = await SiteConfig.findOne();
    const billing = config?.billing || {};
    if (!billing.folioDesde && !billing.folioHasta) return null;
    if (billing.folioActual == null) {
      await SiteConfig.updateOne({ _id: config._id }, { $set: { 'billing.folioActual': Math.max(Number(billing.folioDesde) - 1, 0) } });
    }
    const filter = { _id: config._id };
    if (billing.folioHasta) filter['billing.folioActual'] = { $lte: Number(billing.folioHasta) - 1 };
    const updated = await SiteConfig.findOneAndUpdate(filter, { $inc: { 'billing.folioActual': 1 } }, { new: true });
    if (!updated) {
      logger.error({ folioHasta: billing.folioHasta }, 'Rango de folios SII agotado');
      return null;
    }
    return updated.billing.folioActual;
  } catch (err) {
    logger.error({ err: err.message }, 'assignFolio falló');
    return null;
  }
}

// Marca la orden como pagada de forma idempotente, descuenta stock (si no está reservado) y asigna folio.
async function finalizePaidOrder(order, siteConfig) {
  if (!order) throw new Error('Orden no encontrada');
  
  // Atómico: Evitar doble procesamiento si Transbank dispara 2 veces simultáneas
  const updatedOrder = await Order.findOneAndUpdate(
    { _id: order._id, status: { $ne: 'paid' } },
    { $set: { status: 'paid' } },
    { new: true }
  );
  if (!updatedOrder) return order; // Ya procesada por otra petición

  const changed = [];
  try {
    if (!updatedOrder.stockReservedAt) {
      for (const item of updatedOrder.items) {
        const result = await Part.updateOne({ _id: item.part, stock: { $gte: item.qty } }, { $inc: { stock: -item.qty } });
        if (!result.modifiedCount) throw new Error('Stock cambió durante el pago');
        changed.push(item);
      }
    }
    if (!updatedOrder.folio) updatedOrder.folio = await assignFolio();
    updatedOrder.statusHistory = updatedOrder.statusHistory || [];
    updatedOrder.statusHistory.push({ status: 'paid', at: new Date(), by: 'payment' });
    await updatedOrder.save();
  } catch (error) {
    // Revertir si algo falla
    await Order.updateOne({ _id: order._id }, { $set: { status: order.status } });
    for (const item of changed) await Part.updateOne({ _id: item.part }, { $inc: { stock: item.qty } });
    throw error;
  }
  
  try { await sendLowStockAlert(await findLowStockParts()); } catch (e) { logger.error({ err: e.message }, 'stock alert'); }
  try { await mailer.sendPaidInvoice(updatedOrder, siteConfig); } catch (e) { logger.error({ err: e.message }, 'invoice email'); }
  return updatedOrder;
}

async function findLowStockParts(limit = 10) {
  return Part.find({ $expr: { $lte: ['$stock', '$lowStockThreshold'] }, active: true }).limit(limit);
}

async function sendLowStockAlert(parts) {
  if (!parts || !parts.length) return;
  try {
    const config = await SiteConfig.findOne();
    await mailer.sendLowStock(parts, config?.toObject?.() || config);
  } catch (err) {
    logger.error({ err: err.message }, 'Error al enviar alerta de stock bajo');
  }
}

async function notifyBackInStock(part) {
  if (!part || part.stock <= part.lowStockThreshold) return;
  try {
    const alerts = await StockAlert.find({ part: part._id, notified: false });
    if (!alerts.length) return;
    const siteConfig = await SiteConfig.findOne();
    for (const alert of alerts) {
      try {
        await mailer.sendBackInStock(alert, part, siteConfig?.toObject?.() || siteConfig);
        alert.notified = true;
        alert.notifiedAt = new Date();
        await alert.save();
        logger.info({ part: part.sku, email: alert.email }, 'Alerta back-in-stock enviada');
      } catch (e) {
        logger.error({ err: e.message, email: alert.email }, 'back-in-stock mail falló');
      }
    }
  } catch (e) {
    logger.error({ err: e.message }, 'notifyBackInStock');
  }
}

// Costo de envío calculado en servidor (no confía en el cliente).
function computeShippingCost(subtotal, config, deliveryMethod, region) {
  const amount = Number(subtotal) || 0;
  const free = Number(config?.freeShippingThreshold) || 0;
  const rules = config?.shippingRules || [];
  if (deliveryMethod !== 'delivery') return 0;
  if (free > 0 && amount >= free) return 0;
  if (region) {
    const rule = rules.find(r => String(r.region || '').toLowerCase() === String(region).toLowerCase());
    if (rule) return Number(rule.cost) || 0;
  }
  return rules.length ? Number(rules[0].cost) || 0 : 0;
}

// Retención de auditoría: elimina registros anteriores a N días.
async function pruneAuditLogs(before = null) {
  const limite = before || new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const result = await AuditLog.deleteMany({ createdAt: { $lt: limite } });
  if (result.deletedCount > 0) logger.info({ deleted: result.deletedCount }, 'Auditoría prunada');
  return result.deletedCount;
}

const subscriptionBaseUrl = () => (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`);

module.exports = {
  STOCK_RESERVATION_MINUTES, AUDIT_RETENTION_DAYS,
  currentDiscount, paginate, nextOrderNumber, reserveStock, releaseReservation,
  releaseExpiredReservations, assignFolio, finalizePaidOrder, findLowStockParts,
  sendLowStockAlert, notifyBackInStock, computeShippingCost, pruneAuditLogs, subscriptionBaseUrl
};