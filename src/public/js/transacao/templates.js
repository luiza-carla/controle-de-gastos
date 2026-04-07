import {
  formatarValor,
  formatarData,
  capitalizar,
  escaparHtml,
  criarBotoesAcao,
  criarBadgesCategoriaSubcategoriaSeparados,
  gerarTags,
  getCategoryThemeClass,
} from '../helpers/index.js';

export function templateTransacaoCard(t) {
  const tipoClasse =
    t.tipo === 'entrada' ? 'transacao-entrada' : 'transacao-saida';

  const tipoCapitalizado = capitalizar(t.tipo);
  const tipoDespesaCapitalizado = t.tipoDespesa
    ? capitalizar(t.tipoDespesa)
    : '';
  const recorrenciaCapitalizada =
    t.recorrencia && t.recorrencia.toLowerCase() !== 'nenhuma'
      ? capitalizar(t.recorrencia)
      : '';
  const statusCapitalizado = capitalizar(t.status);

  const temRecorrencia =
    t.recorrencia && t.recorrencia.toLowerCase() !== 'nenhuma';

  const valorFormatado = formatarValor(t.valor);

  const conta =
    t.fonteSaldo === 'carteira'
      ? 'Carteira (dinheiro físico)'
      : t.conta?.nome || 'Sem conta';

  const { categoriaBadge, subcategoriaBadge } =
    criarBadgesCategoriaSubcategoriaSeparados(t.categoria, t.subcategoria);
  const themeClass = getCategoryThemeClass(t.categoria?.cor, t.categoria?.nome);

  const tags = gerarTags(t.tags);
  const dataCriacao = formatarData(t.createdAt || t.data);

  const parcelaAtual = t.parcelamento?.parcelaAtual || 1;
  const totalParcelas = t.parcelamento?.totalParcelas || 1;

  return `
    <div class="transacao-card ${tipoClasse} ${themeClass}">

      <div class="transacao-header">
        <div class="transacao-titulo">
          ${escaparHtml(t.titulo)}
        </div>
        <div class="transacao-valor ${tipoClasse}">
          R$ ${valorFormatado}
        </div>
      </div>

      <div class="transacao-corpo">
        <div class="transacao-info-grid">
          
          <div class="info-linha">
            <span class="info-label">Tipo:</span>
            <span class="info-valor info-valor-tipo">
              <span class="tipo-chip tipo-chip-${t.tipo}">${tipoCapitalizado}</span>
              ${
                tipoDespesaCapitalizado
                  ? `<span class="tipo-chip tipo-chip-despesa">${tipoDespesaCapitalizado}</span>`
                  : ''
              }
            </span>
          </div>

          <div class="info-linha">
            <span class="info-label">Categoria:</span>
            <span class="info-valor">
              ${categoriaBadge}
            </span>
          </div>

          ${
            subcategoriaBadge
              ? `<div class="info-linha">
            <span class="info-label">Subcategoria:</span>
            <span class="info-valor">${subcategoriaBadge}</span>
          </div>`
              : ''
          }

          <div class="info-linha">
            <span class="info-label">Conta:</span>
            <span class="info-valor">${escaparHtml(conta)}</span>
          </div>

          <div class="info-linha">
            <span class="info-label">Status:</span>
            <span class="info-valor">${statusCapitalizado}</span>
          </div>

          <div class="info-linha">
            <span class="info-label">Criada em:</span>
            <span class="info-valor">${dataCriacao}</span>
          </div>

          ${
            temRecorrencia
              ? `<div class="info-linha">
            <span class="info-label">Recorrência:</span>
            <span class="info-valor">${recorrenciaCapitalizada}</span>
          </div>`
              : ''
          }

          ${
            temRecorrencia
              ? `<div class="info-linha">
            <span class="info-label">Parcela:</span>
            <span class="info-valor">${parcelaAtual}/${totalParcelas}</span>
          </div>`
              : ''
          }

          ${
            temRecorrencia
              ? `<div class="info-linha">
            <span class="info-label">Data da primeira parcela:</span>
            <span class="info-valor">${
              t.dataPrimeiraParcela
                ? formatarData(t.dataPrimeiraParcela)
                : 'Não definida'
            }</span>
          </div>`
              : ''
          }
        </div>

        ${
          tags
            ? `<div class="transacao-tags">
          ${tags}
        </div>`
            : ''
        }
      </div>

      <div class="transacao-acoes">
        ${criarBotoesAcao([
          {
            classe: 'secondary',
            dataAttributes: {
              action: 'editar',
              id: t._id,
            },
            icone: 'fa-pen',
            title: 'Editar',
          },
          {
            classe: 'danger',
            dataAttributes: {
              action: 'deletar',
              id: t._id,
            },
            icone: 'fa-trash',
            title: 'Deletar',
          },
        ])}
      </div>

    </div>
  `;
}

