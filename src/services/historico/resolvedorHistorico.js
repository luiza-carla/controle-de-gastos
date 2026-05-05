const FONTE_DADOS_PRIORITARIA_POR_ACAO = {
  criacao: 'dadosNovos',
  edicao: 'dadosNovos',
  delecao: 'dadosAnteriores',
  realizacao: 'dadosNovos',
};

function criarResolvedorHistoricoPorOperacao(buscarObjetoRelacionado) {
  const cache = {
    objetos: new Map(),
    categorias: new Map(),
    subcategorias: new Map(),
  };

  const isObjectId = (v) =>
    typeof v === 'string' && /^[a-fA-F0-9]{24}$/.test(v);

  const getKey = (v) => (v?.toString ? v.toString() : String(v));

  // Função genérica pra carregar e cachear qualquer model
  async function carregarComCache(cacheMap, Model, id, select) {
    const key = getKey(id);

    if (!cacheMap.has(key)) {
      cacheMap.set(
        key,
        Model.findById(id)
          .select(select)
          .catch(() => null)
      );
    }

    return cacheMap.get(key);
  }

  async function popularCampo(obj, campo, loader) {
    const valor = obj[campo];

    const jaPopulado = valor && typeof valor === 'object' && valor.nome;

    const ehId =
      valor && (isObjectId(valor) || typeof valor?.toString === 'function');

    if (valor && !jaPopulado && ehId) {
      const populado = await loader(valor);
      if (populado) obj[campo] = populado;
    }
  }

  async function popularIds(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const Categoria = require('../../models/Categoria');
    const Subcategoria = require('../../models/Subcategoria');

    await Promise.all([
      popularCampo(obj, 'categoria', (id) =>
        carregarComCache(cache.categorias, Categoria, id, 'nome cor tipo')
      ),
      popularCampo(obj, 'subcategoria', (id) =>
        carregarComCache(cache.subcategorias, Subcategoria, id, 'nome')
      ),
    ]);

    return obj;
  }

  async function obterObjetoRelacionado(historico) {
    const key = `${historico.entidade}:${historico.entidadeId}`;

    if (!cache.objetos.has(key)) {
      cache.objetos.set(
        key,
        (async () => {
          const fonte = FONTE_DADOS_PRIORITARIA_POR_ACAO[historico.acao];

          const snapshot = historico[fonte];
          const temSnapshot = snapshot && Object.keys(snapshot).length;

          const base = temSnapshot
            ? { ...snapshot }
            : await buscarObjetoRelacionado(
                historico.entidade,
                historico.entidadeId
              );

          return popularIds(base);
        })()
      );
    }

    return cache.objetos.get(key);
  }

  return {
    obterObjetoRelacionado,
    popularIds,
  };
}

module.exports = { criarResolvedorHistoricoPorOperacao };
