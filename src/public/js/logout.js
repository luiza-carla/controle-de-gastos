import { apiFetch, clearLegacyAuthState } from './config.js';

export async function logout() {
  try {
    await apiFetch('/usuarios/logout', {
      method: 'POST',
      skipAuthRedirect: true,
    });
  } catch {
    // segue para o redirecionamento mesmo se a API falhar
  }

  clearLegacyAuthState();
  window.location.href = '/html/login.html';
}
