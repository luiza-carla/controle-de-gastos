import { apiFetch } from './config.js';
import {
  abrirModal,
  fecharModal,
  mostrarErroInline,
  limparErroInline,
  garantirErroInline,
  abrirModalErro,
} from './modalEditar.js';
import { abrirModalConfirmacao } from './modalDeletar.js';
import {
  mostrarNotificacao,
  persistirNotificacaoParaProximaTela,
} from './notification.js';
import {
  formatarValor,
  criarCardsHTML,
  criarBotoesAcao,
  $,
  clearElement,
  escaparHtml,
  setHTMLById,
  parseCurrency,
} from './helpers/index.js';
import { listarContas } from './conta.js';
import { carregarResumo } from './inicio.js';

// URL base da API de salarios
const salarioBaseUrl = window.location.origin + '/salarios';
const FORM_ERRO_ID = 'formErroInlineSalario';
const FORM_MSG_ERRO_ID = 'formMensagemErroSalario';

// Popula select com dias possiveis de recebimento
function popularSelectDiasRecebimento(
  selectId = 'diaRecebimento',
  diaPadrao = null
) {
  const select = $(selectId);
  if (!select) return;

  select.innerHTML =
    '<option value="" selected disabled>Selecione o dia</option>';

  for (let dia = 1; dia <= 31; dia++) {
    const option = document.createElement('option');
    option.value = String(dia);
    option.textContent = `Dia ${dia}`;
    if (diaPadrao && dia === diaPadrao) {
      option.selected = true;
    }
    select.appendChild(option);
  }
}

// Popula destinos de depósito do salário (carteira + contas)
async function popularSelectDestinoSalario(selectId = 'contaSalario') {
  const select = $(selectId);
  if (!select) return;

  select.innerHTML = `
    <option value="" selected>Selecione a conta ou carteira</option>
    <option value="carteira">Carteira (dinheiro físico)</option>
  `;

  try {
    const contas = await apiFetch('/contas');

    const optionsContas = (contas || [])
      .map(
        (conta) =>
          `<option value="${conta._id}">${escaparHtml(conta.nome)} (${escaparHtml(conta.tipo)})</option>`
      )
      .join('');

    select.innerHTML += optionsContas;
  } catch {
    // Mantém ao menos a opção de carteira em caso de falha na busca de contas
  }
}

// Atualiza telas que dependem de contas e resumo
async function atualizarVisoesRelacionadas() {
  if ($('contas')) {
    await listarContas();
  }

  if ($('saldoAtual') || $('saldoCalculado')) {
    await carregarResumo();
  }
}

// Inicializa envio do formulario de salario
export function criarSalario(formId = 'formSalario', callback) {
  const form = $(formId);
  if (!form) return;
  form.noValidate = true;
  garantirErroInline(form, FORM_ERRO_ID, FORM_MSG_ERRO_ID);

  popularSelectDiasRecebimento();
  popularSelectDestinoSalario('contaSalario');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparErroInline(FORM_ERRO_ID, FORM_MSG_ERRO_ID);

    const botaoClicado = e.submitter;
    const acao = botaoClicado?.getAttribute('data-action');

    const valor = parseCurrency($('valor')?.value);
    const diaRecebimento = $('diaRecebimento')?.value;
    const conta = $('contaSalario')?.value;

    if (!valor || !diaRecebimento) {
      abrirModalErro(
        'Por favor, preencha todos os campos obrigatórios',
        FORM_ERRO_ID,
        FORM_MSG_ERRO_ID
      );
      return;
    }

    try {
      await apiFetch(salarioBaseUrl, {
        method: 'POST',
        body: JSON.stringify({
          valor,
          diaRecebimento: Number(diaRecebimento),
          frequencia: 'mensal',
          conta: conta || null,
        }),
      });

      if (acao === 'salvar-adicionar-outro') {
        mostrarNotificacao(`Salário de R$ ${valor} adicionado com sucesso!`);
        form.reset();
      } else if (window.location.pathname.includes('adicionar-salario')) {
        persistirNotificacaoParaProximaTela(
          `Salário de R$ ${valor} adicionado com sucesso!`
        );
        window.location.href = '/html/salario.html';
      } else {
        mostrarNotificacao(`Salário de R$ ${valor} adicionado com sucesso!`);
        form.reset();
        await listarSalarios();
        await atualizarVisoesRelacionadas();
      }

      if (callback) callback();
    } catch (erro) {
      mostrarNotificacao(erro.message || 'Erro ao criar salário', 'erro');
    }
  });
}

