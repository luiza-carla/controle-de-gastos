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
  formatarItemComTipo,
  criarOpcao,
  criarCardsHTML,
  criarOptionsHTML,
  criarBotoesAcao,
  populateSelect,
  capitalizar,
  escaparHtml,
  $,
  setHTMLById,
} from './helpers/index.js';
const VALOR_CARTEIRA = 'carteira';
const FORM_ERRO_ID = 'formErroInlineConta';
const FORM_MSG_ERRO_ID = 'formMensagemErroConta';

async function buscarContas() {
  return apiFetch('/contas');
}

async function atualizarSaldosTela() {
  await listarContas();

  if (window.exibirCarteira) {
    await window.exibirCarteira();
  }
}

// Lista todas as contas do usuário
export async function listarContas() {
  const contas = await buscarContas();

  const container = $('contas');

  if (container) {
    const gerarCard = (c) => {
      const botoesAcao = criarBotoesAcao([
        {
          classe: 'secondary',
          onclick: `editarConta('${c._id}')`,
          icone: 'fa-pen',
        },
        {
          classe: 'muted',
          onclick: `transferirDaConta('${c._id}')`,
          icone: 'fa-exchange',
        },
        {
          classe: 'danger',
          onclick: `deletarConta('${c._id}')`,
          icone: 'fa-trash',
        },
      ]);

      return `
        <div class="conta-card">
          <div class="conta-nome">${escaparHtml(c.nome)}</div>
          <div class="conta-tipo">Tipo: ${capitalizar(c.tipo)}</div>
          <div class="conta-saldo">R$ ${formatarValor(c.saldo)}</div>
          <div class="conta-acoes">${botoesAcao}</div>
        </div>
      `;
    };

    setHTMLById('contas', criarCardsHTML(contas, gerarCard));
  }

  return contas;
}

// Torna listarContas acessível globalmente
window.listarContas = listarContas;

// Cria nova conta a partir de formulário
export async function criarConta(formId, callback) {
  const form = $(formId);
  if (form) form.noValidate = true;
  garantirErroInline(form, FORM_ERRO_ID, FORM_MSG_ERRO_ID);

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    limparErroInline(FORM_ERRO_ID, FORM_MSG_ERRO_ID);

    const botaoClicado = e.submitter;
    const acao = botaoClicado?.getAttribute('data-action');
    const nomeConta = form.nome.value?.trim();
    const tipoConta = form.tipo.value;

    if (!nomeConta || !tipoConta) {
      abrirModalErro(
        'Por favor, preencha todos os campos obrigatórios',
        FORM_ERRO_ID,
        FORM_MSG_ERRO_ID
      );
      return;
    }

    try {
      await apiFetch('/contas', {
        method: 'POST',
        body: JSON.stringify({
          nome: nomeConta,
          tipo: tipoConta,
          saldo: Number(form.saldoInicial.value || 0),
        }),
      });

      if (acao === 'salvar-adicionar-outro') {
        mostrarNotificacao(`Conta "${nomeConta}" adicionada com sucesso!`);
        form.reset();
      } else if (window.location.pathname.includes('adicionar-conta')) {
        persistirNotificacaoParaProximaTela(
          `Conta "${nomeConta}" adicionada com sucesso!`
        );
        window.location.href = '/html/contas.html';
      } else {
        mostrarNotificacao(`Conta "${nomeConta}" adicionada com sucesso!`);
        listarContas();
      }

      if (callback) callback();
    } catch (erro) {
      mostrarNotificacao(
        'Erro ao criar conta: ' + (erro.message || 'Erro desconhecido'),
        'erro'
      );
    }
  });
}

// Abre modal para editar conta existente
window.editarConta = async (id) => {
  const conta = (await buscarContas()).find((c) => c._id === id);
  if (!conta) return;

  abrirModal({
    titulo: 'Editar conta',
    conteudoHTML: `
      <div class="form-group">
        <label>Nome</label>
        <input type="text" id="modalNomeConta" value="${escaparHtml(conta.nome)}" required>
      </div>
      <div class="form-group">
        <label>Tipo</label>
        <select id="modalTipoConta" required>
          <option value="corrente" ${conta.tipo === 'corrente' ? 'selected' : ''}>Corrente</option>
          <option value="credito" ${conta.tipo === 'credito' ? 'selected' : ''}>Crédito</option>
          <option value="investimento" ${conta.tipo === 'investimento' ? 'selected' : ''}>Investimento</option>
        </select>
      </div>
    `,
    onSalvar: async () => {
      limparErroInline();

      const novoNome = $('modalNomeConta')?.value;
      const novoTipo = $('modalTipoConta')?.value;

      if (!novoNome || !novoTipo) {
        mostrarErroInline('Por favor, preencha todos os campos obrigatórios');
        return;
      }

      try {
        await apiFetch(`/contas/${id}`, {
          method: 'PUT',
          body: JSON.stringify({
            nome: novoNome,
            tipo: novoTipo,
          }),
        });

        fecharModal();
        listarContas();
      } catch (err) {
        mostrarErroInline(err.message || 'Erro ao atualizar conta');
      }
    },
  });
};

