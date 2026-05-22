function launchConfetti(type = 'default') {
  if (typeof confetti !== 'function') return;
  const particleCount = type === 'pomodoro' ? 42 : 34;
  confetti({
    particleCount,
    spread: 54,
    startVelocity: 24,
    gravity: 0.85,
    scalar: 0.75,
    ticks: 140,
    origin: { y: 0.72 },
    colors: ['#10B981', '#22d3ee', '#f59e0b', '#f43f5e'],
  });
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportCsv() {
  const rows = [[
    'tipo', 'fecha', 'id', 'nombre', 'detalle', 'estado', 'minutos', 'color', 'inicio', 'fin', 'extra'
  ]];

  Object.entries(state.tasks || {}).forEach(([date, tasks]) => {
    (tasks || []).forEach((task, index) => {
      rows.push(['tarea', date, `task-${date}-${index}`, task.text || '', task.tag || '', task.done ? 'hecha' : 'pendiente', '', '', '', '', '']);
    });
  });

  (state.subjects || []).forEach(subject => {
    rows.push(['materia', '', subject.id || '', subject.name || '', subject.icon || '', '', '', subject.color || '', subject.start || '', subject.end || '', '']);
  });

  (state.pomodoro?.sessions || []).forEach(session => {
    rows.push(['focus', session.date || '', session.targetId || '', session.targetName || '', session.targetType || '', 'completada', session.minutes || 0, '', '', '', session.timestamp || '']);
  });

  (state.calendarEvents || []).forEach(event => {
    rows.push(['google_calendar', event.date || '', event.id || '', event.title || '', event.time || '', '', '', event.color || '', event.start || '', event.end || '', event.htmlLink || '']);
  });

  (state.studyNotes || []).forEach(note => {
    rows.push(['nota_estudio', note.createdAt || '', note.id || '', note.targetName || 'Sesión libre', note.text || '', note.targetType || '', '', '', '', '', note.targetId || '']);
  });

  (state.networkingContacts || []).forEach(contact => {
    rows.push(['contacto', '', contact.id || '', contact.name || '', contact.role || '', contact.tag || '', '', '', '', '', `${contact.link || ''} ${contact.phone || ''} ${contact.notes || ''}`.trim()]);
  });

  (state.habits || []).forEach(habit => {
    rows.push(['habito', '', habit.id || '', habit.name || '', 'racha diaria', '', '', '', '', '', `${habitStreak(habit)} dias`]);
  });

  (state.lifts || []).forEach(lift => {
    rows.push(['fuerza', lift.date || '', lift.id || '', lift.exercise || '', `${lift.kg || 0}kg`, `${lift.reps || 0} reps`, '', '', '', '', '']);
  });

  (state.kanbanCards || []).forEach(card => {
    rows.push(['proyecto', '', card.id || '', card.title || '', card.desc || '', card.status || '', '', '', '', '', card.tag || '']);
  });

  const csv = '\uFEFF' + rows.map(row => row.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `planner-benjamin-${dateKey(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast('CSV exportado');
}

function exportData() {
  const data = {
    tasks: state.tasks,
    parciales: state.parciales,
    subjects: state.subjects,
    externalActivities: state.externalActivities,
    external_activities: state.externalActivities,
    calendarEvents: state.calendarEvents,
    resources: state.resources,
    studyNotes: state.studyNotes,
    focusStats: state.focusStats,
    networkingContacts: state.networkingContacts,
    habits: state.habits,
    lifts: state.lifts,
    kanbanCards: state.kanbanCards,
    checklist: state.checklist,
    pomodoro: state.pomodoro,
    settings: { ...state.settings },
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `planner-benjamin-${dateKey(new Date())}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Datos exportados');
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (confirm('¿Reemplazar todos los datos actuales?')) {
        state.tasks = data.tasks || {};
        state.parciales = data.parciales || JSON.parse(JSON.stringify(DEFAULT_PARCIALES));
        state.subjects = data.subjects || [];
        state.externalActivities = data.externalActivities || data.external_activities || [];
        state.calendarEvents = data.calendarEvents || [];
        state.resources = data.resources || {};
        state.studyNotes = data.studyNotes || [];
        state.focusStats = data.focusStats || {};
        state.networkingContacts = data.networkingContacts || [];
        state.habits = data.habits || [];
        state.lifts = data.lifts || [];
        state.kanbanCards = data.kanbanCards || [];
        state.checklist = data.checklist || JSON.parse(JSON.stringify(DEFAULT_CHECKLIST));
        state.pomodoro = data.pomodoro || { sessions: [], totalMinutes: 0 };
        save();
        location.reload();
      }
    } catch(err) {
      toast('Archivo inválido', 'error');
    }
  };
  reader.readAsText(file);
}

async function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
  state.tasks = {};
  state.parciales = [];
  state.subjects = [];
  state.externalActivities = [];
  state.calendarEvents = [];
  state.resources = {};
  state.studyNotes = [];
  state.focusStats = {};
  state.networkingContacts = [];
  state.habits = [];
  state.lifts = [];
  state.kanbanCards = [];
  state.checklist = [];
  state.pomodoro = { sessions: [], totalMinutes: 0 };
  state.settings = { notifications: false, pomoSound: true, calendarConnected: false, calendarLastSync: null, calendarPromptDismissed: false };
  const account = window.googleAccountPlanner;
  if (currentUser && account) {
    const ref = userDocRef();
    if (ref) {
      try {
        await account.setDoc(ref, {
          ...getPersistableState(),
          updatedAt: account.serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.error(error);
      }
    }
  }
  location.reload();
}
