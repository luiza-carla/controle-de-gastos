import { normalizarDinheiro, somarCampoDinheiro } from './money.js';

// Formata número para 2 casas decimais com separadores de milhar (pt-BR)
export function formatarValor(valor) {
  const num = normalizarDinheiro(valor || 0);
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Formata valor como moeda brasileira (R$)
export function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(normalizarDinheiro(valor || 0));
}

// Soma valores numericos de uma lista usando campo padrao ou funcao de mapeamento
export function calcularTotalItens(lista = [], valorOuFn = 'valor') {
  return somarCampoDinheiro(lista, valorOuFn);
}

// Capitaliza primeira letra de um texto
export function capitalizar(texto = '') {
  if (!texto) return '';
  if (texto.toLowerCase() === 'saida') return 'Saída';
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Remove acentos de uma string para busca insensível
export function removerAcentos(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Escapa caracteres HTML para evitar XSS
export function escaparHtml(texto = '') {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

// Formata item com tipo entre parênteses (ex: "Nubank (Corrente)")
export function formatarItemComTipo(
  item,
  nomeProp = 'nome',
  tipoProp = 'tipo'
) {
  const nome = item[nomeProp] || '';
  const tipo = item[tipoProp] || '';
  return `${escaparHtml(nome)} (${capitalizar(tipo)})`;
}

// Formata data para exibicao curta (dd/mm/aaaa)
export function formatarData(data) {
  if (!data) return '-';

  const dataObj = new Date(data);
  if (Number.isNaN(dataObj.getTime())) return '-';

  return dataObj.toLocaleDateString('pt-BR');
}

// Formata hora de uma data (hh:mm)
export function formatarHora(dataISO) {
  if (!dataISO) return '-';

  const data = new Date(dataISO);
  if (Number.isNaN(data.getTime())) return '-';

  const hora = String(data.getHours()).padStart(2, '0');
  const minuto = String(data.getMinutes()).padStart(2, '0');
  return `${hora}:${minuto}`;
}
