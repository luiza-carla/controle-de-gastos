import {
  apiFetch,
  clearLegacyAuthState,
  salvarPreferenciasUsuario,
} from './config.js';
import { abrirModal, fecharModal, mostrarErroInline } from './modalEditar.js';
import {
  abrirModalConfirmacao,
  fecharModal as fecharModalConfirmacao,
} from './modalDeletar.js';
import { mostrarNotificacao, tratarErro } from './notification.js';
import { $, setTextById, configurarToggleSenha } from './helpers/index.js';
import { formatarData } from './helpers/format.js';

const PERFIL_URL = '/usuarios/perfil';
const ALTERAR_SENHA_URL = '/usuarios/alterar-senha';
const PREFERENCIAS_URL = '/usuarios/preferencias';
const DESATIVAR_URL = '/usuarios/desativar';
const EXCLUIR_URL = '/usuarios/excluir';

let perfilCarregado = false;
let salvandoSenha = false;
let salvandoPreferencias = false;
let desativandoConta = false;
let excluindoConta = false;

function formatarMembroDesde(data) {
  if (!data) {
    return '-';
  }

  const dataObj = new Date(data);
  if (Number.isNaN(dataObj.getTime())) {
    return formatarData(data);
  }

  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(dataObj);
}

function atualizarExemploFormatoData() {
  const select = $('selectFormatoData');
  const formatoData = select?.value || 'DD/MM/AAAA';
  const dataExemplo = new Date(2026, 4, 6);

  const exemplo =
    formatoData === 'AAAA-MM-DD'
      ? '2026-05-06'
      : dataExemplo.toLocaleDateString('pt-BR');

  setTextById('exemploFormatoData', `Exemplo atual: ${exemplo}`);
}

function atualizarTela({ usuario }) {
  setTextById('nomeUsuario', usuario?.nome || '-');
  setTextById('emailUsuario', usuario?.email || '-');
  setTextById('membroDesde', formatarMembroDesde(usuario?.createdAt));
  setTextById('statusConta', usuario?.ativa === false ? 'Desativada' : 'Ativa');

  const statusContaEl = $('statusConta');
  if (statusContaEl) {
    statusContaEl.classList.toggle(
      'perfil-status-inativa',
      usuario?.ativa === false
    );
  }

  const selectFormatoData = $('selectFormatoData');
  if (selectFormatoData) {
    selectFormatoData.value =
      usuario?.preferencias?.formatoData === 'AAAA-MM-DD'
        ? 'AAAA-MM-DD'
        : 'DD/MM/AAAA';
  }

  atualizarExemploFormatoData();
}

async function carregarPerfil() {
  const dados = await apiFetch(PERFIL_URL);
  atualizarTela(dados);
}

function getSenhaModalHtml() {
  return `
    <form id="formAlterarSenha" class="perfil-password-form">
      <div class="perfil-password-group">
        <label for="senhaAtual">Senha atual</label>
        <div class="perfil-password-field">
          <input id="senhaAtual" type="password" autocomplete="current-password" />
          <button
            class="password-toggle"
            data-target="senhaAtual"
            type="button"
            aria-label="Mostrar senha"
            aria-pressed="false"
          >
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      </div>

      <div class="perfil-password-group">
        <label for="novaSenha">Nova senha</label>
        <div class="perfil-password-field">
          <input id="novaSenha" type="password" autocomplete="new-password" />
          <button
            class="password-toggle"
            data-target="novaSenha"
            type="button"
            aria-label="Mostrar senha"
            aria-pressed="false"
          >
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      </div>

      <div class="perfil-password-group">
        <label for="confirmarNovaSenha">Confirmar nova senha</label>
        <div class="perfil-password-field">
          <input
            id="confirmarNovaSenha"
            type="password"
            autocomplete="new-password"
          />
          <button
            class="password-toggle"
            data-target="confirmarNovaSenha"
            type="button"
            aria-label="Mostrar senha"
            aria-pressed="false"
          >
            <i class="fa-solid fa-eye"></i>
          </button>
        </div>
      </div>
    </form>
  `;
}

function abrirModalAlterarSenha() {
  abrirModal({
    titulo: 'Alterar senha',
    conteudoHTML: getSenhaModalHtml(),
    onSalvar: async () => {
      if (salvandoSenha) {
        return;
      }

      const senhaAtual = $('senhaAtual')?.value || '';
      const novaSenha = $('novaSenha')?.value || '';
      const confirmarNovaSenha = $('confirmarNovaSenha')?.value || '';

      if (!senhaAtual || !novaSenha || !confirmarNovaSenha) {
        mostrarErroInline('Preencha todos os campos para alterar a senha.');
        return;
      }

      salvandoSenha = true;

      try {
        await apiFetch(ALTERAR_SENHA_URL, {
          method: 'PUT',
          body: JSON.stringify({
            senhaAtual,
            novaSenha,
            confirmarNovaSenha,
          }),
        });

        fecharModal();
        mostrarNotificacao('Senha alterada com sucesso.');
      } catch (error) {
        const mensagem = tratarErro(error, 'Não foi possível alterar a senha');
        mostrarErroInline(mensagem);
      } finally {
        salvandoSenha = false;
      }
    },
  });

  configurarToggleSenha('senhaAtual');
  configurarToggleSenha('novaSenha');
  configurarToggleSenha('confirmarNovaSenha');
}

