const nodemailer = require('nodemailer');
const { SiteConfig } = require('./models');
const { buildInvoiceBuffer } = require('./invoice');
const logger = require('./logger');

const FALLBACK = {
  host: 'smtp.ethereal.email',
  port: 587,
  user: process.env.EMAIL_USER || 'florida.mayer3@ethereal.email',
  pass: process.env.EMAIL_PASS || 'T6GfE8QzT4fB5XF2f9'
};

async function isUnsubscribed(email) {
  if (!email) return false;
  try {
    const config = await SiteConfig.findOne();
    return (config?.unsubscribedEmails || []).includes(String(email).toLowerCase());
  } catch {
    return false;
  }
}

const baseUrl = () => process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;

const unsubscribeLink = email =>
  `${baseUrl()}/api/auth/unsubscribe?email=${encodeURIComponent(email)}`;

const unsubscribeHtml = (email, config) => `
  <p style="color:#94a3b8;font-size:11px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;">
    Recibiste este correo por estar suscrito a Autopartes Pro.
    <a href="${unsubscribeLink(email)}" style="color:#64748b;">Darse de baja</a>
  </p>`;

function layout(title, bodyHtml, config = {}) {
  const primary = config.primaryColor || '#ea580c';
  const name = config.logoText1 ? `${config.logoText1}${config.logoText2 ? ' ' + config.logoText2 : ''}` : 'Autopartes Pro';
  return `
  <!DOCTYPE html>
  <html lang="es">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
            <tr>
              <td style="background:${primary};color:#ffffff;padding:20px 28px;">
                <h1 style="margin:0;font-size:20px;letter-spacing:1px;">${name}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px;">${title}</h2>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:20px 28px;border-top:1px solid #e2e8f0;color:#64748b;font-size:12px;">
                ${config.contactAddress || 'Av. Providencia 1234, Santiago'} &bull; ${config.contactPhone || '+56 9 1234 5678'}<br/>
                ${config.contactEmail || 'contacto@autopartespro.cl'}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>`;
}

async function resolveTransport() {
  let config = null;
  try { config = await SiteConfig.findOne(); } catch (e) { /* ignore */ }
  if (process.env.NODE_ENV === 'test') {
    return { config, transporter: nodemailer.createTransport({ jsonTransport: true }) };
  }
  const c = config?.credentials || {};
  const host = c.smtpHost || process.env.SMTP_HOST || FALLBACK.host;
  const port = Number(c.smtpPort || process.env.SMTP_PORT || (host.includes('ethereal') ? 587 : 465));
  const user = c.smtpUser || process.env.SMTP_USER || process.env.EMAIL_USER || FALLBACK.user;
  const pass = c.smtpPass || process.env.SMTP_PASS || process.env.EMAIL_PASS || FALLBACK.pass;
  const secure = port === 465;
  return { config, transporter: nodemailer.createTransport({ host, port, secure, auth: user && pass ? { user, pass } : undefined }) };
}

async function send({ to, subject, html, attachments, marketing }) {
  if (!to) return null;
  if (marketing && await isUnsubscribed(to)) {
    logger.info({ to }, 'mailer: destinatario dado de baja, correo omitido');
    return null;
  }
  let transport;
  try {
    transport = await resolveTransport();
  } catch (e) {
    logger.warn({ err: e.message }, 'mailer: no se pudo resolver transporte');
    return null;
  }
  const from = process.env.MAIL_FROM || process.env.SMTP_FROM || `"Autopartes Pro" <${process.env.EMAIL_USER || transport.config?.contactEmail || 'ventas@autopartespro.cl'}>`;
  try {
    const info = await transport.transporter.sendMail({ from, to, subject, html, attachments });
    if (transport.config?.credentials?.smtpHost) logger.info({ info }, 'Correo enviado (SMTP configurado)');
    else logger.info({ messageId: info.messageId }, 'Correo enviado');
    return info;
  } catch (e) {
    logger.error({ err: e.message, to }, 'mailer: envío falló');
    return null;
  }
}

async function sendOrderConfirmation(order, siteConfig) {
  const itemsHtml = (order.items || []).map(i =>
    `<tr><td style="padding:6px 0;color:#334155;">${i.qty}x ${i.name}</td><td align="right" style="padding:6px 0;color:#334155;">$${(i.unitPrice * i.qty).toLocaleString('es-CL')}</td></tr>`
  ).join('');
  const body = `
    <p style="color:#475569;line-height:1.6;">Hola <strong>${order.customerInfo?.name || 'cliente'}</strong>,</p>
    <p style="color:#475569;">Hemos recibido tu pedido <strong>#${order._id?.toString().slice(-6) || ''}</strong> y se encuentra <strong>${order.status === 'paid' ? 'PAGADO' : 'pendiente de pago'}</strong>.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
      ${itemsHtml}
      <tr><td style="border-top:1px solid #e2e8f0;padding-top:10px;color:#0f172a;"><strong>Total</strong></td>
      <td align="right" style="border-top:1px solid #e2e8f0;padding-top:10px;color:#0f172a;"><strong>$${order.total.toLocaleString('es-CL')}</strong></td></tr>
    </table>
    <p style="color:#64748b;">${order.deliveryMethod === 'pickup' ? 'Retiras tu pedido en tienda.' : `Despachamos a ${order.customerInfo?.address || 'tu dirección registrada'}.`}</p>
  `;
  await send({ to: order.customerInfo?.email, subject: `Confirmación de pedido ${order.orderNumber || order._id?.toString().slice(-6)}`, html: layout('Tu pedido está en camino', body, siteConfig) });
}

