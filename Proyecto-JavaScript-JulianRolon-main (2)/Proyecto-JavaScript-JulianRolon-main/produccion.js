const fabricarForm = document.querySelector('.create-form');
const searchForm = document.querySelector('.search-form');
const createMessage = document.getElementById('create-message');
const searchMessage = document.getElementById('search-message');
const processList = document.getElementById('process-list');
const productoSelect = document.getElementById('producto-select');
const cantidadInput = document.getElementById('cantidad-fabricar');
const previewList = document.getElementById('preview-list');
const fabricarBtn = document.getElementById('fabricar-btn');
const buscarHistorial = document.getElementById('buscar-historial');
const fechaInicioInput = document.getElementById('fecha-inicio');
const fechaFinInput = document.getElementById('fecha-fin');
const reportList = document.getElementById('report-list');
const generarReporteBtn = document.getElementById('generar-reporte');

const firebaseUrl = 'https://proyectoacme-f63e6-default-rtdb.firebaseio.com';

let productosCache = {};
let historialCache = {};

function setMessage(element, message, success = false) {
  element.textContent = message;
  element.classList.toggle('success', success);
}

function isMateriaPrima(producto) {
  return !producto.receta || Object.keys(producto.receta).length === 0;
}

function getCurrentUser() {
  try {
    const storedUser = localStorage.getItem('acmeCurrentUser');
    return storedUser ? JSON.parse(storedUser) : null;
  } catch (error) {
    return null;
  }
}