function confirmarDesativacao() {
  abrirModalConfirmacao({
    titulo: 'Desativar conta',
    mensagem:
      'Tem certeza que deseja desativar sua conta? Você será desconectada imediatamente.',
    onConfirmar: async () => {
      if (desativandoConta) {
        return;
      }

      desativandoConta = true;

      try {
        await apiFetch(DESATIVAR_URL, { method: 'PATCH' });
        fecharModalConfirmacao();
        clearLegacyAuthState();
        window.location.href = '/html/login.html';
      } catch (error) {
        const mensagem = tratarErro(
          error,
          'Não foi possível desativar a conta'
        );
        mostrarNotificacao(mensagem, 'erro');
      } finally {
        desativandoConta = false;
      }
    },
  });
}

async function salvarPreferencias() {
  if (salvandoPreferencias) {
    return;
  }

  const formatoData = $('selectFormatoData')?.value || 'DD/MM/AAAA';
  salvandoPreferencias = true;

  try {
    const resposta = await apiFetch(PREFERENCIAS_URL, {
      method: 'PUT',
      body: JSON.stringify({ formatoData }),
    });

    salvarPreferenciasUsuario(resposta?.preferencias || { formatoData });
    atualizarExemploFormatoData();
    mostrarNotificacao(
      'Preferências salvas. As datas da aplicação foram atualizadas.' //aqui
    );
    window.location.reload();
  } catch (error) {
    const mensagem = tratarErro(
      error,
      'Não foi possível salvar as preferências'
    );
    mostrarNotificacao(mensagem, 'erro');
  } finally {
    salvandoPreferencias = false;
  }
}

function confirmarExclusaoConta() {
  abrirModalConfirmacao({
    titulo: 'Excluir conta',
    mensagem:
      'Essa ação exclui definitivamente sua conta e todos os seus dados. Deseja continuar?',
    onConfirmar: async () => {
      if (excluindoConta) {
        return;
      }

      excluindoConta = true;

      try {
        await apiFetch(EXCLUIR_URL, { method: 'DELETE' });
        fecharModalConfirmacao();
        clearLegacyAuthState();
        window.location.href = '/html/registrar.html';
      } catch (error) {
        const mensagem = tratarErro(error, 'Não foi possível excluir a conta');
        mostrarNotificacao(mensagem, 'erro');
      } finally {
        excluindoConta = false;
      }
    },
  });
}

function bindAcoes() {
  const btnAlterarSenha = $('btnAlterarSenha');
  if (btnAlterarSenha && !btnAlterarSenha.dataset.bound) {
    btnAlterarSenha.dataset.bound = 'true';
    btnAlterarSenha.addEventListener('click', abrirModalAlterarSenha);
  }

  const btnDesativarConta = $('btnDesativarConta');
  if (btnDesativarConta && !btnDesativarConta.dataset.bound) {
    btnDesativarConta.dataset.bound = 'true';
    btnDesativarConta.addEventListener('click', confirmarDesativacao);
  }

  const btnSalvarPreferencias = $('btnSalvarPreferencias');
  if (btnSalvarPreferencias && !btnSalvarPreferencias.dataset.bound) {
    btnSalvarPreferencias.dataset.bound = 'true';
    btnSalvarPreferencias.addEventListener('click', salvarPreferencias);
  }

  const selectFormatoData = $('selectFormatoData');
  if (selectFormatoData && !selectFormatoData.dataset.bound) {
    selectFormatoData.dataset.bound = 'true';
    selectFormatoData.addEventListener('change', atualizarExemploFormatoData);
  }

  const btnExcluirConta = $('btnExcluirConta');
  if (btnExcluirConta && !btnExcluirConta.dataset.bound) {
    btnExcluirConta.dataset.bound = 'true';
    btnExcluirConta.addEventListener('click', confirmarExclusaoConta);
  }
}

export async function initPerfil() {
  if (!$('paginaPerfil') || perfilCarregado) {
    return;
  }

  perfilCarregado = true;
  bindAcoes();

  try {
    await carregarPerfil();
  } catch (error) {
    perfilCarregado = false;
    const mensagem = tratarErro(error, 'Não foi possível carregar o perfil');
    mostrarNotificacao(mensagem, 'erro');
  }
}
