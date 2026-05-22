// Pomodoro 2.0: registra minutos reales contra la materia/actividad elegida.
let pomoState = {
  mode: 'focus',
  minutes: 25,
  seconds: 0,
  running: false,
  interval: null,
  totalSecondsInitial: 25 * 60,
  elapsedSeconds: 0,
  startedAt: null,
  targetId: null,
};

function updatePomoDisplay() {
  const m = String(pomoState.minutes).padStart(2,'0');
  const s = String(pomoState.seconds).padStart(2,'0');
  document.getElementById('pomo-display').textContent = `${m}:${s}`;
  document.title = pomoState.running ? `${m}:${s} - Organización` : 'Organización - Benjamin';
  updatePomoProgress();
}

function updatePomoStats() {
  const today = new Date();
  const todayKey = dateKey(today);
  const weekStart = getMondayOf(today);
  let todayCount = 0, weekCount = 0;
  state.pomodoro.sessions.forEach(s => {
    if (s.date === todayKey) todayCount++;
    const [y,m,d] = s.date.split('-').map(Number);
    if (new Date(y,m-1,d) >= weekStart) weekCount++;
  });
  document.getElementById('pomo-today').textContent = todayCount;
  document.getElementById('pomo-week').textContent = weekCount;
  document.getElementById('pomo-total').textContent = state.pomodoro.sessions.length;
}

function updatePomoProgress() {
  const fill = document.getElementById('pomo-progress-fill');
  if (!fill) return;
  const total = Math.max(1, Number(pomoState.totalSecondsInitial || 1));
  const pct = Math.max(0, Math.min(100, (Number(pomoState.elapsedSeconds || 0) / total) * 100));
  fill.style.width = pct + '%';
}

function updateSelectedFocusColor() {
  const select = document.getElementById('pomo-target');
  const wrap = document.querySelector('.pomodoro-wrap');
  if (!select || !wrap) return;
  const target = getTargetById(select.value);
  if (!target?.color) {
    wrap.classList.remove('target-linked');
    wrap.style.removeProperty('--pomo-target-color');
    wrap.style.removeProperty('--pomo-target-bg');
    return;
  }
  wrap.classList.add('target-linked');
  wrap.style.setProperty('--pomo-target-color', target.color);
  wrap.style.setProperty('--pomo-target-bg', hexToRgba(target.color, 0.14));
}

function startPomo() {
  if (pomoState.running) {
    clearInterval(pomoState.interval);
    pomoState.running = false;
    document.getElementById('pomo-start').innerHTML = '<i class="ti ti-player-play"></i> Reanudar';
    document.getElementById('pomo-display').classList.remove('running', 'break');
    document.getElementById('pomo-status').textContent = 'Pausado';
    return;
  }
  const targetSelect = document.getElementById('pomo-target');
  pomoState.targetId = targetSelect ? (targetSelect.value || FREE_FOCUS_TARGET.id) : FREE_FOCUS_TARGET.id;
  updateSelectedFocusColor();
  pomoState.startedAt = Date.now();
  pomoState.running = true;
  document.getElementById('pomo-start').innerHTML = '<i class="ti ti-player-pause"></i> Pausar';
  document.getElementById('pomo-display').classList.add(pomoState.mode === 'focus' ? 'running' : 'break');
  document.getElementById('pomo-status').textContent = pomoState.mode === 'focus' ? 'Modo enfoque activo' : 'Descansando';

  pomoState.interval = setInterval(() => {
    if (pomoState.seconds === 0) {
      if (pomoState.minutes === 0) {
        completePomo();
        return;
      }
      pomoState.minutes--;
      pomoState.seconds = 59;
    } else {
      pomoState.seconds--;
    }
    pomoState.elapsedSeconds++;
    updatePomoDisplay();
  }, 1000);
}

function completePomo() {
  clearInterval(pomoState.interval);
  pomoState.running = false;
  if (state.settings.pomoSound) playBeep();

  if (pomoState.mode === 'focus') {
    const today = new Date();
    const focusedMinutes = Math.max(1 / 60, Math.round((pomoState.elapsedSeconds / 60) * 100) / 100);
    const target = getTargetById(pomoState.targetId) || FREE_FOCUS_TARGET;
    state.pomodoro.sessions.push({
      date: dateKey(today),
      minutes: focusedMinutes,
      targetId: target.id,
      targetType: target.targetType,
      targetName: target.name,
      timestamp: today.toISOString(),
    });
    state.pomodoro.totalMinutes += focusedMinutes;
    if (target.id) {
      if (!state.focusStats[target.id]) state.focusStats[target.id] = { totalMinutes: 0, sessions: [] };
      state.focusStats[target.id].totalMinutes = Number(state.focusStats[target.id].totalMinutes || 0) + focusedMinutes;
      if (!Array.isArray(state.focusStats[target.id].sessions)) state.focusStats[target.id].sessions = [];
      state.focusStats[target.id].sessions.push({
        date: dateKey(today),
        minutes: focusedMinutes,
        timestamp: today.toISOString(),
      });
    }
    save();
    toast('¡Pomodoro completado! 🍅', 'success', 'flame');
    launchConfetti('pomodoro');

    if (state.settings.notifications && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomodoro completado', { body: 'Tiempo de descansar 5 minutos.' });
    }
  } else {
    toast('Descanso terminado', 'success', 'coffee');
  }

  resetPomo();
  updatePomoStats();
  if (document.getElementById('view-stats').classList.contains('active')) renderStatsView();
}

function resetPomo() {
  clearInterval(pomoState.interval);
  pomoState.running = false;
  pomoState.minutes = pomoState.totalSecondsInitial / 60;
  pomoState.seconds = 0;
  pomoState.elapsedSeconds = 0;
  pomoState.startedAt = null;
  document.getElementById('pomo-start').innerHTML = '<i class="ti ti-player-play"></i> Iniciar';
  document.getElementById('pomo-display').classList.remove('running', 'break');
  document.getElementById('pomo-status').textContent = 'Listo para arrancar';
  updatePomoDisplay();
}

function setPomoMode(min, mode) {
  pomoState.mode = mode;
  pomoState.totalSecondsInitial = min * 60;
  resetPomo();
  document.querySelectorAll('.duration-btn, .pomo-mode').forEach(el => {
    el.classList.toggle('active', parseInt(el.dataset.min) === min);
  });
}

function setCustomPomoMinutes() {
  const input = document.getElementById('pomo-custom-min');
  const min = Math.max(1, Math.min(180, parseInt(input.value || '25', 10)));
  input.value = min;
  setPomoMode(min, 'focus');
  document.querySelectorAll('.duration-btn').forEach(el => el.classList.remove('active'));
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
    setTimeout(() => {
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.connect(g2); g2.connect(ctx.destination);
      o2.frequency.value = 1000;
      g2.gain.setValueAtTime(0.3, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      o2.start();
      o2.stop(ctx.currentTime + 0.5);
    }, 200);
  } catch(e) {}
}
