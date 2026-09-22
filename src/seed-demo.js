require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Part, User, Discount, Order, SiteConfig, Review, Store, Workshop } = require('./models');
const { imageUrlFor, bannerUrlFor } = require('./part-image');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/autopartes_pro';

const CATALOG = [
  ['FRE-001', 'Pastillas de freno cerámicas', 'Brembo', 'Frenos', 45990, 12, 'Mayor poder de frenado, bajo ruido y excelente durabilidad.'],
  ['DIS-002', 'Disco de freno ventilado', 'Brembo', 'Frenos', 64990, 7, 'Diseño ventilado para una respuesta de frenado estable.'],
  ['PAS-003', 'Pastillas de freno (Set 4) compactas', 'Bosch', 'Frenos', 32990, 15, 'Baja emisión de polvo y frenado silencioso de alta fricción.'],
  ['LIQ-004', 'Líquido de frenos DOT 4 1L', 'Motul', 'Lubricantes', 14990, 12, 'Alto punto de ebullición para seguridad extrema.'],
  ['FIL-005', 'Filtro de aceite premium', 'Mann Filter', 'Filtros', 11990, 30, 'Protección contra impurezas para la longevidad del motor.'],
  ['AIR-006', 'Filtro de aire de motor', 'K&N', 'Filtros', 19990, 20, 'Flujo de aire optimizado para la protección del motor.'],
  ['FUE-007', 'Filtro de combustible', 'Hengst', 'Filtros', 15990, 9, 'Retención eficaz de impurezas del combustible.'],
  ['SUS-008', 'Amortiguador delantero', 'Monroe', 'Suspensión', 89990, 8, 'Control y estabilidad para una conducción segura.'],
  ['TER-009', 'Terminal de dirección', 'TRW', 'Suspensión', 28990, 11, 'Componente de dirección de precisión y alta resistencia.'],
  ['BRA-010', 'Brazalete estabilizador', 'Febi', 'Suspensión', 21990, 14, 'Estabilidad de la barra estabilizadora en curvas.'],
  ['BAT-011', 'Batería 60 Ah libre mantenimiento', 'Bosch', 'Electricidad', 84990, 10, 'Potencia de arranque confiable para uso urbano y carretera.'],
  ['ALT-012', 'Alternador 12V 90A', 'Denso', 'Electricidad', 129990, 4, 'Carga estable para el sistema eléctrico del vehículo.'],
  ['BOM-013', 'Bomba de agua', 'Gates', 'Refrigeración', 49990, 6, 'Circulación eficiente del refrigerante del motor.'],
  ['RAD-014', 'Radiador de aluminio', 'Denso', 'Refrigeración', 96990, 4, 'Disipación eficiente para la temperatura óptima del motor.'],
  ['COR-015', 'Kit correa de distribución', 'Gates', 'Motor', 119990, 6, 'Kit completo para una sincronización precisa y duradera.'],
  ['BUJ-016', 'Juego de bujías iridium', 'NGK', 'Motor', 35990, 16, 'Chispa constante, mejor combustión y mayor vida útil.'],
  ['ACE-017', 'Aceite sintético 5W-30 4L', 'Mobil 1', 'Lubricantes', 42990, 22, 'Lubricación avanzada que protege el motor en condiciones exigentes.'],
  ['EMB-018', 'Kit de embrague 3 piezas', 'Valeo', 'Transmisión', 154990, 5, 'Disco, prensa y rodamiento para un acople suave y seguro.'],
  ['TRA-019', 'Kit convertidor de torque', 'ZF', 'Transmisión', 189990, 3, 'Entrega de potencia fluida en la transmisión automática.'],
  ['NEU-020', 'Neumático 205/55 R16', 'Michelin', 'Neumáticos', 109990, 9, 'Agarre, confort y durabilidad para conducción diaria.'],
  ['LLN-021', 'Llanta de aleación 16"', 'Enkei', 'Ruedas', 159990, 5, 'Rendimiento y estética con menor peso.'],
  ['LUC-022', 'Ampolleta LED H7 6000K', 'Philips', 'Iluminación', 24990, 18, 'Iluminación blanca de alto rendimiento y larga vida útil.'],
  ['LUC-023', 'Focus H4 halogen', 'OSRAM', 'Iluminación', 18990, 21, 'Visibilidad clara en rutas y ciudad.'],
  ['ESB-024', 'Paragolpes delantero', 'Rimgard', 'Accesorios', 89990, 6, 'Protección y diseño para el frontal del vehículo.'],
  ['ESP-025', 'Espejo retrovisor eléctrico', 'Rimgard', 'Accesorios', 54990, 8, 'Regulación eléctrica con desempañador.'],
  ['SEN-026', 'Sensor de estacionamiento', 'Hella', 'Electricidad', 34990, 13, 'Detección precisa de obstáculos al estacionar.'],
  ['BOR-027', 'Bomba de dirección asistida', 'TRW', 'Suspensión', 119990, 3, 'Asistencia hidráulica confiable para la dirección.'],
  ['RET-028', 'Retenedor de aceite (juego)', 'VITON', 'Motor', 14990, 25, 'Sellado confiable contra fugas de aceite.'],
  ['CAD-029', 'Cadena de distribución + tensor', 'Iwis', 'Motor', 89990, 5, 'Transmisión silenciosa y sincronización del motor.'],
  ['TER-030', 'Termostato 82°C', 'Calorstat', 'Refrigeración', 12990, 18, 'Control de la temperatura óptima de operación.']
];

