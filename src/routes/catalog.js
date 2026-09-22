const express = require('express');
const { Part, Review, StockAlert, SiteConfig } = require('../models');
const { auth } = require('../middleware');
const { validate } = require('../validators');

const router = express.Router();

router.get('/api/parts', async (req, res) => {
  const { q, category, make, model, sort, stock } = req.query; const filter = { active: true };
  // _id is a deterministic tie-breaker. Without it, records sharing a
  // createdAt timestamp can move between pages and appear duplicated.
  const order = sort === 'price_asc' ? { price: 1, _id: 1 } : sort === 'price_desc' ? { price: -1, _id: -1 } : sort === 'name' ? { name: 1, _id: 1 } : { createdAt: -1, _id: -1 };
  if (q) filter.$text = { $search: q }; if (category) filter.category = category;
  if (req.query.ids) filter._id = { $in: String(req.query.ids).split(',').filter(Boolean) };
  if (make || model) filter.compatibility = { $elemMatch: { ...(make && { make: new RegExp(`^${make}$`, 'i') }), ...(model && { model: new RegExp(`^${model}$`, 'i') }) } };
  if (stock === 'available') filter.stock = { $gt: 0 };
  if (req.query.page) {
    const limit = Math.min(Math.max(Number(req.query.limit) || 9, 1), 30); const page = Math.max(Number(req.query.page) || 1, 1);
    const [items, total] = await Promise.all([Part.find(filter).sort(order).skip((page - 1) * limit).limit(limit), Part.countDocuments(filter)]);
    return res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  }
  res.json(await Part.find(filter).sort(order));
});

router.get('/api/parts/:id', async (req, res) => {
  const p = await Part.findById(req.params.id);
  if (!p || !p.active) return res.status(404).json({ error: 'Repuesto no encontrado' });
  res.json(p);
});

router.get('/api/config', async (req, res) => {
  let config = await SiteConfig.findOne();
  if (!config) config = await SiteConfig.create({});
  const configObj = config.toObject();
  delete configObj.credentials;
  res.json(configObj);
});

router.post('/api/stock-alerts', validate('stockAlert'), async (req, res) => {
  const { partId, email } = req.body;
  const part = await Part.findOne({ _id: partId, active: true });
  if (!part) return res.status(404).json({ error: 'Producto no encontrado' });
  
  const activeAlerts = await StockAlert.countDocuments({ email, notified: false });
  if (activeAlerts >= 10 && !(await StockAlert.exists({ part: part._id, email }))) {
    return res.status(429).json({ error: 'Has alcanzado el límite máximo de 10 alertas activas por correo' });
  }

  await StockAlert.updateOne({ part: part._id, email }, { $setOnInsert: { part: part._id, email } }, { upsert: true });
  res.status(201).json({ ok: true });
});

router.get('/api/reviews/part/:id', async (req, res) => {
  const reviews = await Review.find({ part: req.params.id, status: 'approved' }).populate('user', 'name').sort({ createdAt: -1 });
  res.json(reviews);
});

router.post('/api/reviews', auth, validate('review'), async (req, res) => {
  const { partId, rating, comment } = req.body;
  const part = await Part.findOne({ _id: partId, active: true });
  if (!part) return res.status(404).json({ error: 'Producto no encontrado' });
  if (await Review.exists({ user: req.user.id, part: partId })) {
    return res.status(409).json({ error: 'Ya dejaste una reseña para este producto' });
  }
  const purchased = await require('../models').Order.exists({ customer: req.user.id, status: { $in: ['paid', 'dispatched', 'delivered'] }, 'items.part': partId });
  if (!purchased) return res.status(403).json({ error: 'Solo puedes reseñar productos que hayas comprado' });
  const review = await Review.create({ user: req.user.id, part: partId, rating, comment });
  res.status(201).json(review);
});

router.put('/api/reviews/:id', auth, validate('reviewUpdate'), async (req, res) => {
  const review = await Review.findOne({ _id: req.params.id, user: req.user.id });
  if (!review) return res.status(404).json({ error: 'Reseña no encontrada' });
  
  if (req.body.rating) review.rating = req.body.rating;
  if (req.body.comment) review.comment = req.body.comment;
  review.status = 'pending'; // Regresa a pendiente si se edita
  await review.save();
  res.json(review);
});

router.delete('/api/reviews/:id', auth, async (req, res) => {
  const review = await Review.findOneAndDelete({ _id: req.params.id, user: req.user.id });
  if (!review) return res.status(404).json({ error: 'Reseña no encontrada' });
  res.json({ ok: true });
});

const { B2BRequest, Store, Workshop } = require('../models');

router.get('/api/stores', async (req, res) => {
  res.json(await Store.find({ active: true }).sort({ nombre: 1 }));
});

router.get('/api/workshops', async (req, res) => {
  res.json(await Workshop.find({ active: true }).sort({ rating: -1 }));
});

router.post('/api/b2b-requests', async (req, res) => {
  try {
    const request = await B2BRequest.create(req.body);
    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
