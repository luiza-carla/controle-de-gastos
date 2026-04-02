import { desejosService } from './api.js';
import { createDesejosState } from './state.js';
import { criarControladorListaDesejos } from './render.js';
import {
  abrirModalEditarDesejoComAcoes,
  abrirModalRealizarDesejoComAcoes,
  abrirModalConfirmarRemoverDesejo,
} from './modal.js';
import { initFormDesejos } from './form.js';
import { initFiltroCategoriaDesejo, initOrdenacaoDesejos } from './filters.js';
import { mostrarNotificacao, tratarErro } from '../notification.js';
import { $ } from '../helpers/index.js';

const state = createDesejosState({ onPageChange: renderPaginaDesejos });
const controladorListaDesejos = criarControladorListaDesejos({
  state,
  onAction: handleCardAction,
});

function renderPaginaDesejos() {
  controladorListaDesejos.render();
}

async function carregarDesejos() {
  const desejos = await desejosService.listar(state.ordenarPor);
  state.setItens(desejos || []);
}

export async function listarDesejos() {
  const container = $('listaDesejos');
  if (!container) return;

  await carregarDesejos();
  renderPaginaDesejos();
}

async function handleCardAction({ action, id }) {
  if (action === 'editar') {
    return abrirModalEditarDesejoComAcoes({
      id,
      state,
      onAtualizar: renderPaginaDesejos,
    });
  }

  if (action === 'realizar') {
    return abrirModalRealizarDesejoComAcoes({
      id,
      state,
      onAtualizar: renderPaginaDesejos,
    });
  }

  if (action === 'deletar') {
    return abrirModalConfirmarRemoverDesejo({
      id,
      state,
      onAtualizar: renderPaginaDesejos,
    });
  }
}

export async function initDesejos() {
  if ($('formListaDesejo')) {
    const formController = initFormDesejos(state, {
      onCreated: (novoDesejo, { keepForm, action, error } = {}) => {
        if (error) {
          const msg = tratarErro(error, 'Erro ao criar desejo');
          mostrarNotificacao(msg, 'erro');
          return;
        }

        if (action === 'salvar-redirect') {
          // redireciona para a lista de desejos após gravar
          window.location.href = '/html/lista-desejos.html';
          return;
        }

        if (keepForm) {
          mostrarNotificacao(
            `Desejo "${novoDesejo.titulo}" adicionado com sucesso!`
          );
          return;
        }

        mostrarNotificacao(
          `Desejo "${novoDesejo.titulo}" adicionado com sucesso!`
        );
        formController?.resetForm?.();
        renderPaginaDesejos();
      },
    });
  }

  if ($('listaDesejos')) {
    controladorListaDesejos.init();
    state.pagination.init();
    await initFiltroCategoriaDesejo(state, listarDesejos);
    await listarDesejos();
    initOrdenacaoDesejos(state, listarDesejos, listarDesejos);
  }
}
