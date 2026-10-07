async function checkAuth() {
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
}