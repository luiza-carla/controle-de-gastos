export function setToken(token) {
  localStorage.setItem('token', token);
}

// Recupera token do localStorage
export function getToken() {
  return localStorage.getItem('token');
}

// Faz requisição HTTP com token de autenticação
export async function apiFetch(url, options = {}) {
  const { skipAuthRedirect = false, headers, ...fetchOptions } = options;
  const token = getToken();
  // Adiciona headers padrão (autent)
  fetchOptions.headers = {
    'Content-Type': 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
    ...headers,
  };

  // Faz requisição
  const res = await fetch(url, fetchOptions);

  // Valida resposta
  if (!res.ok) {
    // Se não autorizado, redireciona para login automaticamente
    if (res.status === 401 && !skipAuthRedirect) {
      // limpa token só por segurança
      localStorage.removeItem('token');
      window.location.href = '/html/login.html';
      const error = new Error('Não autorizado');
      error.statusCode = 401;
      throw error;
    }

    const text = await res.text();
    try {
      // Tenta parsear JSON com mensagem de erro
      const json = JSON.parse(text);
      const error = new Error(json.mensagem || text);
      error.statusCode = res.status;
      throw error;
    } catch (e) {
      if (e.message && e.message !== text) {
        throw e;
      }
      const error = new Error(text, { cause: e });
      error.statusCode = res.status;
      throw error;
    }
  }

  return res.json();
}
