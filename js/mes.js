function renderDow() {
  const row = document.getElementById('dow-row');
  row.innerHTML = DOW_SHORT.map(d => `<div class="dow">${d}</div>`).join('');
}

function renderMonth() {
  const m = state.currentMonth;
  const year = m.getFullYear(), month = m.getMonth();
  document.getElementById('month-title').textContent = MONTHS[month] + ' ' + year;

  const cal = document.getElementById('calendar');
  cal.innerHTML = '';

  const first = new Date(year, month, 1);
  const firstDow = first.getDay() === 0 ? 6 : first.getDay() - 1;
  const last = new Date(year, month+1, 0).getDate();
  const prevLast = new Date(year, month, 0).getDate();

  for (let i = firstDow - 1; i >= 0; i--) {
    cal.appendChild(makeDay(new Date(year, month-1, prevLast-i), true));
  }
  for (let i = 1; i <= last; i++) {
    cal.appendChild(makeDay(new Date(year, month, i), false));
  }
  const totalCells = firstDow + last;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    cal.appendChild(makeDay(new Date(year, month+1, i), true));
  }

  renderStats();
}

function getCalendarEventsForDate(key) {
  return (state.calendarEvents || [])
    .filter(event => event.date === key)
    .map(event => ({
      title: event.title || 'Evento',
      detail: event.time ? `${event.time} · ${event.title}` : event.title,
      kind: 'calendar',
      color: event.color || '#60a5fa',
      deleteType: 'calendar', deleteId: event.id,
    }));
}

function getDateEvents(key) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const tasks = state.tasks[key] || [];
  const examEvents = state.parciales
    .filter(p => p.date === key)
    .map(p => {
      const subject = getSubjectByName(p.mat);
      return {
        title: p.mat,
        detail: `${p.mat} - ${p.type}`,
        kind: (p.type || '').toLowerCase().includes('entrega') ? 'entrega' : 'parcial',
        color: subject?.color || null,
        deleteType: 'parcial', deleteId: `${p.mat}|${p.date}|${p.type}`,
      };
    });
  const taskEvents = tasks.map((t, i) => ({
    title: t.text,
    kind: t.done ? 'done' : 'task',
    deleteType: 'task', deleteDate: key, deleteIndex: i,
  }));
  return [...examEvents, ...getCalendarEventsForDate(key), ...getRecurringEventsForDate(date), ...taskEvents];
}

function makeDay(d, other) {
  const el = document.createElement('div');
  el.className = 'day' + (other ? ' other' : '');
  const today = new Date();
  if (sameDay(d, today)) el.classList.add('today');

  const wkStart = state.currentWeekStart;
  const wkEnd = new Date(wkStart); wkEnd.setDate(wkEnd.getDate() + 6);
  if (d >= wkStart && d <= wkEnd && !other && !sameDay(d, today)) el.classList.add('selected-week');

  const key = dateKey(d);
  const tasks = state.tasks[key] || [];
  const parcial = state.parciales.find(p => p.date === key);
  const routines = ROUTINES[d.getDay()] || [];
  const dateEvents = getDateEvents(key);
  if (dateEvents.length) el.title = dateEvents.map(event => event.detail || event.title).join('\n');

  if (parcial) el.classList.add('has-parcial');

  let html = `<div class="day-num">${d.getDate()}</div>`;
  const dots = [];
  if (parcial) dots.push('<span class="dot dot-parcial"></span>');
  if (tasks.some(t => !t.done)) dots.push('<span class="dot dot-task"></span>');
  if (tasks.some(t => t.done)) dots.push('<span class="dot dot-done"></span>');
  if (routines.length) dots.push('<span class="dot dot-event"></span>');
  if (dots.length) html += `<div class="day-dots">${dots.slice(0,4).join('')}</div>`;
  if (dateEvents.length) {
    html += '<div class="day-events">';
    dateEvents.slice(0, 2).forEach(event => {
      const linkedClass = event.color ? ' subject-linked' : '';
      const recurringClass = event.kind === 'recurrente' ? ' recurring-chip' : '';
      html += `<div class="day-event-chip ${event.kind}${linkedClass}${recurringClass}" title="${escapeHtml(event.detail || event.title)}"${eventStyleAttr(event.color)}${deletableAttrs(event)} onclick="event.stopPropagation(); openDayAgenda('${key}')">${escapeHtml(event.title)}</div>`;
    });
    if (dateEvents.length > 2) html += `<div class="day-event-more">+${dateEvents.length - 2} más</div>`;
    html += '</div>';
  }
  el.innerHTML = html;

  el.onclick = () => {
    openDayAgenda(key);
  };
  return el;
}

