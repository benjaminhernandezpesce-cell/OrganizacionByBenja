const TOUR_STORAGE_KEY = 'tutorialVisto';
function getTourSteps() {
  return [
    {
      element: '.stats-grid',
      view: 'mes',
      title: 'Dashboard',
      intro: 'Tus métricas de tareas y rachas de un vistazo.',
    },
    {
      element: '#view-gestion .command-hero',
      view: 'gestion',
      title: 'Panel de Gestión',
      intro: 'Empieza aquí para agregar materias, contactos y configurar colores.',
    },
    {
      element: '#view-pomodoro .pomo-display',
      view: 'pomodoro',
      title: 'Pomodoro',
      intro: "Inicia sesiones asociadas a materias o usa el nuevo 'Modo Libre'.",
    },
    {
      element: '#view-mes .calendar',
      view: 'mes',
      title: 'Calendario Mensual',
      intro: 'Tus entregas y los días de cursada recurrente se calculan y muestran aquí.',
    },
    {
      element: '#view-networking',
      view: 'networking',
      title: 'Networking',
      intro: 'Tu gestor de contactos clave y profesores.',
    },
    {
      element: '#view-entreno .chart-shell',
      view: 'entreno',
      title: 'Tracker',
      intro: 'Controla tus hábitos diarios y tu progresión de fuerza en el gimnasio.',
    },
    {
      element: '#view-proyectos .kanban-board',
      view: 'proyectos',
      title: 'Kanban',
      intro: 'Organiza tus proyectos paralelos arrastrando tarjetas.',
    },
  ];
}

function prepareTourStep(step) {
  if (!step) return null;
  closeFallbackTour(false);
  document.querySelectorAll('.modal-overlay.open').forEach(modal => modal.classList.remove('open'));
  if (step.view) switchView(step.view);
  const target = document.querySelector(step.element);
  target?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
  return target;
}

function getCurrentIntroStep(tour, steps) {
  const index = typeof tour?._currentStep === 'number' ? tour._currentStep : 0;
  return steps[Math.max(0, Math.min(index, steps.length - 1))];
}

function startPlannerTour(force=false) {
  if (!force && localStorage.getItem(TOUR_STORAGE_KEY)) return;
  startFallbackTour();
  return;
  if (typeof introJs !== 'function') {
    startFallbackTour();
    return;
  }
  closeFallbackTour(false);
  document.querySelectorAll('.modal-overlay.open').forEach(modal => modal.classList.remove('open'));
  const steps = getTourSteps();
  prepareTourStep(steps[0]);
  setTimeout(() => {
    let tour;
    try {
      tour = introJs().setOptions({
      steps,
      nextLabel: 'Siguiente',
      prevLabel: 'Atrás',
      doneLabel: 'Finalizar',
      skipLabel: '×',
      tooltipClass: 'planner-intro-tooltip',
      highlightClass: 'planner-intro-highlight',
      tooltipPosition: window.matchMedia('(max-width: 768px)').matches ? 'bottom' : 'auto',
      positionPrecedence: ['bottom', 'top', 'right', 'left'],
      scrollToElement: true,
      scrollPadding: window.matchMedia('(max-width: 768px)').matches ? 132 : 96,
      disableInteraction: false,
      showProgress: true,
      exitOnOverlayClick: true,
      });
    } catch (error) {
      startFallbackTour();
      return;
    }
    tour.onbeforechange(() => {
      const step = getCurrentIntroStep(tour, steps);
      prepareTourStep(step);
    }).onafterchange(() => {
      const step = getCurrentIntroStep(tour, steps);
      prepareTourStep(step);
      setTimeout(() => {
        if (typeof tour.refresh === 'function') tour.refresh();
        clampIntroTooltip();
      }, 120);
    }).oncomplete(() => {
      localStorage.setItem(TOUR_STORAGE_KEY, '1');
    }).onexit(() => {
      localStorage.setItem(TOUR_STORAGE_KEY, '1');
      window.removeEventListener('resize', clampIntroTooltip);
      window.removeEventListener('orientationchange', clampIntroTooltip);
    });
    window.addEventListener('resize', clampIntroTooltip);
    window.addEventListener('orientationchange', clampIntroTooltip);
    try {
      tour.start();
      setTimeout(clampIntroTooltip, 160);
    } catch (error) {
      window.removeEventListener('resize', clampIntroTooltip);
      window.removeEventListener('orientationchange', clampIntroTooltip);
      startFallbackTour();
    }
  }, 250);
}

function restartPlannerTour() {
  localStorage.removeItem(TOUR_STORAGE_KEY);
  startFallbackTour();
}

function clampIntroTooltip() {
  const tooltip = document.querySelector('.introjs-tooltip');
  if (!tooltip) return;
  const margin = 12;
  const rect = tooltip.getBoundingClientRect();
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const currentLeft = parseFloat(tooltip.style.left || '0');
  const currentTop = parseFloat(tooltip.style.top || '0');
  let nextLeft = Number.isFinite(currentLeft) ? currentLeft : rect.left + window.scrollX;
  let nextTop = Number.isFinite(currentTop) ? currentTop : rect.top + window.scrollY;

  if (rect.left < margin) nextLeft += margin - rect.left;
  if (rect.right > viewportW - margin) nextLeft -= rect.right - (viewportW - margin);
  if (rect.top < margin) nextTop += margin - rect.top;
  if (rect.bottom > viewportH - margin) nextTop -= rect.bottom - (viewportH - margin);

  tooltip.style.left = Math.max(window.scrollX + margin, nextLeft) + 'px';
  tooltip.style.top = Math.max(window.scrollY + margin, nextTop) + 'px';
}

