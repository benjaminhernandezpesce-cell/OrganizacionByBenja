function renderStatsView() {
  const today = new Date();
  const chart = document.getElementById('bar-chart');
  chart.innerHTML = '';
  let max = 1;
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const tasks = state.tasks[dateKey(d)] || [];
    const done = tasks.filter(t => t.done).length;
    days.push({ d, done });
    if (done > max) max = done;
  }
  days.forEach(({d, done}) => {
    const col = document.createElement('div');
    col.className = 'bar-col';
    const heightPct = (done / max) * 100;
    col.innerHTML = `
      <div class="bar-value">${done}</div>
      <div class="bar ${done === 0 ? 'bar-empty' : ''}" style="height: ${Math.max(heightPct, 4)}%;"></div>
      <div class="bar-label">${DOW_SHORT[d.getDay() === 0 ? 6 : d.getDay() - 1]}</div>
    `;
    chart.appendChild(col);
  });

  const heatmap = document.getElementById('heatmap');
  heatmap.innerHTML = '';
  for (let i = 27; i >= 0; i--) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const tasks = state.tasks[dateKey(d)] || [];
    const done = tasks.filter(t => t.done).length;
    let level = 0;
    if (done >= 1) level = 1;
    if (done >= 3) level = 2;
    if (done >= 5) level = 3;
    if (done >= 8) level = 4;
    const cell = document.createElement('div');
    cell.className = 'heatmap-cell' + (level > 0 ? ' l' + level : '');
    cell.title = `${dateKey(d)}: ${done} tareas`;
    heatmap.appendChild(cell);
  }

  let totalDone = 0, totalTasks = 0;
  Object.values(state.tasks).forEach(arr => {
    totalTasks += arr.length;
    totalDone += arr.filter(t => t.done).length;
  });
  document.getElementById('stats-total-done').textContent = totalDone;
  document.getElementById('stats-completion').textContent = totalTasks ? Math.round(totalDone/totalTasks*100) + '%' : '0%';
  const hours = Math.round((state.pomodoro.totalMinutes / 60) * 10) / 10;
  document.getElementById('stats-pomo-hours').textContent = hours + 'h';

  const dayCounts = [0,0,0,0,0,0,0];
  Object.entries(state.tasks).forEach(([key, arr]) => {
    const [y,m,d] = key.split('-').map(Number);
    const dow = new Date(y,m-1,d).getDay();
    dayCounts[dow] += arr.filter(t => t.done).length;
  });
  let bestIdx = 0;
  for (let i = 1; i < 7; i++) if (dayCounts[i] > dayCounts[bestIdx]) bestIdx = i;
  document.getElementById('stats-best-day').textContent = dayCounts[bestIdx] > 0 ? DOW_FULL[bestIdx].slice(0,3) : '—';
  const focusList = document.getElementById('focus-by-target');
  if (focusList) {
    const monthKey = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
    const totals = [FREE_FOCUS_TARGET, ...getFocusTargets()].map(target => {
      const minutes = (state.focusStats[target.id]?.sessions || [])
        .filter(session => session.date && session.date.startsWith(monthKey))
        .reduce((sum, session) => sum + Number(session.minutes || 0), 0);
      return { target, minutes };
    }).filter(item => item.minutes > 0).sort((a, b) => b.minutes - a.minutes);
    focusList.innerHTML = totals.length ? '' : '<div class="empty">Todavía no hay sesiones vinculadas este mes.</div>';
    totals.forEach(({ target, minutes }) => {
      const el = document.createElement('div');
      el.className = 'entity-card';
      el.innerHTML = `
        <div class="entity-swatch" style="background:${target.color || '#00d97e'}">${escapeHtml(target.icon || '•')}</div>
        <div class="entity-info">
          <div class="entity-name">${escapeHtml(target.name)}</div>
          <div class="entity-meta">${Math.round((minutes / 60) * 10) / 10} h este mes</div>
        </div>
      `;
      focusList.appendChild(el);
    });
  }
}
