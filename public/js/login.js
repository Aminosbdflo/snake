document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorMsg = document.getElementById('login-error');
  
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
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;
  const errorMsg = document.getElementById('reg-error');
  
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    
    if (res.ok) {
      window.location.href = '/';
    } else {
      const data = await res.json();
      errorMsg.textContent = data.error || 'Registration failed';
    }
  } catch (err) {
    errorMsg.textContent = 'Network error';
  }
});