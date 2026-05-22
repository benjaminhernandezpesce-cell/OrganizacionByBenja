function renderContacts() {
  const list = document.getElementById('contacts-list');
  if (!list) return;
  const filter = normalizeText(document.getElementById('contact-filter')?.value || '');
  const contacts = (state.networkingContacts || []).filter(contact => {
    const haystack = normalizeText(`${contact.name} ${contact.role} ${contact.tag} ${contact.notes} ${contact.phone}`);
    return !filter || haystack.includes(filter);
  });
  list.innerHTML = contacts.length ? '' : '<div class="empty">No hay contactos para ese filtro.</div>';
  contacts.forEach(contact => {
    const el = document.createElement('div');
    el.className = 'contact-card';
    el.innerHTML = `
      <div class="contact-top">
        <div>
          <div class="contact-name">${escapeHtml(contact.name)}</div>
          <div class="contact-meta">${escapeHtml(contact.role || 'Sin rol')}</div>
        </div>
        <button class="mini-btn" onclick="editContact('${contact.id}')" aria-label="Editar contacto"><i class="ti ti-pencil"></i></button>
        <button class="mini-btn danger" onclick="deleteContact('${contact.id}')" aria-label="Eliminar contacto"><i class="ph ph-trash"></i></button>
      </div>
      <div class="contact-meta">${escapeHtml(contact.link || '')}</div>
      ${contact.phone ? `<div class="contact-meta"><i class="ph ph-phone"></i> ${escapeHtml(contact.phone)}</div>` : ''}
      ${contact.tag ? `<div class="contact-tag">${escapeHtml(contact.tag)}</div>` : ''}
      <div class="contact-meta">${escapeHtml(contact.notes || '')}</div>
    `;
    list.appendChild(el);
  });
}

function saveContact() {
  const name = document.getElementById('contact-name').value.trim();
  const role = document.getElementById('contact-role').value.trim();
  const link = document.getElementById('contact-link').value.trim();
  const phone = document.getElementById('contact-phone').value.trim();
  const tag = document.getElementById('contact-tag').value.trim();
  const notes = document.getElementById('contact-notes').value.trim();
  if (!name) {
    toast('Agregá el nombre del contacto', 'error', 'alert-circle');
    return;
  }
  state.networkingContacts.push({ id: uid('contact'), name, role, link, phone, tag, notes });
  ['contact-name', 'contact-role', 'contact-link', 'contact-phone', 'contact-tag', 'contact-notes'].forEach(id => document.getElementById(id).value = '');
  save();
  renderContacts();
  toast('Contacto guardado');
}

function editContact(id) {
  const contact = state.networkingContacts.find(c => c.id === id);
  if (!contact) return;
  document.getElementById('contact-edit-id').value = contact.id;
  document.getElementById('contact-edit-name').value = contact.name || '';
  document.getElementById('contact-edit-role').value = contact.role || '';
  document.getElementById('contact-edit-link').value = contact.link || '';
  document.getElementById('contact-edit-phone').value = contact.phone || '';
  document.getElementById('contact-edit-tag').value = contact.tag || '';
  document.getElementById('contact-edit-notes').value = contact.notes || '';
  openModal('modal-contact-edit');
}

function saveEditContact() {
  const id = document.getElementById('contact-edit-id').value;
  const contact = state.networkingContacts.find(c => c.id === id);
  if (!contact) return;
  contact.name = document.getElementById('contact-edit-name').value.trim();
  contact.role = document.getElementById('contact-edit-role').value.trim();
  contact.link = document.getElementById('contact-edit-link').value.trim();
  contact.phone = document.getElementById('contact-edit-phone').value.trim();
  contact.tag = document.getElementById('contact-edit-tag').value.trim();
  contact.notes = document.getElementById('contact-edit-notes').value.trim();
  if (!contact.name) {
    toast('El nombre no puede estar vacío', 'error', 'alert-circle');
    return;
  }
  save();
  closeModal('modal-contact-edit');
  renderContacts();
  toast('Contacto actualizado');
}

function deleteContact(id) {
  state.networkingContacts = state.networkingContacts.filter(contact => contact.id !== id);
  save();
  renderContacts();
}
