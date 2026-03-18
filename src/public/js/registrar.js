import { setToken, apiFetch } from './config.js';
import { $, configurarToggleSenha } from './helpers/index.js';
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
  formRegistrar.onsubmit = async (e) => {
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

      // Faz requisição de registro com dados do formulário
      const data = await apiFetch(`${baseUrl}/registrar`, {
        method: 'POST',
        body: JSON.stringify({
          nome,
          email,
          senha,
        }),
      });

      // Salva token e redireciona se sucesso
      if (data.token) {
        setToken(data.token);
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
  };
}
