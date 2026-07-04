const loginForm = document.querySelector('.login-form');
const registerForm = document.querySelector('.register-form');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');

const firebaseUrl = 'https://proyectoacme-f63e6-default-rtdb.firebaseio.com';

function setMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle('success', success);
}

function redirectToUserModule(userId) {
  const url = `usuario.html?id=${encodeURIComponent(userId)}`;
  window.location.href = url;
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

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(registerMessage, '');

  const id = document.getElementById('registro-identificacion').value.trim();
  const nombre = document.getElementById('nombre-completo').value.trim();
  const cargo = document.getElementById('cargo').value.trim();
  const password = document.getElementById('registro-contrasena').value;
  const confirmPassword = document.getElementById('confirmar-contrasena').value;

  if (!id || !nombre || !cargo || !password || !confirmPassword) {
    setMessage(registerMessage, 'Rellena todos los campos.');
    return;
  }

  if (password !== confirmPassword) {
    setMessage(registerMessage, 'Las contraseñas no coinciden.');
    return;
  }

  try {
    const users = await fetchUsers();
    if (users[id]) {
      setMessage(registerMessage, 'Ya existe un usuario con esa identificación.');
      return;
    }

    await writeUser(id, {
      id,
      nombre,
      cargo,
      contrasena: password
    });

    setMessage(registerMessage, 'Usuario registrado correctamente.', true);
    registerForm.reset();
  } catch (error) {
    setMessage(registerMessage, 'Error al registrar el usuario.');
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(loginMessage, '');

  const id = document.getElementById('identificacion').value.trim();
  const password = document.getElementById('contrasena').value;

  if (!id || !password) {
    setMessage(loginMessage, 'Ingresa identificación y contraseña.');
    return;
  }

  try {
    const users = await fetchUsers();
    const user = users[id];

    if (!user || user.contrasena !== password) {
      setMessage(loginMessage, 'Credenciales incorrectas.');
      return;
    }

    setMessage(loginMessage, `Bienvenido ${user.nombre}`, true);
    loginForm.reset();
    redirectToUserModule(user.id);
  } catch (error) {
    setMessage(loginMessage, 'Error al iniciar sesión.');
  }
});
