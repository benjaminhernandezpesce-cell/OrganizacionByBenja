function habitStreak(habit) {
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (habit.checks?.[dateKey(d)]) streak++;
    else break;
  }
  return streak;
}

function renderTraining() {
  renderHabits();
  renderLifts();
  renderProgressionExerciseOptions();
  renderProgressionChart();
}

function renderHabits() {
  const list = document.getElementById('habit-list');
  if (!list) return;
  const todayKey = dateKey(new Date());
  list.innerHTML = state.habits.length ? '' : '<div class="empty">No hay hábitos cargados.</div>';
  state.habits.forEach(habit => {
    const checked = !!habit.checks?.[todayKey];
    const el = document.createElement('div');
    el.className = 'habit-card';
    el.innerHTML = `
      <div class="habit-row">
        <button class="habit-check ${checked ? 'checked' : ''}" onclick="toggleHabit('${habit.id}')"><i class="ph ph-check"></i></button>
        <div style="flex:1;">
          <div class="habit-name">${escapeHtml(habit.name)}</div>
          <div class="habit-meta">Racha: ${habitStreak(habit)} días</div>
        </div>
        <button class="mini-btn danger" onclick="deleteHabit('${habit.id}')" aria-label="Eliminar hábito"><i class="ph ph-trash"></i></button>
      </div>
    `;
    list.appendChild(el);
  });
}

function addHabit() {
  const input = document.getElementById('habit-name-input');
  const name = input.value.trim();
  if (!name) return;
  state.habits.push({ id: uid('habit'), name, checks: {} });
  input.value = '';
  save();
  renderHabits();
}

function toggleHabit(id) {
  const habit = state.habits.find(item => item.id === id);
  if (!habit) return;
  const todayKey = dateKey(new Date());
  habit.checks = habit.checks || {};
  habit.checks[todayKey] = !habit.checks[todayKey];
  if (!habit.checks[todayKey]) delete habit.checks[todayKey];
  save();
  renderHabits();
}

function deleteHabit(id) {
  state.habits = state.habits.filter(item => item.id !== id);
  save();
  renderHabits();
}

function renderLifts() {
  const list = document.getElementById('lift-list');
  if (!list) return;
  const lifts = [...(state.lifts || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  list.innerHTML = lifts.length ? '' : '<div class="empty">No hay registros de fuerza.</div>';
  lifts.forEach(lift => {
    const el = document.createElement('div');
    el.className = 'lift-card';
    el.innerHTML = `
      <div class="lift-row">
        <div>
          <div class="habit-name">${escapeHtml(lift.exercise)}</div>
          <div class="lift-meta">${escapeHtml(lift.date)} · ${Number(lift.kg || 0)}kg x ${Number(lift.reps || 0)}</div>
        </div>
        <button class="mini-btn danger" onclick="deleteLift('${lift.id}')" aria-label="Eliminar registro"><i class="ph ph-trash"></i></button>
      </div>
    `;
    list.appendChild(el);
  });
}

function renderProgressionExerciseOptions() {
  const select = document.getElementById('progression-exercise-select');
  if (!select) return;
  const previous = select.value;
  const exercises = [...new Set((state.lifts || []).map(lift => lift.exercise).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'));
  select.innerHTML = exercises.length
    ? exercises.map(exercise => `<option value="${escapeHtml(exercise)}">${escapeHtml(exercise)}</option>`).join('')
    : '<option value="">Sin registros</option>';
  if (previous && exercises.includes(previous)) select.value = previous;
}

function renderProgressionChart() {
  const canvas = document.getElementById('progressionChart');
  const select = document.getElementById('progression-exercise-select');
  if (!canvas || !select || typeof Chart === 'undefined') return;
  const exercise = select.value;
  const rows = (state.lifts || [])
    .filter(lift => lift.exercise === exercise)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));
  if (progressionChart) {
    progressionChart.destroy();
    progressionChart = null;
  }
  const ctx = canvas.getContext('2d');
  progressionChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: rows.map(lift => lift.date),
      datasets: [{
        label: exercise || 'Ejercicio',
        data: rows.map(lift => Number(lift.kg || 0)),
        borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#10B981',
        backgroundColor: 'rgba(16, 185, 129, 0.14)',
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: getComputedStyle(document.documentElement).getPropertyValue('--text-dim').trim() || '#b4b4bb' } },
        tooltip: { callbacks: { label: context => `${context.parsed.y} kg` } },
      },
      scales: {
        x: { ticks: { color: '#8b8b95' }, grid: { color: 'rgba(255,255,255,0.06)' } },
        y: { ticks: { color: '#8b8b95' }, grid: { color: 'rgba(255,255,255,0.06)' }, title: { display: true, text: 'Kilos', color: '#8b8b95' } },
      },
    },
  });
}

function addLift() {
  const date = document.getElementById('lift-date').value || dateKey(new Date());
  const exercise = document.getElementById('lift-exercise').value.trim();
  const kg = Number(document.getElementById('lift-kg').value || 0);
  const reps = Number(document.getElementById('lift-reps').value || 0);
  if (!exercise || !kg || !reps) {
    toast('Completá ejercicio, kilos y repeticiones', 'error', 'alert-circle');
    return;
  }
  state.lifts.push({ id: uid('lift'), date, exercise, kg, reps });
  document.getElementById('lift-exercise').value = '';
  document.getElementById('lift-kg').value = '';
  document.getElementById('lift-reps').value = '';
  save();
  renderLifts();
  renderProgressionExerciseOptions();
  renderProgressionChart();
}

function deleteLift(id) {
  state.lifts = state.lifts.filter(lift => lift.id !== id);
  save();
  renderLifts();
  renderProgressionExerciseOptions();
  renderProgressionChart();
}
