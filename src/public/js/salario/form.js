import {
  abrirModalErro,
  garantirErroInline,
  limparErroInline,
} from '../modalEditar.js';
import {
  mostrarNotificacao,
  notificarOperacao,
  agendarNotificacaoOperacao,
  tratarErro,
} from '../notification.js';
import {
  parseCurrency,
  createFormSubmitGuard,
  formatarValor,
  $,
} from '../helpers/index.js';
import { listarContas } from '../conta.js';
import { criarSalario as serviceCriarSalario } from './service.js';

const FORM_ERRO_ID = 'formErroInlineSalario';
const FORM_MSG_ERRO_ID = 'formMensagemErroSalario';

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

async function popularSelectDestinoSalario(selectId = 'contaSalario') {
  const select = $(selectId);
  if (!select) return;

  try {
    const contas = await listarContas();

    const optionsContas = (contas || [])
      .map(
        (conta) =>
          `<option value="${conta._id}">${conta.nome} (${conta.tipo})</option>`
      )
      .join('');

    select.innerHTML = `
      <option value="" selected>Selecione a conta ou carteira</option>
      <option value="carteira">Carteira (dinheiro físico)</option>
      ${optionsContas}
    `;
  } catch {
    select.innerHTML = `
      <option value="" selected>Selecione a conta ou carteira</option>
      <option value="carteira">Carteira (dinheiro físico)</option>
    `;
  }
}

export function criarSalario(formId, callback) {
  const form = document.getElementById(formId);
  if (!form) return;

  // Evita anexar o listener várias vezes (p.ex. se criarSalario for chamado novamente)
  if (form.dataset.salarioSubmitHandlerAttached) return;
  form.dataset.salarioSubmitHandlerAttached = 'true';

  form.noValidate = true;
  garantirErroInline(form, FORM_ERRO_ID, FORM_MSG_ERRO_ID);

  popularSelectDiasRecebimento();
  popularSelectDestinoSalario('contaSalario');

  const guardSubmit = createFormSubmitGuard(form);

  form.addEventListener(
    'submit',
    guardSubmit(async (e) => {
      e.preventDefault();
      limparErroInline(FORM_ERRO_ID, FORM_MSG_ERRO_ID);

      const botaoClicado = e.submitter;
      const acao = botaoClicado?.getAttribute('data-action');
      const estaNaTelaDeAdicao =
        window.location.pathname.includes('adicionar-salario');

      const valor = parseCurrency(form.valor.value);
      const diaRecebimento = form.diaRecebimento.value;
      const conta = form.contaSalario.value;
      const notificacaoSalario = {
        objeto: `Salário de R$ ${formatarValor(valor)}`,
        acao: 'criacao',
        genero: 'masculino',
      };

      if (!valor || !diaRecebimento) {
        abrirModalErro(
          'Por favor, preencha todos os campos obrigatórios',
          FORM_ERRO_ID,
          FORM_MSG_ERRO_ID
        );
        return;
      }

      try {
        await serviceCriarSalario({
          valor,
          diaRecebimento: Number(diaRecebimento),
          frequencia: 'mensal',
          conta: conta || null,
        });

        if (acao === 'salvar-adicionar-outro') {
          notificarOperacao(notificacaoSalario);
          form.reset();
        } else if (estaNaTelaDeAdicao) {
          agendarNotificacaoOperacao(notificacaoSalario);
          if (callback) await callback();
          window.location.href = '/html/salario.html';
        } else {
          notificarOperacao(notificacaoSalario);
          form.reset();
          if (callback) await callback();
        }
      } catch (erro) {
        const msg = tratarErro(erro, 'Erro ao criar salário');
        mostrarNotificacao(msg, 'erro');
      }
    })
  );
}
