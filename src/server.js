require('dotenv').config();
require('express-async-errors');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { Part, Discount, User, Order, SiteConfig, Review } = require('./models');
const nodemailer = require('nodemailer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression = require('compression');
const fs = require('fs');
const multer = require('multer');
const PDFDocument = require('pdfkit');

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + ext);
  }
});
const upload = multer({ storage: storage });

// Prevent Node.js from crashing on unhandled errors
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors()); 
app.use(morgan('dev')); 
app.use(express.json()); 
app.use(compression()); // Optimize response sizes
app.use(express.static(path.join(__dirname, '..', 'client', 'dist'), { index: false, maxAge: '1d' })); // Serve React app
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '30d' }));

// Security Middlewares
app.use(helmet({ contentSecurityPolicy: false })); // Disabled CSP to avoid breaking inline scripts/images
app.use(mongoSanitize()); // Prevent NoSQL injection
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200, message: { error: 'Demasiadas solicitudes, intenta más tarde' } });
app.use('/api/', apiLimiter);
const jwtSecret = process.env.JWT_SECRET || 'development-secret-change-me';
const mp = process.env.MP_ACCESS_TOKEN ? new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN }) : null;
const sign = user => jwt.sign({ id: user._id, role: user.role, name: user.name, email: user.email, rut: user.rut, phone: user.phone, address: user.address }, jwtSecret, { expiresIn: '7d' });
const auth = (req, res, next) => { try { req.user = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), jwtSecret); next(); } catch { res.status(401).json({ error: 'Sesión inválida o expirada' }); } };
const admin = [auth, (req, res, next) => req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Acceso restringido' })];
const currentDiscount = async code => {
  if (!code) return null; const now = new Date();
  return Discount.findOne({ code: code.toUpperCase(), active: true, startsAt: { $lte: now }, endAt: { $gte: now } });
};

app.get('/api/config', async (req, res) => {
  let config = await SiteConfig.findOne();
  if (!config) config = await SiteConfig.create({});
  const configObj = config.toObject();
  delete configObj.credentials; // NEVER send credentials to the public client
  res.json(configObj);
});

app.get('/api/admin/site-config', admin, async (req, res) => {
  let config = await SiteConfig.findOne();
  if (!config) config = await SiteConfig.create({});
  res.json(config);
});

app.put('/api/admin/site-config', admin, async (req, res) => {
  const { _id, createdAt, updatedAt, __v, ...data } = req.body;
  const config = await SiteConfig.findOneAndUpdate({}, data, { new: true, upsert: true, runValidators: true });
  res.json(config);
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, rut, phone, address } = req.body;
  if (!name || !email || !password || password.length < 8) return res.status(400).json({ error: 'Nombre, email y contraseña de 8 caracteres son obligatorios' });
  if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ error: 'El email ya está registrado' });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), rut, phone, address });
  res.status(201).json({ token: sign(user), user: { name: user.name, email: user.email, role: user.role } });
});
app.post('/api/auth/login', async (req, res) => {
  const user = await User.findOne({ email: String(req.body.email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password))) return res.status(401).json({ error: 'Credenciales incorrectas' });
  res.json({ token: sign(user), user: { name: user.name, email: user.email, role: user.role } });
});

app.get('/api/parts', async (req, res) => {
  const { q, category, make, model, sort } = req.query; const filter = { active: true }; const order = sort === 'price_asc' ? { price: 1 } : sort === 'price_desc' ? { price: -1 } : sort === 'name' ? { name: 1 } : { createdAt: -1 };
  if (q) filter.$text = { $search: q }; if (category) filter.category = category;
  if (make || model) filter.compatibility = { $elemMatch: { ...(make && { make: new RegExp(`^${make}$`, 'i') }), ...(model && { model: new RegExp(`^${model}$`, 'i') }) } };
  if (req.query.page) { const limit = Math.min(Math.max(Number(req.query.limit) || 9, 1), 30); const page = Math.max(Number(req.query.page) || 1, 1); const [items, total] = await Promise.all([Part.find(filter).sort(order).skip((page - 1) * limit).limit(limit), Part.countDocuments(filter)]); return res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) }); }
  res.json(await Part.find(filter).sort(order));
});
app.get('/api/parts/:id', async (req, res) => { const p = await Part.findById(req.params.id); if (!p || !p.active) return res.status(404).json({ error: 'Repuesto no encontrado' }); res.json(p); });
app.get('/api/site-config', async (req, res) => { let config = await SiteConfig.findOne(); if (!config) config = await SiteConfig.create({}); res.json(config); });

