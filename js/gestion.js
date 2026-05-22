function renderWeekdayPicker(containerId, selectedDays=[]) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const selected = new Set(getDayNumbersFromList(selectedDays));
  container.innerHTML = WEEKDAY_OPTIONS.map(day => `
    <label class="weekday-pill" title="${day.long}">
      <input type="checkbox" value="${day.value}" ${selected.has(day.value) ? 'checked' : ''}>
      <span>${day.short}</span>
    </label>
  `).join('');
  if (containerId === 'subject-days') {
    container.querySelectorAll('input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', () => renderSubjectDaySchedules());
    });
  }
}

function getSelectedWeekdays(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return [];
  return Array.from(container.querySelectorAll('input:checked'))
    .map(input => Number(input.value))
    .filter(value => Number.isInteger(value));
}

function getDayNumbersFromList(days=[]) {
  return (days || [])
    .map(item => typeof item === 'object' ? Number(item.day) : Number(item))
    .filter(value => Number.isInteger(value));
}

function normalizeDaySchedules(entity={}) {
  if (Array.isArray(entity.days) && entity.days.some(item => typeof item === 'object')) {
    return entity.days
      .map(item => ({
        day: Number(item.day),
        start: item.start || entity.start || '',
        end: item.end || entity.end || '',
      }))
      .filter(item => Number.isInteger(item.day));
  }
  const dayNumbers = getDayNumbersFromList(entity.days || []);
  return dayNumbers.map(day => ({
    day,
    start: entity.start || '',
    end: entity.end || '',
  }));
}

function getEntityScheduleForDay(entity, day) {
  return normalizeDaySchedules(entity).find(item => Number(item.day) === Number(day)) || null;
}

function getSubjectDaySchedulesFromDom() {
  return getSelectedWeekdays('subject-days').map(day => ({
    day,
    start: document.querySelector(`[data-subject-day-start="${day}"]`)?.value || '',
    end: document.querySelector(`[data-subject-day-end="${day}"]`)?.value || '',
  }));
}

function renderSubjectDaySchedules(seedSchedules=null) {
  const wrap = document.getElementById('subject-day-schedules');
  if (!wrap) return;
  const existing = seedSchedules || getSubjectDaySchedulesFromDom();
  const byDay = new Map(existing.map(item => [Number(item.day), item]));
  const selected = getSelectedWeekdays('subject-days');
  if (!selected.length) {
    wrap.innerHTML = '<div class="empty">Seleccioná días para cargar horarios específicos.</div>';
    return;
  }
  wrap.innerHTML = selected.map(day => {
    const option = WEEKDAY_OPTIONS.find(item => item.value === Number(day));
    const current = byDay.get(Number(day)) || {};
    return `
      <div class="day-schedule-row">
        <div class="day-schedule-name">${escapeHtml(option?.long || String(day))}</div>
        <div class="field">
          <label>Inicio</label>
          <input type="time" class="date-input" data-subject-day-start="${day}" value="${escapeHtml(current.start || '')}">
        </div>
        <div class="field">
          <label>Fin</label>
          <input type="time" class="date-input" data-subject-day-end="${day}" value="${escapeHtml(current.end || '')}">
        </div>
      </div>
    `;
  }).join('');
}

function weekdayLabel(days=[]) {
  const dayNumbers = getDayNumbersFromList(days);
  if (!dayNumbers.length) return '';
  return dayNumbers
    .map(day => WEEKDAY_OPTIONS.find(item => item.value === Number(day))?.short)
    .filter(Boolean)
    .join(', ');
}

function scheduleLabel(entity) {
  const schedules = normalizeDaySchedules(entity);
  if (!schedules.length) return `${entity.start || '--:--'} - ${entity.end || '--:--'}`;
  return schedules.map(item => {
    const day = WEEKDAY_OPTIONS.find(option => option.value === Number(item.day))?.short || item.day;
    return `${day} ${item.start || '--:--'}-${item.end || '--:--'}`;
  }).join(' · ');
}

