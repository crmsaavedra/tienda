const logger = require('./logger');

function getWebpayCredentials(siteConfig) {
  const creds = siteConfig?.credentials || {};
  return {
    commerceCode: creds.webpayCommerceCode || process.env.WEBPAY_COMMERCE_CODE,
    apiKeySecret: creds.webpayApiKeySecret || process.env.WEBPAY_API_KEY_SECRET,
    baseUrl: creds.webpayBaseUrl || process.env.WEBPAY_BASE_URL || 'https://webpay3g.transbank.cl'
  };
}

async function createWebpay(order, total, siteConfig, baseUrl) {
  const { commerceCode, apiKeySecret, baseUrl: webpayBase } = getWebpayCredentials(siteConfig);
  if (!commerceCode || !apiKeySecret) throw Object.assign(new Error('Webpay Plus no está configurado'), { status: 503 });
  const trxUrl = `${webpayBase}/rswebpaytransaction/api/webpay/v1.2/transactions`;
  const buyOrder = order.orderNumber || order._id.toString().slice(-12);
  const body = {
    buy_order: buyOrder,
    session_id: String(order._id),
    amount: Math.round(total),
    return_url: `${baseUrl}/api/payments/webpay/return`
  };
  const res = await fetch(trxUrl, {
    method: 'POST',
    headers: {
      'Tbk-Api-Key-Id': commerceCode,
      'Tbk-Api-Key-Secret': apiKeySecret,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    logger.error({ status: res.status, body: text }, 'webpay: creación transacción falló');
    throw Object.assign(new Error('El procesador de pagos rechazó la operación'), { status: 502 });
  }
  const data = await res.json();
  if (!data?.url) throw Object.assign(new Error('Webpay no devolvió URL de pago'), { status: 502 });
  return { provider: 'webpay', checkoutUrl: data.url, token: data.token, orderId: order._id };
}

async function confirmWebpay(token, siteConfig) {
  const { commerceCode, apiKeySecret, baseUrl: webpayBase } = getWebpayCredentials(siteConfig);
  if (!commerceCode || !apiKeySecret) throw Object.assign(new Error('Webpay Plus no está configurado'), { status: 503 });
  const trxUrl = `${webpayBase}/rswebpaytransaction/api/webpay/v1.2/transactions`;
  const res = await fetch(`${trxUrl}/${encodeURIComponent(token)}`, {
    method: 'PUT',
    headers: {
      'Tbk-Api-Key-Id': commerceCode,
      'Tbk-Api-Key-Secret': apiKeySecret,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw Object.assign(new Error('No se pudo confirmar el pago'), { status: 502 });
  return res.json();
}

async function createPayment(order, orderItems, shippingCost, amount, siteConfig, baseUrl) {
  logger.info({ provider: 'webpay', order: String(order._id) }, 'Creando transacción Webpay Plus');
  return createWebpay(order, order.total, siteConfig, baseUrl);
}

module.exports = { createPayment, createWebpay, confirmWebpay };