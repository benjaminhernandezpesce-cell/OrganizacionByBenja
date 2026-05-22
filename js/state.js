const DEFAULT_PARCIALES = [];

const ROUTINES = {
  1: [],
  2: [],
  3: [],
  4: [],
  5: [],
  6: [],
  0: []
};

const DEFAULT_CHECKLIST = [];
const MODULE_SEED_KEY = 'planner-modules-seeded-v1';
const DEFAULT_CONTACTS = [
  {
    id: 'contact-utn-director',
    name: 'Director de carrera UTN',
    role: 'UTN',
    link: 'direccion@utn.edu.ar',
    tag: 'universidad',
    notes: 'Contacto clave para consultas academicas y oportunidades institucionales.',
  },
  {
    id: 'contact-endeavor-speaker',
    name: 'Disertante evento Endeavor',
    role: 'Endeavor',
    link: 'https://www.linkedin.com/',
    tag: 'evento',
    notes: 'Seguimiento post evento. Posible mentor o contacto para networking.',
  },
];
const DEFAULT_HABITS = [
  { id: 'habit-study', name: 'Estudio profundo', checks: {} },
  { id: 'habit-training', name: 'Entrenamiento', checks: {} },
  { id: 'habit-sleep', name: 'Dormir 7h+', checks: {} },
];
const DEFAULT_LIFTS = [
  { id: 'lift-bench-1', date: '2026-05-01', exercise: 'Press de Banca', kg: 100, reps: 5 },
  { id: 'lift-bench-2', date: '2026-05-08', exercise: 'Press de Banca', kg: 110, reps: 3 },
  { id: 'lift-bench-3', date: '2026-05-15', exercise: 'Press de Banca', kg: 120, reps: 1 },
];
const DEFAULT_KANBAN = [
  { id: 'kanban-chess3', title: 'Desarrollo demo Chess3', desc: 'Preparar demo funcional y narrativa breve.', tag: 'demo', status: 'doing' },
  { id: 'kanban-importacion', title: 'Análisis de importación', desc: 'Revisar costos, datos y escenarios.', tag: 'datos', status: 'todo' },
  { id: 'kanban-consultoria', title: 'Consultoría de datos', desc: 'Armar propuesta inicial y entregables.', tag: 'consultoria', status: 'done' },
];

const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DOW_SHORT = ['lun','mar','mié','jue','vie','sáb','dom'];
const DOW_FULL = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const WEEKDAY_OPTIONS = [
  { value: 1, short: 'Lun', long: 'Lunes' },
  { value: 2, short: 'Mar', long: 'Martes' },
  { value: 3, short: 'Mié', long: 'Miércoles' },
  { value: 4, short: 'Jue', long: 'Jueves' },
  { value: 5, short: 'Vie', long: 'Viernes' },
  { value: 6, short: 'Sáb', long: 'Sábado' },
  { value: 0, short: 'Dom', long: 'Domingo' },
];
const FREE_FOCUS_TARGET = {
  id: '__free__',
  name: 'Sesión libre',
  icon: '✨',
  color: '#10B981',
  targetType: 'free',
};

let state = {
  tasks: {},
  parciales: JSON.parse(JSON.stringify(DEFAULT_PARCIALES)),
  subjects: [],
  externalActivities: [],
  calendarEvents: [],
  resources: {},
  studyNotes: [],
  focusStats: {},
  networkingContacts: [],
  habits: [],
  lifts: [],
  kanbanCards: [],
  checklist: JSON.parse(JSON.stringify(DEFAULT_CHECKLIST)),
  pomodoro: { sessions: [], totalMinutes: 0 },
  settings: { notifications: false, pomoSound: true, calendarConnected: false, calendarLastSync: null, calendarPromptDismissed: false },
  currentMonth: new Date(),
  currentWeekStart: getMondayOf(new Date()),
};

function getMondayOf(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
}

function dateKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function sameDay(a, b) {
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}

const STORAGE_KEY = 'planner-benjamin-v1';
const VISUAL_THEME_KEY = 'planner-visual-theme-v1';
const STATS_ORDER_KEY = 'planner-stats-order-v1';
const PANEL_ORDER_KEY = 'planner-panel-order-v1';
const DAILY_DIGEST_KEY = 'planner-daily-digest-date-v1';
const GOOGLE_CALENDAR_CLIENT_ID = '859282162452-r5p01v7q57fjaq0rctbolmika7f52lv9.apps.googleusercontent.com';
const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
const TIMELINE_START_HOUR = 7;
const TIMELINE_END_HOUR = 23;
const TIMELINE_TOTAL_MINUTES = (TIMELINE_END_HOUR - TIMELINE_START_HOUR) * 60;
let currentUser = null;
let unsubscribeCloud = null;
let applyingRemoteState = false;
let cloudSaveTimer = null;
let calendarTokenClient = null;
let googleCalendarReady = false;
let googleCalendarInitStarted = false;
let calendarSyncInFlight = false;
let calendarAccessToken = null;
let progressionChart = null;

function getPersistableState() {
  return {
    tasks: state.tasks || {},
    parciales: state.parciales || [],
    subjects: (state.subjects || []).map(s => ({ ...s, excludedDates: s.excludedDates || [] })),
    externalActivities: (state.externalActivities || []).map(a => ({ ...a, excludedDates: a.excludedDates || [] })),
    external_activities: (state.externalActivities || []).map(a => ({ ...a, excludedDates: a.excludedDates || [] })),
    calendarEvents: state.calendarEvents || [],
    resources: state.resources || {},
    studyNotes: state.studyNotes || [],
    focusStats: state.focusStats || {},
    networkingContacts: state.networkingContacts || [],
    habits: state.habits || [],
    lifts: state.lifts || [],
    kanbanCards: state.kanbanCards || [],
    checklist: state.checklist || [],
    pomodoro: state.pomodoro || { sessions: [], totalMinutes: 0 },
    settings: state.settings || { notifications: false, pomoSound: true },
  };
}