function renderDayDetail() {
  const input = document.getElementById('day-detail-date');
  const list = document.getElementById('day-detail-list');
  if (!input || !list) return;
  const key = input.value;
  if (!key) { list.innerHTML = '<div class="detail-empty">Seleccioná una fecha</div>'; return; }
  const events = getDateEvents(key);
  if (!events.length) {
    list.innerHTML = '<div class="detail-empty">Sin eventos para este día</div>';
    return;
  }
  list.innerHTML = events.map(ev => {
    const linkedClass = ev.color ? ' subject-linked' : '';
    const style = eventStyleAttr(ev.color);
    const sub = ev.detail && ev.detail !== ev.title ? `<div class="detail-sub">${escapeHtml(ev.detail)}</div>` : '';
    return `<div class="detail-chip ${ev.kind}${linkedClass}"${style}><div><div class="detail-title">${escapeHtml(ev.title)}</div>${sub}</div></div>`;
  }).join('');
}

function resetEventModal() {
  document.getElementById('add-event-title').value = '';
  document.getElementById('add-event-start').value = '';
  document.getElementById('add-event-end').value = '';
  document.getElementById('add-event-color').value = '#60a5fa';
}

function openAddEvent(key) {
  resetEventModal();
  document.getElementById('add-event-date').value = key;
  document.getElementById('add-event-date-field').style.display = 'none';
  document.getElementById('add-event-title-field').classList.add('full');
  const [y, m, d] = key.split('-').map(Number);
  document.getElementById('add-event-modal-title').textContent =
    `Nuevo evento — ${d}/${m}/${y}`;
  openModal('modal-add-event');
  setTimeout(() => document.getElementById('add-event-title').focus(), 120);
}

function openAddEventFromGestion() {
  resetEventModal();
  document.getElementById('add-event-date').value = dateKey(new Date());
  document.getElementById('add-event-date-field').style.display = '';
  document.getElementById('add-event-title-field').classList.remove('full');
  document.getElementById('add-event-modal-title').textContent = 'Nuevo evento';
  openModal('modal-add-event');
  setTimeout(() => document.getElementById('add-event-title').focus(), 120);
}

function saveQuickEvent() {
  const title = document.getElementById('add-event-title').value.trim();
  if (!title) { toast('Agregá un título', 'error', 'alert-circle'); return; }
  const dateVal = document.getElementById('add-event-date').value;
  if (!dateVal) { toast('Elegí una fecha', 'error', 'alert-circle'); return; }
  const start = document.getElementById('add-event-start').value;
  const end = document.getElementById('add-event-end').value;
  const color = document.getElementById('add-event-color').value;
  const time = start ? (end ? `${start} – ${end}` : start) : '';
  state.calendarEvents.push({
    id: uid('evt'),
    title,
    date: dateVal,
    time,
    start: start || null,
    end: end || null,
    color: color || '#60a5fa',
  });
  save();
  closeModal('modal-add-event');
  renderMonth();
  renderDayDetail();
  toast('Evento agregado');
}

function renderStats() {
  const m = state.currentMonth;
  const year = m.getFullYear(), month = m.getMonth();
  let total = 0, done = 0, parciales = 0;
  const last = new Date(year, month+1, 0).getDate();
  for (let i = 1; i <= last; i++) {
    const k = dateKey(new Date(year, month, i));
    const tasks = state.tasks[k] || [];
    total += tasks.length;
    done += tasks.filter(t => t.done).length;
    if (state.parciales.find(p => p.date === k)) parciales++;
  }
  document.getElementById('stat-tasks').textContent = total;
  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-parciales').textContent = parciales;
  document.getElementById('stat-streak').textContent = calcStreak();
  const progress = total ? Math.round((done / total) * 100) : 0;
  const progressFill = document.getElementById('task-progress-fill');
  const progressNote = document.getElementById('task-progress-note');
  if (progressFill) progressFill.style.width = progress + '%';
  if (progressNote) progressNote.textContent = progress + '% completado';
}

function calcStreak() {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const tasks = state.tasks[dateKey(d)] || [];
    if (tasks.length === 0) {
      if (i === 0) continue;
      break;
    }
    if (tasks.every(t => t.done)) streak++;
    else if (i > 0) break;
  }
  return streak;
}
