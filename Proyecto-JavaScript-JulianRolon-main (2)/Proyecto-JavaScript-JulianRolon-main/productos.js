const createForm = document.querySelector('.create-form');
const searchForm = document.querySelector('.search-form');
const editForm = document.querySelector('.edit-form');
const createMessage = document.getElementById('create-message');
const searchMessage = document.getElementById('search-message');
const editMessage = document.getElementById('edit-message');
const itemList = document.getElementById('item-list');
const deleteButton = document.getElementById('delete-product');
const ingredientesList = document.getElementById('ingredientes-list');
const addIngredienteBtn = document.getElementById('add-ingrediente');
const buscarTexto = document.getElementById('buscar-texto');
const productoTipoInfo = document.getElementById('producto-tipo-info');
const productoStockInput = document.getElementById('producto-stock');

const firebaseUrl = 'https://proyectoacme-f63e6-default-rtdb.firebaseio.com';

let productosCache = {};

function setMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle('success', success);
}

function isMateriaPrima(producto) {
  return !producto.receta || Object.keys(producto.receta).length === 0;
}

async function fetchProductos() {
  const response = await fetch(`${firebaseUrl}/productos.json`, {
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

async function writeProducto(codigo, productoData) {
  const response = await fetch(`${firebaseUrl}/productos/${encodeURIComponent(codigo)}.json`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(productoData)
  });
  if (!response.ok) {
    throw new Error('Error al guardar el producto');
  }
  return response.json();
}

async function deleteProducto(codigo) {
  const response = await fetch(`${firebaseUrl}/productos/${encodeURIComponent(codigo)}.json`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('Error al eliminar el producto');
  }
  return response.json();
}

function crearIngredienteRow() {
  const row = document.createElement('div');
  row.className = 'ingrediente-row';
  row.innerHTML = `
    <input type="text" class="ingrediente-codigo" placeholder="Código materia prima" />
    <input type="number" class="ingrediente-cantidad" placeholder="Cantidad" min="0" step="any" />
    <button type="button" class="btn-remove-ingrediente">Quitar</button>
  `;
  return row;
}

addIngredienteBtn.addEventListener('click', () => {
  ingredientesList.appendChild(crearIngredienteRow());
});

ingredientesList.addEventListener('click', (event) => {
  if (event.target.classList.contains('btn-remove-ingrediente')) {
    const row = event.target.closest('.ingrediente-row');
    if (ingredientesList.children.length > 1) {
      row.remove();
    } else {
      row.querySelector('.ingrediente-codigo').value = '';
      row.querySelector('.ingrediente-cantidad').value = '';
    }
  }
});

function leerIngredientesFormulario() {
  const filas = ingredientesList.querySelectorAll('.ingrediente-row');
  const receta = {};
  let error = null;

  filas.forEach((fila) => {
    const codigo = fila.querySelector('.ingrediente-codigo').value.trim();
    const cantidadRaw = fila.querySelector('.ingrediente-cantidad').value;
    if (!codigo && !cantidadRaw) {
      return;
    }
    if (!codigo || cantidadRaw === '') {
      error = 'Completa el código y la cantidad de cada ingrediente agregado.';
      return;
    }
    const cantidad = Number(cantidadRaw);
    if (Number.isNaN(cantidad) || cantidad <= 0) {
      error = 'La cantidad de cada ingrediente debe ser mayor a 0.';
      return;
    }
    receta[codigo] = cantidad;
  });

  return { receta, error };
}

function renderItemList(productos, filtro = '') {
  itemList.innerHTML = '';
  const texto = filtro.trim().toLowerCase();
  const entries = Object.values(productos).filter((item) => {
    if (!texto) return true;
    return (
      item.codigo.toLowerCase().includes(texto) ||
      (item.nombre || '').toLowerCase().includes(texto)
    );
  });

  if (!entries.length) {
    itemList.innerHTML = '<p>No hay productos que coincidan con la búsqueda.</p>';
    return;
  }

  entries.forEach((item) => {
    const materia = isMateriaPrima(item);
    const cantidad = item.stock !== undefined ? item.stock : 0;
    const card = document.createElement('div');
    card.className = 'item-card';
    card.innerHTML = `
      <h3>${item.nombre || 'Sin nombre'} <span class="badge ${materia ? 'materia' : 'elaborado'}">${materia ? 'Materia prima' : 'Elaborado'}</span></h3>
      <p><strong>Código:</strong> ${item.codigo}</p>
      <p><strong>Proveedor:</strong> ${item.proveedor || 'No especificado'}</p>
      <p><strong>Stock:</strong> ${cantidad}</p>
    `;
    card.addEventListener('click', () => {
      populateEditForm(item);
      setMessage(editMessage, 'Producto cargado para edición.', true);
    });
    itemList.appendChild(card);
  });
}

function populateEditForm(item) {
  document.getElementById('producto-codigo').value = item.codigo;
  document.getElementById('producto-nombre').value = item.nombre || '';
  document.getElementById('producto-proveedor').value = item.proveedor || '';
  productoStockInput.value = item.stock || 0;

  productoStockInput.readOnly = false;

  if (materia) {
    productoTipoInfo.textContent = 'Tipo: Materia prima. El stock es editable directamente.';
  } else {
    const receta = Object.entries(item.receta)
      .map(([codigo, cantidad]) => `${codigo} x${cantidad}`)
      .join(', ');
    productoTipoInfo.textContent = `Tipo: Producto elaborado. Receta: ${receta}. El stock es editable y también se actualiza al fabricar desde el módulo de Producción.`;
  }
}

createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(createMessage, '');

  const codigo = document.getElementById('crear-codigo').value.trim();
  const nombre = document.getElementById('crear-nombre').value.trim();
  const proveedor = document.getElementById('crear-proveedor').value.trim();
  const stockInicial = Number(document.getElementById('crear-stock').value);

  if (!codigo || !nombre || !proveedor) {
    setMessage(createMessage, 'Rellena todos los campos correctamente.');
    return;
  }

  if (!Number.isFinite(stockInicial) || stockInicial < 0) {
    setMessage(createMessage, 'El stock inicial debe ser un número mayor o igual a 0.');
    return;
  }

  const { receta, error } = leerIngredientesFormulario();
  if (error) {
    setMessage(createMessage, error);
    return;
  }

  try {
    const productos = await fetchProductos();
    if (productos[codigo]) {
      setMessage(createMessage, 'Ya existe un producto con ese código.');
      return;
    }

    if (Object.keys(receta).length) {
      if (receta[codigo] !== undefined) {
        setMessage(createMessage, 'Un producto no puede ser ingrediente de sí mismo.');
        return;
      }
      for (const codMateria of Object.keys(receta)) {
        const materiaProd = productos[codMateria];
        if (!materiaProd) {
          setMessage(createMessage, `El código "${codMateria}" no corresponde a ningún producto registrado.`);
          return;
        }
        if (!isMateriaPrima(materiaProd)) {
          setMessage(createMessage, `El código "${codMateria}" no es materia prima, por lo que no puede usarse como ingrediente.`);
          return;
        }
      }
    }

    const productoData = {
      codigo,
      nombre,
      proveedor,
      stock: stockInicial
    };
    if (Object.keys(receta).length) {
      productoData.receta = receta;
    }

    await writeProducto(codigo, productoData);

    setMessage(createMessage, 'Producto creado correctamente.', true);
    createForm.reset();
    ingredientesList.innerHTML = '';
    ingredientesList.appendChild(crearIngredienteRow());

    productosCache = await fetchProductos();
    renderItemList(productosCache, buscarTexto.value);
  } catch (error) {
    setMessage(createMessage, 'Error al crear el producto.');
  }
});

