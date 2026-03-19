import { setTextById, formatarValor } from '../helpers/index.js';
import { obterCarteira } from './service.js';
import {
  abrirModalAdicionarDinheiro,
  abrirModalRemoverDinheiro,
  abrirModalTransferencia,
} from './modal.js';

export async function initCarteiraPage() {
  await atualizarSaldoVisivel();
  bindCarteiraAcoes();
}

export async function atualizarSaldoVisivel() {
  const carteira = await obterCarteira();
  if (carteira) {
    setTextById('carteiraSaldo', `R$ ${formatarValor(carteira.saldo)}`);
  }
  return carteira;
}

export { atualizarSaldoVisivel as exibirCarteira };

function bindCarteiraAcoes() {
  const adicionarBtn = document.querySelector(
    '[data-carteira-action="adicionar"]'
  );
  const removerBtn = document.querySelector('[data-carteira-action="remover"]');
  const transferirBtn = document.querySelector(
    '[data-carteira-action="transferir"]'
  );

  adicionarBtn?.addEventListener('click', () =>
    abrirModalAdicionarDinheiro({ onAtualizar: atualizarSaldoVisivel })
  );
  removerBtn?.addEventListener('click', () =>
    abrirModalRemoverDinheiro({ onAtualizar: atualizarSaldoVisivel })
  );
  transferirBtn?.addEventListener('click', () =>
    abrirModalTransferencia({ onAtualizar: atualizarSaldoVisivel })
  );
}
