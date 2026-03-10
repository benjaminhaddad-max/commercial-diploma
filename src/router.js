/**
 * Simple hash-based SPA router
 */

const routes = {};
let currentCleanup = null;

/** Register a route */
export function route(path, handler) {
  routes[path] = handler;
}

/** Navigate to a path */
export function navigate(path) {
  window.location.hash = '#' + path;
}

/** Get current route path (strips query params from hash) */
export function currentPath() {
  const hash = window.location.hash.slice(1) || '/';
  return hash.split('?')[0];
}

/** Start the router */
export function startRouter() {
  async function handleRoute() {
    const path = currentPath();
    const app = document.getElementById('app');

    // Cleanup previous page
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }

    // Find matching route (exact or pattern)
    let handler = routes[path];
    let params = {};

    if (!handler) {
      // Try pattern matching (e.g., /agent/:id)
      for (const [pattern, h] of Object.entries(routes)) {
        const regex = patternToRegex(pattern);
        const match = path.match(regex);
        if (match) {
          handler = h;
          params = extractParams(pattern, match);
          break;
        }
      }
    }

    if (!handler) {
      app.innerHTML = `
        <div class="error-page">
          <h1>404</h1>
          <p>Page non trouvée</p>
          <a href="#/" class="btn btn-primary">Retour au dashboard</a>
        </div>`;
      return;
    }

    // Add page transition
    app.classList.remove('page-active');
    app.classList.add('page-enter');

    const cleanup = await handler(app, params);
    currentCleanup = cleanup || null;

    // Trigger transition
    requestAnimationFrame(() => {
      app.classList.remove('page-enter');
      app.classList.add('page-active');
    });
  }

  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

/** Convert route pattern to regex */
function patternToRegex(pattern) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const withParams = escaped.replace(/:(\w+)/g, '([^/]+)');
  return new RegExp('^' + withParams + '$');
}

/** Extract named params from match */
function extractParams(pattern, match) {
  const params = {};
  const names = [...pattern.matchAll(/:(\w+)/g)].map(m => m[1]);
  names.forEach((name, i) => {
    params[name] = match[i + 1];
  });
  return params;
}
