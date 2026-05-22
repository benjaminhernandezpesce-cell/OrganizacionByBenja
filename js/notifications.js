function focusActivityForm() {
  switchView('gestion');
  setTimeout(() => {
    const input = document.getElementById('activity-name');
    if (!input) return;
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input.focus();
  }, 180);
}

function quickAddFromFab() {
  const activeView = document.querySelector('.view.active')?.id || '';
  if (activeView === 'view-gestion') openSubjectWizard();
  else switchView('gestion');
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    toast('Tu navegador no soporta notificaciones', 'error', 'alert-circle');
    return false;
  }
  if (Notification.permission === 'denied') {
    toast('Permití notificaciones desde la configuración del navegador', 'error', 'alert-circle');
    return false;
  }
  const wasDefault = Notification.permission === 'default';
  const permission = Notification.permission === 'granted'
    ? 'granted'
    : await Notification.requestPermission();
  if (permission !== 'granted') {
    toast('No se activaron las notificaciones', 'error', 'alert-circle');
    return false;
  }
  state.settings.notifications = true;
  document.getElementById('toggle-notify')?.classList.add('on');
  document.getElementById('btn-notify')?.classList.add('active');
  save();
  scheduleParcialNotifications();
  maybeSendDailyDigest(wasDefault);
  toast('Notificaciones activadas');
  return true;
}

async function toggleNotifications() {
  if (!state.settings.notifications) {
    await requestNotificationPermission();
  } else {
    state.settings.notifications = false;
    document.getElementById('toggle-notify').classList.remove('on');
    document.getElementById('btn-notify').classList.remove('active');
    save();
  }
}

function toggleSetting(el, key) {
  el.classList.toggle('on');
  state.settings[key] = el.classList.contains('on');
  save();
}

function scheduleParcialNotifications() {
  if (!state.settings.notifications) return;
  const today = new Date(); today.setHours(0,0,0,0);
  state.parciales.forEach(p => {
    const [y,m,d] = p.date.split('-').map(Number);
    const pDate = new Date(y, m-1, d);
    const diff = Math.ceil((pDate - today) / 86400000);
    if (diff === 1 && Notification.permission === 'granted') {
      setTimeout(() => {
        new Notification(`Mañana: ${p.mat}`, { body: p.type + ' - ¿Estás preparado?' });
      }, 2000);
    }
  });
}

function buildDailyDigest() {
  const today = new Date();
  const todayKey = dateKey(today);
  const pendingChecklist = (state.checklist || []).filter(item => !item.done);
  const todayEvents = (state.parciales || []).filter(item => item.date === todayKey);
  const recurringToday = getRecurringEventsForDate(today);
  const recurringNames = [...new Set(recurringToday.map(item => item.title).filter(Boolean))];

  const pieces = [
    `${pendingChecklist.length} pendiente${pendingChecklist.length === 1 ? '' : 's'} del checklist`,
    `${todayEvents.length} parcial/entrega${todayEvents.length === 1 ? '' : 's'} para hoy`,
  ];
  if (recurringNames.length) pieces.push(`actividades: ${recurringNames.join(', ')}`);
  else pieces.push('sin cursadas o actividades recurrentes');

  const body = `Hoy tenés ${pieces.join(', ')}.`;
  return {
    hasContent: pendingChecklist.length > 0 || todayEvents.length > 0 || recurringNames.length > 0,
    body,
  };
}

function maybeSendDailyDigest(force=false) {
  if (!state.settings.notifications || !('Notification' in window) || Notification.permission !== 'granted') return;
  const todayKey = dateKey(new Date());
  if (!force && localStorage.getItem(DAILY_DIGEST_KEY) === todayKey) return;
  const digest = buildDailyDigest();
  if (!digest.hasContent) {
    localStorage.setItem(DAILY_DIGEST_KEY, todayKey);
    return;
  }
  new Notification('¡Buen día! Resumen de hoy', {
    body: digest.body,
    tag: 'planner-daily-digest',
    renotify: false,
  });
  localStorage.setItem(DAILY_DIGEST_KEY, todayKey);
}

function startDailyDigestChecks() {
  maybeSendDailyDigest();
  setInterval(() => maybeSendDailyDigest(), 30 * 60 * 1000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) maybeSendDailyDigest();
  });
}
