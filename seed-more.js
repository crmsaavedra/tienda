const mongoose = require('mongoose');
const { Part } = require('./src/models');
const { imageUrlFor } = require('./src/part-image');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/autopartes_pro';

const seedMore = async () => {
  await mongoose.connect(MONGODB_URI);

  const parts = [
    {
      sku: 'LIQUI-MOLY-CERATEC', name: 'Aditivo Motor Ceratec 300ml', brand: 'Liqui Moly', category: 'Lubricantes',
      description: 'Protección antidesgaste de alta tecnología para todos los aceites de motor. Reduce la fricción.',
      price: 25000, stock: 40
    },
    {
      sku: 'WD40-MULTI', name: 'WD-40 Multiuso 400ml', brand: 'WD-40', category: 'Accesorios',
      description: 'Lubrica, afloja, protege y limpia.',
      price: 6500, stock: 150
    },
    {
      sku: 'GATES-TB-001', name: 'Correa de Distribución Gates', brand: 'Gates', category: 'Motor',
      description: 'Correa de distribución de alta resistencia.',
      price: 18000, stock: 20
    },
    {
      sku: 'KYB-EXCEL-G', name: 'Amortiguador KYB Excel-G', brand: 'KYB', category: 'Suspensión',
      description: 'Restaura el rendimiento original de manejo de fábrica.',
      price: 55000, stock: 12
    },
    {
      sku: 'HELLA-H4-S', name: 'Ampolleta Hella H4 Standard', brand: 'Hella', category: 'Iluminación',
      description: 'Ampolleta halógena estándar, calidad alemana.',
      price: 4500, stock: 80
    }
  ];
  parts.forEach(p => { p.image = imageUrlFor(p); });

  await Part.insertMany(parts);
  
  console.log('Más productos agregados!');
  process.exit(0);
};

seedMore();
