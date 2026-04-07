import { formatarData, formatarMoeda } from '../helpers/index.js';

// Campos que não são relevantes para o diff exibido na UI.
const CAMPOS_OCULTOS_GERAIS = new Set([
  '_id',
  '__v',
  'createdAt',
  'updatedAt',
  'usuario',
  'data',
  'dataUltimoProcessamento',
  'fonteSaldo',
]);

const CAMPOS_OCULTOS_POR_CONTEXTO = {
  salario: {
    edicao: new Set(['status', 'frequencia']),
  },
};

const LABEL_CAMPO_ALTERACAO = {
  titulo: 'Título',
  valor: 'Valor',
  tipo: 'Tipo',
  categoria: 'Categoria',
  conta: 'Conta',
  status: 'Status',
  tipoDespesa: 'Tipo de despesa',
  recorrencia: 'Recorrência',
  fonteSaldo: 'Origem do saldo',
  tags: 'Tags',
  data: 'Data',
  'parcelamento.totalParcelas': 'Total de parcelas',
  'parcelamento.parcelaAtual': 'Parcela atual',
  ativa: 'Ativa',
  saldo: 'Saldo',
  nome: 'Nome',
};

export function calcularAlteracoes(
  dadosAnteriores = {},
  dadosNovos = {},
  contexto = {}
) {
  const antes = achatarObjeto(dadosAnteriores);
  const depois = achatarObjeto(dadosNovos);

  const chaves = new Set([...Object.keys(antes), ...Object.keys(depois)]);
  const alteracoes = [];

  for (const chave of chaves) {
    if (deveOcultarCampo(chave, contexto)) continue;

    const valorAntes = normalizarValorCampo(
      chave,
      antes[chave],
      dadosAnteriores,
      dadosNovos
    );
    const valorDepois = normalizarValorCampo(
      chave,
      depois[chave],
      dadosNovos,
      dadosAnteriores
    );

    if (saoValoresIguais(valorAntes, valorDepois)) continue;

    alteracoes.push({
      campo: nomeCampo(chave),
      antes: formatarValorAlteracao(chave, valorAntes),
      depois: formatarValorAlteracao(chave, valorDepois),
    });
  }

  return alteracoes;
}

function deveOcultarCampo(chave, contexto = {}) {
  const ultimaParte = chave.split('.').pop();

  if (
    CAMPOS_OCULTOS_GERAIS.has(chave) ||
    CAMPOS_OCULTOS_GERAIS.has(ultimaParte)
  ) {
    return true;
  }

  const entidade = contexto.entidade;
  const acao = contexto.acao;
  const ocultosPorAcao = entidade
    ? CAMPOS_OCULTOS_POR_CONTEXTO[entidade]?.[acao]
    : null;

  return Boolean(
    ocultosPorAcao &&
    (ocultosPorAcao.has(chave) || ocultosPorAcao.has(ultimaParte))
  );
}

function nomeCampo(chave) {
  if (LABEL_CAMPO_ALTERACAO[chave]) return LABEL_CAMPO_ALTERACAO[chave];

  const ultimaParte = chave.split('.').pop() || chave;
  if (LABEL_CAMPO_ALTERACAO[ultimaParte])
    return LABEL_CAMPO_ALTERACAO[ultimaParte];

  return ultimaParte
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (letra) => letra.toUpperCase())
    .trim();
}

function formatarValorAlteracao(chave, valor) {
  if (valor === undefined || valor === null || valor === '') {
    return '-';
  }

  if (Array.isArray(valor)) {
    return valor.length ? valor.join(', ') : '-';
  }

  if (typeof valor === 'boolean') {
    return valor ? 'Sim' : 'Não';
  }

  if (typeof valor === 'number') {
    if (chave.includes('valor') || chave.includes('saldo')) {
      return formatarMoeda(valor);
    }
    return String(valor);
  }

  if (typeof valor === 'string' && chave.includes('data')) {
    const data = new Date(valor);
    if (!Number.isNaN(data.getTime())) {
      return formatarData(data);
    }
  }

  if (typeof valor === 'object') {
    if (valor.nome || valor.titulo || valor.descricao) {
      return String(valor.nome || valor.titulo || valor.descricao);
    }

    if (Object.prototype.hasOwnProperty.call(valor, '_id')) {
      return String(valor._id);
    }

    return JSON.stringify(valor);
  }

  return String(valor);
}