export function templateEditarTransacaoModal(transacao, contas) {
  const destinoAtual =
    transacao.fonteSaldo === 'carteira' ? 'carteira' : transacao.conta?._id;

  const carteiraSelecionada = destinoAtual === 'carteira' ? 'selected' : '';
  const optionsContas = (contas || [])
    .map((conta) => {
      const selecionada = conta._id === destinoAtual ? 'selected' : '';
      return `<option value="${conta._id}" data-tipo="${escaparHtml(
        conta.tipo
      )}" ${selecionada}>${escaparHtml(
        conta.nome
      )} (${capitalizar(conta.tipo)})</option>`;
    })
    .join('');

  const tipoDespesaField = `
    <div class="form-group ${
      transacao.tipo === 'saida' ? '' : 'is-hidden'
    }" id="modalGrupoTipoDespesa">
      <label>Tipo de Despesa</label>
      <select id="modalTipoDespesa">
        <option value="">Selecione o tipo de despesa</option>
        <option value="essencial" ${
          transacao.tipoDespesa === 'essencial' ? 'selected' : ''
        }>Essencial</option>
        <option value="eventual" ${
          transacao.tipoDespesa === 'eventual' ? 'selected' : ''
        }>Eventual</option>
        <option value="opcional" ${
          transacao.tipoDespesa === 'opcional' ? 'selected' : ''
        }>Opcional</option>
      </select>
    </div>
  `;

  return `
    <div class="form-group">
      <label>Título</label>
      <input type="text" id="modalTituloTransacao" value="${escaparHtml(
        transacao.titulo
      )}" required>
    </div>
    <div class="form-group">
      <label>Valor</label>
      <input type="text" inputmode="decimal" data-moeda id="modalValorTransacao" value="${formatarValor(
        transacao.valor
      )}" required>
    </div>
    <div class="form-group">
      <label>Tipo</label>
      <select id="modalTipoTransacao" required>
        <option value="entrada" ${
          transacao.tipo === 'entrada' ? 'selected' : ''
        }>Entrada</option>
        <option value="saida" ${
          transacao.tipo === 'saida' ? 'selected' : ''
        }>Saída</option>
      </select>
    </div>
    <div class="form-group">
      <label>Status</label>
      <select id="modalStatusTransacao" required>
        <option value="pago" ${
          transacao.status === 'pago' ? 'selected' : ''
        }>Pago</option>
        <option value="pendente" ${
          transacao.status === 'pendente' ? 'selected' : ''
        }>Pendente</option>
      </select>
    </div>
    <div class="form-group">
      <label>Conta ou carteira</label>
      <select id="modalContaTransacao" required>
        <option value="" disabled ${!destinoAtual ? 'selected' : ''}>Selecione a conta ou carteira</option>
        <option value="carteira" ${carteiraSelecionada}>Carteira (dinheiro físico)</option>
        ${optionsContas}
      </select>
    </div>
    <div class="form-group">
      <label>Categoria</label>
       <div class="categoria-autocomplete">
         <input type="text" id="modalBuscaCategoriaTransacao" placeholder="Buscar categoria..." autocomplete="off" required>
         <input type="hidden" id="modalCategoriaTransacao" required>
         <div id="modalDropdownCategoriaTransacao" class="dropdown-categorias"></div>
       </div>
    </div>      <div class="form-group" id="modalSubcategoriaGroup">
      <label>Subcategoria</label>
      <div class="categoria-autocomplete">
        <input type="text" id="modalBuscaSubcategoriaTransacao" placeholder="Buscar ou selecionar subcategoria..." autocomplete="off">
        <input type="hidden" id="modalSubcategoriaTransacao">
        <div id="modalDropdownSubcategoriaTransacao" class="dropdown-categorias"></div>
      </div>
    </div>      <div class="form-group">
      <label>Tags</label>
      <div id="modalTagsContainer" class="tag-editor-container"></div>
      <div class="tag-editor-input-row">
        <input type="text" id="modalTagInput" class="tag-editor-input" placeholder="Adicionar tag">
        <button type="button" id="modalBtnAddTag" class="btn btn-tag-add">
          <i class="fa-solid fa-plus"></i>
        </button>
      </div>
    </div>
    ${tipoDespesaField}
    ${
      transacao.recorrencia && transacao.recorrencia !== 'nenhuma'
        ? `<div class="form-group">
      <label>Data da primeira parcela</label>
      <input type="date" id="modalDataPrimeiraParcela" value="${
        transacao.dataPrimeiraParcela
          ? new Date(transacao.dataPrimeiraParcela).toISOString().split('T')[0]
          : ''
      }" />
    </div>`
        : ''
    }
  `;
}
