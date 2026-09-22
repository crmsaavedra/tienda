const mongoose = require('mongoose');
const { Schema } = mongoose;

const partSchema = new Schema({
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true, trim: true },
  category: { type: String, required: true, index: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  stock: { type: Number, required: true, min: 0, default: 0 },
  lowStockThreshold: { type: Number, min: 0, default: 5 },
  technicalSpecs: [{ label: String, value: String }],
  compatibility: [{ make: String, model: String, yearFrom: Number, yearTo: Number, engine: String }],
  image: { type: String, default: 'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=900&q=80' },
  gallery: [{ type: String }],
  notes: [{ title: String, content: String }],
  discountPercent: { type: Number, min: 0, max: 100, default: 0 },
  active: { type: Boolean, default: true }
}, { timestamps: true });
partSchema.index({ name: 'text', brand: 'text', sku: 'text' });

const discountSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  type: { type: String, enum: ['percent', 'fixed'], required: true },
  value: { type: Number, required: true, min: 0 },
  startsAt: { type: Date, default: Date.now }, endAt: { type: Date, required: true },
  minimumAmount: { type: Number, min: 0, default: 0 }, active: { type: Boolean, default: true }
}, { timestamps: true });

const userSchema = new Schema({
  name: { type: String, required: true }, email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true }, role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
  rut: String, phone: String, address: String,
  otpSecret: String, otpEnabled: { type: Boolean, default: false },
  recoveryCodes: [String]
}, { timestamps: true });
userSchema.index({ role: 1 });

