function escapeHTML(str) {
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

checkAdmin().then(loadProducts);