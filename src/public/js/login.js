import { apiFetch, clearLegacyAuthState } from './config.js';
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

// Referência do formulário e URL da API
const formLogin = $('formLogin');
const baseUrlUsuarios = window.location.origin + '/usuarios';
if (formLogin) formLogin.noValidate = true;

const FORM_ERRO_ID = 'formErroInlineLogin';
const FORM_MSG_ERRO_ID = 'formMensagemErroLogin';

garantirErroInline(formLogin, FORM_ERRO_ID, FORM_MSG_ERRO_ID);
configurarToggleSenha('loginSenha');

// Trata envio do formulário de login
if (formLogin) {
  const guard = createFormSubmitGuard(formLogin);

  formLogin.addEventListener(
    'submit',
    guard(async (e) => {
      e.preventDefault();
      limparErroInline(FORM_ERRO_ID, FORM_MSG_ERRO_ID);
      try {
        // Recupera valores do formulário
        const email = $('loginEmail').value?.trim();
        const senha = $('loginSenha').value;

        if (!email || !senha) {
          mostrarErroInline(
            'Por favor, preencha email e senha',
            FORM_ERRO_ID,
            FORM_MSG_ERRO_ID
          );
          return;
        }

        const data = await apiFetch(`${baseUrlUsuarios}/login`, {
          skipAuthRedirect: true,
          method: 'POST',
          body: JSON.stringify({ email, senha }),
        });

        if (data?.usuario) {
          clearLegacyAuthState();
          window.location.href = '/html/inicio.html';
        }
      } catch (err) {
        tratarErro(err, 'Erro ao fazer login');
        mostrarErroInline(
          'Não foi possível fazer login. Verifique suas credenciais e tente novamente.',
          FORM_ERRO_ID,
          FORM_MSG_ERRO_ID
        );
      }
    })
  );
}
