// centraliza padrões de `populate` usados em várias partes da aplicação

function transacao(query) {
  return query
    .populate('conta', 'nome tipo')
    .populate('categoria', 'nome tipo cor')
    .populate('subcategoria', 'nome');
}

function salario(query) {
  return query.populate('conta', 'nome tipo').populate('categoria', 'nome');
}

module.exports = {
  transacao,
  salario,
};
