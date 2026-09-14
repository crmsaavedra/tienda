import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { OTP } from 'otplib';
import serverModule from '../src/server.js';

const { app, mongoose, models } = serverModule;
const { Part, User, Discount, Order } = models;

const TEST_DB = 'mongodb://127.0.0.1:27017/autopartes_pro_test';
const otp = new OTP();

let adminToken;
let customerToken;
let customerId;
let partAvailable;
let partSoldOut;

beforeAll(async () => {
  await mongoose.connect(TEST_DB);
  await mongoose.connection.dropDatabase();
  const admin = await User.create({ name: 'Admin', email: 'admin@test.cl', password: await bcrypt.hash('AdminPass123!', 4), role: 'admin' });
  const customer = await User.create({ name: 'Cliente', email: 'cliente@test.cl', password: await bcrypt.hash('Password123!', 4), role: 'customer' });
  customerId = customer._id;
  partAvailable = await Part.create({ sku: 'TEST-001', name: 'Bujía NGK', brand: 'NGK', category: 'Encendido', description: 'Bujía de alto rendimiento', price: 12990, stock: 10, lowStockThreshold: 3 });
  partSoldOut = await Part.create({ sku: 'TEST-002', name: 'Correa de distribución', brand: 'Gates', category: 'Motor', description: 'Correa con tensor', price: 29990, stock: 0, lowStockThreshold: 2 });
  await Discount.create({ code: 'TEST10', type: 'percent', value: 10, endAt: new Date('2027-12-31'), active: true });
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});

describe('Salud y configuración pública', () => {
  it('GET /api/health responde ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/config no filtra credenciales SMTP/Webpay/SII', async () => {
    const res = await request(app).get('/api/config');
    expect(res.status).toBe(200);
    expect(res.body).not.toHaveProperty('credentials');
    expect(res.body.logoText1).toBeTruthy();
  });

  it('GET /sitemap.xml genera urlset de productos', async () => {
    const res = await request(app).get('/sitemap.xml');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<urlset');
    expect(res.text).toContain(`/producto/${partAvailable._id}`);
  });
});

describe('Catálogo público', () => {
  it('lista repuestos activos', async () => {
    const res = await request(app).get('/api/parts');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
  });

  it('filtra solo con stock disponible', async () => {
    const res = await request(app).get('/api/parts').query({ stock: 'available' });
    expect(res.status).toBe(200);
    const skus = res.body.map(p => p.sku);
    expect(skus).toContain('TEST-001');
    expect(skus).not.toContain('TEST-002');
  });

  it('obtiene detalle de un repuesto', async () => {
    const res = await request(app).get(`/api/parts/${partAvailable._id}`);
    expect(res.status).toBe(200);
    expect(res.body.sku).toBe('TEST-001');
  });

  it('filtra por lista de ids (favoritos/recientes)', async () => {
    const res = await request(app).get('/api/parts').query({ ids: `${partAvailable._id},${partSoldOut._id}` });
    expect(res.status).toBe(200);
    const skus = res.body.map(p => p.sku).sort();
    expect(skus).toEqual(['TEST-001', 'TEST-002']);
  });
});

describe('Registro y autenticación', () => {
  it('registra un usuario y devuelve token', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Nuevo', email: 'nuevo@test.cl', password: 'ClaveSegura1!' });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
  });

  it('rechaza contraseña corta', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'X', email: 'x@test.cl', password: 'corta' });
    expect(res.status).toBe(400);
  });

  it('rechaza email duplicado', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Dup', email: 'cliente@test.cl', password: 'ClaveSegura1!' });
    expect(res.status).toBe(409);
  });

  it('inicia sesión como cliente', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'cliente@test.cl', password: 'Password123!' });
    expect(res.status).toBe(200);
    customerToken = res.body.token;
  });

  it('bloquea la cuenta tras 5 intentos fallidos', async () => {
    const email = 'lock@test.cl';
    await User.create({ name: 'Lock', email, password: await bcrypt.hash('Password123!', 4), role: 'customer' });
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/auth/login').send({ email, password: 'incorrecta' });
      expect([401, 429]).toContain(res.status);
    }
    const res = await request(app).post('/api/auth/login').send({ email, password: 'Password123!' });
    expect(res.status).toBe(429);
  });
});