app.post('/api/orders/quote', async (req, res) => {
  const items = req.body.items || []; if (!items.length) return res.status(400).json({ error: 'El carrito está vacío' });
  const parts = await Part.find({ _id: { $in: items.map(i => i.partId) }, active: true }); let subtotal = 0;
  const normalized = items.map(i => { const p = parts.find(x => String(x._id) === i.partId); if (!p || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > p.stock) throw Object.assign(new Error(`Stock insuficiente para ${p ? p.name : 'un producto'}`), { status: 400 }); const pPrice = p.discountPercent > 0 ? Math.round(p.price * (1 - p.discountPercent / 100)) : p.price; subtotal += pPrice * i.qty; return { part: p, qty: i.qty, finalPrice: pPrice }; });
  const discount = await currentDiscount(req.body.discountCode); let discountAmount = 0;
  if (discount && subtotal >= discount.minimumAmount) discountAmount = Math.min(subtotal, discount.type === 'percent' ? subtotal * discount.value / 100 : discount.value);
  res.json({ items: normalized.map(x => ({ partId: x.part._id, name: x.part.name, qty: x.qty, unitPrice: x.finalPrice })), subtotal, discount: discount ? { code: discount.code, amount: discountAmount } : null, total: subtotal - discountAmount });
});

app.post('/api/orders/checkout', auth, async (req, res) => {
  const quoteRes = { json: data => data }; let quote;
  const items = req.body.items || []; const parts = await Part.find({ _id: { $in: items.map(i => i.partId) }, active: true });
  if (!items.length || parts.length !== items.length) return res.status(400).json({ error: 'Carrito inválido' }); 
  let subtotal = 0;
  const orderItems = items.map(i => { const p = parts.find(x => String(x._id) === i.partId); if (!p || !Number.isInteger(i.qty) || i.qty < 1 || i.qty > p.stock) throw Object.assign(new Error(`Stock insuficiente para ${p ? p.name : 'un artículo'}`), { status: 400 }); const pPrice = p.discountPercent > 0 ? Math.round(p.price * (1 - p.discountPercent / 100)) : p.price; subtotal += pPrice * i.qty; return { part: p._id, sku: p.sku, name: p.name, qty: i.qty, unitPrice: pPrice }; });
  
  const d = await currentDiscount(req.body.discountCode); 
  const amount = d && subtotal >= d.minimumAmount ? Math.min(subtotal, d.type === 'percent' ? subtotal * d.value / 100 : d.value) : 0;
  const shippingCost = Number(req.body.shippingCost) || 0;
  
  const order = await Order.create({ 
    customer: req.user.id, 
    customerInfo: req.body.customerInfo, 
    items: orderItems, 
    subtotal, 
    shippingCost,
    discount: d ? { code: d.code, amount } : undefined, 
    total: subtotal - amount + shippingCost, 
    deliveryMethod: req.body.deliveryMethod || 'delivery' 
  });
  
  if (req.body.customerInfo) {
    const { rut, phone, address } = req.body.customerInfo;
    const updatePayload = {};
    if (rut) updatePayload.rut = rut;
    if (phone) updatePayload.phone = phone;
    if (address) updatePayload.address = address;
    if (Object.keys(updatePayload).length > 0) {
      await User.findByIdAndUpdate(req.user.id, updatePayload);
    }
  }

  const siteConfig = await SiteConfig.findOne();
  const mpToken = siteConfig?.credentials?.mpAccessToken || process.env.MP_ACCESS_TOKEN;
  const mpClient = mpToken ? new MercadoPagoConfig({ accessToken: mpToken }) : null;

  if (!mpClient) return res.status(503).json({ error: 'Mercado Pago no está configurado.', orderId: order._id });
  
  const mpItems = orderItems.map(i => ({ id: i.sku, title: i.name, quantity: i.qty, unit_price: i.unitPrice, currency_id: 'CLP' }));
  if (shippingCost > 0) {
    mpItems.push({ id: 'ENVIO', title: 'Costo de Envío', quantity: 1, unit_price: shippingCost, currency_id: 'CLP' });
  }
  if (amount > 0) {
    mpItems.push({ id: 'DESC', title: 'Descuento', quantity: 1, unit_price: -amount, currency_id: 'CLP' });
  }

  const preference = await new Preference(mpClient).create({ 
    body: { 
      external_reference: String(order._id), 
      items: mpItems, 
      payer: { email: req.body.customerInfo?.email }, 
      back_urls: { 
        success: `${process.env.BASE_URL || 'http://localhost:3000'}/?payment=success`, 
        failure: `${process.env.BASE_URL || 'http://localhost:3000'}/?payment=failure`, 
        pending: `${process.env.BASE_URL || 'http://localhost:3000'}/?payment=pending` 
      }, 
      notification_url: `${process.env.BASE_URL || 'http://localhost:3000'}/api/payments/webhook` 
    } 
  });
  res.status(201).json({ orderId: order._id, checkoutUrl: preference.init_point || preference.sandbox_init_point });
});

