export function clearLegacyAuthState() {
  localStorage.removeItem('token');
  localStorage.removeItem('userPreferences');
}

const PREFERENCIAS_STORAGE_KEY = 'userPreferences';

export function salvarPreferenciasUsuario(preferencias = {}) {
  try {
    localStorage.setItem(
      PREFERENCIAS_STORAGE_KEY,
      JSON.stringify(preferencias)
    );
  } catch {
    // ignora falhas de storage
  }
}

export function lerPreferenciasUsuario() {
  try {
    const raw = localStorage.getItem(PREFERENCIAS_STORAGE_KEY);
    if (!raw) {
      return { formatoData: 'DD/MM/AAAA' };
    }

    const preferencias = JSON.parse(raw);
    return {
      formatoData:
        preferencias?.formatoData === 'AAAA-MM-DD'
          ? 'AAAA-MM-DD'
          : 'DD/MM/AAAA',
    };
  } catch {
    return { formatoData: 'DD/MM/AAAA' };
  }
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
      error.payload = json;
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
    const data = await apiFetch('/usuarios/sessao', { skipAuthRedirect: true });
    if (data?.usuario?.preferencias) {
      salvarPreferenciasUsuario(data.usuario.preferencias);
    }

    return data;
  } catch (error) {
    if (Number(error?.statusCode) === 401) {
      clearLegacyAuthState();
      return false;
    }

    throw error;
  }
}
