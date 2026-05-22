function renderChecklist() {
  const list = document.getElementById('checklist');
  list.innerHTML = '';
  state.checklist.forEach((c, i) => {
    const el = document.createElement('div');
    el.className = 'check-item' + (c.done ? ' done' : '');
    el.innerHTML = `
      <div class="checkbox ${c.done ? 'checked' : ''}" onclick="toggleCheck(${i})"></div>
      <span class="check-label" contenteditable="true" onblur="editCheck(${i}, this.innerText)">${escapeHtml(c.text)}</span>
      <button class="task-del" onclick="delCheck(${i})" style="opacity:0.6" aria-label="Eliminar pendiente"><i class="ph ph-x"></i></button>
    `;
    list.appendChild(el);
  });
  const done = state.checklist.filter(c => c.done).length;
  const pct = state.checklist.length ? Math.round((done / state.checklist.length) * 100) : 0;
  document.getElementById('check-pct').textContent = pct + '%';
  document.getElementById('check-fill').style.width = pct + '%';
}

function toggleCheck(i) {
  const wasDone = state.checklist[i]?.done;
  state.checklist[i].done = !state.checklist[i].done;
  save();
  renderChecklist();
  if (!wasDone && state.checklist.length && state.checklist.every(item => item.done)) {
    launchConfetti('checklist');
  }
}

function editCheck(i, newText) {
  const trimmed = newText.trim();
  if (state.checklist[i] && trimmed) {
    state.checklist[i].text = trimmed;
    save();
  }
}

function delCheck(i) {
  state.checklist.splice(i, 1);
  save();
  renderChecklist();
}

function addChecklistItem() {
  const inp = document.getElementById('check-new-input');
  if (!inp.value.trim()) return;
  state.checklist.push({ id: 'c' + Date.now(), text: inp.value.trim(), done: false });
  inp.value = '';
  save();
  renderChecklist();
}

function resetWeek() {
  state.checklist.forEach(c => c.done = false);
  save();
  renderChecklist();
  toast('Check semanal reseteado');
}