// Abre modal de confirmação para deletar conta
window.deletarConta = async (id) => {
  abrirModalConfirmacao({
    titulo: 'Confirmar exclusão',
    mensagem: 'Tem certeza que deseja deletar esta conta?',
    onConfirmar: async () => {
      try {
        await apiFetch(`/contas/${id}`, { method: 'DELETE' });
        fecharModal();
        listarContas();
      } catch (err) {
        mostrarNotificacao(
          'Erro ao excluir conta: ' + (err.message || 'erro'),
          'erro'
        );
      }
    },
  });
};

// Popula select com lista de contas disponíveis
export async function popularSelectContas(selectId = 'conta') {
  const select = $(selectId);
  if (!select) return;

  const contas = await buscarContas();

  const placeholderTexto =
    selectId === 'conta' || selectId === 'contaSalario'
      ? 'Selecione a conta ou carteira'
      : 'Selecione a conta';
  const placeholderAttrs =
    selectId === 'contaSalario' ? 'selected' : 'selected disabled';

  select.innerHTML = `<option value="" ${placeholderAttrs}>${placeholderTexto}</option>`;

  populateSelect(
    select,
    contas,
    (conta) => conta._id,
    (conta) => formatarItemComTipo(conta)
  );

  if (selectId === 'conta' || selectId === 'contaSalario') {
    select.innerHTML += criarOpcao(
      VALOR_CARTEIRA,
      'Carteira (dinheiro físico)'
    );
  }

  if (selectId === 'conta' || selectId === 'contaSalario') {
    let etiquetaCarteira = 'Carteira (dinheiro físico)';
    try {
      const carteira = await apiFetch('/carteira');
      if (carteira && typeof carteira.saldo !== 'undefined') {
        etiquetaCarteira += ` - R$ ${formatarValor(carteira.saldo)}`;
      }
    } catch (e) {
      // falha em buscar carteira não é crítico; apenas exibimos label padrão
      // eslint-disable-next-line no-unused-vars
      const _ = e;
    }
    const opt = select.querySelector(`option[value="${VALOR_CARTEIRA}"]`);
    if (opt) opt.textContent = etiquetaCarteira;
  }
}

// Abre modal de transferência de conta para conta ou carteira
window.transferirDaConta = async (contaOrigemId) => {
  const contas = await buscarContas();
  const contaOrigem = contas.find((c) => c._id === contaOrigemId);

  if (!contaOrigem) return;

  // Outras contas (exceto a de origem)
  const outrasContas = contas.filter((c) => c._id !== contaOrigemId);

  const optionsCarteira = `<option value="${VALOR_CARTEIRA}">Dinheiro físico</option>`;
  const optionsContas = criarOptionsHTML(
    outrasContas,
    (c) => c._id,
    (c) => formatarItemComTipo(c)
  );

  abrirModal({
    titulo: 'Transferir de conta',
    conteudoHTML: `
      <div class="form-group">
        <label>De</label>
        <input type="text" value="${escaparHtml(contaOrigem.nome)}" disabled>
      </div>
      <div class="form-group">
        <label>Para</label>
        <select id="modalContaDestino" required>
          <option value="" selected disabled>Selecione o destino</option>
          ${optionsCarteira}
          ${optionsContas}
        </select>
      </div>
      <div class="form-group">
        <label>Valor</label>
        <input type="number" id="modalValorTransferenciaConta" step="0.01" min="0" required>
      </div>
      <div class="form-group">
        <small style="color: var(--text-secondary);">Saldo disponível: R$ ${formatarValor(contaOrigem.saldo)}</small>
      </div>
    `,
    onSalvar: async () => {
      const destino = $('modalContaDestino')?.value;
      const valor = parseFloat($('modalValorTransferenciaConta')?.value);

      limparErroInline();
      if (!destino || !valor || valor <= 0) {
        mostrarErroInline('Preencha todos os campos com valores válidos');
        return;
      }

      if (valor > contaOrigem.saldo) {
        mostrarErroInline('Saldo insuficiente na conta');
        return;
      }

      try {
        // Se o destino é carteira
        if (destino === VALOR_CARTEIRA) {
          await apiFetch('/carteira/transferir', {
            method: 'POST',
            body: JSON.stringify({
              contaId: contaOrigemId,
              valor,
              direcao: 'conta-para-carteira',
            }),
          });
        } else {
          // Transferência entre contas
          await apiFetch(`/contas/${contaOrigemId}/transferir`, {
            method: 'POST',
            body: JSON.stringify({
              contaDestinoId: destino,
              valor,
            }),
          });
        }

        fecharModal();
        await atualizarSaldosTela();
      } catch (err) {
        mostrarErroInline(err.message);
      }
    },
  });
};
