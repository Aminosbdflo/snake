import os

base = r"c:\Users\amino\mysite\monsite"

files = {
    "package.json": """{
  "name": "monsite",
  "version": "1.0.0",
  "description": "E-commerce site",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "bcrypt": "^5.1.1",
    "cookie-parser": "^1.4.6",
    "dotenv": "^16.4.1",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.11.3"
  },
  "devDependencies": {
    "nodemon": "^3.0.3"
  }
}""",
    ".env.example": """PORT=3000
DATABASE_URL=postgres://postgres:password@localhost:5432/monsite
JWT_SECRET=supersecretjwtkey
""",
    "schema.sql": """DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    category VARCHAR(100),
    image_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- admin user with password 'Admin123!' (hashed with bcrypt 10 rounds)
INSERT INTO users (name, email, password_hash, role) VALUES
('Admin', 'admin@site.com', '$2b$10$Wp23pT/gT/hK5XwWpG.4/.N9950bZ4pS6Q/8Qx2Z7L7b7U9M/9i.a', 'admin');

-- sample products
INSERT INTO products (name, description, price, stock, category, image_url) VALUES
('Laptop', 'High performance laptop', 999.99, 10, 'Electronics', 'https://via.placeholder.com/300x200?text=Laptop'),
('Smartphone', 'Latest smartphone model', 699.99, 15, 'Electronics', 'https://via.placeholder.com/300x200?text=Smartphone'),
('Headphones', 'Noise-cancelling headphones', 199.99, 20, 'Accessories', 'https://via.placeholder.com/300x200?text=Headphones'),
('Keyboard', 'Mechanical keyboard', 89.99, 30, 'Accessories', 'https://via.placeholder.com/300x200?text=Keyboard'),
('Mouse', 'Wireless gaming mouse', 59.99, 25, 'Accessories', 'https://via.placeholder.com/300x200?text=Mouse'),
('Monitor', '4K UHD Monitor', 349.99, 12, 'Electronics', 'https://via.placeholder.com/300x200?text=Monitor'),
('Desk Chair', 'Ergonomic office chair', 149.99, 8, 'Furniture', 'https://via.placeholder.com/300x200?text=Chair'),
('Desk', 'Standing desk', 299.99, 5, 'Furniture', 'https://via.placeholder.com/300x200?text=Desk');""",
    "db.js": """const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};""",
    "server.js": """const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));""",
    "routes/auth.js": """const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticate } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });
  
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = rows[0];
    
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production' });
    res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const { rows } = await db.query('SELECT id, name, email, role FROM users WHERE id = $1', [req.user.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;""",
    "middleware/auth.js": """const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
}

module.exports = { authenticate, requireAdmin };""",
    "routes/products.js": """const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', async (req, res) => {
  const { search, category } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  let params = [];
  
  if (category) {
    params.push(category);
    query += ` AND category = $${params.length}`;
  }
  
  if (search) {
    params.push(`%${search}%`);
    query += ` AND name ILIKE $${params.length}`;
  }
  
  query += ' ORDER BY created_at DESC';
  
  try {
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, description, price, stock, category, image_url } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'Missing fields' });
  
  try {
    const { rows } = await db.query(
      'INSERT INTO products (name, description, price, stock, category, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, description, price, stock || 0, category, image_url]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const { name, description, price, stock, category, image_url } = req.body;
  
  try {
    const { rows } = await db.query(
      'UPDATE products SET name = $1, description = $2, price = $3, stock = $4, category = $5, image_url = $6 WHERE id = $7 RETURNING *',
      [name, description, price, stock, category, image_url, req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM products WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;""",
    "public/css/style.css": """* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, sans-serif; background: #f4f4f9; color: #333; }
nav { background: #333; color: #fff; padding: 1rem; display: flex; justify-content: space-between; align-items: center; }
nav a { color: #fff; text-decoration: none; margin-left: 1rem; }
.hero { text-align: center; padding: 3rem 1rem; background: #e2e2e2; }
.hero button { padding: 0.5rem 1rem; margin-top: 1rem; cursor: pointer; background: #007bff; color: white; border: none; border-radius: 4px; }
.container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
.products { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; }
.card { background: #fff; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); text-align: center; }
.card img { max-width: 100%; height: auto; border-radius: 4px; }
.card h3 { margin: 1rem 0 0.5rem; }
.card p { color: #666; margin-bottom: 1rem; }
.card button { padding: 0.5rem; width: 100%; background: #007bff; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.card button:hover { background: #0056b3; }
form { background: #fff; padding: 2rem; border-radius: 8px; max-width: 400px; margin: 2rem auto; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
form div { margin-bottom: 1rem; }
form label { display: block; margin-bottom: 0.5rem; }
form input { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; }
form button { width: 100%; padding: 0.75rem; background: #28a745; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
.error { color: red; font-size: 0.9rem; margin-top: 0.5rem; }
.filters { margin-bottom: 2rem; display: flex; gap: 1rem; }
.filters input, .filters select { padding: 0.5rem; }
.hidden { display: none !important; }
""",
    "public/css/admin.css": """body { display: flex; margin: 0; font-family: Arial, sans-serif; background: #f4f4f9; }
.sidebar { width: 250px; background: #333; color: #fff; min-height: 100vh; padding: 1rem; }
.sidebar a { display: block; color: #fff; text-decoration: none; margin-bottom: 1rem; }
.main { flex: 1; padding: 2rem; }
.stats { display: flex; gap: 1rem; margin-bottom: 2rem; }
.stat-card { background: #fff; padding: 1.5rem; flex: 1; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); text-align: center; }
table { width: 100%; border-collapse: collapse; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #ddd; }
th { background: #f8f9fa; }
.actions button { padding: 0.25rem 0.5rem; margin-right: 0.5rem; cursor: pointer; }
.modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; }
.modal-content { background: #fff; padding: 2rem; border-radius: 8px; width: 400px; max-width: 90%; }
.close { float: right; cursor: pointer; font-size: 1.2rem; }
.toast { position: fixed; bottom: 20px; right: 20px; background: #333; color: #fff; padding: 1rem; border-radius: 4px; display: none; }
""",
    "public/index.html": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shop - Home</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <nav>
    <div class="logo">MySite</div>
    <div>
      <a href="/">Home</a>
      <a href="/login.html" id="login-link">Login</a>
      <a href="#" id="logout-link" class="hidden">Logout</a>
      <a href="/admin.html" id="admin-link" class="hidden">Dashboard</a>
    </div>
  </nav>

  <div class="hero">
    <h1>Welcome to MySite</h1>
    <p>Discover the best products at unbeatable prices.</p>
    <button onclick="document.getElementById('products').scrollIntoView()">Shop Now</button>
  </div>

  <div class="container">
    <div class="filters">
      <input type="text" id="search" placeholder="Search products...">
      <select id="category">
        <option value="">All Categories</option>
        <option value="Electronics">Electronics</option>
        <option value="Accessories">Accessories</option>
        <option value="Furniture">Furniture</option>
      </select>
    </div>
    <div class="products" id="products"></div>
  </div>

  <script src="/js/main.js"></script>
</body>
</html>""",
    "public/product.html": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Product Details</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <nav>
    <div class="logo">MySite</div>
    <div>
      <a href="/">Home</a>
    </div>
  </nav>
  <div class="container" id="product-details">
    <p>Loading...</p>
  </div>
  <script src="/js/product.js"></script>
</body>
</html>""",
    "public/login.html": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login</title>
  <link rel="stylesheet" href="/css/style.css">
</head>
<body>
  <nav>
    <div class="logo">MySite</div>
    <div><a href="/">Home</a></div>
  </nav>
  <form id="login-form">
    <h2>Login</h2>
    <div>
      <label>Email</label>
      <input type="email" id="email" required>
    </div>
    <div>
      <label>Password</label>
      <input type="password" id="password" required>
    </div>
    <button type="submit">Login</button>
    <div id="error-msg" class="error"></div>
  </form>
  <script src="/js/login.js"></script>
</body>
</html>""",
    "public/admin.html": """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Dashboard</title>
  <link rel="stylesheet" href="/css/admin.css">
</head>
<body>
  <div class="sidebar">
    <h2>Admin</h2>
    <a href="/">Home</a>
    <a href="#" id="logout-btn">Logout</a>
  </div>
  <div class="main">
    <h1>Dashboard</h1>
    <div class="stats">
      <div class="stat-card"><h3>Total Products</h3><p id="stat-products">0</p></div>
    </div>
    
    <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
      <input type="text" id="admin-search" placeholder="Search..." style="padding:0.5rem;">
      <button id="add-btn" style="padding:0.5rem 1rem;">Add Product</button>
    </div>
    
    <table>
      <thead>
        <tr>
          <th>Image</th>
          <th>Name</th>
          <th>Category</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="admin-products"></tbody>
    </table>
  </div>

  <div id="modal" class="modal" style="display:none;">
    <div class="modal-content">
      <span class="close" id="close-modal">&times;</span>
      <h2 id="modal-title">Add Product</h2>
      <form id="product-form" style="box-shadow:none; padding:0; margin:0;">
        <input type="hidden" id="prod-id">
        <div><label>Name</label><input type="text" id="prod-name" required></div>
        <div><label>Description</label><input type="text" id="prod-desc"></div>
        <div><label>Price</label><input type="number" step="0.01" id="prod-price" required></div>
        <div><label>Stock</label><input type="number" id="prod-stock" required></div>
        <div><label>Category</label><input type="text" id="prod-cat"></div>
        <div><label>Image URL</label><input type="text" id="prod-img"></div>
        <button type="submit">Save</button>
      </form>
    </div>
  </div>

  <div id="toast" class="toast"></div>

  <script src="/js/admin.js"></script>
</body>
</html>""",
    "public/js/main.js": """async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const user = await res.json();
      document.getElementById('login-link').classList.add('hidden');
      document.getElementById('logout-link').classList.remove('hidden');
      if (user.role === 'admin') {
        document.getElementById('admin-link').classList.remove('hidden');
      }
    }
  } catch (err) {}
}