function getRecurringEventsForDate(date) {
  if (!date) return [];
  const key = dateKey(date);
  const day = date.getDay();
  const fromSubjects = (state.subjects || [])
    .filter(item => getDayNumbersFromList(item.days || []).includes(day))
    .filter(item => !(item.excludedDates || []).includes(key))
    .map(item => {
      const schedule = getEntityScheduleForDay(item, day);
      return {
      title: item.name,
      detail: `${item.name}${schedule?.start || schedule?.end ? ` · ${schedule.start || '--:--'}-${schedule.end || '--:--'}` : ''}`,
      kind: 'recurrente',
      color: item.color || '#10B981',
      };
    });
  const fromActivities = (state.externalActivities || [])
    .filter(item => getDayNumbersFromList(item.days || []).includes(day))
    .filter(item => !(item.excludedDates || []).includes(key))
    .map(item => ({
      title: item.name,
      detail: `${item.name}${item.start || item.end ? ` · ${item.start || '--:--'}-${item.end || '--:--'}` : ''}`,
      kind: 'recurrente',
      color: item.color || '#58a6ff',
    }));
  return [...fromSubjects, ...fromActivities];
}

function openSubjectWizard(id=null) {
  const editing = id ? state.subjects.find(s => s.id === id) : null;
  document.getElementById('subject-modal-title').textContent = editing ? 'Editar materia' : 'Nueva materia';
  document.getElementById('subject-edit-id').value = editing ? editing.id : '';
  document.getElementById('subject-name').value = editing ? editing.name : '';
  document.getElementById('subject-icon').value = editing ? editing.icon : '📚';
  document.getElementById('subject-color').value = editing ? editing.color : '#00d97e';
  const schedules = editing ? normalizeDaySchedules(editing) : [];
  renderWeekdayPicker('subject-days', schedules);
  renderSubjectDaySchedules(schedules);
  document.getElementById('subject-partial-count').value = 0;
  document.getElementById('subject-delivery-dates').value = '';
  renderSubjectDateFields();
  openModal('modal-subject');
}

function renderSubjectDateFields() {
  const wrap = document.getElementById('subject-partial-dates');
  const count = Math.max(0, Math.min(12, parseInt(document.getElementById('subject-partial-count').value || '0', 10)));
  wrap.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const field = document.createElement('div');
    field.className = 'field';
    field.style.marginBottom = '8px';
    field.innerHTML = `
      <label for="subject-partial-${i}">Fecha parcial ${i + 1}</label>
      <input type="date" class="date-input subject-partial-date" id="subject-partial-${i}">
    `;
    wrap.appendChild(field);
  }
}

