const PDFDocument = require('pdfkit');

function buildInvoicePDF(stream, order, siteConfig = {}) {
  const doc = new PDFDocument({ margin: 50 });
  const billing = siteConfig?.billing || {};
  const logoText1 = siteConfig?.logoText1 || 'AUTO';
  const logoText2 = siteConfig?.logoText2 || 'PRO';
  const businessName = billing.razonSocial || `${logoText1}${logoText2 ? ' ' + logoText2 : ''}` || 'AUTOPARTES PRO';
  const giro = billing.giro || 'Venta de repuestos automotrices';
  const folio = order.folio || order._id.toString().slice(-6);

  doc.pipe(stream);
  doc.fontSize(22).font('Helvetica-Bold').text(businessName.toUpperCase(), { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(giro, { align: 'center' });
  if (billing.rutEmisor) doc.text(`RUT: ${billing.rutEmisor}`, { align: 'center' });
  const emisorLine = [billing.direccion, billing.comuna].filter(Boolean).join(', ');
  if (emisorLine) doc.text(emisorLine, { align: 'center' });
  if (billing.telefono) doc.text(`Tel: ${billing.telefono}`, { align: 'center' });
  if (billing.codigoActividad) doc.text(`Actividad económica: ${billing.codigoActividad}`, { align: 'center' });
  doc.moveDown(2);
  doc.fontSize(14).font('Helvetica-Bold').text('BOLETA DE VENTA');
  doc.fontSize(12).font('Helvetica');
  doc.text(`Folio N°: ${folio}`);
  doc.text(`Fecha: ${order.createdAt.toLocaleDateString('es-CL')}`);
  doc.text(`Cliente: ${order.customerInfo?.name || 'Cliente'}`);
  doc.text(`RUT: ${order.customerInfo?.rut || 'N/A'}`);
  doc.text(`Email: ${order.customerInfo?.email || 'N/A'}`);
  if (order.deliveryMethod === 'pickup') doc.text('Entrega: Retiro en tienda');
  else if (order.shippingCost > 0) doc.text(`Entrega: Despacho a domicilio (costo envío $${order.shippingCost.toLocaleString('es-CL')})`);
  doc.moveDown(2);
  doc.font('Helvetica-Bold').text('Detalle de la compra:');
  doc.moveDown(0.5);
  doc.font('Helvetica');
  order.items.forEach(item => {
    doc.text(`${item.qty}x ${item.name} - $${(item.unitPrice * item.qty).toLocaleString('es-CL')}`);
  });
  doc.moveDown(2);
  doc.text(`Subtotal: $${order.subtotal.toLocaleString('es-CL')}`, { align: 'right' });
  if (order.discount && order.discount.amount > 0) {
    doc.text(`Descuento (${order.discount.code}): -$${order.discount.amount.toLocaleString('es-CL')}`, { align: 'right' });
  }
  if (order.shippingCost > 0) {
    doc.text(`Envío: $${order.shippingCost.toLocaleString('es-CL')}`, { align: 'right' });
  }
  const iva = Math.round(order.total * 19 / 119);
  doc.text(`IVA (19% incl.): $${iva.toLocaleString('es-CL')}`, { align: 'right' });
  doc.moveDown(0.5);
  doc.fontSize(16).font('Helvetica-Bold').text(`TOTAL PAGADO: $${order.total.toLocaleString('es-CL')}`, { align: 'right' });
  doc.moveDown(1.5);
  doc.fontSize(9).font('Helvetica').text('Esta boleta no da derecho a crédito fiscal (Art. 53 D.L. 825).', { align: 'center', color: '#64748b' });
  doc.end();
  return doc;
}

async function buildInvoiceBuffer(order, siteConfig) {
  const { PassThrough } = require('stream');
  const buffers = [];
  const streamInstance = new PassThrough();
  streamInstance.on('data', b => buffers.push(b));
  buildInvoicePDF(streamInstance, order, siteConfig);
  await new Promise((resolve, reject) => {
    streamInstance.on('end', resolve);
    streamInstance.on('error', reject);
  });
  return Buffer.concat(buffers);
}

module.exports = { buildInvoicePDF, buildInvoiceBuffer };