document.getElementById('logout-link')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/auth/logout', { method: 'POST' });
  location.reload();
});

function escapeHTML(str) {
  return str ? String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag)) : '';
}

async function loadProducts() {
  const search = document.getElementById('search').value;
  const category = document.getElementById('category').value;
  let url = '/api/products?';
  if (search) url += `search=${encodeURIComponent(search)}&`;
  if (category) url += `category=${encodeURIComponent(category)}`;
  
  const res = await fetch(url);
  const products = await res.json();
  const container = document.getElementById('products');
  
  container.innerHTML = products.map(p => `
    <div class="card">
      <img src="${escapeHTML(p.image_url)}" alt="${escapeHTML(p.name)}">
      <h3>${escapeHTML(p.name)}</h3>
      <p>$${p.price}</p>
      <button onclick="location.href='/product.html?id=${p.id}'">View Details</button>
    </div>
  `).join('');
}

document.getElementById('search')?.addEventListener('input', loadProducts);
document.getElementById('category')?.addEventListener('change', loadProducts);

if (document.getElementById('products')) {
  checkAuth();
  loadProducts();
}""",
    "public/js/product.js": """function escapeHTML(str) {
  return str ? String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag)) : '';
}

async function loadProduct() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  const container = document.getElementById('product-details');
  
  if (!id) {
    container.innerHTML = '<h2>Product not found</h2><button onclick="location.href=\\'/\\'">Back to products</button>';
    return;
  }
  
  try {
    const res = await fetch(`/api/products/${id}`);
    if (!res.ok) throw new Error('Not found');
    const p = await res.json();
    
    container.innerHTML = `
      <div style="display:flex; gap:2rem; background:#fff; padding:2rem; border-radius:8px;">
        <img src="${escapeHTML(p.image_url)}" alt="${escapeHTML(p.name)}" style="max-width:400px; border-radius:8px;">
        <div>
          <h2>${escapeHTML(p.name)}</h2>
          <p style="color:#888;">${escapeHTML(p.category)}</p>
          <h3 style="margin:1rem 0; color:#28a745;">$${p.price}</h3>
          <p>${escapeHTML(p.description)}</p>
          <p style="margin-top:1rem; font-weight:bold; color:${p.stock > 0 ? 'green' : 'red'};">
            ${p.stock > 0 ? `In Stock (${p.stock})` : 'Out of Stock'}
          </p>
          <button style="margin-top:2rem; padding:0.5rem 1rem; cursor:pointer;" onclick="location.href='/'">Back to products</button>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = '<h2>Product not found</h2><button onclick="location.href=\\'/\\'">Back to products</button>';
  }
}

loadProduct();""",
    "public/js/login.js": """document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('error-msg');
  
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    if (res.ok) {
      const user = await res.json();
      window.location.href = user.role === 'admin' ? '/admin.html' : '/';
    } else {
      const data = await res.json();
      errorMsg.textContent = data.error || 'Login failed';
    }
  } catch (err) {
    errorMsg.textContent = 'Network error';
  }
});""",
    "public/js/admin.js": """function escapeHTML(str) {
  return str ? String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag)) : '';
}

function showToast(msg, isError=false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.background = isError ? 'red' : '#28a745';
  toast.style.display = 'block';
  setTimeout(() => toast.style.display = 'none', 3000);
}

async function checkAdmin() {
  const res = await fetch('/api/auth/me');
  if (!res.ok) return window.location.href = '/login.html';
  const user = await res.json();
  if (user.role !== 'admin') window.location.href = '/';
}

async function loadProducts() {
  const search = document.getElementById('admin-search').value;
  const res = await fetch(`/api/products${search ? '?search='+encodeURIComponent(search) : ''}`);
  const products = await res.json();
  
  document.getElementById('stat-products').textContent = products.length;
  
  const tbody = document.getElementById('admin-products');
  tbody.innerHTML = products.map(p => `
    <tr>
      <td><img src="${escapeHTML(p.image_url)}" width="50"></td>
      <td>${escapeHTML(p.name)}</td>
      <td>${escapeHTML(p.category)}</td>
      <td>$${p.price}</td>
      <td>${p.stock}</td>
      <td class="actions">
        <button onclick='editProduct(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Edit</button>
        <button onclick="deleteProduct(${p.id})">Delete</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('admin-search').addEventListener('input', loadProducts);

const modal = document.getElementById('modal');
document.getElementById('add-btn').onclick = () => {
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('modal-title').textContent = 'Add Product';
  modal.style.display = 'flex';
};
document.getElementById('close-modal').onclick = () => modal.style.display = 'none';

function editProduct(p) {
  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-name').value = p.name;
  document.getElementById('prod-desc').value = p.description || '';
  document.getElementById('prod-price').value = p.price;
  document.getElementById('prod-stock').value = p.stock;
  document.getElementById('prod-cat').value = p.category || '';
  document.getElementById('prod-img').value = p.image_url || '';
  document.getElementById('modal-title').textContent = 'Edit Product';
  modal.style.display = 'flex';
}

async function deleteProduct(id) {
  if (!confirm('Are you sure?')) return;
  const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
  if (res.ok) {
    showToast('Product deleted');
    loadProducts();
  } else showToast('Error deleting', true);
}

document.getElementById('product-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('prod-id').value;
  const method = id ? 'PUT' : 'POST';
  const url = id ? `/api/products/${id}` : '/api/products';
  
  const body = JSON.stringify({
    name: document.getElementById('prod-name').value,
    description: document.getElementById('prod-desc').value,
    price: parseFloat(document.getElementById('prod-price').value),
    stock: parseInt(document.getElementById('prod-stock').value),
    category: document.getElementById('prod-cat').value,
    image_url: document.getElementById('prod-img').value,
  });
  
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body
  });
  
  if (res.ok) {
    modal.style.display = 'none';
    showToast('Product saved');
    loadProducts();
  } else {
    showToast('Error saving', true);
  }
});

document.getElementById('logout-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

checkAdmin().then(loadProducts);"""
}

for rel_path, content in files.items():
    full_path = os.path.join(base, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content)