buscarTexto.addEventListener('input', () => {
  renderItemList(productosCache, buscarTexto.value);
});

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const texto = buscarTexto.value.trim();
  const total = Object.values(productosCache).filter((item) => {
    if (!texto) return true;
    return (
      item.codigo.toLowerCase().includes(texto.toLowerCase()) ||
      (item.nombre || '').toLowerCase().includes(texto.toLowerCase())
    );
  }).length;
  setMessage(searchMessage, `${total} producto(s) encontrado(s).`, true);
  renderItemList(productosCache, texto);
});

editForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(editMessage, '');

  const codigo = document.getElementById('producto-codigo').value.trim();
  const nombre = document.getElementById('producto-nombre').value.trim();
  const proveedor = document.getElementById('producto-proveedor').value.trim();
  const stock = Number(productoStockInput.value);

  if (!codigo) {
    setMessage(editMessage, 'Carga primero un producto para editar.');
    return;
  }

  try {
    const productos = await fetchProductos();
    const existente = productos[codigo];
    if (!existente) {
      setMessage(editMessage, 'El producto ya no existe.');
      return;
    }

    const materia = isMateriaPrima(existente);
    const actualizado = {
      ...existente,
      nombre,
      proveedor,
      stock: Number.isFinite(stock) ? stock : (existente.stock || 0)
    };

    await writeProducto(codigo, actualizado);

    setMessage(editMessage, 'Producto actualizado correctamente.', true);
    productosCache = await fetchProductos();
    renderItemList(productosCache, buscarTexto.value);
    populateEditForm(productosCache[codigo]);
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
    await deleteProducto(codigo);
    setMessage(editMessage, 'Producto eliminado correctamente.', true);
    editForm.reset();
    productoTipoInfo.textContent = 'Carga un producto para ver su información.';
    productoStockInput.readOnly = false;
    productosCache = await fetchProductos();
    renderItemList(productosCache, buscarTexto.value);
  } catch (error) {
    setMessage(editMessage, 'Error al eliminar el producto.');
  }
});

window.addEventListener('load', async () => {
  try {
    productosCache = await fetchProductos();
    renderItemList(productosCache);
  } catch (error) {
    itemList.innerHTML = '<p>No se pudo cargar la lista de productos.</p>';
  }
});