describe('Reseñas y moderación', () => {
  it('rechaza reseña de producto no comprado (403)', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ partId: partAvailable._id, rating: 5, comment: 'Se ve bien' });
    expect(res.status).toBe(403);
  });

  it('rechaza rating fuera de rango', async () => {
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ partId: partAvailable._id, rating: 9, comment: 'Mal rating' });
    expect(res.status).toBe(400);
  });

  it('acepta reseña de un producto comprado', async () => {
    await Order.create({
      customer: customerId,
      customerInfo: { name: 'Cliente', email: 'cliente@test.cl' },
      items: [{ part: partAvailable._id, sku: 'TEST-001', name: 'Bujía NGK', qty: 1, unitPrice: 12990 }],
      subtotal: 12990, shippingCost: 0, total: 12990,
      status: 'paid', deliveryMethod: 'pickup'
    });
    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ partId: partAvailable._id, rating: 5, comment: 'Excelente repuesto' });
    expect(res.status).toBe(201);
  });
});

describe('Alertas de stock (back-in-stock)', () => {
  it('permite suscribirse y listarla en admin', async () => {
    const sub = await request(app).post('/api/stock-alerts').send({ partId: partSoldOut._id, email: 'avisame@test.cl' });
    expect(sub.status).toBe(201);
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.cl', password: 'AdminPass123!' });
    adminToken = login.body.token;
    const list = await request(app).get('/api/admin/stock-alerts').set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(list.body.some(a => String(a.part?._id) === String(partSoldOut._id))).toBe(true);
  });

  it('rechaza email inválido', async () => {
    const res = await request(app).post('/api/stock-alerts').send({ partId: partSoldOut._id, email: 'no-email' });
    expect(res.status).toBe(400);
  });

  it('reponer stock marca la alerta como notificada', async () => {
    await request(app)
      .put(`/api/admin/parts/${partSoldOut._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stock: 15 });
    const list = await request(app).get('/api/admin/stock-alerts').set('Authorization', `Bearer ${adminToken}`);
    const alert = list.body.find(a => String(a.part?._id) === String(partSoldOut._id));
    expect(alert.notified).toBe(true);
  });
});

describe('Seguridad 2FA (admin)', () => {
  it('setup genera secreto y enable verifica código', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.cl', password: 'AdminPass123!' });
    adminToken = login.body.token;
    const setup = await request(app)
      .post('/api/auth/2fa/setup')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'AdminPass123!' });
    expect(setup.status).toBe(200);
    const code = await otp.generate({ secret: setup.body.secret });
    const enable = await request(app)
      .post('/api/auth/2fa/enable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code });
    expect(enable.body.otpEnabled).toBe(true);
  });

  it('exige código 2FA en el login', async () => {
    const admin = await User.findOne({ email: 'admin@test.cl' });
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.cl', password: 'AdminPass123!' });
    expect(login.body.needs2fa).toBe(true);
    const bad = await request(app).post('/api/auth/login/2fa').send({ otpKey: login.body.otpKey, code: '000000' });
    expect(bad.status).toBe(401);
    const code = await otp.generate({ secret: admin.otpSecret });
    const good = await request(app).post('/api/auth/login/2fa').send({ otpKey: login.body.otpKey, code });
    expect(good.status).toBe(200);
    expect(good.body.token).toBeTruthy();
    adminToken = good.body.token;
  });

  it('desactiva 2FA al final', async () => {
    const res = await request(app)
      .post('/api/auth/2fa/disable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: 'AdminPass123!' });
    expect(res.body.otpEnabled).toBe(false);
  });
});

describe('Auditoría y reportes admin', () => {
  it('registra acciones en /api/admin/audit', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.cl', password: 'AdminPass123!' });
    adminToken = login.body.token;
    const res = await request(app).get('/api/admin/audit').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.items.length).toBeGreaterThan(0);
  });

  it('reportes de ventas devuelven estructura completa', async () => {
    const res = await request(app).get('/api/admin/reports').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.totals).toHaveProperty('revenue');
    expect(res.body.totals).toHaveProperty('count');
    expect(Array.isArray(res.body.byDay)).toBe(true);
    expect(Array.isArray(res.body.byStatus)).toBe(true);
  });

  it('bloquea endpoints admin sin token', async () => {
    const res = await request(app).get('/api/admin/audit');
    expect(res.status).toBe(401);
  });
});

describe('Config avanzada: Transbank y boletas SII', () => {
  it('PUT /api/admin/site-config guarda credenciales webpay y normaliza folios', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: 'admin@test.cl', password: 'AdminPass123!' });
    adminToken = login.body.token;
    const put = await request(app)
      .put('/api/admin/site-config')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        credentials: { smtpHost: '', smtpPort: 465, smtpUser: '', smtpPass: '', webpayCommerceCode: '597020000541', webpayApiKeySecret: 'x-secret', webpayBaseUrl: 'https://webpay3gint.transbank.cl' },
        billing: { rutEmisor: '76.123.456-K', razonSocial: 'Autopartes Test SpA', giro: 'Venta de repuestos', folioDesde: 100, folioHasta: 200, folioActual: 0 }
      });
    expect(put.status).toBe(200);
    expect(put.body.credentials.webpayCommerceCode).toBe('597020000541');
    expect(put.body.billing.folioActual).toBe(99);

    const get = await request(app).get('/api/admin/site-config').set('Authorization', `Bearer ${adminToken}`);
    expect(get.body.credentials.webpayApiKeySecret).toBe('x-secret');
    expect(get.body.billing.razonSocial).toBe('Autopartes Test SpA');
  });

  it('la boleta PDF usa el folio asignado a la orden', async () => {
    const order = await Order.create({
      customer: customerId,
      customerInfo: { name: 'Cliente', email: 'cliente@test.cl' },
      items: [{ part: partAvailable._id, sku: 'TEST-001', name: 'Bujía NGK', qty: 1, unitPrice: 12990 }],
      subtotal: 12990, shippingCost: 0, total: 12990,
      status: 'paid', deliveryMethod: 'pickup', folio: 100
    });
    const res = await request(app).get(`/api/admin/orders/${order._id}/invoice`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('Boleta-100.pdf');
    // Prueba simple del contenido del PDF
    expect(res.body.length).toBeGreaterThan(100);
  });
});

describe('Checkout y Flujo de Pagos (Webpay)', () => {
  let createdOrderId;

  it('checkout calcula el envío y devuelve URL de Webpay', async () => {
    global.fetch = async (url) => {
      if (url.includes('webpay/v1.2/transactions')) {
        return { ok: true, json: async () => ({ url: 'https://webpay.test/pago', token: 'token-123' }) };
      }
      return { ok: false };
    };

    const res = await request(app)
      .post('/api/orders/checkout')
      .send({
        items: [{ partId: String(partAvailable._id), qty: 1 }],
        customerInfo: { name: 'Comprador', email: 'comprador@test.cl', region: 'Región Metropolitana' },
        deliveryMethod: 'delivery'
      });
    
    expect(res.status).toBe(201);
    expect(res.body.checkoutUrl).toBe('https://webpay.test/pago');
    expect(res.body.token).toBe('token-123');
    createdOrderId = res.body.orderId;
    
    // Verifica que el envío fue cobrado y stock reservado
    const order = await Order.findById(createdOrderId);
    expect(order.shippingCost).toBeGreaterThan(0);
    expect(order.total).toBe(order.subtotal + order.shippingCost);
    expect(order.stockReservedAt).toBeTruthy();
    
    // Verifica que el stock fue descontado temporalmente
    const part = await Part.findById(partAvailable._id);
    expect(part.stock).toBe(9); // era 10, ahora 9
  });

  it('retorno exitoso de webpay marca orden pagada y asigna folio', async () => {
    global.fetch = async (url) => {
      return { ok: true, json: async () => ({ status: 'AUTHORIZED', session_id: String(createdOrderId) }) };
    };

    const res = await request(app)
      .post('/api/payments/webpay/return')
      .send({ token_ws: 'token-123' });
      
    expect(res.status).toBe(302); // Redirect al frontend
    expect(res.headers.location).toContain('payment=success');
    
    const order = await Order.findById(createdOrderId);
    expect(order.status).toBe('paid');
    expect(order.folio).toBeGreaterThanOrEqual(100);
  });
});