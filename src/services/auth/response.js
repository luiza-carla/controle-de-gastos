// Monta payload de autenticação com token e dados públicos do usuário.
function montarRespostaAutenticacao(usuario, token) {
  return {
    token,
    usuario: {
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      salario: usuario.salario,
    },
  };
}

module.exports = { montarRespostaAutenticacao };