async function sendPaidInvoice(order, siteConfig) {
  if (order.customerInfo?.email) {
    const pdfBuffer = await buildInvoiceBuffer(order, siteConfig);
    const body = `
      <p style="color:#475569;line-height:1.6;">¡Gracias por tu compra!</p>
      <p style="color:#475569;">Hemos recibido el pago de tu pedido <strong>#${order._id?.toString().slice(-6)}</strong> de forma exitosa.</p>
      <p style="color:#64748b;">Adjuntamos la boleta de tu compra.</p>
    `;
    await send({
      to: order.customerInfo.email,
      subject: `Confirmación de Pago - Pedido #${order._id.toString().slice(-6)}`,
      html: layout('Pago confirmado', body, siteConfig),
      attachments: [{ filename: `Boleta-${order._id.toString().slice(-6)}.pdf`, content: pdfBuffer }]
    });
  }
}

async function sendDispatchNotification(order, trackingNumber, siteConfig) {
  const body = `
    <p style="color:#475569;line-height:1.6;">¡Hola ${order.customerInfo?.name || 'cliente'}!</p>
    <p style="color:#475569;">Tu pedido ha sido <strong>despachado</strong>.</p>
    <p style="margin:20px 0;"><span style="background:#f1f5f9;padding:10px 16px;border-radius:8px;font-family:monospace;color:#0f172a;font-weight:bold;">${trackingNumber}</span></p>
    <p style="color:#64748b;">Usa este número para rastrear tu envío con la empresa de despacho.</p>
  `;
  await send({ to: order.customerInfo?.email, subject: `Tu pedido ${order._id?.toString().slice(-6)} ha sido despachado`, html: layout('Pedido despachado', body, siteConfig) });
}

async function sendDeliveryNotification(order, siteConfig) {
  const body = `
    <p style="color:#475569;line-height:1.6;">¡Hola ${order.customerInfo?.name || 'cliente'}!</p>
    <p style="color:#475569;">Tu pedido fue <strong>entregado</strong>. Esperamos que todo esté en perfectas condiciones.</p>
    <p style="color:#64748b;">Si tienes dudas o quieres dejar una reseña de tus productos, contáctanos.</p>
  `;
  await send({ to: order.customerInfo?.email, subject: `Tu pedido ${order._id?.toString().slice(-6)} fue entregado`, html: layout('Pedido entregado', body, siteConfig) });
}

async function sendLowStock(parts, siteConfig) {
  if (!parts || !parts.length) return;
  const rows = parts.map(p =>
    `<tr><td style="padding:6px;border:1px solid #e2e8f0;color:#334155;">${p.name}</td><td style="padding:6px;border:1px solid #e2e8f0;color:#334155;">${p.sku}</td><td align="center" style="padding:6px;border:1px solid #e2e8f0;"><strong style="color:#dc2626;">${p.stock}</strong></td><td style="padding:6px;border:1px solid #e2e8f0;color:#334155;">${p.lowStockThreshold}</td></tr>`
  ).join('');
  const body = `
    <p style="color:#475569;">Los siguientes repuestos están en <strong>stock bajo o agotados</strong>:</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-collapse:collapse;">
      <tr><th align="left" style="padding:6px;border:1px solid #e2e8f0;background:#f8fafc;color:#0f172a;">Producto</th><th align="left" style="padding:6px;border:1px solid #e2e8f0;background:#f8fafc;color:#0f172a;">SKU</th><th align="center" style="padding:6px;border:1px solid #e2e8f0;background:#f8fafc;color:#0f172a;">Stock</th><th align="left" style="padding:6px;border:1px solid #e2e8f0;background:#f8fafc;color:#0f172a;">Umbral</th></tr>
      ${rows}
    </table>
    <p style="color:#64748b;">Revisa el panel de administración para reponer inventario.</p>
  `;
  await send({ to: siteConfig?.contactEmail || process.env.ADMIN_EMAIL || 'admin@autopartespro.cl', subject: `Alerta de stock bajo (${parts.length})`, html: layout('Alerta de inventario', body, siteConfig) });
}

async function sendBackInStock(alert, part, siteConfig) {
  const body = `
    <p style="color:#475569;line-height:1.6;">¡Buenas noticias!</p>
    <p style="color:#475569;"><strong>${part.name}</strong> ya está disponible nuevamente con stock.</p>
    <p style="color:#64748b;">Visita nuestro catálogo para completar tu compra mientras haya unidades.</p>
    ${unsubscribeHtml(alert.email, siteConfig)}
  `;
  await send({ to: alert.email, subject: `¡${part.name} volvió a estar disponible!`, html: layout('Stock disponible', body, siteConfig), marketing: true });
}

module.exports = { send, sendOrderConfirmation, sendPaidInvoice, sendDispatchNotification, sendDeliveryNotification, sendLowStock, sendBackInStock, layout, resolveTransport };