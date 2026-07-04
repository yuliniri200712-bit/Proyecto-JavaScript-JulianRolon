const createForm = document.querySelector('.create-form');
const searchForm = document.querySelector('.search-form');
const editForm = document.querySelector('.edit-form');
const createMessage = document.getElementById('create-message');
const searchMessage = document.getElementById('search-message');
const editMessage = document.getElementById('edit-message');
const processList = document.getElementById('process-list');
const deleteButton = document.getElementById('delete-process');

const firebaseUrl = 'https://proyectoacme-f63e6-default-rtdb.firebaseio.com';

function setMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle('success', success);
}

async function fetchProcesses() {
  const response = await fetch(`${firebaseUrl}/produccion.json`, {
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

async function writeProcess(processId, processData) {
  const response = await fetch(`${firebaseUrl}/produccion/${encodeURIComponent(processId)}.json`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(processData)
  });
  if (!response.ok) {
    throw new Error('Error al guardar el proceso');
  }
  return response.json();
}

async function deleteProcess(processId) {
  const response = await fetch(`${firebaseUrl}/produccion/${encodeURIComponent(processId)}.json`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('Error al eliminar el proceso');
  }
  return response.json();
}

function populateEditForm(process) {
  document.getElementById('proceso-codigo').value = process.codigo;
  document.getElementById('proceso-nombre').value = process.nombre || '';
  document.getElementById('proceso-descripcion').value = process.descripcion || '';
  document.getElementById('proceso-duracion').value = process.duracion || 0;
  document.getElementById('proceso-responsable').value = process.responsable || '';
}

function renderProcessList(processes) {
  processList.innerHTML = '';
  const entries = Object.values(processes);

  if (!entries.length) {
    processList.innerHTML = '<p>No hay procesos de producción registrados.</p>';
    return;
  }

  entries.forEach((process) => {
    const card = document.createElement('div');
    card.className = 'process-card';
    card.innerHTML = `
      <h3>${process.nombre || 'Sin nombre'}</h3>
      <p><strong>Código:</strong> ${process.codigo}</p>
      <p><strong>Descripción:</strong> ${process.descripcion || 'No especificada'}</p>
      <p><strong>Duración:</strong> ${process.duracion || 0} minutos</p>
      <p><strong>Responsable:</strong> ${process.responsable || 'No asignado'}</p>
    `;
    card.addEventListener('click', () => {
      populateEditForm(process);
      setMessage(editMessage, 'Proceso cargado para edición.', true);
    });
    processList.appendChild(card);
  });
}

createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(createMessage, '');

  const codigo = document.getElementById('crear-codigo-proceso').value.trim();
  const nombre = document.getElementById('crear-nombre-proceso').value.trim();
  const descripcion = document.getElementById('crear-descripcion').value.trim();
  const duracion = Number(document.getElementById('crear-duracion').value);
  const responsable = document.getElementById('crear-responsable').value.trim();

  if (!codigo || !nombre || !descripcion || Number.isNaN(duracion) || !responsable) {
    setMessage(createMessage, 'Rellena todos los campos correctamente.');
    return;
  }

  try {
    const processes = await fetchProcesses();
    if (processes[codigo]) {
      setMessage(createMessage, 'Ya existe un proceso con ese código.');
      return;
    }

    await writeProcess(codigo, {
      codigo,
      nombre,
      descripcion,
      duracion,
      responsable
    });

    setMessage(createMessage, 'Proceso creado correctamente.', true);
    createForm.reset();
    const updatedProcesses = await fetchProcesses();
    renderProcessList(updatedProcesses);
  } catch (error) {
    setMessage(createMessage, 'Error al crear el proceso.');
  }
});

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(searchMessage, '');

  const codigo = document.getElementById('buscar-codigo-proceso').value.trim();
  if (!codigo) {
    setMessage(searchMessage, 'Ingresa el código del proceso.');
    return;
  }

  try {
    const processes = await fetchProcesses();
    const process = processes[codigo];
    if (!process) {
      setMessage(searchMessage, 'Proceso no encontrado.');
      return;
    }

    populateEditForm(process);
    setMessage(searchMessage, 'Proceso encontrado.', true);
  } catch (error) {
    setMessage(searchMessage, 'Error al buscar el proceso.');
  }
});

editForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(editMessage, '');

  const codigo = document.getElementById('proceso-codigo').value.trim();
  const nombre = document.getElementById('proceso-nombre').value.trim();
  const descripcion = document.getElementById('proceso-descripcion').value.trim();
  const duracion = Number(document.getElementById('proceso-duracion').value);
  const responsable = document.getElementById('proceso-responsable').value.trim();

  if (!codigo) {
    setMessage(editMessage, 'Carga primero un proceso para editar.');
    return;
  }

  try {
    await writeProcess(codigo, {
      codigo,
      nombre,
      descripcion,
      duracion,
      responsable
    });

    setMessage(editMessage, 'Proceso actualizado correctamente.', true);
    const processes = await fetchProcesses();
    renderProcessList(processes);
  } catch (error) {
    setMessage(editMessage, 'Error al actualizar el proceso.');
  }
});

deleteButton.addEventListener('click', async () => {
  setMessage(editMessage, '');

  const codigo = document.getElementById('proceso-codigo').value.trim();
  if (!codigo) {
    setMessage(editMessage, 'Carga primero un proceso para eliminar.');
    return;
  }

  try {
    await deleteProcess(codigo);
    setMessage(editMessage, 'Proceso eliminado correctamente.', true);
    editForm.reset();
    const processes = await fetchProcesses();
    renderProcessList(processes);
  } catch (error) {
    setMessage(editMessage, 'Error al eliminar el proceso.');
  }
});

window.addEventListener('load', async () => {
  try {
    const processes = await fetchProcesses();
    renderProcessList(processes);
  } catch (error) {
    processList.innerHTML = '<p>No se pudo cargar la lista de procesos.</p>';
  }
});
