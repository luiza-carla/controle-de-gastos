import {
  apiFetch,
  clearLegacyAuthState,
  salvarPreferenciasUsuario,
} from './config.js';
import {
  $,
  configurarToggleSenha,
  createFormSubmitGuard,
} from './helpers/index.js';
import {
  mostrarErroInline,
  limparErroInline,
  garantirErroInline,
} from './modalEditar.js';
import { tratarErro } from './notification.js';

// URL base da API de usuários
const baseUrl = window.location.origin + '/usuarios';
const formRegistrar = $('formRegistrar');
if (formRegistrar) formRegistrar.noValidate = true;

const FORM_ERRO_ID = 'formErroInlineRegistrar';
const FORM_MSG_ERRO_ID = 'formMensagemErroRegistrar';

garantirErroInline(formRegistrar, FORM_ERRO_ID, FORM_MSG_ERRO_ID);
configurarToggleSenha('senha');

// Trata envio do formulário de registro
if (formRegistrar) {
  const guard = createFormSubmitGuard(formRegistrar);

  formRegistrar.addEventListener(
    'submit',
    guard(async (e) => {
      e.preventDefault();
      limparErroInline(FORM_ERRO_ID, FORM_MSG_ERRO_ID);

      try {
        const nome = $('nome').value?.trim();
        const email = $('email').value?.trim();
        const senha = $('senha').value;

        if (!nome || !email || !senha) {
          mostrarErroInline(
            'Por favor, preencha todos os campos obrigatórios',
            FORM_ERRO_ID,
            FORM_MSG_ERRO_ID
          );
          return;
        }

        const data = await apiFetch(`${baseUrl}/registrar`, {
          method: 'POST',
          body: JSON.stringify({
            nome,
            email,
            senha,
          }),
        });

        if (data?.usuario) {
          clearLegacyAuthState();
          salvarPreferenciasUsuario(data.usuario.preferencias || {});
          window.location.href = '/html/inicio.html';
        }
      } catch (err) {
        tratarErro(err, 'Erro ao registrar');
        mostrarErroInline(
          'Não foi possível registrar. Verifique os dados e tente novamente.',
          FORM_ERRO_ID,
          FORM_MSG_ERRO_ID
        );
      }
    })
  );
}
