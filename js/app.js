document.querySelectorAll('.nav-item[data-view]').forEach(n => {
  n.onclick = () => switchView(n.dataset.view);
});

let lastHelpRequestAt = 0;
function handleHelpRequest(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  const now = Date.now();
  if (now - lastHelpRequestAt < 450) return;
  lastHelpRequestAt = now;
  restartPlannerTour();
}

document.getElementById('btn-help')?.addEventListener('click', handleHelpRequest);
document.getElementById('btn-help')?.addEventListener('touchend', handleHelpRequest, { passive: false });

['parcial-mat-input', 'parcial-date-input', 'parcial-type-input'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', (event) => {
    if (event.key === 'Enter') addParcial();
  });
});
document.getElementById('add-event-title')?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') saveQuickEvent();
});

document.getElementById('prev-month').onclick = () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() - 1, 1);
  renderMonth();
};
document.getElementById('next-month').onclick = () => {
  state.currentMonth = new Date(state.currentMonth.getFullYear(), state.currentMonth.getMonth() + 1, 1);
  renderMonth();
};
document.getElementById('prev-week').onclick = () => {
  const d = new Date(state.currentWeekStart); d.setDate(d.getDate() - 7);
  state.currentWeekStart = d;
  renderWeek();
};
document.getElementById('next-week').onclick = () => {
  const d = new Date(state.currentWeekStart); d.setDate(d.getDate() + 7);
  state.currentWeekStart = d;
  renderWeek();
};

document.querySelectorAll('.pomo-mode').forEach(btn => {
  btn.onclick = () => setPomoMode(parseInt(btn.dataset.min), btn.dataset.mode);
});
document.getElementById('pomo-start').onclick = startPomo;
document.getElementById('pomo-reset').onclick = resetPomo;

document.getElementById('btn-settings').onclick = () => openModal('modal-settings');
document.getElementById('btn-notify').onclick = requestNotificationPermission;

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.onclick = (e) => { if (e.target === o) o.classList.remove('open'); };
});

applyVisualTheme();
load();
renderDow();
renderMonth();
renderWeek();
renderManagement();
renderContacts();
renderTraining();
renderKanban();
renderWeekdayPicker('activity-days', []);
renderWeekdayPicker('subject-days', []);
renderSubjectDaySchedules([]);
renderTargetSelect();
renderStudyNotes();
updatePomoDisplay();
updatePomoStats();
initDashboardDragDrop();
initStatsSortable();
initGoogleCalendarApi();
updateCalendarStatus();
const liftDateInput = document.getElementById('lift-date');
if (liftDateInput && !liftDateInput.value) liftDateInput.value = dateKey(new Date());
const dayDetailInput = document.getElementById('day-detail-date');
if (dayDetailInput && !dayDetailInput.value) { dayDetailInput.value = dateKey(new Date()); renderDayDetail(); }

if (state.settings.notifications) {
  document.getElementById('btn-notify').classList.add('active');
  document.getElementById('toggle-notify').classList.add('on');
  scheduleParcialNotifications();
}
startDailyDigestChecks();
if (!state.settings.pomoSound) {
  document.getElementById('toggle-pomo-sound').classList.remove('on');
}
maybeStartPlannerTour();

if ('serviceWorker' in navigator && window.location.protocol === 'https:') {
}
