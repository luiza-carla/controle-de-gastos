import { capitalizar, formatarMoeda, gerarTags } from '../helpers/index.js';
import { criarBadgesCategoriaSubcategoriaSeparados } from '../helpers/index.js';

function renderCampo(label, valor, escape = true) {
  if (valor === undefined || valor === null || valor === '') return '';

  const valorFormatado = escape ? String(valor) : valor;
  return `<div class="objeto-campo"><strong>${label}:</strong> ${valorFormatado}</div>`;
}

function renderCategoriaSubcategoria(categoria, subcategoria) {
  if (!categoria) return '';

  const { categoriaBadge, subcategoriaBadge } =
    criarBadgesCategoriaSubcategoriaSeparados(categoria, subcategoria);

  let html = renderCampo('Categoria', categoriaBadge, false);
  if (subcategoriaBadge) {
    html += renderCampo('Subcategoria', subcategoriaBadge, false);
  }

  return html;
}

function renderTags(tags = []) {
  const tagsNormalizadas = normalizarTags(tags);
  if (!tagsNormalizadas.length) return '';

  const badges = gerarTags(tagsNormalizadas);

  return `<div class="objeto-campo"><strong>Tags:</strong> ${badges}</div>`;
}

function withField(rendered, label, valor, escape = true) {
  if (valor === undefined || valor === null || valor === '') return rendered;
  return `${rendered}${renderCampo(label, valor, escape)}`;
}

function normalizarTags(tags) {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);
  }

  return [];
}

function obterNomeContaOuDestino({ conta, fonteSaldo }) {
  if (fonteSaldo === 'carteira') {
    return 'Carteira';
  }

  if (conta === 'carteira') {
    return 'Carteira';
  }

  if (conta && typeof conta === 'object' && conta.nome) {
    return conta.nome;
  }

  return '';
}

function formatarFrequencia(valor) {
  const labels = {
    mensal: 'Mensal',
    semanal: 'Semanal',
    diario: 'Diária',
    anual: 'Anual',
    hora: 'Por hora',
    outra: 'Outra',
    nenhuma: 'Nenhuma',
  };

  return labels[valor] || (valor ? capitalizar(valor) : '');
}

export function formatarObjetoTransacao(transacao) {
  if (!transacao) {
    return '<div class="objeto-campo">Objeto não disponível</div>';
  }

  let html = '';
  html = withField(html, 'Título', transacao.titulo);

  if (transacao.tipo) {
    html = withField(html, 'Tipo', capitalizar(transacao.tipo), false);
  }

  if (transacao.valor !== undefined && transacao.valor !== null) {
    html = withField(html, 'Valor', formatarMoeda(transacao.valor), false);
  }

  html += renderCategoriaSubcategoria(
    transacao.categoria,
    transacao.subcategoria
  );

  const contaNome = obterNomeContaOuDestino(transacao);

  if (contaNome) {
    html = withField(html, 'Conta', contaNome);
  }

  if (transacao.tipoDespesa) {
    html = withField(
      html,
      'Tipo de despesa',
      capitalizar(transacao.tipoDespesa),
      false
    );
  }

  if (transacao.recorrencia && transacao.recorrencia !== 'nenhuma') {
    html = withField(
      html,
      'Recorrência',
      formatarFrequencia(transacao.recorrencia),
      false
    );
  }

  if (transacao.frequencia) {
    html = withField(
      html,
      'Frequência',
      formatarFrequencia(transacao.frequencia),
      false
    );
  }

  if (transacao.diaRecebimento) {
    html = withField(
      html,
      'Dia de recebimento',
      `Todo dia ${transacao.diaRecebimento}`
    );
  }

  if (transacao.parcelamento?.totalParcelas > 1) {
    html = withField(
      html,
      'Parcelamento',
      `${transacao.parcelamento.parcelaAtual || 1}/${transacao.parcelamento.totalParcelas}`
    );
  }

  if (transacao.status) {
    html = withField(html, 'Status', capitalizar(transacao.status), false);
  }

  if (typeof transacao.ativa === 'boolean') {
    html = withField(html, 'Ativa', transacao.ativa ? 'Sim' : 'Não', false);
  }

  html += renderTags(transacao.tags);

  return html || '<div class="objeto-campo">Sem detalhes para exibir</div>';
}

export function formatarObjetoSalario(salario) {
  if (!salario) {
    return '<div class="objeto-campo">Objeto não disponível</div>';
  }

  let html = '';
  html = withField(html, 'Título', salario.titulo || 'Salário');

  if (salario.valor !== undefined && salario.valor !== null) {
    html = withField(html, 'Valor', formatarMoeda(salario.valor), false);
  }

  const destino = obterNomeContaOuDestino(salario);
  if (destino) {
    html = withField(html, 'Destino', destino);
  }

  if (salario.frequencia) {
    html = withField(
      html,
      'Frequência',
      formatarFrequencia(salario.frequencia),
      false
    );
  }

  if (salario.diaRecebimento) {
    html = withField(
      html,
      'Dia de recebimento',
      `Todo dia ${salario.diaRecebimento}`
    );
  }

  if (salario.status) {
    html = withField(html, 'Status', capitalizar(salario.status), false);
  }

  if (typeof salario.ativa === 'boolean') {
    html = withField(html, 'Ativo', salario.ativa ? 'Sim' : 'Não', false);
  }

  html += renderTags(salario.tags);

  return html || '<div class="objeto-campo">Sem detalhes para exibir</div>';
}

export function formatarObjetoConta(conta) {
  if (!conta) {
    return '<div class="objeto-campo">Objeto não disponível</div>';
  }

  const tipo =
    conta.tipo === 'corrente'
      ? 'Corrente'
      : conta.tipo === 'credito'
        ? 'Crédito'
        : conta.tipo === 'investimento'
          ? 'Investimento'
          : 'Outro';

  return `
    ${renderCampo('Nome', conta.nome || '')}
    ${renderCampo('Tipo', tipo, false)}
    ${renderCampo('Saldo', formatarMoeda(conta.saldo || 0), false)}
    ${renderCampo('Ativa', conta.ativa ? 'Sim' : 'Não', false)}
  `;
}

export function formatarObjetoListaDesejo(item) {
  if (!item) {
    return '<div class="objeto-campo">Objeto não disponível</div>';
  }

  let html = '';
  html = withField(html, 'Título', item.titulo);

  if (item.valor !== undefined && item.valor !== null) {
    html = withField(html, 'Valor', formatarMoeda(item.valor), false);
  }

  html += renderCategoriaSubcategoria(item.categoria, item.subcategoria);

  if (item.tipoDespesa) {
    html = withField(
      html,
      'Tipo de despesa',
      capitalizar(item.tipoDespesa),
      false
    );
  }

  html += renderTags(item.tags);

  return html || '<div class="objeto-campo">Sem detalhes para exibir</div>';
}

export function formatarObjetoCarteira(carteira) {
  if (!carteira) {
    return '<div class="objeto-campo">Objeto não disponível</div>';
  }

  return `
    ${renderCampo('Saldo', formatarMoeda(carteira.saldo || 0), false)}
  `;
}
