function renderParciales() {
  const list = document.getElementById('parciales-list');
  list.innerHTML = '';
  const today = new Date(); today.setHours(0,0,0,0);
  const parcialesOrdenados = [...state.parciales].sort((a, b) => a.date.localeCompare(b.date));
  if (parcialesOrdenados.length === 0) {
    list.innerHTML = '<div class="empty">No hay parciales cargados todavia.</div>';
    return;
  }
  parcialesOrdenados.forEach(p => {
    const originalIndex = state.parciales.indexOf(p);
    const [y,m,d] = p.date.split('-').map(Number);
    const pDate = new Date(y, m-1, d);
    const diff = Math.ceil((pDate - today) / 86400000);
    let cls = '', label = `${diff}`;
    if (diff < 0) { cls = 'past'; label = 'â€“'; }
    else if (diff === 0) { cls = 'urgent'; label = 'HOY'; }
    else if (diff <= 7) { cls = 'urgent'; }
    else if (diff <= 21) { cls = 'soon'; }

    const card = document.createElement('div');
    card.className = 'parcial-card ' + cls;
    card.innerHTML = `
      <div>
        <div class="countdown">${label}</div>
        <div class="countdown-label">${diff <= 0 ? '' : 'días'}</div>
      </div>
      <div class="parcial-info">
        <div class="parcial-mat">${p.mat}</div>
        <div class="parcial-meta">${pDate.getDate()}/${pDate.getMonth()+1} · ${DOW_FULL[pDate.getDay()]}</div>
      </div>
      <span class="parcial-badge">${p.type}</span>
      <div class="parcial-actions">
        <button class="mini-btn" title="Editar" onclick="event.stopPropagation(); editParcial(${originalIndex})"><i class="ti ti-pencil"></i></button>
        <button class="mini-btn danger" title="Eliminar" onclick="event.stopPropagation(); delParcial(${originalIndex})"><i class="ph ph-trash"></i></button>
      </div>
    `;
    card.onclick = () => {
      state.currentWeekStart = getMondayOf(pDate);
      switchView('semana');
    };
    list.appendChild(card);
  });
}

function addParcial() {
  const mat = document.getElementById('parcial-mat-input');
  const date = document.getElementById('parcial-date-input');
  const type = document.getElementById('parcial-type-input');
  if (!mat.value.trim() || !date.value) {
    toast('Completa materia y fecha', 'error', 'alert-circle');
    return;
  }
  state.parciales.push({
    id: 'p' + Date.now(),
    date: date.value,
    mat: mat.value.trim(),
    type: type.value.trim() || 'Parcial',
  });
  mat.value = '';
  date.value = '';
  type.value = '';
  save();
  renderParciales();
  renderMonth();
  toast('Parcial agregado');
}

function editParcial(i) {
  const parcial = state.parciales[i];
  if (!parcial) return;
  const mat = prompt('Materia', parcial.mat);
  if (mat === null) return;
  const date = prompt('Fecha (AAAA-MM-DD)', parcial.date);
  if (date === null) return;
  const type = prompt('Tipo', parcial.type);
  if (type === null) return;
  const cleanMat = mat.trim();
  const cleanDate = date.trim();
  if (!cleanMat || !/^\d{4}-\d{2}-\d{2}$/.test(cleanDate)) {
    toast('Datos incompletos o fecha invalida', 'error', 'alert-circle');
    return;
  }
  state.parciales[i] = { ...parcial, mat: cleanMat, date: cleanDate, type: type.trim() || 'Parcial' };
  save();
  renderParciales();
  renderMonth();
  renderWeek();
  toast('Parcial actualizado');
}

function delParcial(i) {
  const parcial = state.parciales[i];
  if (!parcial) return;
  if (!confirm(`Eliminar ${parcial.mat}?`)) return;
  state.parciales.splice(i, 1);
  save();
  renderParciales();
  renderMonth();
  renderWeek();
  toast('Parcial eliminado', 'success', 'trash');
}

