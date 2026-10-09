/* login.js — Account page */

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email    = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('login-error');
  errorMsg.textContent = '';

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (res.ok) {
      const user = await res.json();
      window.location.href = user.role === 'admin' ? '/admin.html' : '/';
    } else {
      const data = await res.json().catch(() => ({}));
      errorMsg.textContent = data.error || 'Invalid credentials.';
    }
  } catch (_) {
    errorMsg.textContent = 'Network error. Please try again.';
  }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name     = document.getElementById('reg-name').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errorMsg = document.getElementById('reg-error');
  const successMsg = document.getElementById('reg-success');
  errorMsg.textContent   = '';
  successMsg.textContent = '';

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    if (res.ok) {
      successMsg.textContent = 'Account created. Redirecting…';
      setTimeout(() => (window.location.href = '/'), 1200);
    } else {
      const data = await res.json().catch(() => ({}));
      errorMsg.textContent = data.error || 'Registration failed.';
    }
  } catch (_) {
    errorMsg.textContent = 'Network error. Please try again.';
  }
});