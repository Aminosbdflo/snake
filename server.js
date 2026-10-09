const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
require('dotenv').config();

const authRoutes    = require('./routes/auth');
const productRoutes = require('./routes/products');
const uploadRoutes  = require('./routes/upload');

const app = express();

app.use(express.json());
app.use(cookieParser());

// Serve static files (HTML, CSS, JS, uploaded images)
app.use(express.static(path.join(__dirname, 'public')));

// API routes
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload',   uploadRoutes);

// 404 fallback for API routes
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Catch-all: serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✦ LUXE server running → http://localhost:${PORT}`));