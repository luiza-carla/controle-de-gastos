const Categoria = require('../models/Categoria');

// helpers para trabalhar com categorias de forma centralizada

/**
 * Busca uma categoria pelo nome exatamente igual.
 * @param {string} nome
 * @returns {Promise<import('../models/Categoria')>}
 */
async function buscarPorNome(nome) {
  return Categoria.findOne({ nome });
}

/**
 * Busca a categoria utilizada para representar salários no sistema.
 * Retorna `null` se não existir.
 */
async function buscarSalario() {
  const categoriaRenda = await buscarPorNome('Renda');
  const categoriaSalario = await buscarPorNome('Salário');

  const categoria = categoriaRenda || categoriaSalario;
  if (!categoria) return null;

  const Subcategoria = require('../models/Subcategoria');
  const subcategoria = categoriaRenda
    ? await Subcategoria.findOne({
        nome: 'Salário',
        categoria: categoriaRenda._id,
      })
    : null;

  const categorias = [
    ...(categoriaRenda ? [categoriaRenda._id] : []),
    ...(_temCategoriaSalarioDistintaDeRenda({
      categoriaRenda,
      categoriaSalario,
    })
      ? [categoriaSalario._id]
      : []),
  ];

  return {
    categoria,
    subcategoria,
    categorias,
    categoriaRenda,
    categoriaSalario,
  };
}

function _temCategoriaSalarioDistintaDeRenda(refs) {
  return (
    refs &&
    refs.categoriaRenda &&
    refs.categoriaSalario &&
    refs.categoriaSalario._id.toString() !== refs.categoriaRenda._id.toString()
  );
}

function _getCategoriasSalario(refs) {
  if (!refs || !refs.categoria) return null;
  return (
    (refs.categorias && refs.categorias.length && refs.categorias) || [
      refs.categoria._id,
    ]
  );
}

function montarFiltroCategoriaSalario(refs) {
  if (!refs || !refs.categoria) return null;

  const categoriasSalario = _getCategoriasSalario(refs);

  // Caso seja um sistema híbrido (categoria Renda + subcategoria Salário)
  // ainda mantemos compatibilidade com lançamentos usando a categoria antiga.
  if (refs.subcategoria && refs.categoriaRenda) {
    const filtroRendaComSubcategoria = {
      categoria: refs.categoriaRenda._id,
      $or: [
        { subcategoria: refs.subcategoria._id },
        { subcategoria: { $exists: false } },
        { subcategoria: null },
      ],
    };

    if (_temCategoriaSalarioDistintaDeRenda(refs)) {
      return {
        $or: [
          filtroRendaComSubcategoria,
          { categoria: refs.categoriaSalario._id },
        ],
      };
    }

    return filtroRendaComSubcategoria;
  }

  return categoriasSalario.length > 1
    ? { categoria: { $in: categoriasSalario } }
    : { categoria: categoriasSalario[0] };
}

function montarFiltroSalarioParaUsuario(refs, usuarioId) {
  const filtroCategoria = montarFiltroCategoriaSalario(refs);
  if (!filtroCategoria) return null;
  return { usuario: usuarioId, ...filtroCategoria };
}

/**
 * Retorna filtros úteis relacionados a salário.
 *
 * @param {object} refs - retorno de buscarSalario()
 * @param {string} [usuarioId] - id do usuário para filtros específicos
 */
function obterFiltrosSalario(refs, usuarioId) {
  const filtroCategoria = montarFiltroCategoriaSalario(refs);
  const filtroUsuario = usuarioId
    ? montarFiltroSalarioParaUsuario(refs, usuarioId)
    : null;
  const filtroExclusao = adicionarExclusaoCategoriaSalario(
    usuarioId ? { usuario: usuarioId } : {},
    refs
  );

  return {
    filtroCategoria,
    filtroUsuario,
    filtroExclusao,
  };
}

function adicionarExclusaoCategoriaSalario(filtro, refs) {
  if (!refs || !refs.categoria) return filtro;

  const categoriasSalario = _getCategoriasSalario(refs);

  if (refs.subcategoria && refs.categoriaRenda) {
    const nor = [
      {
        categoria: refs.categoriaRenda._id,
        subcategoria: refs.subcategoria._id,
      },
    ];

    if (_temCategoriaSalarioDistintaDeRenda(refs)) {
      nor.push({ categoria: refs.categoriaSalario._id });
    }

    return {
      ...filtro,
      $nor: nor,
    };
  }

  return {
    ...filtro,
    categoria: { $nin: categoriasSalario },
  };
}

module.exports = {
  buscarPorNome,
  buscarSalario,
  obterFiltrosSalario,
};