function calcularCantidadMaxima(producto) {
  if (!producto || !producto.receta || !Object.keys(producto.receta).length) {
    return 0;
  }

  return Object.entries(producto.receta).reduce((max, [codMateria, cantidadPorUnidad]) => {
    const materia = productosCache[codMateria];
    const disponible = materia ? (Number(materia.stock) || 0) : 0;
    const posible = cantidadPorUnidad > 0 ? Math.floor(disponible / cantidadPorUnidad) : 0;
    return Math.min(max, posible);
  }, Infinity);
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

async function fetchHistorial() {
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

async function writeHistorial(consecutivo, registro) {
  const response = await fetch(`${firebaseUrl}/produccion/${encodeURIComponent(consecutivo)}.json`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(registro)
  });
  if (!response.ok) {
    throw new Error('Error al guardar el historial');
  }
  return response.json();
}

function nextConsecutivo(historial) {
  const codigos = Object.keys(historial)
    .map((codigo) => Number(codigo))
    .filter((n) => !Number.isNaN(n));
  if (!codigos.length) return 1;
  return Math.max(...codigos) + 1;
}

function poblarSelectProductos() {
  const seleccionActual = productoSelect.value;
  productoSelect.innerHTML = '<option value="">Selecciona un producto...</option>';

  Object.values(productosCache)
    .filter((producto) => !isMateriaPrima(producto))
    .forEach((producto) => {
      const option = document.createElement('option');
      option.value = producto.codigo;
      option.textContent = `${producto.nombre} (${producto.codigo})`;
      productoSelect.appendChild(option);
    });

  if (seleccionActual && productosCache[seleccionActual]) {
    productoSelect.value = seleccionActual;
  }
}

function renderPreview() {
  const codigo = productoSelect.value;
  const cantidad = Number(cantidadInput.value);
  previewList.innerHTML = '';

  if (!codigo || !cantidad || cantidad <= 0) {
    previewList.innerHTML = '<p class="preview-empty">Selecciona un producto y una cantidad para ver la vista previa.</p>';
    fabricarBtn.disabled = true;
    return;
  }

  const producto = productosCache[codigo];
  if (!producto || !producto.receta) {
    previewList.innerHTML = '<p class="preview-empty">Este producto no tiene una receta definida.</p>';
    fabricarBtn.disabled = true;
    return;
  }

  const stockProducto = Number(producto.stock || 0);
  if (stockProducto < 0) {
    previewList.innerHTML = '<p class="preview-empty">El stock del producto terminado no puede ser negativo.</p>';
    fabricarBtn.disabled = true;
    return;
  }

  let suficiente = true;

  const stockProductoRow = document.createElement('div');
  stockProductoRow.className = 'preview-item';
  stockProductoRow.innerHTML = `
    <span><strong>Stock actual del producto</strong></span>
    <span>${stockProducto}</span>
  `;
  previewList.appendChild(stockProductoRow);

  Object.entries(producto.receta).forEach(([codMateria, cantidadPorUnidad]) => {
    const requerido = cantidadPorUnidad * cantidad;
    const materia = productosCache[codMateria];
    const disponible = materia ? (Number(materia.stock) || 0) : 0;
    const insuficiente = disponible < requerido;
    if (insuficiente) suficiente = false;

    const row = document.createElement('div');
    row.className = `preview-item${insuficiente ? ' insufficient' : ''}`;
    row.innerHTML = `
      <span>${materia ? materia.nombre : codMateria} (${codMateria})</span>
      <span>Necesario: ${requerido} · Disponible: ${disponible}</span>
    `;
    previewList.appendChild(row);
  });

  const maximo = calcularCantidadMaxima(producto);
  const maxRow = document.createElement('div');
  maxRow.className = `preview-item${cantidad > maximo ? ' insufficient' : ''}`;
  maxRow.innerHTML = `
    <span><strong>Cantidad máxima posible</strong></span>
    <span>${maximo}</span>
  `;
  previewList.appendChild(maxRow);

  if (cantidad > maximo) {
    suficiente = false;
  }

  fabricarBtn.disabled = !suficiente;
}

productoSelect.addEventListener('change', renderPreview);
cantidadInput.addEventListener('input', renderPreview);

fabricarForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setMessage(createMessage, '');

  const codigo = productoSelect.value;
  const cantidad = Number(cantidadInput.value);

  if (!codigo || !cantidad || cantidad <= 0) {
    setMessage(createMessage, 'Selecciona un producto y una cantidad válida.');
    return;
  }

  try {
    productosCache = await fetchProductos();
    const producto = productosCache[codigo];

    if (!producto || !producto.receta) {
      setMessage(createMessage, 'El producto seleccionado ya no tiene una receta válida.');
      poblarSelectProductos();
      return;
    }

    const requerimientos = Object.entries(producto.receta).map(([codMateria, cantidadPorUnidad]) => {
      const requerido = cantidadPorUnidad * cantidad;
      const materia = productosCache[codMateria];
      const disponible = materia ? (Number(materia.stock) || 0) : 0;
      return { codMateria, requerido, disponible, materia };
    });

    const faltantes = requerimientos.filter((r) => r.disponible < r.requerido);
    if (faltantes.length) {
      setMessage(createMessage, 'Stock insuficiente de materia prima para fabricar esta cantidad.');
      renderPreview();
      return;
    }

    const maximo = calcularCantidadMaxima(producto);
    if (cantidad > maximo) {
      setMessage(createMessage, `No es posible fabricar más de ${maximo} unidades con la materia prima actual.`);
      renderPreview();
      return;
    }

    for (const req of requerimientos) {
      const nuevoStock = req.disponible - req.requerido;
      await writeProducto(req.codMateria, { ...req.materia, stock: nuevoStock });
    }

    const nuevoStockProducto = (Number(producto.stock) || 0) + cantidad;
    await writeProducto(codigo, { ...producto, stock: nuevoStockProducto });

    const usuario = getCurrentUser();
    historialCache = await fetchHistorial();
    const consecutivo = nextConsecutivo(historialCache);
    await writeHistorial(consecutivo, {
      codigo: String(consecutivo),
      productoCodigo: producto.codigo,
      productoNombre: producto.nombre,
      cantidad,
      fecha: new Date().toISOString(),
      usuarioId: usuario ? usuario.id : '',
      usuarioNombre: usuario ? usuario.nombre : 'Sin usuario'
    });

    setMessage(createMessage, `Producción registrada con el código ${consecutivo}.`, true);
    cantidadInput.value = '';

    productosCache = await fetchProductos();
    historialCache = await fetchHistorial();
    poblarSelectProductos();
    renderPreview();
    renderHistorial(historialCache, buscarHistorial.value);
  } catch (error) {
    setMessage(createMessage, 'Error al registrar la producción.');
  }
});

function normalizeText(value) {
  return String(value || '').trim().toLowerCase();
}

function getHistorialEntries(historial) {
  return Object.values(historial || {}).sort((a, b) => Number(b.codigo || 0) - Number(a.codigo || 0));
}

function renderHistorial(historial, filtro = '') {
  processList.innerHTML = '';
  const texto = normalizeText(filtro);

  const entries = getHistorialEntries(historial).filter((registro) => {
    if (!texto) return true;
    return (
      normalizeText(registro.codigo).includes(texto) ||
      normalizeText(registro.productoCodigo).includes(texto) ||
      normalizeText(registro.productoNombre).includes(texto) ||
      normalizeText(registro.usuarioNombre).includes(texto) ||
      normalizeText(registro.usuarioId).includes(texto)
    );
  });

  if (!entries.length) {
    processList.innerHTML = '<p>No hay procesos de producción registrados.</p>';
    return;
  }

  entries.forEach((registro) => {
    const fecha = registro.fecha ? new Date(registro.fecha).toLocaleString() : 'No especificada';
    const usuarioTexto = registro.usuarioNombre
      ? `${registro.usuarioNombre} (${registro.usuarioId || 'sin ID'})`
      : 'Sin usuario';
    const card = document.createElement('div');
    card.className = 'process-card';
    card.innerHTML = `
      <h3>Proceso #${registro.codigo}</h3>
      <p><strong>Producto:</strong> ${registro.productoNombre || 'Sin nombre'} (${registro.productoCodigo || ''})</p>
      <p><strong>Cantidad fabricada:</strong> ${registro.cantidad}</p>
      <p><strong>Fecha:</strong> ${fecha}</p>
      <p><strong>Usuario:</strong> ${usuarioTexto}</p>
    `;
    processList.appendChild(card);
  });
}

