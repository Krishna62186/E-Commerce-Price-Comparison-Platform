import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret';

// ── Helpers ──────────────────────────────────────────────────────────────────
let _id = 1;
const newId = () => String(_id++);

const effective = o =>
  Math.max(0,
    o.price +
    (o.delivery || 0) -
    (o.coupon?.amount || 0) -
    (o.bankOffer?.amount || 0) -
    (o.paymentOffer?.amount || 0)
  );

// ── Seed data ─────────────────────────────────────────────────────────────────
const image = (text, bg = 'e8f0fe') =>
  `https://placehold.co/800x600/${bg}/1c3d5a?text=${encodeURIComponent(text)}`;

const listing = (store, price, bank = 0, coupon = 0) => ({
  _id: newId(),
  store, price, url: '#', delivery: 0,
  coupon:      { code: coupon ? 'SAVE' : '', amount: coupon },
  bankOffer:   { name: bank ? 'Card offer' : '', amount: bank },
  paymentOffer:{ name: 'UPI cashback', amount: 99 },
  inStock: true,
  updatedAt: new Date(),
});

const makeProduct = (title, brand, category, base, description, specs) => ({
  _id: newId(),
  title, brand, category, description, specs,
  image: image(title),
  featured: true,
  rating: 4.4,
  offers: [
    listing('Amazon',   base,        1000, 500),
    listing('Flipkart', base + 900,  1500, 0),
    listing('Croma',    base + 1700, 0,    800),
  ],
  priceHistory: Array.from({ length: 12 }, (_, i) => ({
    _id: newId(),
    date: new Date(Date.now() - (12 - i) * 86400000),
    price: base + Math.round(Math.sin(i) * 1800) + i * 80,
  })),
  createdAt: new Date(),
});

// In-memory DB
const db = {
  products: [
    makeProduct('Samsung Galaxy S24 5G', 'Samsung', 'Mobiles', 64999,
      'Flagship Android smartphone with AI features and a vivid AMOLED display.',
      [{ label: 'Display', value: '6.2 inch AMOLED' }, { label: 'Storage', value: '256 GB' }, { label: 'Camera', value: '50 MP' }]),
    makeProduct('Apple MacBook Air M3', 'Apple', 'Laptops', 104990,
      'Lightweight laptop with the Apple M3 chip for students and creators.',
      [{ label: 'Chip', value: 'Apple M3' }, { label: 'Memory', value: '8 GB' }, { label: 'Storage', value: '256 GB SSD' }]),
    makeProduct('Sony WH-1000XM5', 'Sony', 'Audio', 27990,
      'Premium wireless noise-cancelling headphones.',
      [{ label: 'Battery', value: '30 hours' }, { label: 'Type', value: 'Over-ear' }, { label: 'Noise control', value: 'Adaptive ANC' }]),
    makeProduct('LG 55-inch 4K OLED TV', 'LG', 'Televisions', 89990,
      'OLED smart TV with cinematic 4K picture quality.',
      [{ label: 'Resolution', value: '4K UHD' }, { label: 'Panel', value: 'OLED' }, { label: 'Refresh rate', value: '120 Hz' }]),
    makeProduct('OnePlus 12 5G', 'OnePlus', 'Mobiles', 64999,
      'Flagship killer with Snapdragon 8 Gen 3 and Hasselblad cameras.',
      [{ label: 'Display', value: '6.82 inch LTPO AMOLED' }, { label: 'Storage', value: '256 GB' }, { label: 'Camera', value: '50 MP Triple' }]),
    makeProduct('Dell XPS 15', 'Dell', 'Laptops', 149990,
      'Premium Windows laptop with OLED display and Intel Core i9.',
      [{ label: 'Processor', value: 'Intel Core i9-13900H' }, { label: 'RAM', value: '32 GB DDR5' }, { label: 'Display', value: '15.6" OLED 3.5K' }]),
  ],
  users: [],
};

// Seed demo users
(async () => {
  db.users.push(
    { _id: newId(), name: 'Administrator', email: 'admin@pricewise.dev', password: await bcrypt.hash('Admin@123', 10), role: 'admin', wishlist: [], alerts: [], searches: [], createdAt: new Date() },
    { _id: newId(), name: 'Student User',  email: 'student@pricewise.dev', password: await bcrypt.hash('Student@123', 10), role: 'user', wishlist: [], alerts: [], searches: [], createdAt: new Date() },
  );
  console.log('✅ In-memory DB seeded with demo data');
})();

// ── Auth helpers ──────────────────────────────────────────────────────────────
const tokenFor = u => jwt.sign({ id: u._id, role: u.role }, JWT_SECRET, { expiresIn: '7d' });

const protect = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) throw new Error('no token');
    const { id } = jwt.verify(token, JWT_SECRET);
    req.user = db.users.find(u => u._id === id);
    if (!req.user) throw new Error('user not found');
    next();
  } catch {
    res.status(401).json({ message: 'Authentication required' });
  }
};

const adminOnly = (req, res, next) =>
  req.user?.role === 'admin' ? next() : res.status(403).json({ message: 'Administrator access required' });

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true }));

