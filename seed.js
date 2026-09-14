const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Part, Discount, User, Order, SiteConfig, Review } = require('./src/models');
const { imageUrlFor, bannerUrlFor } = require('./src/part-image');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/autopartes_pro';

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Conectado a MongoDB...');

    // Limpiar BD
    await Part.deleteMany({});
    await Discount.deleteMany({});
    await User.deleteMany({});
    await Order.deleteMany({});
    await Review.deleteMany({});
    await SiteConfig.deleteMany({});
    console.log('Colecciones limpias.');

    // Configuración base
    await SiteConfig.create({
      banners: [
        {
          imageUrl: bannerUrlFor('Gran Liquidación de Motores', 'banner-liquidacion'),
          title: 'Gran Liquidación de Motores',
          link: '/catalogo?q=motor',
          active: true
        },
        {
          imageUrl: bannerUrlFor('Accesorios Premium', 'banner-accesorios'),
          title: 'Accesorios Premium',
          link: '/catalogo',
          active: true
        }
      ]
    });

    // Usuarios
    const hashPassword = await bcrypt.hash('password123', 10);
    const users = await User.insertMany([
      { name: 'Admin Principal', email: 'admin@autopartespro.cl', password: await bcrypt.hash('CambiaEstaClave123!', 10), role: 'admin' },
      { name: 'Carlos Martínez', email: 'carlos.m@example.com', password: hashPassword, role: 'customer', phone: '+56912345678', address: 'Av. Las Condes 123, Stgo' },
      { name: 'Ana Silva', email: 'ana.s@example.com', password: hashPassword, role: 'customer', phone: '+56987654321', address: 'Calle Falsa 456, Viña del Mar' },
      { name: 'Taller Mecánico Express', email: 'taller.express@example.com', password: hashPassword, role: 'customer', phone: '+56911223344', address: 'Ruta 68, Valparaíso' }
    ]);
    const customers = users.filter(u => u.role === 'customer');

    // Descuentos
    const discount = await Discount.create({
      code: 'BIENVENIDA20',
      type: 'percent',
      value: 20,
      endAt: new Date(Date.now() + 86400000 * 30),
      minimumAmount: 10000
    });

    // Productos (Repuestos)
    const partsData = [
      {
        sku: 'BOSCH-BAT-001', name: 'Batería Bosch S4 60Ah', brand: 'Bosch', category: 'Eléctrico',
        description: 'Batería de alto rendimiento, libre de mantención. Especial para vehículos con requerimientos de energía estándar.',
        price: 75000, stock: 15, lowStockThreshold: 5, discountPercent: 10,
        technicalSpecs: [{ label: 'Amperaje', value: '60Ah' }, { label: 'Voltaje', value: '12V' }, { label: 'CCA', value: '540A' }],
        compatibility: [{ make: 'Toyota', model: 'Yaris', yearFrom: 2010, yearTo: 2020 }]
      },
      {
        sku: 'NGK-SP-BKR6E', name: 'Bujía NGK BKR6E-11', brand: 'NGK', category: 'Motor',
        description: 'Bujía de encendido convencional de cobre, proporciona arranques rápidos y suave funcionamiento.',
        price: 3500, stock: 100, lowStockThreshold: 20,
        technicalSpecs: [{ label: 'Material', value: 'Cobre' }, { label: 'Luz', value: '1.1mm' }],
        compatibility: [{ make: 'Honda', model: 'Civic', yearFrom: 2006, yearTo: 2011 }]
      },
      {
        sku: 'MANN-FILTER-W712', name: 'Filtro de Aceite MANN W712/94', brand: 'MANN-FILTER', category: 'Filtros',
        description: 'Filtro de aceite de alta capacidad de retención de suciedad, protege el motor y alarga su vida útil.',
        price: 8500, stock: 45, lowStockThreshold: 10,
        technicalSpecs: [{ label: 'Tipo', value: 'Sellado' }, { label: 'Válvula anti-retorno', value: 'Sí' }],
        compatibility: [{ make: 'Volkswagen', model: 'Golf', yearFrom: 2012, yearTo: 2018 }]
      },
      {
        sku: 'BREMBO-P-06-034', name: 'Pastillas de Freno Brembo Delanteras', brand: 'Brembo', category: 'Frenos',
        description: 'Pastillas de freno premium para un rendimiento de frenado excelente y baja emisión de polvo.',
        price: 45000, stock: 20, lowStockThreshold: 5, discountPercent: 5,
        technicalSpecs: [{ label: 'Posición', value: 'Delantera' }, { label: 'Material', value: 'Semi-metálica' }],
        compatibility: [{ make: 'BMW', model: 'Serie 3', yearFrom: 2012, yearTo: 2019 }]
      },
      {
        sku: 'MOBIL-1-5W30', name: 'Aceite Motor Mobil 1 5W-30 (5 Lts)', brand: 'Mobil', category: 'Lubricantes',
        description: 'Aceite de motor sintético avanzado diseñado para mantener el motor como nuevo.',
        price: 42000, stock: 30, lowStockThreshold: 10,
        technicalSpecs: [{ label: 'Viscosidad', value: '5W-30' }, { label: 'Tipo', value: 'Sintético' }],
        compatibility: []
      },
      {
        sku: 'MICHELIN-2055516', name: 'Neumático Michelin Primacy 4 205/55 R16', brand: 'Michelin', category: 'Ruedas',
        description: 'Seguridad duradera y excelente agarre en mojado.',
        price: 115000, stock: 2, lowStockThreshold: 4, 
        technicalSpecs: [{ label: 'Aro', value: '16' }, { label: 'Ancho', value: '205' }, { label: 'Perfil', value: '55' }],
        compatibility: []
      },
      {
        sku: 'PHILIPS-H7-LED', name: 'Ampolletas Philips Ultinon Essential LED H7', brand: 'Philips', category: 'Iluminación',
        description: 'Luz LED blanca y elegante para una visibilidad mejorada. Diseño compacto para instalación rápida.',
        price: 32000, stock: 25, lowStockThreshold: 10,
        technicalSpecs: [{ label: 'Tecnología', value: 'LED' }, { label: 'Base', value: 'H7' }],
        compatibility: []
      }
    ];
    partsData.forEach(p => { p.image = imageUrlFor(p); });
    const parts = await Part.insertMany(partsData);

    // Reseñas
    await Review.insertMany([
      { user: customers[0]._id, part: parts[0]._id, rating: 5, comment: 'Excelente batería, arrancó a la primera. Envío súper rápido.', status: 'approved' },
      { user: customers[1]._id, part: parts[0]._id, rating: 4, comment: 'Buen producto, pero la caja llegó un poco maltratada. Funciona bien.', status: 'approved' },
      { user: customers[2]._id, part: parts[3]._id, rating: 5, comment: 'Frenan excelente, 100% recomendadas para BMW.', status: 'approved' },
      { user: customers[1]._id, part: parts[1]._id, rating: 2, comment: 'No le sirvieron a mi auto, aunque decía que sí.', status: 'pending' },
      { user: customers[0]._id, part: parts[4]._id, rating: 5, comment: 'El mejor aceite. Lo uso hace años y jamás un problema.', status: 'approved' }
    ]);

    // Órdenes (Compras)
    const order1 = new Order({
      customer: customers[0]._id,
      customerInfo: { name: customers[0].name, email: customers[0].email, phone: customers[0].phone, address: customers[0].address },
      items: [{ part: parts[0]._id, sku: parts[0].sku, name: parts[0].name, qty: 1, unitPrice: 75000 }],
      subtotal: 75000, discount: { code: discount.code, amount: 15000 }, total: 60000 + 3500, // + shipping
      status: 'paid', paymentId: 'PAY-12345', paymentStatus: 'approved',
      deliveryMethod: 'delivery', trackingNumber: '', shippingCost: 3500
    });

    const order2 = new Order({
      customer: customers[1]._id,
      customerInfo: { name: customers[1].name, email: customers[1].email, phone: customers[1].phone, address: customers[1].address },
      items: [{ part: parts[3]._id, sku: parts[3].sku, name: parts[3].name, qty: 2, unitPrice: 45000 }],
      subtotal: 90000, total: 90000 + 5500,
      status: 'paid', paymentId: 'PAY-54321', paymentStatus: 'approved',
      deliveryMethod: 'delivery', trackingNumber: 'STARKEN-987654321', shippingCost: 5500
    });

    const order3 = new Order({
      customer: customers[2]._id,
      customerInfo: { name: customers[2].name, email: customers[2].email, phone: customers[2].phone, address: customers[2].address },
      items: [{ part: parts[5]._id, sku: parts[5].sku, name: parts[5].name, qty: 4, unitPrice: 115000 }],
      subtotal: 460000, total: 460000, // free shipping
      status: 'pending', 
      deliveryMethod: 'pickup'
    });

    const order4 = new Order({
      customer: customers[0]._id,
      customerInfo: { name: customers[0].name, email: customers[0].email, phone: customers[0].phone, address: customers[0].address },
      items: [{ part: parts[1]._id, sku: parts[1].sku, name: parts[1].name, qty: 4, unitPrice: 3500 }],
      subtotal: 14000, total: 14000,
      status: 'cancelled', paymentId: 'PAY-999', paymentStatus: 'rejected',
      deliveryMethod: 'delivery', shippingCost: 0
    });

    await Order.insertMany([order1, order2, order3, order4]);

    console.log('¡Base de datos poblada con éxito!');
    process.exit(0);
  } catch (error) {
    console.error('Error poblando la base de datos:', error);
    process.exit(1);
  }
};

seedData();
