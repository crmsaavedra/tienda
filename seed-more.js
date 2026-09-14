const mongoose = require('mongoose');
const { Part } = require('./src/models');

const MONGODB_URI = 'mongodb://127.0.0.1:27017/autopartes_pro';

const seedMore = async () => {
  await mongoose.connect(MONGODB_URI);

  await Part.insertMany([
    {
      sku: 'LIQUI-MOLY-CERATEC', name: 'Aditivo Motor Ceratec 300ml', brand: 'Liqui Moly', category: 'Lubricantes',
      description: 'Protección antidesgaste de alta tecnología para todos los aceites de motor. Reduce la fricción.',
      price: 25000, stock: 40, image: 'https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&w=800&q=80'
    },
    {
      sku: 'WD40-MULTI', name: 'WD-40 Multiuso 400ml', brand: 'WD-40', category: 'Accesorios',
      description: 'Lubrica, afloja, protege y limpia.',
      price: 6500, stock: 150, image: 'https://images.unsplash.com/photo-1587842323719-74d32e95a32b?auto=format&fit=crop&w=800&q=80'
    },
    {
      sku: 'GATES-TB-001', name: 'Correa de Distribución Gates', brand: 'Gates', category: 'Motor',
      description: 'Correa de distribución de alta resistencia.',
      price: 18000, stock: 20, image: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=800&q=80'
    },
    {
      sku: 'KYB-EXCEL-G', name: 'Amortiguador KYB Excel-G', brand: 'KYB', category: 'Suspensión',
      description: 'Restaura el rendimiento original de manejo de fábrica.',
      price: 55000, stock: 12, image: 'https://images.unsplash.com/photo-1622396481328-9b1b78cdd9fd?auto=format&fit=crop&w=800&q=80' // Car bottom/suspension
    },
    {
      sku: 'HELLA-H4-S', name: 'Ampolleta Hella H4 Standard', brand: 'Hella', category: 'Iluminación',
      description: 'Ampolleta halógena estándar, calidad alemana.',
      price: 4500, stock: 80, image: 'https://images.unsplash.com/photo-1563720225150-1845bbccaf49?auto=format&fit=crop&w=800&q=80' // headlight
    }
  ]);
  
  console.log('Más productos agregados!');
  process.exit(0);
};

seedMore();
