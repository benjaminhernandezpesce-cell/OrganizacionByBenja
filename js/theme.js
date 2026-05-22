function normalizeHexColor(value, fallback) {
  return /^#[0-9a-fA-F]{6}$/.test(value || '') ? value : fallback;
}

function shadeHexColor(hex, amount) {
  const clean = normalizeHexColor(hex, '#111111').replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.max(0, Math.min(255, (num >> 16) + amount));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 255) + amount));
  const b = Math.max(0, Math.min(255, (num & 255) + amount));
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function getVisualTheme() {
  try {
    return JSON.parse(localStorage.getItem(VISUAL_THEME_KEY)) || {};
  } catch {
    return {};
  }
}

function applyVisualTheme() {
  const theme = getVisualTheme();
  const bg = normalizeHexColor(theme.bg, '#111111');
  const accent = normalizeHexColor(theme.accent, '#10B981');
  const root = document.documentElement;
  const card = shadeHexColor(bg, 7);
  const hover = shadeHexColor(bg, 16);
  const surface = shadeHexColor(bg, 24);

  root.style.setProperty('--bg-principal', bg);
  root.style.setProperty('--bg', bg);
  root.style.setProperty('--bg-tarjetas', card);
  root.style.setProperty('--bg-elev', card);
  root.style.setProperty('--bg-tarjetas-hover', hover);
  root.style.setProperty('--bg-elev-2', hover);
  root.style.setProperty('--bg-campos', shadeHexColor(bg, 5));
  root.style.setProperty('--bg-superficie', surface);
  root.style.setProperty('--bg-elev-3', surface);
  root.style.setProperty('--bg-sidebar', hexToRgba(bg, 0.92));
  root.style.setProperty('--bg-header', hexToRgba(bg, 0.78));
  root.style.setProperty('--bg-glass', hexToRgba(card, 0.72));
  root.style.setProperty('--color-acento', accent);
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--color-acento-suave', hexToRgba(accent, 0.13));
  root.style.setProperty('--accent-dim', hexToRgba(accent, 0.13));
  root.style.setProperty('--color-acento-brillo', hexToRgba(accent, 0.36));
  root.style.setProperty('--accent-glow', hexToRgba(accent, 0.36));
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  document.body.style.backgroundImage = `
    radial-gradient(circle at 18% 0%, ${hexToRgba(accent, 0.075)} 0%, transparent 36%),
    radial-gradient(circle at 88% 100%, rgba(34,211,238,0.045) 0%, transparent 44%),
    linear-gradient(180deg, ${bg} 0%, ${shadeHexColor(bg, -2)} 100%)
  `;

  const bgInput = document.getElementById('theme-bg-input');
  const accentInput = document.getElementById('theme-accent-input');
  if (bgInput) bgInput.value = bg;
  if (accentInput) accentInput.value = accent;
  if (document.getElementById('view-entreno')?.classList.contains('active')) renderProgressionChart();
}

function updateThemeColor(key, value) {
  const current = getVisualTheme();
  current[key] = value;
  localStorage.setItem(VISUAL_THEME_KEY, JSON.stringify(current));
  applyVisualTheme();
}

function resetVisualTheme() {
  localStorage.removeItem(VISUAL_THEME_KEY);
  document.documentElement.removeAttribute('style');
  applyVisualTheme();
  toast('Colores restaurados', 'success', 'palette');
}
