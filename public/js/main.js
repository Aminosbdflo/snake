/* main.js — Luxury storefront */

function escapeHTML(str) {
  return str
    ? String(str).replace(/[&<>'"]/g, t =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t))
    : '';
}

/* ── Auth state ── */
async function checkAuth() {
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) return;
    const user = await res.json();
    document.getElementById('login-link')?.classList.add('hidden');
    document.getElementById('logout-link')?.classList.remove('hidden');
    if (user.role === 'admin') {
      document.getElementById('admin-link')?.classList.remove('hidden');
    }
  } catch (_) {}
}

document.getElementById('logout-link')?.addEventListener('click', async e => {
  e.preventDefault();
  await fetch('/api/auth/logout', { method: 'POST' });
  location.reload();
});

/* ── Product card rendering ── */
function renderCard(p) {
  const imgSrc = escapeHTML(p.image_url) || 'https://via.placeholder.com/400x300/1a1a1a/c9a84c?text=LUXE';
  return `
    <div class="card reveal" onclick="location.href='/product.html?id=${p.id}'">
      <div class="card-image-wrap">
        <img src="${imgSrc}" alt="${escapeHTML(p.name)}" loading="lazy">
        <div class="card-overlay">
          <button class="btn-outline">View Details</button>
        </div>
      </div>
      <div class="card-body">
        <p class="card-category">${escapeHTML(p.category) || 'Collection'}</p>
        <h3>${escapeHTML(p.name)}</h3>
        <p class="card-price">$${parseFloat(p.price).toFixed(2)}</p>
        <p class="card-stock">${p.stock > 0 ? p.stock + ' in stock' : 'Out of stock'}</p>
      </div>
    </div>`;
}

/* ── Load & filter products ── */
async function loadProducts() {
  const search = document.getElementById('search')?.value || '';
  const category = document.getElementById('category')?.value || '';

  let url = '/api/products?';
  if (search)   url += `search=${encodeURIComponent(search)}&`;
  if (category) url += `category=${encodeURIComponent(category)}`;

  const container = document.getElementById('products');
  if (!container) return;

  try {
    const res = await fetch(url);
    const products = await res.json();

    if (products.length === 0) {
      container.innerHTML = `
        <div style="grid-column:1/-1; text-align:center; padding:4rem 0;">
          <p style="font-size:0.7rem; letter-spacing:0.3em; color:var(--text-muted);">
            NO PRODUCTS FOUND
          </p>
        </div>`;
      return;
    }

    container.innerHTML = products.map(renderCard).join('');
    observeReveal();
  } catch (err) {
    container.innerHTML = `<p style="color:var(--text-muted); padding:2rem;">Error loading products.</p>`;
  }
}

/* ── Scroll-reveal observer ── */
function observeReveal() {
  const els = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => io.observe(el));
}

/* ── Event listeners ── */
document.getElementById('search')?.addEventListener('input', loadProducts);
document.getElementById('category')?.addEventListener('change', loadProducts);

/* ── Init ── */
if (document.getElementById('products')) {
  checkAuth();
  loadProducts();
  observeReveal();   // for static reveal elements
}