// Lista salarios do usuario na tela
export async function listarSalarios() {
  const salarios = await apiFetch(salarioBaseUrl);

  const container = $('salariosContainer');
  if (!container) return;

  clearElement(container);

  const gerarItem = (s) => {
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
      <div class="salario-item">

        <div>
          <div class="salario-valor">R$ ${formatarValor(s.valor)}</div>
          <div class="salario-conta">Conta: ${contaNome}</div>
          <div class="salario-dia">Recebimento: Todo dia ${diaRecebimento}</div>
        </div>

        <div class="acoes-salario">
          ${criarBotoesAcao([
            {
              classe: 'secondary',
              onclick: `editarSalario('${s._id}', ${s.valor}, ${diaRecebimento}, '${destinoSaldo}')`,
              icone: 'fa-pen',
            },
            {
              classe: 'danger',
              onclick: `deletarSalario('${s._id}')`,
              icone: 'fa-trash',
            },
          ])}
        </div>

      </div>
    `;
  };

  setHTMLById('salariosContainer', criarCardsHTML(salarios, gerarItem));

  return salarios;
}

// Abre fluxo de confirmacao para deletar salario
window.deletarSalario = async (id) => {
  abrirModalConfirmacao({
    titulo: 'Confirmar exclusão',
    mensagem: 'Tem certeza que deseja deletar este salário?',
    onConfirmar: async () => {
      try {
        await apiFetch(`${salarioBaseUrl}/${id}`, { method: 'DELETE' });
        fecharModal();
        await listarSalarios();
        await atualizarVisoesRelacionadas();
      } catch (err) {
        fecharModal();
        mostrarNotificacao(err.message || 'Erro ao deletar salário', 'erro');
      }
    },
  });
};

// Abre modal para edicao de salario
window.editarSalario = async (id, valor, diaRecebimento, destinoAtual = '') => {
  const contas = await apiFetch('/contas');

  const optionsContas = contas
    .map((conta) => {
      const selected = conta._id === destinoAtual ? 'selected' : '';
      return `<option value="${conta._id}" ${selected}>${conta.nome} (${conta.tipo})</option>`;
    })
    .join('');

  const carteiraSelecionada = destinoAtual === 'carteira' ? 'selected' : '';

  abrirModal({
    titulo: 'Editar salário',

    conteudoHTML: `
      <div class="form-group">
        <label>Valor</label>
        <input type="text" inputmode="decimal" data-moeda id="modalValorSalario" value="${valor}" required>
      </div>
      <div class="form-group">
        <label>Dia do recebimento</label>
        <select id="modalDiaRecebimento" required>
          ${[...Array(31)]
            .map((_, i) => {
              const dia = i + 1;
              const selected = dia === diaRecebimento ? 'selected' : '';
              return `<option value="${dia}" ${selected}>Dia ${dia}</option>`;
            })
            .join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Destino do depósito</label>
        <select id="modalContaSalario">
          <option value="" ${!destinoAtual ? 'selected' : ''}>Selecione a conta ou carteira</option>
          <option value="carteira" ${carteiraSelecionada}>Carteira (dinheiro físico)</option>
          ${optionsContas}
        </select>
      </div>
    `,

    onSalvar: async () => {
      limparErroInline();

      const novoValor = parseCurrency($('modalValorSalario')?.value);
      const novoDiaRecebimento = Number($('modalDiaRecebimento')?.value);
      const novaConta = $('modalContaSalario')?.value || null;

      if (!novoValor || !novoDiaRecebimento) {
        mostrarErroInline('Por favor, preencha todos os campos obrigatórios');
        return;
      }

      try {
        await apiFetch(`${salarioBaseUrl}/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            valor: novoValor,
            diaRecebimento: novoDiaRecebimento,
            frequencia: 'mensal',
            conta: novaConta,
          }),
        });

        fecharModal();
        await listarSalarios();
        await atualizarVisoesRelacionadas();
      } catch (err) {
        mostrarErroInline(err.message || 'Erro ao atualizar salário');
      }
    },
  });
};
