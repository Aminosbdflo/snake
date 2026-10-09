/* product.js — Luxury product detail page */

function escapeHTML(str) {
  return str
    ? String(str).replace(/[&<>'"]/g, t =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t] || t))
    : '';
}

async function loadProduct() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  const container = document.getElementById('product-details');

  if (!id) {
    container.innerHTML = `<p style="text-align:center; padding:4rem; color:var(--text-muted); letter-spacing:0.2em;">Invalid product.</p>`;
    return;
  }

  try {
    const res = await fetch(`/api/products/${encodeURIComponent(id)}`);
    if (!res.ok) throw new Error('Not found');
    const p = await res.json();

    // Update breadcrumb
    const bc = document.getElementById('breadcrumb-name');
    if (bc) bc.textContent = p.name;

    // Update page title
    document.title = `LUXE — ${p.name}`;

    const imgSrc = escapeHTML(p.image_url) || 'https://via.placeholder.com/600x600/1a1a1a/c9a84c?text=LUXE';
    const stockText = p.stock > 0
      ? `<span style="color:var(--success, #52c46a);">${p.stock} available</span>`
      : `<span style="color:var(--danger, #e05252);">Out of stock</span>`;

    container.innerHTML = `
      <div class="product-detail">
        <div class="product-detail-image">
          <img src="${imgSrc}" alt="${escapeHTML(p.name)}">
        </div>
        <div class="product-detail-info">
          <p class="card-category">${escapeHTML(p.category) || 'Collection'}</p>
          <h1>${escapeHTML(p.name)}</h1>
          <div class="product-detail-rule"></div>
          <p class="product-detail-price">$${parseFloat(p.price).toFixed(2)}</p>
          <p class="product-detail-desc">${escapeHTML(p.description) || 'No description available.'}</p>
          <p class="product-detail-meta">
            Availability: <span>${stockText}</span>
          </p>
          <a href="/" class="btn-outline" style="display:inline-block;">← Back to Collection</a>
        </div>
      </div>
    `;
  } catch (err) {
    container.innerHTML = `
      <div style="text-align:center; padding:6rem 2rem;">
        <p style="font-size:0.7rem; letter-spacing:0.3em; color:var(--text-muted);">PRODUCT NOT FOUND</p>
        <a href="/" style="color:var(--gold); font-size:0.65rem; letter-spacing:0.2em; margin-top:2rem; display:block;">← Return to Collection</a>
      </div>`;
  }
}

loadProduct();