function saveSubjectWizard() {
  const id = document.getElementById('subject-edit-id').value;
  const name = document.getElementById('subject-name').value.trim();
  const icon = document.getElementById('subject-icon').value.trim() || '📚';
  const color = document.getElementById('subject-color').value || '#00d97e';
  const days = getSubjectDaySchedulesFromDom();
  const firstSchedule = days[0] || {};
  if (!name) {
    toast('La materia necesita nombre', 'error', 'alert-circle');
    return;
  }

  let subjectId = id;
  if (id) {
    const idx = state.subjects.findIndex(s => s.id === id);
    if (idx >= 0) state.subjects[idx] = { ...state.subjects[idx], name, icon, color, start: firstSchedule.start || '', end: firstSchedule.end || '', days };
  } else {
    subjectId = uid('subject');
    state.subjects.push({ id: subjectId, name, icon, color, start: firstSchedule.start || '', end: firstSchedule.end || '', days });
  }

  document.querySelectorAll('.subject-partial-date').forEach((input, index) => {
    if (!input.value) return;
    state.parciales.push({
      id: uid('exam'),
      date: input.value,
      mat: name,
      type: `${index + 1} parcial`,
      subjectId,
    });
  });

  const deliveries = document.getElementById('subject-delivery-dates').value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  deliveries.forEach(line => {
    const [rawDate, rawTitle] = line.split('|').map(part => (part || '').trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return;
    state.parciales.push({
      id: uid('delivery'),
      date: rawDate,
      mat: name,
      type: rawTitle || 'Entrega importante',
      subjectId,
    });
  });

  save();
  closeModal('modal-subject');
  renderManagement();
  renderTargetSelect();
  renderMonth();
  renderParciales();
  toast(id ? 'Materia actualizada' : 'Materia creada');
}

function deleteSubject(id) {
  const subject = state.subjects.find(s => s.id === id);
  if (!subject || !confirm(`Eliminar ${subject.name}?`)) return;
  state.subjects = state.subjects.filter(s => s.id !== id);
  state.parciales = state.parciales.filter(p => p.subjectId !== id);
  delete state.resources[id];
  save();
  renderManagement();
  renderTargetSelect();
  renderMonth();
  renderParciales();
  renderResourcesForSelectedTarget();
}

let editingActivityId = null;

function saveActivity() {
  const name = document.getElementById('activity-name').value.trim();
  const icon = document.getElementById('activity-icon').value.trim() || '💼';
  const color = document.getElementById('activity-color').value || '#58a6ff';
  const start = document.getElementById('activity-start').value;
  const end = document.getElementById('activity-end').value;
  const days = getSelectedWeekdays('activity-days');
  if (!name) {
    toast('La actividad necesita nombre', 'error', 'alert-circle');
    return;
  }
  if (editingActivityId) {
    const idx = state.externalActivities.findIndex(a => a.id === editingActivityId);
    if (idx >= 0) state.externalActivities[idx] = { ...state.externalActivities[idx], name, icon, color, start, end, days };
  } else {
    state.externalActivities.push({ id: uid('activity'), name, icon, color, start, end, days });
  }
  editingActivityId = null;
  clearActivityForm();
  save();
  renderManagement();
  renderTargetSelect();
  toast('Actividad guardada');
}

function editActivity(id) {
  const activity = state.externalActivities.find(a => a.id === id);
  if (!activity) return;
  editingActivityId = id;
  document.getElementById('activity-name').value = activity.name;
  document.getElementById('activity-icon').value = activity.icon || '💼';
  document.getElementById('activity-color').value = activity.color || '#58a6ff';
  document.getElementById('activity-start').value = activity.start || '';
  document.getElementById('activity-end').value = activity.end || '';
  renderWeekdayPicker('activity-days', activity.days || []);
  document.getElementById('activity-save-btn').innerHTML = '<i class="ti ti-device-floppy"></i> Actualizar';
}

function deleteActivity(id) {
  const activity = state.externalActivities.find(a => a.id === id);
  if (!activity || !confirm(`Eliminar ${activity.name}?`)) return;
  state.externalActivities = state.externalActivities.filter(a => a.id !== id);
  delete state.resources[id];
  save();
  renderManagement();
  renderTargetSelect();
  renderResourcesForSelectedTarget();
}

function clearActivityForm() {
  document.getElementById('activity-name').value = '';
  document.getElementById('activity-icon').value = '';
  document.getElementById('activity-color').value = '#58a6ff';
  document.getElementById('activity-start').value = '';
  document.getElementById('activity-end').value = '';
  renderWeekdayPicker('activity-days', []);
  document.getElementById('activity-save-btn').innerHTML = '<i class="ti ti-device-floppy"></i> Guardar';
}

function renderManagement() {
  const subjectList = document.getElementById('subjects-list');
  const activityList = document.getElementById('activities-list');
  if (!subjectList || !activityList) return;

  subjectList.innerHTML = state.subjects.length ? '' : '<div class="empty">No hay materias cargadas.</div>';
  state.subjects.forEach(subject => {
    if (!Array.isArray(subject.days)) subject.days = [];
    const el = document.createElement('div');
    el.className = 'entity-card';
    const daysText = weekdayLabel(subject.days || []);
    el.innerHTML = `
      <div class="entity-swatch" style="background:${subject.color || '#00d97e'}">${escapeHtml(subject.icon || '📚')}</div>
      <div class="entity-info">
        <div class="entity-name">${escapeHtml(subject.name)}</div>
        <div class="entity-meta">${escapeHtml(scheduleLabel(subject))}${daysText ? ` · ${daysText}` : ''}</div>
      </div>
      <div class="entity-actions">
        <button class="mini-btn" onclick="openSubjectWizard('${subject.id}')"><i class="ti ti-pencil"></i></button>
        <button class="mini-btn danger" onclick="deleteSubject('${subject.id}')" aria-label="Eliminar materia"><i class="ph ph-trash"></i></button>
      </div>
    `;
    subjectList.appendChild(el);
  });

  activityList.innerHTML = state.externalActivities.length ? '' : '<div class="empty">No hay actividades externas.</div>';
  state.externalActivities.forEach(activity => {
    if (!Array.isArray(activity.days)) activity.days = [];
    const el = document.createElement('div');
    el.className = 'entity-card';
    const daysText = weekdayLabel(activity.days || []);
    el.innerHTML = `
      <div class="entity-swatch" style="background:${activity.color || '#58a6ff'}">${escapeHtml(activity.icon || '💼')}</div>
      <div class="entity-info">
        <div class="entity-name">${escapeHtml(activity.name)}</div>
        <div class="entity-meta">${activity.start || '--:--'} - ${activity.end || '--:--'}${daysText ? ` · ${daysText}` : ''}</div>
      </div>
      <div class="entity-actions">
        <button class="mini-btn" onclick="editActivity('${activity.id}')"><i class="ti ti-pencil"></i></button>
        <button class="mini-btn danger" onclick="deleteActivity('${activity.id}')" aria-label="Eliminar actividad"><i class="ph ph-trash"></i></button>
      </div>
    `;
    activityList.appendChild(el);
  });
}

function renderTargetSelect() {
  const select = document.getElementById('pomo-target');
  if (!select) return;
  const previous = select.value;
  const targets = getFocusTargets();
  select.innerHTML = `<option value="${FREE_FOCUS_TARGET.id}">${escapeHtml(targetLabel(FREE_FOCUS_TARGET))}</option>` +
    targets.map(t => `<option value="${t.id}">${escapeHtml(targetLabel(t))}</option>`).join('');
  if (previous && (previous === FREE_FOCUS_TARGET.id || targets.some(t => t.id === previous))) select.value = previous;
  else select.value = FREE_FOCUS_TARGET.id;
  renderResourceTargetSelect();
  renderResourcesForSelectedTarget();
  updateSelectedFocusColor();
}

function renderResourceTargetSelect() {
  const select = document.getElementById('resource-target');
  if (!select) return;
  const previous = select.value;
  const currentFocus = document.getElementById('pomo-target')?.value || '';
  const subjects = state.subjects || [];
  select.innerHTML = subjects.length
    ? subjects.map(subject => `<option value="${subject.id}">${escapeHtml(targetLabel({ ...subject, targetType: 'subject' }))}</option>`).join('')
    : '<option value="">Sin materias</option>';
  if (previous && subjects.some(subject => subject.id === previous)) select.value = previous;
  else if (subjects.some(subject => subject.id === currentFocus)) select.value = currentFocus;
}

function renderResourcesForSelectedTarget() {
  const list = document.getElementById('resource-list');
  const select = document.getElementById('pomo-target');
  if (!list || !select) return;
  const targetId = select.value;
  const resourceTarget = document.getElementById('resource-target');
  if (resourceTarget && (state.subjects || []).some(subject => subject.id === targetId)) {
    resourceTarget.value = targetId;
  }
  const resources = state.resources[targetId] || [];
  if (!targetId || targetId === FREE_FOCUS_TARGET.id) {
    list.innerHTML = '<div class="empty">Sesión libre: no hay material vinculado.</div>';
    return;
  }
  list.innerHTML = resources.length ? '' : '<div class="empty">Sin material cargado para este foco.</div>';
  resources.forEach((resource, index) => {
    const el = document.createElement('div');
    el.className = 'resource-card';
    el.innerHTML = `
      <i class="ti ti-link" style="color:var(--accent);"></i>
      <div class="resource-info">
        <a class="resource-name" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener">${escapeHtml(resource.title)}</a>
        <div class="resource-url">${escapeHtml(resource.url)}</div>
      </div>
      <button class="mini-btn danger" onclick="deleteResource('${targetId}', ${index})" aria-label="Eliminar recurso"><i class="ph ph-trash"></i></button>
    `;
    list.appendChild(el);
  });
}

function addResource() {
  const select = document.getElementById('resource-target');
  const title = document.getElementById('resource-title').value.trim();
  const url = document.getElementById('resource-url').value.trim();
  const targetId = select?.value || '';
  if (!targetId) {
    toast('Elegí una materia para vincular el material', 'error', 'alert-circle');
    return;
  }
  if (!title || !url) {
    toast('Completa titulo y URL', 'error', 'alert-circle');
    return;
  }
  if (!state.resources[targetId]) state.resources[targetId] = [];
  state.resources[targetId].push({ title, url });
  document.getElementById('resource-title').value = '';
  document.getElementById('resource-url').value = '';
  save();
  renderResourcesForSelectedTarget();
}

function deleteResource(targetId, index) {
  if (!state.resources[targetId]) return;
  state.resources[targetId].splice(index, 1);
  save();
  renderResourcesForSelectedTarget();
}

function getCurrentStudyTarget() {
  const targetId = document.getElementById('pomo-target')?.value || FREE_FOCUS_TARGET.id;
  if (targetId === FREE_FOCUS_TARGET.id) return FREE_FOCUS_TARGET;
  return getFocusTargets().find(target => target.id === targetId) || FREE_FOCUS_TARGET;
}

function renderStudyNotes() {
  const list = document.getElementById('study-note-list');
  if (!list) return;
  const target = getCurrentStudyTarget();
  const notes = (state.studyNotes || [])
    .filter(note => (note.targetId || FREE_FOCUS_TARGET.id) === target.id)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  list.innerHTML = notes.length ? '' : `<div class="empty">${target.id === FREE_FOCUS_TARGET.id ? 'No hay notas generales todavía.' : 'No hay notas para esta materia todavía.'}</div>`;
  notes.forEach(note => {
    const el = document.createElement('div');
    el.className = 'study-note-card';
    const date = note.createdAt ? new Date(note.createdAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : '';
    el.innerHTML = `
      <div class="study-note-head">
        <div class="study-note-meta">${escapeHtml(note.targetName || 'Sesión libre')} · ${escapeHtml(date)}</div>
        <button class="mini-btn danger" onclick="deleteStudyNote('${note.id}')" aria-label="Eliminar nota"><i class="ph ph-trash"></i></button>
      </div>
      <div class="study-note-text">${escapeHtml(note.text || '')}</div>
    `;
    list.appendChild(el);
  });
}

function saveStudyNote() {
  const input = document.getElementById('study-note-input');
  const text = input?.value.trim() || '';
  if (!text) {
    toast('Escribí una nota antes de guardarla', 'error', 'alert-circle');
    return;
  }
  const target = getCurrentStudyTarget();
  state.studyNotes = state.studyNotes || [];
  state.studyNotes.push({
    id: uid('note'),
    targetId: target.id,
    targetName: target.name,
    targetType: target.targetType || 'free',
    text,
    createdAt: new Date().toISOString(),
  });
  input.value = '';
  save();
  renderStudyNotes();
  toast('Nota guardada');
}

function deleteStudyNote(id) {
  state.studyNotes = (state.studyNotes || []).filter(note => note.id !== id);
  save();
  renderStudyNotes();
}