const orderSchema = new Schema({
  customer: { type: Schema.Types.ObjectId, ref: 'User' }, customerInfo: { name: String, email: String, phone: String, rut: String, address: String, region: String },
  orderNumber: { type: String, index: true },
  items: [{ part: { type: Schema.Types.ObjectId, ref: 'Part' }, sku: String, name: String, qty: Number, unitPrice: Number }],
  subtotal: Number, discount: { code: String, amount: Number }, shippingCost: Number, total: Number,
  status: { type: String, enum: ['pending', 'paid', 'cancelled', 'refunded', 'dispatched', 'delivered'], default: 'pending' },
  statusHistory: [{ status: String, at: Date, by: String }],
  paymentId: String, paymentStatus: String,
  deliveryMethod: { type: String, enum: ['pickup', 'delivery'], default: 'delivery' },
  trackingNumber: String,
  folio: Number,
  stockReservedAt: Date
}, { timestamps: true });
orderSchema.index({ 'customerInfo.email': 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

const siteConfigSchema = new Schema({
  heroEyebrow: { type: String, default: 'Repuestos con respaldo profesional' }, heroTitle: { type: String, default: 'Tu vehículo merece piezas que responden.' },
  heroIntro: { type: String, default: 'Encuentra repuestos de marcas líderes, con compatibilidad técnica verificada y despacho seguro.' }, heroButton: { type: String, default: 'Buscar repuestos' },
  featuredEyebrow: { type: String, default: 'SELECCIÓN DEL TALLER' }, featuredTitle: { type: String, default: 'Productos destacados' }, featuredIntro: { type: String, default: 'Los repuestos más buscados, seleccionados por calidad, disponibilidad y desempeño.' },
  primaryColor: { type: String, default: '#ea580c' }, secondaryColor: { type: String, default: '#1667b7' },
  logoText1: { type: String, default: 'AUTO' }, logoText2: { type: String, default: 'PRO' },
  footerDescription: { type: String, default: 'Encuentra los mejores repuestos con calidad certificada y el respaldo que tu vehículo merece.' },
  contactAddress: { type: String, default: 'Av. Providencia 1234, Stgo' }, contactPhone: { type: String, default: '+56 9 1234 5678' }, contactEmail: { type: String, default: 'contacto@autopartespro.cl' },
  socialFacebook: { type: String, default: '#' }, socialInstagram: { type: String, default: '#' }, socialTwitter: { type: String, default: '#' },
  trust: { type: [{ title: String, text: String }], default: [{ title: 'Compra protegida', text: 'Pago seguro con Webpay Plus de Transbank' }, { title: 'Calidad garantizada', text: 'Marcas seleccionadas' }, { title: 'Soporte experto', text: 'Te ayudamos a elegir' }] },
  shippingRules: { type: [{ region: String, cost: Number }], default: [{ region: 'Región Metropolitana', cost: 3500 }, { region: 'Otras Regiones', cost: 5500 }] },
  freeShippingThreshold: { type: Number, default: 50000 },
  banners: { type: [{ imageUrl: String, title: String, link: String, active: Boolean }], default: [] },
  credentials: {
    smtpHost: { type: String, default: '' },
    smtpPort: { type: Number, default: 465 },
    smtpUser: { type: String, default: '' },
    smtpPass: { type: String, default: '' },
    webpayCommerceCode: { type: String, default: '' },
    webpayApiKeySecret: { type: String, default: '' },
    webpayBaseUrl: { type: String, default: '' }
  },
billing: {
      rutEmisor: { type: String, default: '' },
      razonSocial: { type: String, default: '' },
      giro: { type: String, default: '' },
      direccion: { type: String, default: '' },
      comuna: { type: String, default: '' },
      telefono: { type: String, default: '' },
      codigoActividad: { type: String, default: '' },
      folioDesde: { type: Number, default: 0 },
      folioActual: { type: Number, default: 0 },
      folioHasta: { type: Number, default: 0 }
    },
    unsubscribedEmails: [String]
  }, { timestamps: true });

const reviewSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  part: { type: Schema.Types.ObjectId, ref: 'Part', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

const auditLogSchema = new Schema({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  email: String,
  action: { type: String, required: true },
  targetType: String,
  targetId: Schema.Types.ObjectId,
  details: Schema.Types.Mixed,
  ip: String
}, { timestamps: true });
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });

const stockAlertSchema = new Schema({
  part: { type: Schema.Types.ObjectId, ref: 'Part', required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  notified: { type: Boolean, default: false },
  notifiedAt: Date
}, { timestamps: true });
stockAlertSchema.index({ part: 1, email: 1 }, { unique: true });

const counterSchema = new Schema({
  key: { type: String, required: true, unique: true },
  seq: { type: Number, default: 0 }
});

const b2bRequestSchema = new Schema({
  rut: { type: String, required: true },
  razonSocial: { type: String, required: true },
  giro: String,
  contacto: { type: String, required: true },
  email: { type: String, required: true },
  telefono: { type: String, required: true },
  mensaje: String,
  status: { type: String, enum: ['pending', 'contacted', 'approved', 'rejected'], default: 'pending' },
  notes: String
}, { timestamps: true });

const storeSchema = new Schema({
  nombre: { type: String, required: true },
  direccion: { type: String, required: true },
  horario: { type: String, required: true },
  telefono: { type: String, required: true },
  lat: Number,
  lng: Number,
  active: { type: Boolean, default: true }
}, { timestamps: true });

const workshopSchema = new Schema({
  nombre: { type: String, required: true },
  direccion: { type: String, required: true },
  rating: { type: Number, default: 5, min: 1, max: 5 },
  telefono: { type: String, required: true },
  especialidades: [String],
  active: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = { 
  Part: mongoose.model('Part', partSchema), 
  Discount: mongoose.model('Discount', discountSchema), 
  User: mongoose.model('User', userSchema), 
  Order: mongoose.model('Order', orderSchema), 
  SiteConfig: mongoose.model('SiteConfig', siteConfigSchema),
  Review: mongoose.model('Review', reviewSchema),
  AuditLog: mongoose.model('AuditLog', auditLogSchema),
  StockAlert: mongoose.model('StockAlert', stockAlertSchema),
  Counter: mongoose.model('Counter', counterSchema),
  B2BRequest: mongoose.model('B2BRequest', b2bRequestSchema),
  Store: mongoose.model('Store', storeSchema),
  Workshop: mongoose.model('Workshop', workshopSchema)
};
