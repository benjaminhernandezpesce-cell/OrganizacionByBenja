function renderKanban() {
  const statuses = ['todo', 'doing', 'done'];
  statuses.forEach(status => {
    const list = document.getElementById('kanban-' + status);
    const count = document.getElementById('kanban-count-' + status);
    if (!list) return;
    const cards = (state.kanbanCards || []).filter(card => card.status === status);
    list.innerHTML = cards.length ? '' : '<div class="empty">Arrastrá tarjetas acá.</div>';
    if (count) count.textContent = cards.length;
    cards.forEach(card => {
      const el = document.createElement('div');
      el.className = 'kanban-card';
      el.draggable = typeof Sortable === 'undefined';
      el.dataset.cardId = card.id;
      el.innerHTML = `
        <div class="kanban-title">${escapeHtml(card.title)}</div>
        <div class="kanban-meta">${escapeHtml(card.desc || '')}</div>
        ${card.tag ? `<div class="contact-tag" style="margin-top:8px;">${escapeHtml(card.tag)}</div>` : ''}
        <button class="mini-btn danger" onclick="deleteKanbanCard('${card.id}')" style="margin-top:10px;" aria-label="Eliminar tarjeta"><i class="ph ph-trash"></i></button>
      `;
      if (typeof Sortable === 'undefined') {
        el.addEventListener('dragstart', () => {
          el.classList.add('dragging');
          window._dragKanbanId = card.id;
        });
        el.addEventListener('dragend', () => {
          el.classList.remove('dragging');
          window._dragKanbanId = null;
        });
      }
      list.appendChild(el);
    });
  });

  document.querySelectorAll('.kanban-column').forEach(column => {
    column.ondragover = (event) => {
      event.preventDefault();
      column.classList.add('drag-over');
    };
    column.ondragleave = () => column.classList.remove('drag-over');
    column.ondrop = (event) => {
      event.preventDefault();
      column.classList.remove('drag-over');
      const id = window._dragKanbanId;
      const card = state.kanbanCards.find(item => item.id === id);
      if (!card) return;
      card.status = column.dataset.kanbanStatus;
      save();
      renderKanban();
    };
  });
  initKanbanSortable();
}

function addKanbanCard() {
  const title = document.getElementById('kanban-title-input').value.trim();
  const desc = document.getElementById('kanban-desc-input').value.trim();
  const tag = document.getElementById('kanban-tag-input').value.trim();
  if (!title) {
    toast('Agregá un título para la tarjeta', 'error', 'alert-circle');
    return;
  }
  state.kanbanCards.push({ id: uid('kanban'), title, desc, tag, status: 'todo' });
  ['kanban-title-input', 'kanban-desc-input', 'kanban-tag-input'].forEach(id => document.getElementById(id).value = '');
  save();
  renderKanban();
}

function deleteKanbanCard(id) {
  state.kanbanCards = state.kanbanCards.filter(card => card.id !== id);
  save();
  renderKanban();
}
