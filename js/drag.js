function initSortableList(container, options) {
  if (typeof Sortable === 'undefined' || !container || container.dataset.sortableReady === '1') return null;
  container.dataset.sortableReady = '1';
  return new Sortable(container, {
    animation: 170,
    delayOnTouchOnly: true,
    delay: 80,
    touchStartThreshold: 4,
    ghostClass: 'dragging',
    chosenClass: 'drag-over',
    ...options,
  });
}

function initStatsSortable() {
  const stats = document.querySelector('.stats-grid');
  if (!stats) return;
  applySavedOrder(stats, '[data-stat-card]', 'statCard', STATS_ORDER_KEY);
  initSortableList(stats, {
    draggable: '[data-stat-card]',
    onEnd: () => saveCurrentOrder(stats, '[data-stat-card]', 'statCard', STATS_ORDER_KEY),
  });
}

function syncKanbanFromDom() {
  const statusByList = { 'kanban-todo': 'todo', 'kanban-doing': 'doing', 'kanban-done': 'done' };
  const ordered = [];
  Object.entries(statusByList).forEach(([listId, status]) => {
    document.querySelectorAll(`#${listId} [data-card-id]`).forEach(cardEl => {
      const card = state.kanbanCards.find(item => item.id === cardEl.dataset.cardId);
      if (card) {
        card.status = status;
        ordered.push(card);
      }
    });
  });
  const untouched = state.kanbanCards.filter(card => !ordered.some(item => item.id === card.id));
  state.kanbanCards = [...ordered, ...untouched];
  save();
  renderKanban();
}

function initKanbanSortable() {
  if (typeof Sortable === 'undefined') return;
  ['kanban-todo', 'kanban-doing', 'kanban-done'].forEach(id => {
    const list = document.getElementById(id);
    initSortableList(list, {
      group: 'planner-kanban',
      draggable: '.kanban-card',
      filter: '.mini-btn, .empty',
      preventOnFilter: false,
      onEnd: syncKanbanFromDom,
    });
  });
}

function initDraggableOrder(containerSelector, itemSelector, dataAttr, storageKey) {
  const container = document.querySelector(containerSelector);
  if (!container) return;
  if (typeof Sortable !== 'undefined') {
    initStatsSortable();
    return;
  }
  applySavedOrder(container, itemSelector, dataAttr, storageKey);
  let dragged = null;

  container.querySelectorAll(itemSelector).forEach(item => {
    item.setAttribute('draggable', 'true');
    item.addEventListener('dragstart', () => {
      dragged = item;
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      container.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      saveCurrentOrder(container, itemSelector, dataAttr, storageKey);
    });
    item.addEventListener('dragover', event => {
      event.preventDefault();
      if (!dragged || dragged === item) return;
      item.classList.add('drag-over');
      const rect = item.getBoundingClientRect();
      const after = event.clientX > rect.left + rect.width / 2 || event.clientY > rect.top + rect.height / 2;
      container.insertBefore(dragged, after ? item.nextSibling : item);
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', event => {
      event.preventDefault();
      item.classList.remove('drag-over');
      saveCurrentOrder(container, itemSelector, dataAttr, storageKey);
    });
  });
}

function applySavedOrder(container, itemSelector, dataAttr, storageKey) {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return;
  try {
    const order = JSON.parse(raw);
    const items = Array.from(container.querySelectorAll(itemSelector));
    order.forEach(key => {
      const item = items.find(el => el.dataset[dataAttr] === key);
      if (item) container.appendChild(item);
    });
  } catch {
    localStorage.removeItem(storageKey);
  }
}

function saveCurrentOrder(container, itemSelector, dataAttr, storageKey) {
  const order = Array.from(container.querySelectorAll(itemSelector))
    .map(item => item.dataset[dataAttr])
    .filter(Boolean);
  localStorage.setItem(storageKey, JSON.stringify(order));
}

function applySavedLayout() {
  const stats = document.querySelector('.stats-grid');
  if (stats) applySavedOrder(stats, '[data-stat-card]', 'statCard', STATS_ORDER_KEY);
  document.querySelectorAll('[data-dashboard-panel]').forEach(panel => {
    panel.setAttribute('draggable', 'true');
  });
}

function initDashboardDragDrop() {
  initDraggableOrder('.stats-grid', '[data-stat-card]', 'statCard', STATS_ORDER_KEY);
  document.querySelectorAll('[data-dashboard-panel]').forEach(panel => {
    panel.setAttribute('draggable', 'true');
    panel.addEventListener('dragstart', () => panel.classList.add('dragging'));
    panel.addEventListener('dragend', () => {
      panel.classList.remove('dragging');
      const parent = panel.parentElement;
      if (!parent) return;
      const order = Array.from(parent.querySelectorAll('[data-dashboard-panel]')).map(el => el.dataset.dashboardPanel);
      localStorage.setItem(PANEL_ORDER_KEY + ':' + parent.id, JSON.stringify(order));
    });
  });
}
