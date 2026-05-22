function deletableAttrs(event) {
  if (!event.deleteType) return '';
  let attrs = ` data-del-type="${event.deleteType}"`;
  if (event.deleteId != null) attrs += ` data-del-id="${escapeHtml(String(event.deleteId))}"`;
  if (event.deleteDate) attrs += ` data-del-date="${event.deleteDate}"`;
  if (event.deleteIndex != null) attrs += ` data-del-index="${event.deleteIndex}"`;
  return attrs;
}

const DELETE_LABELS = {
  task: 'Eliminar esta tarea',
  calendar: 'Eliminar este evento',
  parcial: 'Eliminar este parcial',
  entrega: 'Eliminar esta entrega',
};

function deleteItemByAttrs(type, id, date, index) {
  if (type === 'task' && date) {
    const tasks = state.tasks[date];
    if (!tasks) return;
    const idx = parseInt(index, 10);
    if (idx >= 0 && idx < tasks.length) tasks.splice(idx, 1);
    if (!tasks.length) delete state.tasks[date];
  } else if (type === 'calendar' && id) {
    state.calendarEvents = (state.calendarEvents || []).filter(e => e.id !== id);
  } else if ((type === 'parcial' || type === 'entrega') && id) {
    const [mat, pDate, pType] = id.split('|');
    state.parciales = (state.parciales || []).filter(p =>
      !(p.mat === mat && p.date === pDate && p.type === pType)
    );
  } else {
    return;
  }
  save();
  renderMonth();
  renderWeek();
  renderDayDetail();
  toast('Eliminado');
}

function refreshAllViews() {
  save();
  renderMonth();
  renderWeek();
  renderDayDetail();
  const agendaContent = document.getElementById('day-agenda-content');
  if (agendaContent && document.getElementById('modal-day-agenda')?.classList.contains('open')) {
    const timeline = agendaContent.querySelector('.timeline[data-date-key]');
    if (timeline) openDayAgenda(timeline.dataset.dateKey);
  }
}

function handleItemAction(itemType, itemId, itemDate, action) {
  if (action === 'delete') {
    if (itemType === 'task') {
      const parts = itemId.split('-');
      const idx = parseInt(parts.pop(), 10);
      const date = parts.join('-');
      const tasks = state.tasks[date];
      if (tasks && idx >= 0 && idx < tasks.length) tasks.splice(idx, 1);
      if (tasks && !tasks.length) delete state.tasks[date];
    } else if (itemType === 'manual-event') {
      state.calendarEvents = (state.calendarEvents || []).filter(e => e.id !== itemId);
    } else if (itemType === 'parcial') {
      const [mat, pDate, pType] = itemId.split('|');
      state.parciales = (state.parciales || []).filter(p =>
        !(p.mat === mat && p.date === pDate && p.type === pType)
      );
    }
    refreshAllViews();
    toast('Eliminado');
  } else if (action === 'hide-gcal') {
    state.calendarEvents = (state.calendarEvents || []).filter(e => e.id !== itemId);
    refreshAllViews();
    toast('Evento oculto del planner');
  } else if (action === 'exclude-date') {
    const collection = itemType === 'subject' ? state.subjects : state.externalActivities;
    const entity = (collection || []).find(e => e.id === itemId);
    if (entity) {
      if (!entity.excludedDates) entity.excludedDates = [];
      if (!entity.excludedDates.includes(itemDate)) entity.excludedDates.push(itemDate);
    }
    refreshAllViews();
    toast('Oculto para este día');
  } else if (action === 'delete-recurring') {
    if (itemType === 'subject') {
      state.subjects = (state.subjects || []).filter(s => s.id !== itemId);
    } else if (itemType === 'activity') {
      state.externalActivities = (state.externalActivities || []).filter(a => a.id !== itemId);
    }
    refreshAllViews();
    renderManagement();
    toast('Eliminado de todos los días');
  }
}

function buildPopoverButtons(itemType, itemId, itemDate, itemTitle) {
  const label = escapeHtml(itemTitle || 'este item');
  const buttons = [];

  if (itemType === 'task' || itemType === 'manual-event' || itemType === 'parcial') {
    buttons.push({ label: `Eliminar "${label}"`, cls: 'danger', action: 'delete' });
  } else if (itemType === 'subject' || itemType === 'activity') {
    buttons.push({ label: 'Ocultar solo este día', cls: '', action: 'exclude-date' });
    buttons.push({ label: 'Eliminar de todos los días', cls: 'danger', action: 'delete-recurring' });
  } else if (itemType === 'gcal-event') {
    buttons.push({ label: 'Ocultar de mi planner', cls: '', action: 'hide-gcal' });
  }
  buttons.push({ label: 'Cancelar', cls: '', action: 'cancel' });
  return buttons;
}