function parseDateValue(value) {
  if (!value) return null;
  const fecha = new Date(`${value}T00:00:00`);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function renderReportePorFechas(historial, fechaInicio, fechaFin) {
  reportList.innerHTML = '';
  const inicio = parseDateValue(fechaInicio);
  const fin = parseDateValue(fechaFin);

  if (!inicio && !fin) {
    const entries = getHistorialEntries(historial);
    if (!entries.length) {
      reportList.innerHTML = '<p>No hay registros de producción para mostrar.</p>';
      return;
    }

    entries.forEach((registro) => {
      const fecha = registro.fecha ? new Date(registro.fecha).toLocaleDateString() : 'No especificada';
      const usuarioTexto = registro.usuarioNombre
        ? `${registro.usuarioNombre} (${registro.usuarioId || 'sin ID'})`
        : 'Sin usuario';
      const card = document.createElement('div');
      card.className = 'process-card';
      card.innerHTML = `
        <h3>${registro.productoNombre || 'Sin nombre'} (${registro.productoCodigo || ''})</h3>
        <p><strong>Código producto:</strong> ${registro.productoCodigo || 'No disponible'}</p>
        <p><strong>Cantidad producida:</strong> ${registro.cantidad}</p>
        <p><strong>Fecha:</strong> ${fecha}</p>
        <p><strong>Usuario:</strong> ${usuarioTexto}</p>
      `;
      reportList.appendChild(card);
    });
    return;
  }

  if (!inicio || !fin) {
    reportList.innerHTML = '<p>Selecciona una fecha de inicio y una fecha fin válidas.</p>';
    return;
  }

  if (fin < inicio) {
    reportList.innerHTML = '<p>La fecha fin no puede ser anterior a la fecha de inicio.</p>';
    return;
  }

  const inicioDia = new Date(inicio);
  inicioDia.setHours(0, 0, 0, 0);
  const finDia = new Date(fin);
  finDia.setHours(23, 59, 59, 999);

  const entries = getHistorialEntries(historial)
    .filter((registro) => {
      if (!registro.fecha) return false;
      const fechaRegistro = new Date(registro.fecha);
      return fechaRegistro >= inicioDia && fechaRegistro <= finDia;
    });

  if (!entries.length) {
    reportList.innerHTML = '<p>No se encontraron registros dentro del rango de fechas seleccionado.</p>';
    return;
  }

  entries.forEach((registro) => {
    const fecha = registro.fecha ? new Date(registro.fecha).toLocaleDateString() : 'No especificada';
    const usuarioTexto = registro.usuarioNombre
      ? `${registro.usuarioNombre} (${registro.usuarioId || 'sin ID'})`
      : 'Sin usuario';
    const card = document.createElement('div');
    card.className = 'process-card';
    card.innerHTML = `
      <h3>${registro.productoNombre || 'Sin nombre'} (${registro.productoCodigo || ''})</h3>
      <p><strong>Código producto:</strong> ${registro.productoCodigo || 'No disponible'}</p>
      <p><strong>Cantidad producida:</strong> ${registro.cantidad}</p>
      <p><strong>Fecha:</strong> ${fecha}</p>
      <p><strong>Usuario:</strong> ${usuarioTexto}</p>
    `;
    reportList.appendChild(card);
  });
}

buscarHistorial.addEventListener('input', () => {
  renderHistorial(historialCache, buscarHistorial.value);
});

generarReporteBtn.addEventListener('click', async () => {
  try {
    historialCache = await fetchHistorial();
    renderReportePorFechas(historialCache, fechaInicioInput.value, fechaFinInput.value);
  } catch (error) {
    reportList.innerHTML = '<p>No se pudo generar el reporte.</p>';
  }
});

searchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  try {
    historialCache = await fetchHistorial();
    const texto = buscarHistorial.value.trim();
    renderHistorial(historialCache, texto);
    setMessage(searchMessage, texto ? 'Historial filtrado.' : 'Se muestran todos los registros.', true);
  } catch (error) {
    setMessage(searchMessage, 'No se pudo cargar el historial.');
  }
});

window.addEventListener('load', async () => {
  try {
    productosCache = await fetchProductos();
    historialCache = await fetchHistorial();
    poblarSelectProductos();
    renderHistorial(historialCache);
  } catch (error) {
    processList.innerHTML = '<p>No se pudo cargar el historial de producción.</p>';
  }
});