function normalizarValorCampo(chave, valor, snapshotAtual, snapshotOutro) {
  // Para campos de referência (ex: categoria/conta) preferimos mostrar o nome em vez do id.
  if (!ehCampoReferencia(chave)) {
    return valor;
  }

  const destinoCarteira = extrairDestinoCarteira(chave, valor, snapshotAtual);
  if (destinoCarteira) return destinoCarteira;

  const nomeDireto = extrairNomeLegivel(valor);
  if (nomeDireto) return nomeDireto;

  const id = extrairIdReferencia(valor);
  if (!id) return valor;

  const valorMesmoSnapshot = obterValorPorCaminho(snapshotAtual, chave);
  const nomeMesmoSnapshot = extrairNomePorId(valorMesmoSnapshot, id);
  if (nomeMesmoSnapshot) return nomeMesmoSnapshot;

  const valorOutroSnapshot = obterValorPorCaminho(snapshotOutro, chave);
  const nomeOutroSnapshot = extrairNomePorId(valorOutroSnapshot, id);
  if (nomeOutroSnapshot) return nomeOutroSnapshot;

  return valor;
}

function extrairDestinoCarteira(chave, valor, snapshotAtual) {
  const ultimaParte = chave.split('.').pop();

  if (ultimaParte !== 'conta') {
    return null;
  }

  if (valor === 'carteira' || snapshotAtual?.conta === 'carteira') {
    return 'Carteira';
  }

  if (snapshotAtual?.fonteSaldo === 'carteira') {
    return 'Carteira';
  }

  return null;
}

function ehCampoReferencia(chave) {
  const ultimaParte = chave.split('.').pop();
  return ultimaParte === 'categoria' || ultimaParte === 'conta';
}

function extrairIdReferencia(valor) {
  if (!valor) return null;

  if (typeof valor === 'string' && /^[a-f0-9]{24}$/i.test(valor)) {
    return valor;
  }

  if (
    typeof valor === 'object' &&
    Object.prototype.hasOwnProperty.call(valor, '_id')
  ) {
    return String(valor._id);
  }

  return null;
}

function extrairNomeLegivel(valor) {
  if (!valor || typeof valor !== 'object') return null;

  const nome = valor.nome || valor.titulo || valor.descricao;
  return nome ? String(nome) : null;
}

function extrairNomePorId(valor, idEsperado) {
  if (!valor || typeof valor !== 'object') return null;

  if (!Object.prototype.hasOwnProperty.call(valor, '_id')) {
    return extrairNomeLegivel(valor);
  }

  const idValor = String(valor._id);
  if (idValor !== idEsperado) return null;

  return extrairNomeLegivel(valor);
}

function obterValorPorCaminho(obj, caminho) {
  if (!obj || typeof obj !== 'object') return undefined;

  return caminho.split('.').reduce((acc, parte) => acc?.[parte], obj);
}

function achatarObjeto(obj, prefixo = '') {
  if (!obj || typeof obj !== 'object') return {};

  const resultado = {};

  Object.entries(obj).forEach(([chave, valor]) => {
    const caminho = prefixo ? `${prefixo}.${chave}` : chave;

    if (valor instanceof Date || Array.isArray(valor) || valor === null) {
      resultado[caminho] = valor;
      return;
    }

    if (typeof valor === 'object') {
      if (Object.prototype.hasOwnProperty.call(valor, '_id')) {
        resultado[caminho] =
          valor.nome || valor.titulo || valor.descricao || valor._id;
        return;
      }

      if (Object.keys(valor).length === 0) {
        resultado[caminho] = valor;
        return;
      }

      Object.assign(resultado, achatarObjeto(valor, caminho));
      return;
    }

    resultado[caminho] = valor;
  });

  return resultado;
}

function saoValoresIguais(a, b) {
  if (valorAusente(a) && valorAusente(b)) {
    return true;
  }

  return areDeepEqual(normalizarParaComparacao(a), normalizarParaComparacao(b));
}

function valorAusente(valor) {
  return valor === undefined || valor === null || valor === '';
}

function normalizarParaComparacao(valor) {
  if (valorAusente(valor)) return null;
  if (valor instanceof Date) return valor.toISOString();
  if (Array.isArray(valor)) return valor.map(normalizarParaComparacao);
  if (valor && typeof valor === 'object') {
    if (Object.prototype.hasOwnProperty.call(valor, '_id')) {
      return valor._id;
    }
    return valor;
  }
  return valor;
}

function areDeepEqual(a, b) {
  if (a === b) return true;
  if (a && typeof a === 'object' && b && typeof b === 'object') {
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      return a.every((item, idx) => areDeepEqual(item, b[idx]));
    }

    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;

    return keysA.every((key) => areDeepEqual(a[key], b[key]));
  }

  return false;
}
