import {
  abrirModal,
  fecharModal,
  mostrarErroInline,
  limparErroInline,
} from '../modalEditar.js';
import { tratarErro } from '../notification.js';
import { formatarValor, parseCurrency } from '../helpers/index.js';
import { atualizarSalario, deletarSalario } from './service.js';

export function criarTemplateEditarSalario(
  valor,
  diaRecebimento,
  destinoAtual,
  contas
) {
  const optionsContas = (contas || [])
    .map((conta) => {
      const selected = conta._id === destinoAtual ? 'selected' : '';
      return `<option value="${conta._id}" ${selected}>${conta.nome} (${conta.tipo})</option>`;
    })
    .join('');

  const carteiraSelecionada = destinoAtual === 'carteira' ? 'selected' : '';

  return `
    <div class="form-group">
      <label>Valor</label>
      <input type="text" inputmode="decimal" data-moeda id="modalValorSalario" value="${formatarValor(valor)}" required>
    </div>
    <div class="form-group">
      <label>Dia do recebimento</label>
      <select id="modalDiaRecebimento" required>
        ${[...Array(31)]
          .map((_, i) => {
            const dia = i + 1;
            const selected = dia === diaRecebimento ? 'selected' : '';
            return `<option value="${dia}" ${selected}>Dia ${dia}</option>`;
          })
          .join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Destino do depósito</label>
      <select id="modalContaSalario">
        <option value="" ${!destinoAtual ? 'selected' : ''}>Selecione a conta ou carteira</option>
        <option value="carteira" ${carteiraSelecionada}>Carteira (dinheiro físico)</option>
        ${optionsContas}
      </select>
    </div>
  `;
}

export async function abrirModalEditarSalario({
  id,
  valor,
  diaRecebimento,
  destinoAtual,
  contas,
  onAtualizar,
}) {
  abrirModal({
    titulo: 'Editar salário',

    conteudoHTML: criarTemplateEditarSalario(
      valor,
      diaRecebimento,
      destinoAtual,
      contas
    ),

    onSalvar: async () => {
      limparErroInline();

      const novoValor = parseCurrency(
        document.getElementById('modalValorSalario')?.value
      );
      const novoDiaRecebimento = Number(
        document.getElementById('modalDiaRecebimento')?.value
      );
      const novaConta =
        document.getElementById('modalContaSalario')?.value || null;

      if (!novoValor || !novoDiaRecebimento) {
        mostrarErroInline('Por favor, preencha todos os campos obrigatórios');
        return;
      }

      try {
        await atualizarSalario(id, {
          valor: novoValor,
          diaRecebimento: novoDiaRecebimento,
          frequencia: 'mensal',
          conta: novaConta,
        });

        fecharModal();
        await onAtualizar();
      } catch (err) {
        const msg = tratarErro(err, 'Erro ao atualizar salário');
        mostrarErroInline(msg);
      }
    },
  });
}

export async function abrirModalDeletarSalario({ id, onAtualizar }) {
  abrirModal({
    titulo: 'Confirmar exclusão',
    conteudoHTML: `<p>Tem certeza que deseja deletar este salário?</p>`,
    onSalvar: async () => {
      try {
        await deletarSalario(id);
        fecharModal();
        await onAtualizar();
      } catch (err) {
        const msg = tratarErro(err, 'Erro ao deletar salário');
        mostrarErroInline(msg);
      }
    },
  });
}
