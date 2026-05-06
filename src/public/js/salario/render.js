import {
  formatarValor,
  criarCardsHTML,
  criarBotoesAcao,
  setHTMLById,
  escaparHtml,
  $,
} from '../helpers/index.js';
import {
  listarSalarios as listarSalariosService,
  invalidarEListarSalarios as invalidarEListarSalariosService,
  deletarSalario as deletarSalarioService,
} from './service.js';

function criarItemSalario(s) {
  const contaNome =
    s.fonteSaldo === 'carteira'
      ? 'Carteira (dinheiro físico)'
      : s.conta
        ? s.conta.nome
        : 'Sem conta';
  const diaRecebimento = s.diaRecebimento || 5;
  const destinoSaldo =
    s.fonteSaldo === 'carteira' ? 'carteira' : s.conta?._id || '';

  return `
    <div class="salario-item" data-salario-id="${s._id}">

      <div>
        <div class="salario-valor">R$ ${formatarValor(s.valor)}</div>
        <div class="salario-conta">Conta: ${escaparHtml(contaNome)}</div>
        <div class="salario-dia">Recebimento: Todo dia ${diaRecebimento}</div>
      </div>

      <div class="acoes-salario">
        ${criarBotoesAcao([
          {
            classe: 'secondary',
            title: 'Editar',
            dataAttributes: {
              action: 'editar',
              id: s._id,
              valor: s.valor,
              dia: diaRecebimento,
              destino: destinoSaldo,
            },
            icone: 'fa-pen',
          },
          {
            classe: 'danger',
            title: 'Deletar',
            dataAttributes: { action: 'deletar', id: s._id },
            icone: 'fa-trash',
          },
        ])}
      </div>

    </div>
  `;
}

export async function listarSalarios() {
  const container = $('salariosContainer');
  if (!container) return null;

  const salarios = await listarSalariosService();
  const html = criarCardsHTML(salarios, criarItemSalario);
  setHTMLById('salariosContainer', html);

  return salarios;
}

export async function invalidarEListarSalarios() {
  await invalidarEListarSalariosService();
  return listarSalarios();
}

export async function deletarSalarioPorId(id) {
  await deletarSalarioService(id);
  await invalidarEListarSalarios();
}

function _getSalarioButton(event) {
  return event.target.closest('button[data-action]');
}

export function extractSalarioId(event) {
  const button = _getSalarioButton(event);
  return button?.dataset.id || null;
}

export function extractSalarioAction(event) {
  const button = _getSalarioButton(event);
  return button?.dataset.action || null;
}

export function extractSalarioDados(event) {
  const button = _getSalarioButton(event);
  if (!button) return {};
  return {
    valor: normalizarDinheiro(button.dataset.valor) || 0,
    dia: Number(button.dataset.dia) || 0,
    destino: button.dataset.destino || '',
  };
}
import { normalizarDinheiro } from '../helpers/money.js';