let fallbackTourIndex = 0;

function startFallbackTour() {
  closeFallbackTour(false);
  fallbackTourIndex = 0;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="tour-overlay" id="tour-overlay" onclick="closeFallbackTour(true)"></div>
    <div class="tour-spotlight" id="tour-spotlight" aria-hidden="true"></div>
    <div class="tour-card" id="tour-card" role="dialog" aria-live="polite"></div>
  `);
  window.addEventListener('resize', repositionFallbackTour);
  window.addEventListener('orientationchange', repositionFallbackTour);
  showFallbackTourStep();
}

function showFallbackTourStep() {
  const steps = getTourSteps();
  const step = steps[fallbackTourIndex];
  const card = document.getElementById('tour-card');
  if (!card || !step) return closeFallbackTour(true);
  if (step.view) switchView(step.view);
  setTimeout(() => {
    const target = document.querySelector(step.element) || document.querySelector(`[data-view="${step.view}"]`) || document.body;
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    setTimeout(() => positionFallbackTour(target), 180);
  }, 120);
  card.innerHTML = `
    <div class="tour-title">${escapeHtml(step.title)}</div>
    <div class="tour-copy">${escapeHtml(step.intro)}</div>
    <div class="tour-copy" style="margin-top:10px;">Paso ${fallbackTourIndex + 1} de ${steps.length}</div>
    <div class="tour-actions">
      <button type="button" onclick="closeFallbackTour(true)" aria-label="Cerrar tutorial"><i class="ph ph-x"></i></button>
      <button type="button" onclick="prevFallbackTourStep()" ${fallbackTourIndex === 0 ? 'disabled' : ''}>Atrás</button>
      <button class="tour-next" type="button" onclick="nextFallbackTourStep()">${fallbackTourIndex === steps.length - 1 ? 'Finalizar' : 'Siguiente'}</button>
    </div>
  `;
}

function positionFallbackTour(target) {
  const card = document.getElementById('tour-card');
  const spotlight = document.getElementById('tour-spotlight');
  if (!card || !spotlight || !target) return;
  const safeTop = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0;
  const safeBottom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-bottom')) || 0;
  const margin = 12;
  const rect = target.getBoundingClientRect();
  const pad = 8;
  const spotLeft = Math.max(margin, rect.left - pad);
  const spotTop = Math.max(safeTop + margin, rect.top - pad);
  const spotRight = Math.min(window.innerWidth - margin, rect.right + pad);
  const spotBottom = Math.min(window.innerHeight - safeBottom - margin, rect.bottom + pad);
  spotlight.style.left = spotLeft + 'px';
  spotlight.style.top = spotTop + 'px';
  spotlight.style.width = Math.max(44, spotRight - spotLeft) + 'px';
  spotlight.style.height = Math.max(44, spotBottom - spotTop) + 'px';

  const cardRect = card.getBoundingClientRect();
  const cardWidth = Math.min(340, window.innerWidth - 28);
  let left = rect.left + (rect.width / 2) - (cardWidth / 2);
  left = Math.max(margin, Math.min(left, window.innerWidth - cardWidth - margin));
  const spaceBelow = window.innerHeight - rect.bottom - safeBottom;
  let top = spaceBelow > cardRect.height + 22 ? rect.bottom + 14 : rect.top - cardRect.height - 14;
  if (top < safeTop + margin) top = safeTop + margin;
  if (top + cardRect.height > window.innerHeight - safeBottom - margin) {
    top = Math.max(safeTop + margin, window.innerHeight - safeBottom - cardRect.height - margin);
  }
  card.style.left = left + 'px';
  card.style.top = top + 'px';
}

function repositionFallbackTour() {
  const step = getTourSteps()[fallbackTourIndex];
  if (!step) return;
  const target = document.querySelector(step.element) || document.querySelector(`[data-view="${step.view}"]`) || document.body;
  positionFallbackTour(target);
}

function prevFallbackTourStep() {
  fallbackTourIndex = Math.max(0, fallbackTourIndex - 1);
  showFallbackTourStep();
}

function nextFallbackTourStep() {
  fallbackTourIndex += 1;
  if (fallbackTourIndex >= getTourSteps().length) closeFallbackTour(true);
  else showFallbackTourStep();
}

function closeFallbackTour(markSeen=true) {
  document.getElementById('tour-overlay')?.remove();
  document.getElementById('tour-spotlight')?.remove();
  document.getElementById('tour-card')?.remove();
  window.removeEventListener('resize', repositionFallbackTour);
  window.removeEventListener('orientationchange', repositionFallbackTour);
  if (markSeen) localStorage.setItem(TOUR_STORAGE_KEY, '1');
}

function maybeStartPlannerTour() {
  if (!localStorage.getItem(TOUR_STORAGE_KEY)) setTimeout(() => startPlannerTour(false), 700);
}