// Auth
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Name, email and password required' });
  if (db.users.find(u => u.email === email)) return res.status(409).json({ message: 'Email already registered' });
  const u = { _id: newId(), name, email, password: await bcrypt.hash(password, 10), role: 'user', wishlist: [], alerts: [], searches: [], createdAt: new Date() };
  db.users.push(u);
  res.status(201).json({ token: tokenFor(u), user: { id: u._id, name: u.name, email: u.email, role: u.role } });
});

app.post('/api/auth/login', async (req, res) => {
  const u = db.users.find(u => u.email === req.body.email);
  if (!u || !await bcrypt.compare(req.body.password, u.password))
    return res.status(401).json({ message: 'Invalid email or password' });
  res.json({ token: tokenFor(u), user: { id: u._id, name: u.name, email: u.email, role: u.role } });
});

// Products
app.get('/api/products', (req, res) => {
  const { q = '', category = '' } = req.query;
  let products = db.products;
  if (q) products = products.filter(p =>
    p.title.toLowerCase().includes(q.toLowerCase()) ||
    p.brand.toLowerCase().includes(q.toLowerCase())
  );
  if (category) products = products.filter(p => p.category === category);
  products = [...products].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  res.json(products.map(p => ({ ...p, lowestPrice: Math.min(...p.offers.map(effective)) })));
});

app.get('/api/products/:id', (req, res) => {
  const p = db.products.find(p => p._id === req.params.id);
  if (!p) return res.status(404).json({ message: 'Product not found' });
  const offers = p.offers.map(o => ({ ...o, effectivePrice: effective(o) })).sort((a, b) => a.effectivePrice - b.effectivePrice);
  res.json({ ...p, offers, lowestPrice: offers[0]?.effectivePrice });
});

// Search history
app.post('/api/products/search-history', protect, async (req, res) => {
  if (req.body.query) {
    req.user.searches.unshift({ _id: newId(), query: req.body.query, at: new Date() });
    req.user.searches = req.user.searches.slice(0, 10);
  }
  res.json(req.user.searches);
});

// Users
app.get('/api/users/me', protect, (req, res) => {
  const wishlist = req.user.wishlist.map(id => db.products.find(p => p._id === id)).filter(Boolean);
  const alerts = req.user.alerts.map(a => ({ ...a, product: db.products.find(p => p._id === a.product) }));
  res.json({ ...req.user, wishlist, alerts });
});

app.post('/api/users/wishlist/:id', protect, (req, res) => {
  const id = req.params.id;
  const i = req.user.wishlist.indexOf(id);
  if (i >= 0) req.user.wishlist.splice(i, 1);
  else req.user.wishlist.push(id);
  res.json(req.user.wishlist);
});

app.post('/api/users/alerts', protect, (req, res) => {
  const { product, targetPrice } = req.body;
  if (!product || !targetPrice) return res.status(400).json({ message: 'Product and target price required' });
  const alert = { _id: newId(), product, targetPrice, active: true };
  req.user.alerts.push(alert);
  res.status(201).json(req.user.alerts);
});

app.delete('/api/users/alerts/:id', protect, (req, res) => {
  req.user.alerts = req.user.alerts.filter(a => a._id !== req.params.id);
  res.status(204).end();
});

// Recommendations
app.get('/api/recommendations/:id', (req, res) => {
  const p = db.products.find(p => p._id === req.params.id);
  if (!p) return res.status(404).json({ message: 'Product not found' });
  const prices = p.priceHistory.map(x => x.price);
  const current = Math.min(...p.offers.map(effective));
  const avg = prices.slice(-4).reduce((a, b) => a + b, 0) / Math.min(4, prices.length);
  res.json({
    predicted_price: Math.round(avg),
    recommendation: current <= avg ? 'BUY' : 'WAIT',
    confidence: 'in-memory forecast',
    current_price: current,
  });
});

// Admin
app.get('/api/admin/analytics', protect, adminOnly, (_, res) => {
  res.json({
    products: db.products.length,
    users: db.users.length,
    offers: db.products.reduce((n, p) => n + p.offers.length, 0),
    categories: [...new Set(db.products.map(p => p.category))],
    recent: db.products.slice(0, 5),
  });
});

app.post('/api/admin/products', protect, adminOnly, (req, res) => {
  const p = { _id: newId(), ...req.body, createdAt: new Date() };
  db.products.unshift(p);
  res.status(201).json(p);
});

app.put('/api/admin/products/:id', protect, adminOnly, (req, res) => {
  const i = db.products.findIndex(p => p._id === req.params.id);
  if (i < 0) return res.status(404).json({ message: 'Not found' });
  db.products[i] = { ...db.products[i], ...req.body };
  res.json(db.products[i]);
});

app.delete('/api/admin/products/:id', protect, adminOnly, (req, res) => {
  db.products = db.products.filter(p => p._id !== req.params.id);
  res.status(204).end();
});

app.post('/api/admin/mock-price-update', protect, adminOnly, (_, res) => {
  db.products.forEach(p => {
    p.offers.forEach(o => {
      o.price = Math.max(100, Math.round(o.price * (0.97 + Math.random() * 0.07)));
      o.updatedAt = new Date();
    });
    p.priceHistory.push({ _id: newId(), price: Math.min(...p.offers.map(effective)), date: new Date() });
    p.priceHistory = p.priceHistory.slice(-30);
  });
  res.json({ message: `Updated ${db.products.length} products with mock price data` });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`🚀 API running on http://localhost:${port}`));