const specsOf = (cat) => {
  const common = [{ label: 'Garantía', value: '6 meses' }, { label: 'Calidad', value: 'Equipo equivalente OEM' }];
  if (cat === 'Frenos') return [{ label: 'Eje', value: 'Delantero' }, ...common];
  if (cat === 'Filtros') return [{ label: 'Tipo', value: 'Repuesto recomendado' }, ...common];
  if (cat === 'Suspensión') return [{ label: 'Posición', value: 'Delantero' }, ...common];
  if (cat === 'Motor') return [{ label: 'Aplicación', value: 'Gasolina' }, ...common];
  if (cat === 'Neumáticos') return [{ label: 'Índice de carga', value: '91V' }, ...common];
  if (cat === 'Iluminación') return [{ label: 'Zócalo', value: 'H7' }, ...common];
  return common;
};

const compatibilityOf = (index) => {
  const makes = [
    { make: 'Toyota', model: 'Corolla', yearFrom: 2014, yearTo: 2023 },
    { make: 'Hyundai', model: 'Tucson', yearFrom: 2016, yearTo: 2022 },
    { make: 'Chevrolet', model: 'Sail', yearFrom: 2015, yearTo: 2021 },
    { make: 'Nissan', model: 'Sentra', yearFrom: 2013, yearTo: 2020 },
    { make: 'Suzuki', model: 'Swift', yearFrom: 2017, yearTo: 2023 }
  ];
  return [makes[index % makes.length]];
};

