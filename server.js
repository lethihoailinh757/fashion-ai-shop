const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 10000;
const PUBLIC_URL = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || '';

const dataDir = path.join(__dirname, 'data');
const productsFile = path.join(dataDir, 'products.json');
const ordersFile = path.join(dataDir, 'orders.json');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    return fallback;
  }
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

function vnd(n) {
  return new Intl.NumberFormat('vi-VN').format(n) + 'đ';
}

function publicProductUrl(productId) {
  return `${PUBLIC_URL}/product.html?id=${encodeURIComponent(productId)}`;
}

app.get('/api/products', (req, res) => {
  const products = readJson(productsFile, []);
  const { q = '', category = '', min = '', max = '', sort = '' } = req.query;
  let result = [...products];
  if (q.trim()) {
    const key = q.toLowerCase();
    result = result.filter(p => `${p.name} ${p.brand} ${p.category} ${p.material} ${p.tags.join(' ')}`.toLowerCase().includes(key));
  }
  if (category) result = result.filter(p => p.category === category);
  if (min) result = result.filter(p => p.price >= Number(min));
  if (max) result = result.filter(p => p.price <= Number(max));
  if (sort === 'price-asc') result.sort((a,b) => a.price - b.price);
  if (sort === 'price-desc') result.sort((a,b) => b.price - a.price);
  if (sort === 'rating') result.sort((a,b) => b.rating - a.rating);
  if (sort === 'new') result.sort((a,b) => b.id.localeCompare(a.id));
  res.json(result);
});

app.get('/api/products/:id', (req, res) => {
  const products = readJson(productsFile, []);
  const product = products.find(p => p.id === req.params.id);
  if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });
  const similar = products
    .filter(p => p.id !== product.id && (p.category === product.category || p.gender === product.gender))
    .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price))
    .slice(0, 4);
  res.json({ ...product, productUrl: publicProductUrl(product.id), similar });
});

app.post('/api/ai/ask', async (req, res) => {
  const { productId, question = '', profile = {} } = req.body;
  const products = readJson(productsFile, []);
  const product = products.find(p => p.id === productId);
  if (!product) return res.status(404).json({ message: 'Không tìm thấy sản phẩm' });

  const payload = {
    question,
    profile,
    product,
    productUrl: publicProductUrl(product.id),
    instruction: 'Bạn là AI tư vấn bán quần áo. Trả lời tiếng Việt, thân thiện, tập trung vào đúng sản phẩm, gợi ý size, chất liệu, phối đồ, ưu đãi, cách mua online và luôn kèm link sản phẩm.'
  };

  if (N8N_WEBHOOK_URL) {
    try {
      const n8nRes = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await n8nRes.text();
      let parsed;
      try { parsed = JSON.parse(text); } catch { parsed = { answer: text }; }
      const answer = parsed.answer || parsed.output || parsed.message || text;
      return res.json({ answer: `${answer}\n\nLink sản phẩm: ${payload.productUrl}`, source: 'n8n' });
    } catch (err) {
      console.error('N8N error:', err.message);
    }
  }

  const name = profile.fullName ? ` ${profile.fullName}` : '';
  const sizeHint = profile.size ? ` Với size thường mặc là ${profile.size}, bạn nên kiểm tra bảng size và chọn theo số đo vai/ngực/eo.` : ' Bạn có thể chọn size theo bảng size trong phần mô tả sản phẩm.';
  const answer = `Chào${name}! Mình đang tư vấn đúng sản phẩm “${product.name}”. Sản phẩm này thuộc nhóm ${product.category.toLowerCase()}, chất liệu ${product.material}, form ${product.fit}, phù hợp để ${product.occasion.toLowerCase()}. Giá hiện tại là ${vnd(product.price)} và đang có ưu đãi ${product.promotion}. ${sizeHint}\n\nĐiểm nên mua: ${product.highlights.join('; ')}. Bạn có thể thêm vào giỏ hàng, điền thông tin nhận hàng, chọn COD hoặc chuyển khoản, sau đó admin sẽ xác nhận đơn.\n\nLink sản phẩm: ${payload.productUrl}`;
  res.json({ answer, source: 'local-fallback' });
});

app.post('/api/orders', (req, res) => {
  const { customer, items, paymentMethod, shippingMethod, note } = req.body;
  if (!customer?.fullName || !customer?.phone || !customer?.address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Thiếu thông tin đặt hàng' });
  }
  const products = readJson(productsFile, []);
  const detailedItems = items.map(item => {
    const p = products.find(x => x.id === item.productId);
    if (!p) return null;
    return {
      productId: p.id,
      name: p.name,
      size: item.size || 'M',
      color: item.color || p.colors[0],
      quantity: Math.max(1, Number(item.quantity || 1)),
      price: p.price
    };
  }).filter(Boolean);
  const subtotal = detailedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = subtotal >= 800000 ? 0 : 30000;
  const discount = subtotal >= 1200000 ? 100000 : 0;
  const total = subtotal + shippingFee - discount;
  const orders = readJson(ordersFile, []);
  const order = {
    id: 'OD' + Date.now(),
    createdAt: new Date().toISOString(),
    customer,
    items: detailedItems,
    subtotal,
    shippingFee,
    discount,
    total,
    paymentMethod: paymentMethod || 'COD',
    shippingMethod: shippingMethod || 'Giao hàng tiêu chuẩn',
    note: note || '',
    status: 'Mới đặt'
  };
  orders.unshift(order);
  writeJson(ordersFile, orders);
  res.status(201).json(order);
});

function checkAdmin(req, res, next) {
  const pass = req.headers['x-admin-password'];
  if (pass !== ADMIN_PASSWORD) return res.status(401).json({ message: 'Sai mật khẩu admin' });
  next();
}

app.get('/api/admin/orders', checkAdmin, (req, res) => {
  res.json(readJson(ordersFile, []));
});

app.patch('/api/admin/orders/:id', checkAdmin, (req, res) => {
  const orders = readJson(ordersFile, []);
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn' });
  const allowed = ['Mới đặt', 'Đã xác nhận', 'Đang giao', 'Hoàn thành', 'Đã hủy'];
  if (allowed.includes(req.body.status)) order.status = req.body.status;
  order.adminNote = req.body.adminNote ?? order.adminNote ?? '';
  order.updatedAt = new Date().toISOString();
  writeJson(ordersFile, orders);
  res.json(order);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Fashion AI Shop running on port ${PORT}`);
});
