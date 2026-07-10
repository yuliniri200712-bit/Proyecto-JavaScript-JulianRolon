const searchForm = document.querySelector('.search-form');
const editForm = document.querySelector('.edit-form');
const searchMessage = document.getElementById('search-message');
const editMessage = document.getElementById('edit-message');
const userList = document.getElementById('user-list');
const deleteButton = document.getElementById('delete-user');

const firebaseUrl = 'https://proyectoacme-f63e6-default-rtdb.firebaseio.com';

function setMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle('success', success);
}

async function fetchUsers() {
  const response = await fetch(`${firebaseUrl}/usuarios.json`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok) {
    throw new Error('No se pudo conectar con Firebase');
  }
  const data = await response.json();
  return data || {};
}

async function writeUser(userId, userData) {
  const response = await fetch(`${firebaseUrl}/usuarios/${encodeURIComponent(userId)}.json`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(userData)
  });
  if (!response.ok) {
    throw new Error('Error al guardar el usuario');
  }
  return response.json();
}

async function deleteUser(userId) {
  const response = await fetch(`${firebaseUrl}/usuarios/${encodeURIComponent(userId)}.json`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('Error al eliminar el usuario');
  }
  return response.json();
}

function populateEditForm(user) {
  document.getElementById('usuario-identificacion').value = user.id;
  document.getElementById('usuario-nombre').value = user.nombre || '';
  document.getElementById('usuario-cargo').value = user.cargo || '';
  document.getElementById('usuario-contrasena').value = user.contrasena || '';
}

function renderUserList(users) {
  userList.innerHTML = '';
  const entries = Object.values(users);
  if (!entries.length) {
    userList.innerHTML = '<p>No hay usuarios registrados.</p>';
    return;
  }

  entries.forEach((user) => {
    const item = document.createElement('div');
    item.className = 'user-item';
    item.innerHTML = `
      <h3>${user.nombre || 'Sin nombre'}</h3>
      <p><strong>ID:</strong> ${user.id}</p>
      <p><strong>Cargo:</strong> ${user.cargo || 'No especificado'}</p>
    `;
    item.addEventListener('click', () => {
      populateEditForm(user);
      setMessage(editMessage, 'Usuario cargado para edición.', true);
    });
    userList.appendChild(item);
  });
}

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(searchMessage, '');

  const id = document.getElementById('buscar-identificacion').value.trim();
  if (!id) {
    setMessage(searchMessage, 'Ingresa una identificación.');
    return;
  }

  try {
    const users = await fetchUsers();
    const user = users[id];
    if (!user) {
      setMessage(searchMessage, 'Usuario no encontrado.');
      return;
    }
    populateEditForm(user);
    setMessage(searchMessage, 'Usuario encontrado.', true);
  } catch (error) {
    setMessage(searchMessage, 'Error al buscar el usuario.');
  }
});

editForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(editMessage, '');

  const id = document.getElementById('usuario-identificacion').value.trim();
  const nombre = document.getElementById('usuario-nombre').value.trim();
  const cargo = document.getElementById('usuario-cargo').value.trim();
  const contrasena = document.getElementById('usuario-contrasena').value;

  if (!id) {
    setMessage(editMessage, 'Carga primero un usuario para editar.');
    return;
  }

  try {
    await writeUser(id, {
      id,
      nombre,
      cargo,
      contrasena
    });
    setMessage(editMessage, 'Usuario actualizado correctamente.', true);
    const users = await fetchUsers();
    renderUserList(users);
  } catch (error) {
    setMessage(editMessage, 'Error al actualizar el usuario.');
  }
});

deleteButton.addEventListener('click', async () => {
  setMessage(editMessage, '');
  const id = document.getElementById('usuario-identificacion').value.trim();

  if (!id) {
    setMessage(editMessage, 'Carga primero un usuario para eliminar.');
    return;
  }

  try {
    await deleteUser(id);
    setMessage(editMessage, 'Usuario eliminado correctamente.', true);
    editForm.reset();
    const users = await fetchUsers();
    renderUserList(users);
  } catch (error) {
    setMessage(editMessage, 'Error al eliminar el usuario.');
  }
});

window.addEventListener('load', async () => {
  try {
    const users = await fetchUsers();
    renderUserList(users);
  } catch (error) {
    userList.innerHTML = '<p>No se pudo cargar la lista de usuarios.</p>';
  }
});
