// Cria opcao HTML para select
export function criarOpcao(valor, texto) {
  return `<option value="${valor}">${texto}</option>`;
}

// Transforma array de itens em HTML de cards
export function criarCardsHTML(lista, gerador) {
  return lista.map(gerador).join('');
}

// Define texto de elemento por ID
export function setTextById(id, texto) {
  const el = document.getElementById(id);
  if (el) el.textContent = texto;
}

// Define conteudo HTML de elemento por ID
export function setHTMLById(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// Mostra elemento (remove display none)
export function showElement(el) {
  if (el) el.style.display = '';
}

// Oculta elemento
export function hideElement(el) {
  if (el) el.style.display = 'none';
}

// Limpa conteudo HTML de elemento
export function clearElement(el) {
  if (el) el.innerHTML = '';
}

// Popula select com opcoes de um array
export function populateSelect(selectEl, items, valueFn, textFn) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  items.forEach((item) => {
    const valor = valueFn ? valueFn(item) : item._id;
    const texto = textFn ? textFn(item) : item.nome || '';
    selectEl.innerHTML += criarOpcao(valor, texto);
  });
}

// Atalho para document.getElementById
export function $(id) {
  return document.getElementById(id);
}

// Obtém o nome da página atual a partir da URL
export function getPaginaAtual(fallback = '') {
  return window.location.pathname.split('/').pop() || fallback;
}

// Ativa ou desativa elemento por ID
export function setDisabledById(id, disabled) {
  const el = $(id);
  if (el) el.disabled = disabled;
}

// Mostra modal global
export function showModal() {
  const modal = document.getElementById('modalGlobal');
  if (modal) modal.style.display = 'flex';
}

// Oculta modal global
export function hideModal() {
  const modal = document.getElementById('modalGlobal');
  if (modal) modal.style.display = 'none';
}

// Mostra overlay global de carregamento (p.ex. "Enviando...")
export function showLoadingOverlay(message = 'Enviando...') {
  const overlay = document.getElementById('loadingOverlay');
  if (!overlay) return;

  const titleEl = overlay.querySelector('.loading-title');
  if (titleEl) titleEl.textContent = message;

  overlay.style.display = 'flex';
}

// Oculta overlay global de carregamento
export function hideLoadingOverlay() {
  const overlay = document.getElementById('loadingOverlay');
  if (!overlay) return;
  overlay.style.display = 'none';
}

// Adiciona evento a elemento por ID
export function onEventById(id, evento, handler) {
  const el = $(id);
  if (el) el.addEventListener(evento, handler);
}

// Adiciona classe a elemento
export function addClass(el, classe) {
  if (el) el.classList.add(classe);
}

// Remove classe de elemento
export function removeClass(el, classe) {
  if (el) el.classList.remove(classe);
}

// Cria options HTML para select a partir de array de itens
export function criarOptionsHTML(items, valueFn, textFn, optionAtual = null) {
  return items
    .map((item) => {
      const valor = valueFn ? valueFn(item) : item._id;
      const texto = textFn ? textFn(item) : item.nome || '';
      const selected = optionAtual === valor ? 'selected' : '';
      return `<option value="${valor}" ${selected}>${texto}</option>`;
    })
    .join('');
}

// Cria botões de ação para cards (editar, deletar, etc)
export function criarBotoesAcao(acoes) {
  return acoes
    .map((acao) => {
      let variant = acao.classe || '';
      if (variant && !variant.startsWith('btn-')) {
        variant = `btn-${variant}`;
      }

      const dataAttrs = acao.dataAttributes
        ? Object.entries(acao.dataAttributes)
            .map(([key, value]) => ` data-${key}="${value}"`)
            .join('')
        : '';

      const titleAttr = acao.title ? ` title="${acao.title}"` : '';
      const text = acao.texto ? ` ${acao.texto}` : '';
      const onclick = acao.onclick ? ` onclick="${acao.onclick}"` : '';

      return `
    <button class="btn ${variant}"${onclick}${titleAttr}${dataAttrs}>
      <i class="fa-solid ${acao.icone}"></i>${text}
    </button>
  `;
    })
    .join('');
}

// Configura botão de mostrar/ocultar senha para um input
export function configurarToggleSenha(inputId) {
  const senhaInput = $(inputId);
  const toggleBtn = document.querySelector(
    `.password-toggle[data-target="${inputId}"]`
  );

  if (!toggleBtn || !senhaInput) return;

  toggleBtn.addEventListener('click', () => {
    const visivel = senhaInput.type === 'text';
    senhaInput.type = visivel ? 'password' : 'text';

    const icone = toggleBtn.querySelector('i');
    if (icone) {
      icone.classList.toggle('fa-eye', visivel);
      icone.classList.toggle('fa-eye-slash', !visivel);
    }

    toggleBtn.setAttribute('aria-pressed', String(!visivel));
    toggleBtn.setAttribute(
      'aria-label',
      visivel ? 'Mostrar senha' : 'Ocultar senha'
    );
  });
}
