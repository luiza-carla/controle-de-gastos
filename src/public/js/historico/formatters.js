import { capitalizar, formatarMoeda } from '../helpers/index.js';
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
  if (!Array.isArray(tags) || tags.length === 0) return '';

  const badges = tags
    .map((tag) => `<span class="tag-badge">${String(tag)}</span>`)
    .join(' ');

  return `<div class="objeto-campo"><strong>Tags:</strong> ${badges}</div>`;
}

function withField(rendered, label, valor, escape = true) {
  if (valor === undefined || valor === null || valor === '') return rendered;
  return `${rendered}${renderCampo(label, valor, escape)}`;
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

  const contaNome =
    transacao.fonteSaldo === 'carteira'
      ? 'Carteira'
      : transacao.conta && transacao.conta.nome
        ? transacao.conta.nome
        : '';

  if (contaNome) {
    html = withField(html, 'Conta', contaNome);
  }

  if (transacao.status) {
    html = withField(html, 'Status', capitalizar(transacao.status), false);
  }

  if (transacao.data) {
    html = withField(html, 'Data', transacao.data ? transacao.data : '', false);
  }

  html += renderTags(transacao.tags);

  return html || '<div class="objeto-campo">Sem detalhes para exibir</div>';
}

export function formatarObjetoConta(conta) {
  if (!conta) {
    return '<div class="objeto-campo">Objeto não disponível</div>';
  }

  const tipo =
    conta.tipo === 'corrente'
      ? 'Corrente'
      : conta.tipo === 'poupanca'
        ? 'Poupança'
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

  if (item.preco !== undefined && item.preco !== null) {
    html = withField(html, 'Preço', formatarMoeda(item.preco), false);
  }

  html += renderCategoriaSubcategoria(item.categoria, item.subcategoria);

  if (
    item.valorEconomizado !== undefined &&
    item.valorEconomizado !== null &&
    item.preco
  ) {
    const progresso = ((item.valorEconomizado / item.preco) * 100).toFixed(1);
    html = withField(
      html,
      'Economizado',
      `${formatarMoeda(item.valorEconomizado)} (${progresso}%)`,
      false
    );
  }

  html = withField(html, 'Descrição', item.descricao);

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
