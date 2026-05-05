function montarDetalhesMovimentos(transacoes = [], tipo) {
  return transacoes
    .filter((transacao) => transacao.tipo === tipo)
    .map((transacao) => ({
      data: transacao.data,
      categoria: transacao.categoria ? transacao.categoria.nome : '',
      subcategoria: transacao.subcategoria ? transacao.subcategoria.nome : '',
      nome: transacao.titulo,
      valor: Number(transacao.valor || 0),
    }))
    .sort((a, b) => a.valor - b.valor);
}

module.exports = { montarDetalhesMovimentos };
