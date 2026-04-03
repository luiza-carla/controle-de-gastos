// Templates HTML para os modais da carteira.

export function templateAdicionarDinheiro() {
  return `
    <div class="form-group">
      <label>Valor a adicionar</label>
      <input type="text" inputmode="decimal" data-moeda id="modalValorDinheiro" min="0" required>
    </div>
  `;
}

export function templateRemoverDinheiro(saldoDisponivel) {
  return `
    <div class="form-group">
      <label>Valor a remover</label>
      <input type="text" inputmode="decimal" data-moeda id="modalValorRemover" min="0" required>
    </div>
    <div class="form-group">
      <small class="text-secondary">Saldo disponível: R$ ${saldoDisponivel}</small>
    </div>
  `;
}

export function templateTransferencia(carteiraSaldo, contasOptionsHtml) {
  return `
    <div class="form-group">
      <label>Conta de destino</label>
      <select id="modalContaTransferencia" required>
        <option value="" selected disabled>Selecione a conta</option>
        ${contasOptionsHtml}
      </select>
    </div>
    <div class="form-group">
      <label>Valor</label>
      <input type="text" inputmode="decimal" data-moeda id="modalValorTransferencia" min="0" required>
    </div>
    <div class="form-group">
      <small class="text-secondary">Saldo disponível: R$ ${carteiraSaldo}</small>
    </div>
  `;
}
