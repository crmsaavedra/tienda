const express = require('express');
const { Order, SiteConfig } = require('../models');
const { confirmWebpay } = require('../payments');
const { finalizePaidOrder, releaseReservation } = require('../services');
const logger = require('../logger');

const router = express.Router();

const redirectBase = () => process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

router.all('/api/payments/webpay/return', async (req, res) => {
  const token = req.body.token_ws || req.query.token_ws;
  if (!token) return res.redirect(`${redirectBase()}/pago/fallo`);
  try {
    const siteConfig = await SiteConfig.findOne();
    const data = await confirmWebpay(token, siteConfig);
    logger.info({ webpayData: data }, 'Datos recibidos desde confirmWebpay');
    
    const order = await Order.findById(data.session_id || req.query.order);
    if ((data.status === 'AUTHORIZED' || data.response_code === 0) && order) {
      await finalizePaidOrder(order, siteConfig);
      return res.redirect(`${redirectBase()}/pago/exito?order=${order._id}`);
    }
    if (order) {
      order.status = 'cancelled';
      order.paymentStatus = data.status;
      order.statusHistory = order.statusHistory || [];
      order.statusHistory.push({ status: 'cancelled', at: new Date(), by: 'payment' });
      await order.save();
      await releaseReservation(order);
    }
    return res.redirect(`${redirectBase()}/pago/fallo`);
  } catch (err) {
    logger.error({ err: err.message }, 'Webpay return');
    return res.redirect(`${redirectBase()}/pago/fallo`);
  }
});

module.exports = router;