async function seedDemo() {
  await mongoose.connect(MONGODB_URI);

  const email = process.env.ADMIN_EMAIL || 'admin@autopartespro.cl';
  await User.findOneAndUpdate(
    { email },
    { name: 'Administrador', email, password: await bcrypt.hash(process.env.ADMIN_PASSWORD || 'define_una_clave_segura_para_el_admin', 12), role: 'admin' },
    { upsert: true }
  );

  const demoEmail = 'demo@autopartespro.cl';
  const demoUser = await User.findOneAndUpdate(
    { email: demoEmail },
    { name: 'Carlos Demo', email: demoEmail, password: await bcrypt.hash('DemoClave123!', 12), role: 'customer', rut: '11.111.111-1', phone: '+56 9 5555 5555', address: 'Av. Siempre Viva 742, Providencia' },
    { upsert: true, new: true }
  );

  const parts = CATALOG.map(([sku, name, brand, category, price, stock, description], i) => ({
    sku, name, brand, category, price, stock, description,
    lowStockThreshold: 5,
    technicalSpecs: specsOf(category),
    compatibility: compatibilityOf(i)
  }));
  const withImages = parts.map(p => ({ ...p, image: imageUrlFor(p) }));
  await Part.bulkWrite(withImages.map(doc => ({
    updateOne: { filter: { sku: doc.sku }, update: { $set: doc }, upsert: true }
  })));
  console.log(`Catálogo: ${parts.length} repuestos listos.`);

  const indexed = {};
  for (const p of withImages) indexed[p.sku] = await Part.findOne({ sku: p.sku });

  await Discount.bulkWrite([
    { updateOne: { filter: { code: 'BIENVENIDA10' }, update: { $set: { code: 'BIENVENIDA10', type: 'percent', value: 10, minimumAmount: 0, startsAt: new Date('2020-01-01'), endAt: new Date('2027-12-31'), active: true } }, upsert: true } },
    { updateOne: { filter: { code: 'CAMIONETA5' }, update: { $set: { code: 'CAMIONETA5', type: 'percent', value: 5, minimumAmount: 30000, startsAt: new Date('2020-01-01'), endAt: new Date('2027-12-31'), active: true } }, upsert: true } }
  ]);
  console.log('Descuentos: BIENVENIDA10, CAMIONETA5.');

  await Store.bulkWrite([
    { updateOne: { filter: { nombre: 'AutoPro Providencia' }, update: { $set: { nombre: 'AutoPro Providencia', direccion: 'Av. Providencia 1234, Santiago', horario: 'Lun–Vie 09:00–19:00 · Sáb 10:00–15:00', telefono: '+56 9 1234 5678', lat: -33.4253, lng: -70.6157, active: true } }, upsert: true } },
    { updateOne: { filter: { nombre: 'AutoPro Maipú' }, update: { $set: { nombre: 'AutoPro Maipú', direccion: 'Av. Pajaritos 3210, Maipú', horario: 'Lun–Vie 09:00–18:30 · Sáb 10:00–14:00', telefono: '+56 9 8765 4321', lat: -33.5106, lng: -70.7565, active: true } }, upsert: true } }
  ]);
  await Workshop.bulkWrite([
    { updateOne: { filter: { nombre: 'Taller MotorLab' }, update: { $set: { nombre: 'Taller MotorLab', direccion: 'Av. Italia 1560, Ñuñoa', telefono: '+56 9 4141 8080', rating: 4.9, especialidades: ['Frenos', 'Suspensión', 'Diagnóstico'], active: true } }, upsert: true } },
    { updateOne: { filter: { nombre: 'Garage Norte' }, update: { $set: { nombre: 'Garage Norte', direccion: 'Independencia 2345, Conchalí', telefono: '+56 9 5656 9090', rating: 4.7, especialidades: ['Motor', 'Transmisión', 'Electricidad'], active: true } }, upsert: true } }
  ]);
  console.log('Sucursales y talleres demo verificados.');

  let config = await SiteConfig.findOne();
  if (!config) config = await SiteConfig.create({});
  if (!config.banners || !config.banners.length) {
    config.banners = [
      { imageUrl: bannerUrlFor('MUERTE A LOS PREJUICIOS'), title: 'Frenos que responden', link: '/catalogo?category=Frenos', active: true },
      { imageUrl: bannerUrlFor('AUTO#PRO'), title: 'Repuestos con respaldo de taller', link: '/catalogo', active: true }
    ];
    await config.save();
  }
  console.log('Config del sitio verificada (banners listos).');

  const existingOrders = await Order.countDocuments({ 'customerInfo.email': demoEmail });
  if (existingOrders === 0) {
    const mkOrder = (skus, daysAgo, status, extra) => ({
      customer: demoUser._id,
      customerInfo: { name: 'Carlos Demo', email: demoEmail, rut: '11.111.111-1', phone: '+56 9 5555 5555', address: 'Av. Siempre Viva 742, Providencia' },
      items: skus.map(([sku, qty]) => ({ part: indexed[sku]?._id, sku, name: indexed[sku]?.name, qty, unitPrice: indexed[sku]?.price })),
      subtotal: skus.reduce((s, [sku, qty]) => s + (indexed[sku]?.price || 0) * qty, 0),
      discount: null,
      shippingCost: extra?.shipping || 0,
      total: skus.reduce((s, [sku, qty]) => s + (indexed[sku]?.price || 0) * qty, 0) + (extra?.shipping || 0),
      status,
      statusHistory: [{ status, at: new Date(Date.now() - daysAgo * 86400000), by: 'system' }],
      deliveryMethod: extra?.delivery || 'pickup',
      paymentId: extra?.paymentId,
      paymentStatus: 'paid',
      folio: extra?.folio
    });
    const orders = [
      mkOrder([['FRE-001', 1], ['FIL-005', 2]], 1, 'paid', { folio: 1001, delivery: 'delivery', shipping: 3500 }),
      mkOrder([['SUS-008', 1]], 3, 'dispatched', { folio: 1000, delivery: 'pickup', trackingNumber: 'CHL-48220', paymentId: 'webpay-demo-1' }),
      mkOrder([['BUJ-016', 1], ['AIR-006', 1]], 6, 'delivered', { folio: 999, delivery: 'delivery', shipping: 5500 })
    ];
    orders[2].trackingNumber = 'CHL-41093';
    await Order.insertMany(orders);
    console.log('Órdenes demo del cliente: 3 pedidos (pagados/despachados/entregados).');
  } else {
    console.log('El cliente demo ya tenía órdenes; no se duplican.');
  }

  const reviewCount = await Review.countDocuments({ user: demoUser._id });
  if (reviewCount === 0) {
    const approvedReviews = [
      { user: demoUser._id, part: indexed['FRE-001']._id, rating: 5, comment: 'Excelente poder de frenado, se notan desde el primer uso.' },
      { user: demoUser._id, part: indexed['BUJ-016']._id, rating: 4, comment: 'El auto quedó más sensible. Buena relación precio-calidad.' },
      { user: demoUser._id, part: indexed['NEU-020']._id, rating: 5, comment: 'Agarre impecable en lluvia. Tal cual la descripción.' }
    ];
    await Review.insertMany(approvedReviews);
    console.log('Reseñas demo: 3 aprobadas.');
  }

  console.log('Seed demo completo ✔');
  await mongoose.disconnect();
}

seedDemo().catch(e => { console.error('Error en seed demo:', e); process.exit(1); });