app.get('/api/orders/me', auth, async (req, res) => {
  res.json(await Order.find({ customer: req.user.id }).sort({ createdAt: -1 }));
});

app.get('/api/orders/:id/invoice', auth, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Orden no encontrada' });
  if (String(order.customer) !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
  if (order.status !== 'paid') return res.status(400).json({ error: 'La orden no está pagada' });

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=Boleta-${order._id.toString().slice(-6)}.pdf`);
  
  doc.pipe(res);
  doc.fontSize(24).font('Helvetica-Bold').text('AUTOPARTES PRO', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text('Repuestos Profesionales', { align: 'center' });
  doc.moveDown(2);
  
  doc.fontSize(14).font('Helvetica-Bold').text(`Boleta N°: ${order._id.toString().slice(-6)}`);
  doc.fontSize(12).font('Helvetica');
  doc.text(`Fecha: ${order.createdAt.toLocaleDateString('es-CL')}`);
  doc.text(`Cliente: ${order.customerInfo?.name || 'Cliente'}`);
  doc.text(`RUT: ${order.customerInfo?.rut || 'N/A'}`);
  doc.text(`Email: ${order.customerInfo?.email || 'N/A'}`);
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
  doc.moveDown(0.5);
  doc.fontSize(16).font('Helvetica-Bold').text(`TOTAL PAGADO: $${order.total.toLocaleString('es-CL')}`, { align: 'right' });
  
  doc.end();
});

app.post('/api/payments/webhook', async (req, res) => {
  res.sendStatus(200); // Mercado Pago exige respuesta inmediata; la consulta confirma el estado real.
  const paymentId = req.query['data.id'] || req.body?.data?.id; if (!paymentId || !mp) return;
  try { const payment = await new Payment(mp).get({ id: paymentId }); const order = await Order.findById(payment.external_reference); if (!order || order.status === 'paid') return; order.paymentId = String(payment.id); order.paymentStatus = payment.status;
    if (payment.status === 'approved') { 
      const changed = []; try { for (const item of order.items) { const result = await Part.updateOne({ _id: item.part, stock: { $gte: item.qty } }, { $inc: { stock: -item.qty } }); if (!result.modifiedCount) throw new Error('Stock cambió durante el pago'); changed.push(item); } order.status = 'paid'; await order.save(); } catch (error) { for (const item of changed) await Part.updateOne({ _id: item.part }, { $inc: { stock: item.qty } }); throw error; }
      
      // SEND PDF EMAIL
      if (order.customerInfo?.email) {
        const doc = new PDFDocument({ margin: 50 });
        let buffers = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
          let pdfData = Buffer.concat(buffers);
          try {
            await transporter.sendMail({
              from: '"Autopartes Pro" <ventas@autopartespro.cl>',
              to: order.customerInfo.email,
              subject: `Confirmación de Pago - Pedido #${order._id.toString().slice(-6)}`,
              html: `<h2>¡Gracias por tu compra!</h2><p>Hemos recibido el pago de tu pedido de forma exitosa.</p><p>Adjuntamos la boleta de tu compra.</p>`,
              attachments: [{ filename: `Boleta-${order._id.toString().slice(-6)}.pdf`, content: pdfData }]
            });
          } catch (e) { console.error('Error enviando boleta:', e); }
        });
        
        doc.fontSize(24).font('Helvetica-Bold').text('AUTOPARTES PRO', { align: 'center' });
        doc.fontSize(10).font('Helvetica').text('Repuestos Profesionales', { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(14).font('Helvetica-Bold').text(`Boleta N°: ${order._id.toString().slice(-6)}`);
        doc.fontSize(12).font('Helvetica');
        doc.text(`Fecha: ${order.createdAt.toLocaleDateString('es-CL')}`);
        doc.text(`Cliente: ${order.customerInfo?.name || 'Cliente'}`);
        doc.moveDown(2);
        doc.font('Helvetica-Bold').text('Detalle de la compra:');
        doc.moveDown(0.5);
        doc.font('Helvetica');
        order.items.forEach(item => doc.text(`${item.qty}x ${item.name} - $${(item.unitPrice * item.qty).toLocaleString('es-CL')}`));
        doc.moveDown(2);
        doc.text(`Subtotal: $${order.subtotal.toLocaleString('es-CL')}`, { align: 'right' });
        if (order.discount && order.discount.amount > 0) doc.text(`Descuento (${order.discount.code}): -$${order.discount.amount.toLocaleString('es-CL')}`, { align: 'right' });
        doc.moveDown(0.5);
        doc.fontSize(16).font('Helvetica-Bold').text(`TOTAL PAGADO: $${order.total.toLocaleString('es-CL')}`, { align: 'right' });
        doc.end();
      }

    } else if (['cancelled', 'rejected'].includes(payment.status)) { order.status = 'cancelled'; await order.save(); }
  } catch (err) { console.error('Webhook Mercado Pago:', err.message); }
});

