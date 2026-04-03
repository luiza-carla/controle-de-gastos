export function clearLegacyAuthState() {
  localStorage.removeItem('token');
}

export async function apiFetch(url, options = {}) {
  const { skipAuthRedirect = false, headers, ...fetchOptions } = options;

  fetchOptions.headers = {
    'Content-Type': 'application/json',
    ...headers,
  };
  fetchOptions.credentials = 'same-origin';

  const res = await fetch(url, fetchOptions);

  if (!res.ok) {
    if (res.status === 401 && !skipAuthRedirect) {
      clearLegacyAuthState();
      window.location.href = '/html/login.html';
      const error = new Error('Não autorizado');
      error.statusCode = 401;
      throw error;
    }

    const text = await res.text();

    try {
      const json = JSON.parse(text);
      const mensagem =
        typeof json?.mensagem === 'string' && json.mensagem.trim()
          ? json.mensagem
          : 'Erro na resposta do servidor';
      const error = new Error(mensagem);
      error.statusCode = res.status;
      throw error;
    } catch (e) {
      if (e.message && e.message !== text) {
        throw e;
      }

      const error = new Error('Erro inesperado do servidor', { cause: e });
      error.statusCode = res.status;
      throw error;
    }
  }

  return res.json();
}

export async function verificarSessaoAtiva() {
  try {
    await apiFetch('/usuarios/sessao', { skipAuthRedirect: true });
    return true;
  } catch (error) {
    if (Number(error?.statusCode) === 401) {
      clearLegacyAuthState();
      return false;
    }

    throw error;
  }
}