(function initLongPress() {
  let timer = null;
  let didLongPress = false;
  let activeEl = null;
  let confirmPending = false;

  function findActionable(el) {
    return el?.closest?.('[data-item-type]') || el?.closest?.('[data-del-type]') || null;
  }

  function showContextPopover(target) {
    dismissPopover();

    const itemType = target.dataset.itemType;
    const itemId = target.dataset.itemId || '';
    const itemDate = target.dataset.itemDate || '';
    const itemTitle = target.dataset.itemTitle || target.textContent?.trim().slice(0, 50) || '';

    if (itemType) {
      showItemPopover(target, itemType, itemId, itemDate, itemTitle);
    } else if (target.dataset.delType) {
      showLegacyDeletePopover(target);
    }
  }

  function showItemPopover(target, itemType, itemId, itemDate, itemTitle) {
    const buttons = buildPopoverButtons(itemType, itemId, itemDate, itemTitle);
    if (buttons.length <= 1) return;

    const pop = document.createElement('div');
    pop.className = 'delete-popover';
    pop.innerHTML = buttons.map(btn => {
      if (btn.action === 'cancel') {
        return `<button class="delete-popover-btn" data-action="cancel">${btn.label}</button>`;
      }
      if (btn.action === 'delete-recurring') {
        return `<button class="delete-popover-btn ${btn.cls}" data-action="delete-recurring" data-item-type="${itemType}" data-item-id="${escapeHtml(itemId)}" data-item-date="${itemDate}">${btn.label}</button>`;
      }
      return `<button class="delete-popover-btn ${btn.cls}" data-action="${btn.action}" data-item-type="${itemType}" data-item-id="${escapeHtml(itemId)}" data-item-date="${itemDate}">${btn.label}</button>`;
    }).join('');

    positionPopover(pop, target);

    pop.querySelectorAll('[data-action]').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'cancel') { dismissPopover(); return; }
        if (action === 'delete-recurring' && !confirmPending) {
          confirmPending = true;
          btn.textContent = '¿Seguro? Toca de nuevo para confirmar';
          btn.style.fontWeight = '800';
          setTimeout(() => { confirmPending = false; }, 4000);
          return;
        }
        confirmPending = false;
        handleItemAction(btn.dataset.itemType, btn.dataset.itemId, btn.dataset.itemDate, action);
        dismissPopover();
      };
    });

    setTimeout(() => {
      document.addEventListener('pointerdown', outsideClickHandler, { once: true, capture: true });
    }, 10);
  }

  function showLegacyDeletePopover(target) {
    const type = target.dataset.delType;
    const id = target.dataset.delId || '';
    const date = target.dataset.delDate || '';
    const index = target.dataset.delIndex || '';
    const label = DELETE_LABELS[type] || 'Eliminar';

    const pop = document.createElement('div');
    pop.className = 'delete-popover';
    pop.innerHTML = `
      <button class="delete-popover-btn danger" data-action="confirm">${escapeHtml(label)}</button>
      <button class="delete-popover-btn" data-action="cancel">Cancelar</button>
    `;

    positionPopover(pop, target);

    pop.querySelector('[data-action="confirm"]').onclick = (e) => {
      e.stopPropagation();
      deleteItemByAttrs(type, id, date, index);
      dismissPopover();
    };
    pop.querySelector('[data-action="cancel"]').onclick = (e) => {
      e.stopPropagation();
      dismissPopover();
    };

    setTimeout(() => {
      document.addEventListener('pointerdown', outsideClickHandler, { once: true, capture: true });
    }, 10);
  }

  function positionPopover(pop, target) {
    pop.style.position = 'fixed';
    pop.style.zIndex = '500';
    document.body.appendChild(pop);

    const rect = target.getBoundingClientRect();
    const popRect = pop.getBoundingClientRect();
    let top = rect.top - popRect.height - 6;
    let left = rect.left + rect.width / 2 - popRect.width / 2;
    if (top < 8) top = rect.bottom + 6;
    if (top + popRect.height > window.innerHeight - 8) top = window.innerHeight - popRect.height - 8;
    left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
  }

  function outsideClickHandler(e) {
    const pop = document.querySelector('.delete-popover');
    if (pop && !pop.contains(e.target)) {
      dismissPopover();
    } else if (pop) {
      setTimeout(() => {
        document.addEventListener('pointerdown', outsideClickHandler, { once: true, capture: true });
      }, 10);
    }
  }

  function dismissPopover() {
    confirmPending = false;
    document.querySelectorAll('.delete-popover').forEach(p => p.remove());
  }

  function cancelTimer() {
    if (timer) { clearTimeout(timer); timer = null; }
  }

  function onStart(e) {
    const target = findActionable(e.target);
    if (!target) return;
    didLongPress = false;
    activeEl = target;
    cancelTimer();
    timer = setTimeout(() => {
      didLongPress = true;
      activeEl = null;
      if (navigator.vibrate) navigator.vibrate(30);
      showContextPopover(target);
    }, 600);
  }

  function onEnd() {
    cancelTimer();
    activeEl = null;
  }

  function onMove(e) {
    if (!timer) return;
    if (e.type === 'touchmove') {
      cancelTimer();
      return;
    }
  }

  document.addEventListener('pointerdown', onStart, { passive: true });
  document.addEventListener('pointerup', onEnd, { passive: true });
  document.addEventListener('pointercancel', onEnd, { passive: true });
  document.addEventListener('touchmove', onMove, { passive: true });

  document.addEventListener('click', (e) => {
    if (didLongPress) {
      e.stopPropagation();
      e.preventDefault();
      didLongPress = false;
    }
  }, true);
})();
