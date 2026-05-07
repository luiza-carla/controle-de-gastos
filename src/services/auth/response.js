// Monta payload de autenticação com token e dados públicos do usuário.
function montarRespostaAutenticacao(usuario, token) {
  return {
    token,
    usuario: {
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      ativa: usuario.ativa !== false,
      preferencias: {
        formatoData: usuario?.preferencias?.formatoData || 'DD/MM/AAAA',
      },
      salario: usuario.salario,
    },
  };
}

module.exports = { montarRespostaAutenticacao };
