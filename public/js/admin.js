/* admin.js — Luxury Admin Panel */

function escapeHTML(str) {
  return str
    ? String(str).replace(/[&<>'"]/g, t =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t))
    : '';
}

/* ── Toast ── */
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = isError ? 'error' : '';
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3500);
}

/* ── Auth gate — redirect if not admin ── */
async function checkAdmin() {
  const res = await fetch('/api/auth/me');
  if (!res.ok) return (window.location.href = '/login.html');
  const user = await res.json();
  if (user.role !== 'admin') return (window.location.href = '/');
  const nameEl = document.getElementById('admin-name');
  if (nameEl) nameEl.textContent = user.name;
}

/* ── Load products into table ── */
async function loadProducts() {
  const search = document.getElementById('admin-search').value;
  const url = `/api/products${search ? '?search=' + encodeURIComponent(search) : ''}`;
  const res = await fetch(url);
  const products = await res.json();

  // Stats
  const total = products.length;
  const stock = products.reduce((s, p) => s + (parseInt(p.stock) || 0), 0);
  const value = products.reduce((s, p) => s + (parseFloat(p.price) || 0) * (parseInt(p.stock) || 0), 0);
  document.getElementById('stat-products').textContent = total;
  document.getElementById('stat-stock').textContent = stock;
  document.getElementById('stat-value').textContent = value.toLocaleString('en-US', { maximumFractionDigits: 0 });

  const tbody = document.getElementById('admin-products');
  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); letter-spacing:0.3em; font-size:0.65rem; padding:2rem;">NO PRODUCTS</td></tr>`;
    return;
  }

  tbody.innerHTML = products.map(p => {
    const img = escapeHTML(p.image_url) || 'https://via.placeholder.com/48/1a1a1a/c9a84c?text=L';
    return `
      <tr>
        <td class="td-image"><img src="${img}" alt="${escapeHTML(p.name)}"></td>
        <td class="td-name">${escapeHTML(p.name)}</td>
        <td class="td-category">${escapeHTML(p.category) || '—'}</td>
        <td class="td-price">$${parseFloat(p.price).toFixed(2)}</td>
        <td>${escapeHTML(String(p.stock))}</td>
        <td class="td-actions">
          <button class="btn btn-edit" onclick='openEdit(${JSON.stringify(p).replace(/'/g, "&#39;")})'>Edit</button>
          <button class="btn btn-danger" onclick="deleteProduct(${p.id})">Delete</button>
        </td>
      </tr>`;
  }).join('');
}

/* ── Modal open/close ── */
const modal = document.getElementById('modal');

function openModal(title) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('product-form').reset();
  document.getElementById('prod-id').value = '';
  document.getElementById('image-preview').style.display = 'none';
  modal.style.display = 'flex';
}

function closeModal() {
  modal.style.display = 'none';
}

document.getElementById('add-btn').onclick = () => openModal('Add Product');
document.getElementById('close-modal').onclick = closeModal;
document.getElementById('cancel-btn').onclick = closeModal;
modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

/* ── Populate modal for edit ── */
function openEdit(p) {
  document.getElementById('modal-title').textContent = 'Edit Product';
  document.getElementById('prod-id').value = p.id;
  document.getElementById('prod-name').value = p.name || '';
  document.getElementById('prod-desc').value = p.description || '';
  document.getElementById('prod-price').value = p.price || '';
  document.getElementById('prod-stock').value = p.stock || 0;
  document.getElementById('prod-cat').value = p.category || '';
  document.getElementById('prod-img').value = p.image_url || '';

  const preview = document.getElementById('image-preview');
  if (p.image_url) {
    preview.src = p.image_url;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }

  modal.style.display = 'flex';
}

/* ── Image file preview ── */
document.getElementById('prod-image-file').addEventListener('change', function () {
  const file = this.files[0];
  if (!file) return;

  // Client-side size check (5 MB)
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image must be under 5 MB.', true);
    this.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('image-preview');
    preview.src = e.target.result;
    preview.style.display = 'block';
    // Clear manual URL when file chosen
    document.getElementById('prod-img').value = '';
  };
  reader.readAsDataURL(file);
});

/* ── Save product (create / update) ── */
document.getElementById('save-btn').addEventListener('click', async () => {
  const id        = document.getElementById('prod-id').value;
  const name      = document.getElementById('prod-name').value.trim();
  const desc      = document.getElementById('prod-desc').value.trim();
  const price     = parseFloat(document.getElementById('prod-price').value);
  const stock     = parseInt(document.getElementById('prod-stock').value);
  const category  = document.getElementById('prod-cat').value;
  const imgUrl    = document.getElementById('prod-img').value.trim();
  const fileInput = document.getElementById('prod-image-file');

  if (!name || isNaN(price)) {
    showToast('Name and price are required.', true);
    return;
  }

  let uploadedUrl = imgUrl;

  // Upload file first if chosen
  if (fileInput.files[0]) {
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    try {
      const upRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!upRes.ok) throw new Error('Upload failed');
      const upData = await upRes.json();
      uploadedUrl = upData.url;
    } catch (err) {
      showToast('Image upload failed.', true);
      return;
    }
  }

  const body = JSON.stringify({ name, description: desc, price, stock: stock || 0, category, image_url: uploadedUrl });
  const method = id ? 'PUT' : 'POST';
  const url    = id ? `/api/products/${id}` : '/api/products';

  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body });
  if (res.ok) {
    closeModal();
    showToast(id ? 'Product updated.' : 'Product added.');
    loadProducts();
  } else {
    const data = await res.json().catch(() => ({}));
    showToast(data.error || 'Error saving product.', true);
  }
});

/* ── Delete product ── */
async function deleteProduct(id) {
  if (!confirm('Permanently delete this product?')) return;
  const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
  if (res.ok) {
    showToast('Product deleted.');
    loadProducts();
  } else {
    showToast('Error deleting product.', true);
  }
}

/* ── Search ── */
document.getElementById('admin-search').addEventListener('input', loadProducts);

/* ── Logout ── */
document.getElementById('logout-btn').addEventListener('click', async e => {
  e.preventDefault();
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login.html';
});

/* ── URL preview sync ── */
document.getElementById('prod-img').addEventListener('input', function () {
  const preview = document.getElementById('image-preview');
  if (this.value) {
    preview.src = this.value;
    preview.style.display = 'block';
  } else {
    preview.style.display = 'none';
  }
});

/* ── Init ── */
checkAdmin().then(loadProducts);