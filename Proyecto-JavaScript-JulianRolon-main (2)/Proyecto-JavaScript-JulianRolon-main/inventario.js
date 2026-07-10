const createForm = document.querySelector('.create-form');
const searchForm = document.querySelector('.search-form');
const editForm = document.querySelector('.edit-form');
const createMessage = document.getElementById('create-message');
const searchMessage = document.getElementById('search-message');
const editMessage = document.getElementById('edit-message');
const itemList = document.getElementById('item-list');
const deleteButton = document.getElementById('delete-product');

const firebaseUrl = 'https://proyectoacme-f63e6-default-rtdb.firebaseio.com';

function setMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle('success', success);
}

async function fetchInventory() {
  const response = await fetch(`${firebaseUrl}/inventario.json`, {
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

async function writeItem(itemId, itemData) {
  const response = await fetch(`${firebaseUrl}/inventario/${encodeURIComponent(itemId)}.json`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(itemData)
  });
  if (!response.ok) {
    throw new Error('Error al guardar el producto');
  }
  return response.json();
}

async function deleteItem(itemId) {
  const response = await fetch(`${firebaseUrl}/inventario/${encodeURIComponent(itemId)}.json`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('Error al eliminar el producto');
  }
  return response.json();
}

function populateEditForm(item) {
  document.getElementById('producto-codigo').value = item.codigo;
  document.getElementById('producto-nombre').value = item.nombre || '';
  document.getElementById('producto-proveedor').value = item.proveedor || '';
  document.getElementById('producto-cantidad').value = item.cantidad || 0;
}

function renderItemList(items) {
  itemList.innerHTML = '';
  const entries = Object.values(items);

  if (!entries.length) {
    itemList.innerHTML = '<p>No hay productos en inventario.</p>';
    return;
  }

  entries.forEach((item) => {
    const cantidad = item.cantidad !== undefined ? item.cantidad : 0;
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <h3>${item.nombre || 'Sin nombre'}</h3>
      <p><strong>Código:</strong> ${item.codigo}</p>
      <p><strong>Proveedor:</strong> ${item.proveedor || 'No especificado'}</p>
      <p><strong>Cantidad:</strong> ${cantidad}</p>
    `;
    card.addEventListener('click', () => {
      populateEditForm(item);
      setMessage(editMessage, 'Producto cargado para edición.', true);
    });
    itemList.appendChild(card);
  });
}

createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(createMessage, '');

  const codigo = document.getElementById('crear-codigo').value.trim();
  const nombre = document.getElementById('crear-nombre').value.trim();
  const proveedor = document.getElementById('crear-proveedor').value.trim();
  const cantidad = Number(document.getElementById('crear-cantidad').value);

  if (!codigo || !nombre || !proveedor || Number.isNaN(cantidad)) {
    setMessage(createMessage, 'Rellena todos los campos correctamente.');
    return;
  }

  try {
    const items = await fetchInventory();
    if (items[codigo]) {
      setMessage(createMessage, 'Ya existe un producto con ese código.');
      return;
    }

    await writeItem(codigo, {
      codigo,
      nombre,
      proveedor,
      cantidad
    });

    setMessage(createMessage, 'Producto agregado correctamente.', true);
    createForm.reset();
    const updatedItems = await fetchInventory();
    renderItemList(updatedItems);
  } catch (error) {
    setMessage(createMessage, 'Error al agregar el producto.');
  }
});

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(searchMessage, '');

  const codigo = document.getElementById('buscar-codigo').value.trim();
  if (!codigo) {
    setMessage(searchMessage, 'Ingresa el código del producto.');
    return;
  }

  try {
    const items = await fetchInventory();
    const item = items[codigo];
    if (!item) {
      setMessage(searchMessage, 'Producto no encontrado.');
      return;
    }

    populateEditForm(item);
    setMessage(searchMessage, 'Producto encontrado.', true);
  } catch (error) {
    setMessage(searchMessage, 'Error al buscar el producto.');
  }
});

editForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(editMessage, '');

  const codigo = document.getElementById('producto-codigo').value.trim();
  const nombre = document.getElementById('producto-nombre').value.trim();
  const proveedor = document.getElementById('producto-proveedor').value.trim();
  const cantidad = Number(document.getElementById('producto-cantidad').value);

  if (!codigo) {
    setMessage(editMessage, 'Carga primero un producto para editar.');
    return;
  }

  try {
    await writeItem(codigo, {
      codigo,
      nombre,
      proveedor,
      cantidad
    });

    setMessage(editMessage, 'Producto actualizado correctamente.', true);
    const items = await fetchInventory();
    renderItemList(items);
  } catch (error) {
    setMessage(editMessage, 'Error al actualizar el producto.');
  }
});

deleteButton.addEventListener('click', async () => {
  setMessage(editMessage, '');

  const codigo = document.getElementById('producto-codigo').value.trim();
  if (!codigo) {
    setMessage(editMessage, 'Carga primero un producto para eliminar.');
    return;
  }

  try {
    await deleteItem(codigo);
    setMessage(editMessage, 'Producto eliminado correctamente.', true);
    editForm.reset();
    const items = await fetchInventory();
    renderItemList(items);
  } catch (error) {
    setMessage(editMessage, 'Error al eliminar el producto.');
  }
});

window.addEventListener('load', async () => {
  try {
    const items = await fetchInventory();
    renderItemList(items);
  } catch (error) {
    itemList.innerHTML = '<p>No se pudo cargar el inventario.</p>';
  }
});
