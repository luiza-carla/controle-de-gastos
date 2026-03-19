import {
  abrirModalErro,
  garantirErroInline,
  limparErroInline,
} from '../modalEditar.js';
import {
  mostrarNotificacao,
  persistirNotificacaoParaProximaTela,
  tratarErro,
} from '../notification.js';
import { parseCurrency, createFormSubmitGuard } from '../helpers/index.js';
import { createConta } from './api.js';
import { invalidateContas } from './service.js';

const FORM_ERRO_ID = 'formErroInlineConta';
const FORM_MSG_ERRO_ID = 'formMensagemErroConta';

export async function criarConta(formId, callback) {
  const form = document.getElementById(formId);
  if (!form) return;

  // Evita anexar o listener várias vezes (p.ex. se criarConta for chamado novamente)
  if (form.dataset.contaSubmitHandlerAttached) return;
  form.dataset.contaSubmitHandlerAttached = 'true';

  form.noValidate = true;
  garantirErroInline(form, FORM_ERRO_ID, FORM_MSG_ERRO_ID);

  const guardSubmit = createFormSubmitGuard(form);

  form.addEventListener(
    'submit',
    guardSubmit(async (e) => {
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
        await createConta({
          nome: nomeConta,
          tipo: tipoConta,
          saldo: parseCurrency(form.saldoInicial.value || 0) || 0,
        });

        invalidateContas();

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
        }

        if (callback) await callback();
      } catch (erro) {
        const msg = tratarErro(erro, 'Erro ao criar conta');
        mostrarNotificacao(msg, 'erro');
      }
    })
  );
}