app.get('/api/admin/dashboard', admin, async (req, res) => {
  const [sales, lowStock, orders, totalUsers, pendingOrders, totalProducts] = await Promise.all([
    Order.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, revenue: { $sum: '$total' }, count: { $sum: 1 } } }]),
    Part.find({ $expr: { $lte: ['$stock', '$lowStockThreshold'] }, active: true }).sort({ stock: 1 }),
    Order.find().sort({ createdAt: -1 }).limit(8),
    User.countDocuments(),
    Order.countDocuments({ status: { $in: ['pending', 'paid'] }, trackingNumber: { $exists: false } }),
    Part.countDocuments({ active: true })
  ]);
  res.json({
    sales: sales[0] || { revenue: 0, count: 0 },
    lowStock,
    orders,
    metrics: { users: totalUsers, pendingOrders, products: totalProducts }
  });
});
app.get('/api/admin/customers', admin, async (req, res) => {
  const users = await User.find({ role: 'user' }).lean();
  const customers = await Promise.all(users.map(async u => {
    const orders = await Order.find({ 'customerInfo.email': u.email, status: 'paid' });
    const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
    return { ...u, ordersCount: orders.length, totalSpent };
  }));
  res.json(customers);
});

app.get('/api/admin/export/:type', admin, async (req, res) => {
  const { type } = req.params;
  let data = [];
  if (type === 'orders') {
    const orders = await Order.find().lean();
    data = orders.map(o => ({ ID: o._id, Fecha: o.createdAt, Cliente: o.customerInfo?.name, Email: o.customerInfo?.email, Total: o.total, Estado: o.status }));
  } else if (type === 'parts') {
    const parts = await Part.find().lean();
    data = parts.map(p => ({ SKU: p.sku, Nombre: p.name, Marca: p.brand, Stock: p.stock, Precio: p.price }));
  } else if (type === 'customers') {
    const users = await User.find({ role: 'user' }).lean();
    data = users.map(u => ({ Email: u.email, FechaRegistro: u.createdAt }));
  }
  
  if (data.length === 0) return res.send("No hay datos");
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(obj => Object.values(obj).map(v => `"${v}"`).join(',')).join('\n');
  res.header('Content-Type', 'text/csv');
  res.attachment(`${type}.csv`);
  res.send(`${headers}\n${rows}`);
});

app.post('/api/reviews', auth, async (req, res) => {
  const { partId, rating, comment } = req.body;
  const review = await Review.create({ user: req.user._id, part: partId, rating, comment });
  res.status(201).json(review);
});

app.get('/api/reviews/part/:id', async (req, res) => {
  const reviews = await Review.find({ part: req.params.id, status: 'approved' }).populate('user', 'email createdAt').sort({ createdAt: -1 });
  res.json(reviews);
});

app.get('/api/admin/reviews', admin, async (req, res) => {
  const reviews = await Review.find().populate('user', 'email').populate('part', 'name sku').sort({ createdAt: -1 });
  res.json(reviews);
});

app.put('/api/admin/reviews/:id/status', admin, async (req, res) => {
  const review = await Review.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  res.json(review);
});

app.get('/api/admin/parts', admin, async (req, res) => res.json(await Part.find().sort({ updatedAt: -1 })));
app.post('/api/admin/parts', admin, async (req, res) => res.status(201).json(await Part.create(req.body)));
app.put('/api/admin/parts/:id', admin, async (req, res) => { const part = await Part.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }); if (!part) return res.status(404).json({ error: 'No encontrado' }); res.json(part); });
app.delete('/api/admin/parts/:id', admin, async (req, res) => { const part = await Part.findByIdAndUpdate(req.params.id, { active: false }, { new: true }); if (!part) return res.status(404).json({ error: 'No encontrado' }); res.sendStatus(204); });
app.get('/api/admin/discounts', admin, async (req, res) => res.json(await Discount.find().sort({ createdAt: -1 })));
app.post('/api/admin/discounts', admin, async (req, res) => res.status(201).json(await Discount.create(req.body)));
app.put('/api/admin/discounts/:id', admin, async (req, res) => res.json(await Discount.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true })));
app.delete('/api/admin/discounts/:id', admin, async (req, res) => { await Discount.findByIdAndDelete(req.params.id); res.sendStatus(204); });


