function renderWeek() {
  const start = state.currentWeekStart;
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const title = `${start.getDate()} ${MONTHS[start.getMonth()].slice(0,3)} → ${end.getDate()} ${MONTHS[end.getMonth()].slice(0,3)}`;
  document.getElementById('week-range').textContent = title;

  const view = document.getElementById('week-view');
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    days.push(d);
  }
  view.innerHTML = `
    <div class="week-agenda-shell">
      ${renderTimeAxis(true)}
      <div class="week-agenda-grid">
        ${days.map(day => renderWeekAgendaDay(day)).join('')}
      </div>
    </div>
  `;
}

function renderTimeAxis() {
  const labels = [];
  for (let hour = TIMELINE_START_HOUR; hour < TIMELINE_END_HOUR; hour++) {
    labels.push(`<div class="time-axis-label">${String(hour).padStart(2, '0')}:00</div>`);
  }
  return `<div class="time-axis">${labels.join('')}</div>`;
}

function timeToMinutes(value) {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return null;
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function timelineStyle(start, end) {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (startMin === null) return '';
  const safeEnd = endMin !== null && endMin > startMin ? endMin : startMin + 60;
  const from = Math.max(0, startMin - TIMELINE_START_HOUR * 60);
  const duration = Math.max(30, Math.min(TIMELINE_TOTAL_MINUTES, safeEnd - startMin));
  const top = (from / TIMELINE_TOTAL_MINUTES) * 100;
  const height = (duration / TIMELINE_TOTAL_MINUTES) * 100;
  return `top:${top}%;height:${height}%;`;
}

function eventColorStyle(color) {
  const safe = color || '#10B981';
  return `--event-color:${safe};--event-border:${hexToRgba(safe, 0.48)};--event-bg:${hexToRgba(safe, 0.18)};`;
}

function getTimedEventsForDate(date) {
  const key = dateKey(date);
  const day = date.getDay();
  const events = [];
  (state.subjects || []).forEach(subject => {
    const schedule = getEntityScheduleForDay(subject, day);
    if (!schedule?.start) return;
    if ((subject.excludedDates || []).includes(key)) return;
    events.push({ id: `subject-${subject.id}-${key}`, title: subject.name, type: 'Materia', start: schedule.start, end: schedule.end || schedule.start, color: subject.color || '#10B981', itemType: 'subject', itemId: subject.id, itemDate: key });
  });
  (state.externalActivities || []).forEach(activity => {
    if (!getDayNumbersFromList(activity.days || []).includes(day) || !activity.start) return;
    if ((activity.excludedDates || []).includes(key)) return;
    events.push({ id: `activity-${activity.id}-${key}`, title: activity.name, type: 'Actividad', start: activity.start, end: activity.end || activity.start, color: activity.color || '#58a6ff', itemType: 'activity', itemId: activity.id, itemDate: key });
  });
  (state.calendarEvents || []).filter(event => event.date === key && event.time && event.time !== 'Todo el día').forEach(event => {
    const startTime = event.start?.includes('T') ? new Date(event.start).toTimeString().slice(0,5)
      : (event.start && /^\d{2}:\d{2}$/.test(event.start)) ? event.start : event.time;
    const endTime = event.end?.includes('T') ? new Date(event.end).toTimeString().slice(0,5)
      : (event.end && /^\d{2}:\d{2}$/.test(event.end)) ? event.end : '';
    const isManual = event.source === 'manual';
    events.push({ id: `calendar-${event.id}`, title: event.title, type: 'Calendar', start: startTime, end: endTime, color: event.color || '#60a5fa', deleteType: 'calendar', deleteId: event.id, itemType: isManual ? 'manual-event' : 'gcal-event', itemId: event.id, itemDate: key });
  });
  (state.tasks[key] || []).forEach((task, index) => {
    if (!task.start) return;
    events.push({ id: `task-${key}-${index}`, title: task.text, type: task.tag || 'Tarea', start: task.start, end: task.end || task.start, color: task.done ? '#6b7280' : '#38bdf8', deleteType: 'task', deleteDate: key, deleteIndex: index, itemType: 'task', itemId: `${key}-${index}`, itemDate: key });
  });
  return events.sort((a, b) => String(a.start).localeCompare(String(b.start)));
}

function getAllDayItemsForDate(date) {
  const key = dateKey(date);
  const items = [];
  (state.tasks[key] || []).forEach((task, i) => {
    if (!task.start) items.push({ title: task.text, color: task.done ? '#6b7280' : '#38bdf8', detail: task.tag || 'Pendiente', deleteType: 'task', deleteDate: key, deleteIndex: i, itemType: 'task', itemId: `${key}-${i}`, itemDate: key });
  });
  (state.parciales || []).filter(item => item.date === key).forEach(item => {
    items.push({ title: `${item.mat} · ${item.type}`, color: '#f43f5e', detail: 'Parcial / entrega', deleteType: 'parcial', deleteId: `${item.mat}|${item.date}|${item.type}`, itemType: 'parcial', itemId: `${item.mat}|${item.date}|${item.type}`, itemDate: key });
  });
  (state.calendarEvents || []).filter(event => event.date === key && (!event.time || event.time === 'Todo el día')).forEach(event => {
    const isManual = event.source === 'manual';
    items.push({ title: event.title, color: '#60a5fa', detail: 'Google Calendar', deleteType: 'calendar', deleteId: event.id, itemType: isManual ? 'manual-event' : 'gcal-event', itemId: event.id, itemDate: key });
  });
  return items;
}

function itemDataAttrs(item) {
  if (!item.itemType) return '';
  let attrs = ` data-item-type="${item.itemType}" data-item-id="${escapeHtml(String(item.itemId || ''))}" data-item-date="${item.itemDate || ''}"`;
  if (item.title) attrs += ` data-item-title="${escapeHtml(item.title)}"`;
  return attrs;
}

function renderAllDayItems(date) {
  const items = getAllDayItemsForDate(date);
  if (!items.length) return '<div class="empty" style="padding:0;">Sin pendientes.</div>';
  return items.map(item => `<div class="all-day-chip" title="${escapeHtml(item.detail || item.title)}" style="border-left-color:${item.color};"${deletableAttrs(item)}${itemDataAttrs(item)}>${escapeHtml(item.title)}</div>`).join('');
}

function renderTimelineBlocks(date) {
  return getTimedEventsForDate(date).map(event => `
    <div class="timeline-block" title="${escapeHtml(`${event.title} · ${event.start}-${event.end || '--:--'}`)}" style="${timelineStyle(event.start, event.end)}${eventColorStyle(event.color)}"${deletableAttrs(event)}${itemDataAttrs(event)} onclick="event.stopPropagation()">
      <div class="timeline-block-title">${escapeHtml(event.title)}</div>
      <div class="timeline-block-time">${escapeHtml(event.start)}-${escapeHtml(event.end || '--:--')}</div>
    </div>
  `).join('');
}

function renderWeekAgendaDay(date) {
  const key = dateKey(date);
  const today = new Date();
  return `
    <div class="week-agenda-day ${sameDay(date, today) ? 'today' : ''}">
      <button class="week-agenda-head" style="width:100%; text-align:left;" onclick="openDayAgenda('${key}')">
        <div class="week-agenda-title">${escapeHtml(DOW_FULL[date.getDay()])}</div>
        <div class="week-agenda-date">${date.getDate()}/${date.getMonth()+1}</div>
      </button>
      <div class="all-day-zone">
        <div class="all-day-title">Pendientes</div>
        ${renderAllDayItems(date)}
      </div>
      <div class="timeline">${renderTimelineBlocks(date)}</div>
      <div class="agenda-add-form">
        <input type="text" class="add-input" placeholder="Nueva tarea..." id="inp-${key}" onkeydown="if(event.key==='Enter')addTask('${key}')">
        <input type="time" class="date-input" id="task-start-${key}" title="Inicio">
        <input type="time" class="date-input" id="task-end-${key}" title="Fin">
        <select class="add-select" id="sel-${key}">
          <option value="Estudio">Estudio</option>
          <option value="Personal">Personal</option>
          <option value="Otro">Otro</option>
        </select>
        <button class="add-btn" title="Agregar tarea" aria-label="Agregar tarea" onclick="addTask('${key}')"><i class="ph ph-plus"></i></button>
      </div>
    </div>
  `;
}

function openDayAgenda(key) {
  const ddInput = document.getElementById('day-detail-date');
  if (ddInput) { ddInput.value = key; renderDayDetail(); }
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const title = document.getElementById('day-agenda-title');
  const content = document.getElementById('day-agenda-content');
  if (!title || !content) return;
  title.textContent = `Agenda del Día ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
  content.innerHTML = `
    <div class="all-day-zone" style="margin-bottom:12px; border:1px solid var(--border); border-radius:var(--radius);">
      <div class="all-day-title">Todo el día / pendientes</div>
      ${renderAllDayItems(date)}
    </div>
    <div class="day-agenda-layout">
      ${renderTimeAxis(false)}
      <div class="day-agenda-panel">
        <div class="timeline" data-date-key="${key}" onclick="handleTimelineClick(event)">${renderTimelineBlocks(date)}</div>
      </div>
    </div>
    <div class="agenda-quick-add">
      <div class="all-day-title" style="margin-bottom:6px;">Agregar evento rápido</div>
      <div class="agenda-quick-add-row">
        <input type="text" class="add-input" id="agenda-quick-title" placeholder="Título del evento" onkeydown="if(event.key==='Enter')saveAgendaQuickEvent('${key}')">
        <input type="time" class="date-input" id="agenda-quick-start" title="Inicio">
        <input type="time" class="date-input" id="agenda-quick-end" title="Fin">
        <button class="add-btn" title="Agregar evento" onclick="saveAgendaQuickEvent('${key}')"><i class="ph ph-plus"></i></button>
      </div>
    </div>
  `;
  openModal('modal-day-agenda');
}

function saveAgendaQuickEvent(key) {
  const title = document.getElementById('agenda-quick-title').value.trim();
  if (!title) { toast('Agregá un título', 'error', 'alert-circle'); return; }
  const start = document.getElementById('agenda-quick-start').value;
  const end = document.getElementById('agenda-quick-end').value;
  const time = start ? (end ? `${start} – ${end}` : start) : '';
  state.calendarEvents.push({
    id: uid('evt'),
    title,
    date: key,
    time,
    start: start || null,
    end: end || null,
    color: '#60a5fa',
  });
  save();
  renderMonth();
  renderWeek();
  renderDayDetail();
  openDayAgenda(key);
  toast('Evento agregado');
}

function snapToHalfHour(totalMinutes) {
  return Math.round(totalMinutes / 30) * 30;
}

function minutesToTimeStr(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function dismissTimelinePopover() {
  document.querySelectorAll('.timeline-click-popover').forEach(p => p.remove());
}

function handleTimelineClick(e) {
  if (e.target.closest('.timeline-block') || e.target.closest('.timeline-click-popover')) return;
  const timeline = e.currentTarget;
  const key = timeline.dataset.dateKey;
  if (!key) return;

  dismissTimelinePopover();

  const rect = timeline.getBoundingClientRect();
  const scrollParent = timeline.closest('.day-agenda-layout');
  const scrollTop = scrollParent ? scrollParent.scrollTop : 0;
  const posY = e.clientY - rect.top + scrollTop;
  const pxPerHour = timeline.scrollHeight / (TIMELINE_END_HOUR - TIMELINE_START_HOUR);

  const rawMinutes = TIMELINE_START_HOUR * 60 + (posY / pxPerHour) * 60;
  const snappedStart = snapToHalfHour(Math.max(TIMELINE_START_HOUR * 60, Math.min(rawMinutes, TIMELINE_END_HOUR * 60 - 30)));
  const snappedEnd = Math.min(snappedStart + 60, TIMELINE_END_HOUR * 60);
  const startStr = minutesToTimeStr(snappedStart);
  const endStr = minutesToTimeStr(snappedEnd);

  const topPx = ((snappedStart - TIMELINE_START_HOUR * 60) / (TIMELINE_TOTAL_MINUTES)) * timeline.scrollHeight;

  const pop = document.createElement('div');
  pop.className = 'timeline-click-popover';
  pop.style.top = topPx + 'px';
  pop.onclick = (ev) => ev.stopPropagation();
  pop.innerHTML = `
    <input type="text" class="tcp-title-input" placeholder="Título del evento" id="tcp-title">
    <div class="tcp-row">
      <input type="time" class="tcp-time" id="tcp-start" value="${startStr}">
      <span class="tcp-sep">→</span>
      <input type="time" class="tcp-time" id="tcp-end" value="${endStr}">
    </div>
    <div class="tcp-actions">
      <button class="tcp-btn" onclick="dismissTimelinePopover()">Cancelar</button>
      <button class="tcp-btn primary" onclick="saveTimelineClickEvent('${key}')">Guardar</button>
    </div>
  `;
  timeline.appendChild(pop);

  const titleInput = pop.querySelector('#tcp-title');
  setTimeout(() => titleInput.focus(), 30);
  titleInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') { ev.preventDefault(); saveTimelineClickEvent(key); }
    if (ev.key === 'Escape') dismissTimelinePopover();
  });
  pop.querySelectorAll('.tcp-time').forEach(inp => {
    inp.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); saveTimelineClickEvent(key); }
      if (ev.key === 'Escape') dismissTimelinePopover();
    });
  });
}

function saveTimelineClickEvent(key) {
  const titleEl = document.getElementById('tcp-title');
  const startEl = document.getElementById('tcp-start');
  const endEl = document.getElementById('tcp-end');
  if (!titleEl) return;
  const title = titleEl.value.trim();
  if (!title) { toast('Agregá un título', 'error', 'alert-circle'); titleEl.focus(); return; }
  const start = startEl?.value || '';
  const end = endEl?.value || '';
  const time = start ? (end ? `${start} – ${end}` : start) : '';
  state.calendarEvents = state.calendarEvents || [];
  state.calendarEvents.push({
    id: uid('evt'),
    title,
    date: key,
    time,
    start: start || null,
    end: end || null,
    color: '#60a5fa',
    source: 'manual',
  });
  save();
  renderMonth();
  renderWeek();
  renderDayDetail();
  dismissTimelinePopover();
  openDayAgenda(key);
  toast('Evento agregado');
}

function makeDayCard(d) {
  const card = document.createElement('div');
  const today = new Date();
  card.className = 'day-card' + (sameDay(d, today) ? ' today' : '');
  const key = dateKey(d);
  const tasks = state.tasks[key] || [];
  const parcial = state.parciales.find(p => p.date === key);
  const routines = ROUTINES[d.getDay()] || [];
  const doneCount = tasks.filter(t => t.done).length;
  const isToday = sameDay(d, today);

  let routinesHtml = '';
  if (routines.length || parcial) {
    routinesHtml = '<div class="routines-bar">';
    if (parcial) {
      routinesHtml += `<span class="routine-chip chip-parcial"><i class="ti ti-flame"></i> ${parcial.mat} · ${parcial.type}</span>`;
    }
    routines.forEach(r => {
      routinesHtml += `<span class="routine-chip chip-${r.tag}">${r.text} ${r.time}</span>`;
    });
    routinesHtml += '</div>';
  }

  card.innerHTML = `
    <div class="day-card-header">
      <div class="day-card-left">
        <span class="day-name">${DOW_FULL[d.getDay()]}</span>
        ${isToday ? '<span class="today-badge">hoy</span>' : ''}
        <span class="day-date">${d.getDate()}/${d.getMonth()+1}</span>
      </div>
      <span class="task-counter">${doneCount}/${tasks.length}</span>
    </div>
    ${routinesHtml}
    <div class="task-list" id="tl-${key}"></div>
    <div class="add-task-form">
      <input type="text" class="add-input" placeholder="Nueva tarea..." id="inp-${key}" onkeydown="if(event.key==='Enter')addTask('${key}')">
      <select class="add-select" id="sel-${key}">
        <option value="Estudio">Estudio</option>
        <option value="Personal">Personal</option>
        <option value="Otro">Otro</option>
      </select>
      <button class="add-btn" title="Agregar tarea" aria-label="Agregar tarea" onclick="addTask('${key}')"><i class="ti ti-plus"></i></button>
    </div>
  `;

  setTimeout(() => {
    const tl = card.querySelector(`#tl-${key}`);
    if (!tl) return;
    if (tasks.length === 0) {
      tl.innerHTML = '<div class="empty">Sin tareas. Agregá una abajo.</div>';
    } else {
      tasks.forEach((t, i) => {
        const taskEl = document.createElement('div');
        taskEl.className = 'task' + (t.done ? ' done' : '');
        taskEl.innerHTML = `
          <div class="checkbox ${t.done ? 'checked' : ''}" onclick="toggleTask('${key}', ${i})"></div>
          <span class="task-text" contenteditable="true" onblur="editTask('${key}', ${i}, this.innerText)">${escapeHtml(t.text)}</span>
          <span class="task-tag tag-${t.tag}">${t.tag}</span>
          <button class="task-del" onclick="delTask('${key}', ${i})" aria-label="Eliminar tarea"><i class="ph ph-x"></i></button>
        `;
        tl.appendChild(taskEl);
      });
    }
  }, 0);

  return card;
}
