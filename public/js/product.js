function escapeHTML(str) {
  return str ? String(str).replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag)) : '';
}

async function loadProduct() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get('id');
  const container = document.getElementById('product-details');
  
  if (!id) {
    container.innerHTML = '<h2>Product not found</h2><button onclick="location.href=\'/\'">Back to products</button>';
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
    container.innerHTML = '<h2>Product not found</h2><button onclick="location.href=\'/\'">Back to products</button>';
  }
}

loadProduct();