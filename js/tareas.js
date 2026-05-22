function addTask(key) {
  const inp = document.getElementById('inp-' + key);
  const sel = document.getElementById('sel-' + key);
  const startInput = document.getElementById('task-start-' + key);
  const endInput = document.getElementById('task-end-' + key);
  if (!inp || !inp.value.trim()) return;
  if (!state.tasks[key]) state.tasks[key] = [];
  state.tasks[key].push({
    text: inp.value.trim(),
    tag: sel.value,
    done: false,
    start: startInput?.value || '',
    end: endInput?.value || '',
  });
  inp.value = '';
  if (startInput) startInput.value = '';
  if (endInput) endInput.value = '';
  save();
  renderWeek();
  renderMonth();
  toast('Tarea agregada');
}

function toggleTask(key, i) {
  state.tasks[key][i].done = !state.tasks[key][i].done;
  save();
  renderWeek();
  renderMonth();
}

function editTask(key, i, newText) {
  const trimmed = newText.trim();
  if (state.tasks[key] && state.tasks[key][i] && trimmed) {
    state.tasks[key][i].text = trimmed;
    save();
  }
}

function delTask(key, i) {
  state.tasks[key].splice(i, 1);
  if (state.tasks[key].length === 0) delete state.tasks[key];
  save();
  renderWeek();
  renderMonth();
  toast('Tarea eliminada', 'success', 'trash');
}