app.post('/api/admin/upload', admin, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió ningún archivo' });
  res.json({ url: `/uploads/${req.file.filename}` });
});


// Configurar transporte de correo (Ethereal test accounts)
const transporter = nodemailer.createTransport({
  host: 'smtp.ethereal.email',
  port: 587,
  auth: { user: process.env.EMAIL_USER || 'florida.mayer3@ethereal.email', pass: process.env.EMAIL_PASS || 'T6GfE8QzT4fB5XF2f9' }
});

app.put('/api/admin/orders/:id/tracking', admin, async (req, res) => {
  const { trackingNumber } = req.body;
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado' });
  
  order.trackingNumber = trackingNumber;
  await order.save();
  
  if (order.customerInfo?.email) {
    try {
      const info = await transporter.sendMail({
        from: '"Autopartes Pro" <ventas@autopartespro.cl>',
        to: order.customerInfo.email,
        subject: `Tu pedido #${order._id.toString().slice(-6)} ha sido despachado`,
        html: `<h2>¡Hola ${order.customerInfo.name}!</h2><p>Tu pedido ha sido despachado.</p><p><strong>Número de seguimiento:</strong> ${trackingNumber}</p><p>Gracias por preferir Autopartes Pro.</p>`
      });
      console.log('Correo de seguimiento enviado. URL de previsualización: %s', nodemailer.getTestMessageUrl(info));
    } catch (err) {
      console.error('Error enviando correo:', err);
    }
  }
  res.json(order);
});

app.get('/api/admin/orders', admin, async (req, res) => {
  res.json(await Order.find().sort({ createdAt: -1 }));
});

app.get('/api/admin/orders/:id', admin, async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});

app.put('/api/admin/orders/:id/status', admin, async (req, res) => {
  const updateData = { status: req.body.status };
  if (req.body.trackingNumber !== undefined) updateData.trackingNumber = req.body.trackingNumber;
  
  const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
  if (!order) return res.status(404).json({ error: 'Not found' });
  
  // Enviar correo si se marca como despachado y tiene tracking
  if (req.body.status === 'dispatched' && order.customerInfo?.email) {
    const config = await SiteConfig.findOne();
    if (config?.credentials?.smtpHost && config?.credentials?.smtpUser) {
      try {
        const transporter = nodemailer.createTransport({
          host: config.credentials.smtpHost,
          port: config.credentials.smtpPort,
          secure: config.credentials.smtpPort === 465,
          auth: { user: config.credentials.smtpUser, pass: config.credentials.smtpPass }
        });
        await transporter.sendMail({
          from: `"AutoPartes Pro" <${config.credentials.smtpUser}>`,
          to: order.customerInfo.email,
          subject: '¡Tu pedido va en camino! 🚚',
          html: `<p>Hola ${order.customerInfo.name || ''},</p>
                 <p>Tu pedido <b>#${order._id.toString().slice(-6)}</b> ha sido despachado.</p>
                 ${order.trackingNumber ? `<p>Tu número de seguimiento es: <b>${order.trackingNumber}</b></p>` : ''}
                 <p>Gracias por tu compra.</p>`
        });
      } catch (err) {
        console.error('Error al enviar correo:', err);
      }
    }
  }
  
  res.json(order);
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

app.use((req, res, next) => {
  res.status(404).sendFile(path.join(__dirname, '..', 'client', 'dist', '404.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (req.path.startsWith('/api/')) {
    res.status(err.status || 500).json({ error: err.message || 'Error interno' });
  } else {
    res.status(500).sendFile(path.join(__dirname, '..', 'client', 'dist', '500.html'), (err) => {
      if (err) res.status(500).send('Error interno del servidor');
    });
  }
});

mongoose.connection.on('error', err => {
  console.error('CRITICAL: MongoDB connection error:', err);
});
mongoose.connection.on('disconnected', () => {
  console.log('CRITICAL: MongoDB disconnected. Waiting for reconnect...');
});

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/autopartes_pro').then(() => app.listen(PORT, () => console.log(`Autopartes Pro en http://localhost:${PORT}`))).catch(err => { 
  console.error('MongoDB initial connection error:', err.message); 
  // We keep the process alive instead of exiting so it can try to recover or at least serve 500s 
});

// trigger restart