function applyPersistedState(data={}) {
  state.tasks = data.tasks || {};
  state.parciales = data.parciales || [];
  state.subjects = (data.subjects || []).map(s => ({ ...s, excludedDates: s.excludedDates || [] }));
  state.externalActivities = (data.externalActivities || data.external_activities || []).map(a => ({ ...a, excludedDates: a.excludedDates || [] }));
  state.calendarEvents = data.calendarEvents || [];
  state.resources = data.resources || {};
  state.studyNotes = data.studyNotes || [];
  state.focusStats = data.focusStats || {};
  state.networkingContacts = data.networkingContacts ?? state.networkingContacts ?? [];
  state.habits = data.habits ?? state.habits ?? [];
  state.lifts = data.lifts ?? state.lifts ?? [];
  state.kanbanCards = data.kanbanCards ?? state.kanbanCards ?? [];
  state.checklist = data.checklist || [];
  state.pomodoro = data.pomodoro || { sessions: [], totalMinutes: 0 };
  state.settings = {
    notifications: Boolean(data.settings?.notifications),
    pomoSound: data.settings?.pomoSound !== false,
    calendarConnected: Boolean(data.settings?.calendarConnected),
    calendarLastSync: data.settings?.calendarLastSync || null,
    calendarPromptDismissed: Boolean(data.settings?.calendarPromptDismissed),
  };
}

function renderAll() {
  renderDow();
  renderMonth();
  renderWeek();
  renderManagement();
  renderContacts();
  renderTraining();
  renderKanban();
  renderTargetSelect();
  renderStudyNotes();
  renderChecklist();
  updatePomoStats();
  applySavedLayout();
  updateSelectedFocusColor();
  updateCalendarStatus();
  if (document.getElementById('view-stats')?.classList.contains('active')) renderStatsView();
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getPersistableState()));
    showSaveDot();
    scheduleCloudSave();
  } catch(e) {
    toast('Error al guardar', 'error');
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      applyPersistedState(data);
    }
  } catch(e) {}
  seedModuleDataIfNeeded();
}

function seedModuleDataIfNeeded() {
  if (localStorage.getItem(MODULE_SEED_KEY)) return;
  if (!state.networkingContacts.length) state.networkingContacts = JSON.parse(JSON.stringify(DEFAULT_CONTACTS));
  if (!state.habits.length) state.habits = JSON.parse(JSON.stringify(DEFAULT_HABITS));
  if (!state.lifts.length) state.lifts = JSON.parse(JSON.stringify(DEFAULT_LIFTS));
  if (!state.kanbanCards.length) state.kanbanCards = JSON.parse(JSON.stringify(DEFAULT_KANBAN));
  localStorage.setItem(MODULE_SEED_KEY, '1');
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getPersistableState()));
  } catch(e) {}
}

function showSaveDot() {
  const dot = document.getElementById('save-dot');
  dot.classList.add('active');
  clearTimeout(window._saveDotTimer);
  window._saveDotTimer = setTimeout(() => dot.classList.remove('active'), 800);
}

function toast(msg, type='success', icon='circle-check') {
  const el = document.getElementById('toast');
  el.className = 'toast ' + type;
  el.innerHTML = `<i class="ti ti-${icon}"></i> <span>${msg}</span><button class="toast-close" onclick="this.closest('.toast').classList.remove('show')" aria-label="Cerrar"><i class="ph ph-x"></i></button>`;
  el.classList.add('show');
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function hexToRgba(hex, alpha = 0.14) {
  const clean = String(hex || '').replace('#', '').trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return `rgba(16,185,129,${alpha})`;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function getTargetById(id) {
  if (id === FREE_FOCUS_TARGET.id) return FREE_FOCUS_TARGET;
  return getFocusTargets().find(target => target.id === id) || null;
}

function getSubjectByName(name) {
  const normalized = normalizeText(name);
  return state.subjects.find(subject => normalizeText(subject.name) === normalized) || null;
}

function eventStyleAttr(color) {
  if (!color) return '';
  return ` style="--event-color:${color};--event-border:${hexToRgba(color, 0.42)};--event-bg:${hexToRgba(color, 0.15)};background:${hexToRgba(color, 0.15)};border-color:${hexToRgba(color, 0.42)};border-left-color:${color};color:${color};"`;
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getFocusTargets() {
  const subjects = state.subjects.map(s => ({ ...s, targetType: 'subject' }));
  const activities = state.externalActivities.map(a => ({ ...a, targetType: 'activity' }));
  return [...subjects, ...activities];
}

function targetLabel(target) {
  return `${target.icon || '•'} ${target.name}`;
}

function switchView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + name));
  document.querySelectorAll('.nav-item[data-view]').forEach(n => n.classList.toggle('active', n.dataset.view === name));
  if (name === 'semana') renderWeek();
  if (name === 'mes') renderMonth();
  if (name === 'parciales') renderParciales();
  if (name === 'pomodoro') { renderChecklist(); renderTargetSelect(); updatePomoStats(); }
  if (name === 'stats') renderStatsView();
  if (name === 'gestion') renderManagement();
  if (name === 'networking') renderContacts();
  if (name === 'entreno') renderTraining();
  if (name === 'proyectos') renderKanban();
}

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
