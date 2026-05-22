function userDocRef() {
  const account = window.googleAccountPlanner;
  if (!currentUser || !account) return null;
  return account.doc(account.db, 'users', currentUser.uid, 'planner', 'state');
}

function scheduleCloudSave() {
  const account = window.googleAccountPlanner;
  if (!currentUser || !account || applyingRemoteState) return;
  clearTimeout(cloudSaveTimer);
  cloudSaveTimer = setTimeout(async () => {
    const ref = userDocRef();
    if (!ref) return;
    try {
      await account.setDoc(ref, {
        ...getPersistableState(),
        updatedAt: account.serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error(error);
      toast('No se pudo guardar en tu cuenta. Tus cambios quedan en este navegador.', 'error', 'alert-circle');
    }
  }, 600);
}

function updateAuthUI(user) {
  const btn = document.getElementById('auth-btn');
  if (!btn) return;
  if (user) {
    const name = user.displayName ? user.displayName.split(' ')[0] : 'Mi cuenta';
    const photo = user.photoURL ? `<img src="${user.photoURL}" alt="">` : '<i class="ph ph-user-circle-check"></i>';
    btn.title = 'Cerrar sesión';
    btn.innerHTML = `${photo}<span id="auth-label">${escapeHtml(name)}</span>`;
  } else {
    btn.title = 'Entrar con Google';
    btn.innerHTML = '<i class="ph ph-google-logo"></i><span id="auth-label">Entrar con Google</span>';
  }
}

function getAccountErrorMessage(error) {
  const code = error?.code || '';
  const messages = {
    'auth/unauthorized-domain': 'Este dominio todavía no está autorizado para iniciar sesión con Google.',
    'auth/operation-not-allowed': 'El ingreso con Google no está habilitado en el panel de cuentas.',
    'auth/invalid-api-key': 'La configuración de cuenta no coincide con este proyecto.',
    'auth/app-not-authorized': 'Esta web no está autorizada para usar el ingreso con Google.',
    'auth/network-request-failed': 'No se pudo conectar con Google. Revisá la conexión y probá de nuevo.',
  };
  return messages[code] || '';
}

async function handleAuthButton() {
  const account = window.googleAccountPlanner;
  if (!account) {
    toast('La cuenta Google todavía está cargando. Probá de nuevo en unos segundos.', 'error', 'alert-circle');
    return;
  }
  try {
    if (currentUser) {
      await account.signOut(account.auth);
      return;
    }
    await account.signInWithPopup(account.auth, account.provider);
  } catch (error) {
    console.error(error);
    const setupMessage = getAccountErrorMessage(error);
    if (setupMessage) {
      toast(setupMessage, 'error', 'alert-circle');
      return;
    }
    if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
      toast('Inicio cancelado. Tocá Entrar con Google para intentar otra vez.', 'error', 'alert-circle');
      return;
    }
    try {
      await account.signInWithRedirect(account.auth, account.provider);
    } catch (redirectError) {
      console.error(redirectError);
      toast(getAccountErrorMessage(redirectError) || 'No se pudo iniciar sesión con Google.', 'error', 'alert-circle');
    }
  }
}

let redirectChecked = false;

async function setupGoogleAccountListener() {
  const account = window.googleAccountPlanner;
  if (!account) return;
  if (!redirectChecked) {
    redirectChecked = true;
    try {
      await account.getRedirectResult(account.auth);
    } catch (error) {
      console.error(error);
      toast(getAccountErrorMessage(error) || 'Google devolvió un error al iniciar sesión.', 'error', 'alert-circle');
    }
  }
  account.onAuthStateChanged(account.auth, async (user) => {
    currentUser = user;
    updateAuthUI(user);
    if (unsubscribeCloud) {
      unsubscribeCloud();
      unsubscribeCloud = null;
    }
    if (!user) {
      toast('Modo local: los datos quedan en este navegador');
      return;
    }

    const ref = userDocRef();
    try {
      const snap = await account.getDoc(ref);
      if (snap.exists()) {
        applyingRemoteState = true;
        applyPersistedState(snap.data());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(getPersistableState()));
        renderAll();
        applyingRemoteState = false;
      } else {
        await account.setDoc(ref, {
          ...getPersistableState(),
          ownerUid: user.uid,
          ownerEmail: user.email || '',
          createdAt: account.serverTimestamp(),
          updatedAt: account.serverTimestamp(),
        });
      }
    } catch (error) {
      applyingRemoteState = false;
      console.error(error);
      toast('Entraste con Google, pero no se pudo leer tu perfil. Se mantiene el guardado local.', 'error', 'alert-circle');
      return;
    }

    unsubscribeCloud = account.onSnapshot(ref, (docSnap) => {
      if (!docSnap.exists()) return;
      applyingRemoteState = true;
      applyPersistedState(docSnap.data());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(getPersistableState()));
      renderAll();
      applyingRemoteState = false;
    }, (error) => {
      console.error(error);
      toast('No se pudo actualizar tu perfil en la nube', 'error', 'alert-circle');
    });
    toast('Cuenta Google conectada');
    maybeShowCalendarOptIn();
  });
}

if (window.googleAccountPlanner) setupGoogleAccountListener();
else window.addEventListener('google-account-ready', setupGoogleAccountListener, { once: true });
