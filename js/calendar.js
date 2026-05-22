function updateCalendarStatus() {
  const status = document.getElementById('calendar-status');
  const connectBtn = document.getElementById('calendar-connect-btn');
  const syncBtn = document.getElementById('calendar-sync-btn');
  if (!status) return;
  const count = (state.calendarEvents || []).length;
  if (!currentUser) {
    status.textContent = 'Primero entrá con Google para conectar tu calendario.';
    if (connectBtn) connectBtn.disabled = false;
    if (syncBtn) syncBtn.disabled = true;
    return;
  }
  if (state.settings.calendarConnected) {
    const last = state.settings.calendarLastSync
      ? new Date(state.settings.calendarLastSync).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
      : 'pendiente';
    status.textContent = `Calendar conectado. ${count} evento${count === 1 ? '' : 's'} importado${count === 1 ? '' : 's'}. Última sincronización: ${last}.`;
    if (connectBtn) connectBtn.innerHTML = '<i class="ph ph-check-circle"></i> Calendar conectado';
    if (syncBtn) syncBtn.disabled = false;
  } else {
    status.textContent = 'Conectá tu calendario para ver tus eventos dentro del planner.';
    if (connectBtn) connectBtn.innerHTML = '<i class="ph ph-calendar-plus"></i> Conectar Google Calendar';
    if (syncBtn) syncBtn.disabled = true;
  }
}

function maybeShowCalendarOptIn() {
  if (!currentUser || state.settings.calendarConnected || state.settings.calendarPromptDismissed) return;
  setTimeout(() => openModal('modal-calendar-optin'), 700);
}

function dismissCalendarPrompt() {
  state.settings.calendarPromptDismissed = true;
  save();
  closeModal('modal-calendar-optin');
}

function loadExternalScript(src, id) {
  return new Promise((resolve, reject) => {
    const existing = document.getElementById(id);
    if (existing) {
      if (existing.dataset.loaded === 'true') resolve();
      else {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
      }
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.id = id;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function ensureGoogleCalendarLibraries() {
  if (!window.google?.accounts?.oauth2) {
    await loadExternalScript('https://accounts.google.com/gsi/client', 'google-identity-script');
  }
  return Boolean(window.google?.accounts?.oauth2);
}

async function initGoogleCalendarApi() {
  if (googleCalendarReady && calendarTokenClient) return true;
  if (googleCalendarInitStarted) return false;
  googleCalendarInitStarted = true;
  try {
    const librariesReady = await ensureGoogleCalendarLibraries();
    if (!librariesReady) throw new Error('Google Identity unavailable');
    calendarTokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CALENDAR_CLIENT_ID,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: async (tokenResponse) => {
        if (tokenResponse?.error) {
          toast(getCalendarApiErrorMessage(tokenResponse), 'error', 'alert-circle');
          return;
        }
        calendarAccessToken = tokenResponse.access_token;
        state.settings.calendarConnected = true;
        state.settings.calendarPromptDismissed = true;
        save();
        await syncGoogleCalendarEvents(true);
      },
    });
    googleCalendarReady = true;
    updateCalendarStatus();
    return true;
  } catch (error) {
    console.error(error);
    googleCalendarReady = false;
    calendarTokenClient = null;
    return false;
  } finally {
    googleCalendarInitStarted = false;
  }
}

async function waitForGoogleCalendarReady() {
  for (let i = 0; i < 4; i++) {
    if (googleCalendarReady && calendarTokenClient) return true;
    const initialized = await initGoogleCalendarApi();
    if (initialized && calendarTokenClient) return true;
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  return false;
}

async function connectGoogleCalendar() {
  if (!currentUser) {
    toast('Primero entrá con Google', 'error', 'alert-circle');
    return;
  }
  const ready = await waitForGoogleCalendarReady();
  if (!ready) {
    toast('No se pudo abrir Google Calendar. Probá desde Netlify y revisá dominios autorizados.', 'error', 'alert-circle');
    return;
  }
  calendarTokenClient.requestAccessToken({ prompt: state.settings.calendarConnected ? '' : 'consent' });
}

function formatCalendarEventTime(item) {
  const start = item.start?.dateTime;
  if (!start) return 'Todo el día';
  return new Date(start).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

function calendarEventDateKey(item) {
  if (item.start?.date) return item.start.date;
  if (item.start?.dateTime) return dateKey(new Date(item.start.dateTime));
  return null;
}

function getCalendarApiErrorMessage(error) {
  const code = error?.error?.code || error?.code || error?.status || '';
  const reason = error?.error?.status || error?.error || '';
  if (code === 403 || reason === 'PERMISSION_DENIED') {
    return 'Google Calendar no autorizó la lectura. Revisá que la Calendar API esté habilitada y el permiso calendar.readonly agregado.';
  }
  if (code === 401 || reason === 'UNAUTHENTICATED') {
    return 'Google necesita renovar el permiso de Calendar. Volvé a conectar.';
  }
  if (String(error?.error || '').includes('popup')) {
    return 'El navegador bloqueó la ventana de Google. Permití popups para esta web.';
  }
  return 'No se pudo sincronizar Calendar. Revisá permisos, dominio autorizado y volvé a intentar.';
}

async function syncGoogleCalendarEvents(manual=false) {
  if (calendarSyncInFlight) return;
  if (!currentUser) {
    toast('Primero entrá con Google', 'error', 'alert-circle');
    return;
  }
  const ready = await waitForGoogleCalendarReady();
  if (!ready) {
    toast('Google Calendar no está disponible todavía', 'error', 'alert-circle');
    return;
  }
  if (!calendarAccessToken) {
    connectGoogleCalendar();
    return;
  }

  calendarSyncInFlight = true;
  try {
    const base = state.currentMonth || new Date();
    const timeMin = new Date(base.getFullYear(), base.getMonth() - 1, 1, 0, 0, 0).toISOString();
    const timeMax = new Date(base.getFullYear(), base.getMonth() + 2, 0, 23, 59, 59).toISOString();
    const params = new URLSearchParams({
      timeMin,
      timeMax,
      showDeleted: 'false',
      singleEvents: 'true',
      orderBy: 'startTime',
      maxResults: '250',
    });
    const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`, {
      headers: { Authorization: `Bearer ${calendarAccessToken}` },
    });
    const data = await response.json();
    if (!response.ok) throw data;
    state.calendarEvents = (data.items || [])
      .map(item => {
        const eventDate = calendarEventDateKey(item);
        if (!eventDate) return null;
        return {
          id: item.id,
          title: item.summary || 'Sin título',
          date: eventDate,
          time: formatCalendarEventTime(item),
          start: item.start?.dateTime || item.start?.date || '',
          end: item.end?.dateTime || item.end?.date || '',
          htmlLink: item.htmlLink || '',
          color: '#60a5fa',
        };
      })
      .filter(Boolean);
    state.settings.calendarConnected = true;
    state.settings.calendarPromptDismissed = true;
    state.settings.calendarLastSync = new Date().toISOString();
    save();
    renderMonth();
    updateCalendarStatus();
    toast(manual ? 'Google Calendar sincronizado' : 'Eventos de Calendar importados');
  } catch (error) {
    console.error(error);
    if (error?.error?.code === 401 || error?.code === 401) {
      calendarAccessToken = null;
      connectGoogleCalendar();
    } else {
      toast(getCalendarApiErrorMessage(error), 'error', 'alert-circle');
    }
  } finally {
    calendarSyncInFlight = false;
  }
}
