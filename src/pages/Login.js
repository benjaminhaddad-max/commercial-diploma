import { signIn } from '../auth.js';
import { navigate } from '../router.js';

export default async function LoginPage(app) {
  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-logo">
          <div class="logo-icon">D</div>
          <div>
            <div style="font-weight:700;font-size:1.125rem;">Diploma Santé</div>
            <div style="font-size:0.75rem;color:var(--text-muted);">Dashboard Commercial</div>
          </div>
        </div>
        <h1>Connexion</h1>
        <p class="login-subtitle">Accédez au tableau de bord de votre équipe</p>
        <div class="login-error" id="loginError"></div>
        <form class="login-form" id="loginForm">
          <div class="form-group">
            <label for="email">Email</label>
            <input type="email" id="email" class="input" placeholder="votre@email.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label for="password">Mot de passe</label>
            <input type="password" id="password" class="input" placeholder="Votre mot de passe" required autocomplete="current-password" />
          </div>
          <button type="submit" class="btn btn-primary" id="loginBtn">
            Se connecter
          </button>
        </form>
      </div>
    </div>
  `;

  const form = document.getElementById('loginForm');
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    btn.disabled = true;
    btn.textContent = 'Connexion...';
    errorEl.classList.remove('visible');

    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      errorEl.textContent = err.message === 'Invalid login credentials'
        ? 'Email ou mot de passe incorrect'
        : err.message;
      errorEl.classList.add('visible');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Se connecter';
    }
  });
}
