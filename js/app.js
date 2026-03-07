const STORAGE_KEY = 'intercambioRegalos_evento';

function createEmptyEvento() {
  return {
    organizador: { nombre: '', incluido: true },
    evento: { tipo: 'Navidad', nombreCelebracion: '', fecha: '', presupuesto: 0 },
    participantes: [],
    exclusiones: [],
    sorteo: []
  };
}

function getStoredEvento() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return createEmptyEvento();
  try {
    return { ...createEmptyEvento(), ...JSON.parse(raw) };
  } catch {
    return createEmptyEvento();
  }
}

function saveEvento(evento) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(evento));
}

function init() {
  setupEventListeners();
  renderFechaOpciones();
  setupPresupuestoOpciones();
  const evento = getStoredEvento();
  setPresupuestoSeleccionado(evento.evento.presupuesto);

  // Si hay fechas guardadas, resaltarlas
  if (evento.evento.fecha) {
    document.getElementById('fecha-otro').value = evento.evento.fecha;
    highlightFechaSeleccionada(evento.evento.fecha);
  }

  if (evento.organizador.nombre) {
    setEstado('Evento cargado. Puedes continuar desde el resumen.');
    document.getElementById('btn-continuar-evento').classList.remove('d-none');
    renderResumen();
  } else {
    setEstado('Bienvenido. Comienza creando tu evento.');
  }
}

function setEstado(text) {
  const label = document.getElementById('etiqueta-estado');
  if (label) label.textContent = text;
}

function getStoredEvento() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return createEmptyEvento();
  }
  try {
    const parsed = JSON.parse(raw);
    return { ...createEmptyEvento(), ...parsed };
  } catch (error) {
    console.warn('No se pudo leer eventos de LocalStorage:', error);
    return createEmptyEvento();
  }
}

function createEmptyEvento() {
  return {
    organizador: { nombre: '', incluido: true },
    evento: { tipo: 'Navidad', nombreCelebracion: '', fecha: '', presupuesto: 0 },
    participantes: [],
    exclusiones: [],
    sorteo: []
  };
}

function saveEvento(evento) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(evento));
}

function mostrarPantalla(id) {
  const pantallas = document.querySelectorAll('.pantalla');
  pantallas.forEach(p => p.classList.add('d-none'));
  document.getElementById(id).classList.remove('d-none');

  if (id === 'resumen') renderResumen();
  if (id === 'participantes') renderParticipantes();
  if (id === 'exclusiones') renderExclusiones();
  if (id === 'sorteo') renderSorteo();
}

function irAConfiguracion() {
  mostrarPantalla('configuracion');
  const evento = getStoredEvento();
  document.getElementById('organizador-nombre').value = evento.organizador.nombre || '';
  document.getElementById('organizador-incluido').checked = evento.organizador.incluido;
  document.getElementById('tipo-evento').value = evento.evento.tipo || 'Navidad';
  toggleCelebracionNombre();
  document.getElementById('celebracion-nombre').value = evento.evento.nombreCelebracion || '';
  document.getElementById('fecha-otro').value = evento.evento.fecha || '';
  setPresupuestoSeleccionado(evento.evento.presupuesto);
}

function setupEventListeners() {
  document.getElementById('tipo-evento').addEventListener('change', toggleCelebracionNombre);
  document.getElementById('fecha-otro').addEventListener('change', () => selectFecha('otro', document.getElementById('fecha-otro').value));
  document.getElementById('organizador-incluido').addEventListener('change', () => {
    const evento = getStoredEvento();
    evento.organizador.incluido = document.getElementById('organizador-incluido').checked;
    saveEvento(evento);
  });

  document.getElementById('excl-si').addEventListener('change', () => togglePanelExclusiones(true));
  document.getElementById('excl-no').addEventListener('change', () => togglePanelExclusiones(false));
}

function toggleCelebracionNombre() {
  const tipo = document.getElementById('tipo-evento').value;
  const container = document.getElementById('celebracion-nombre-container');
  if (tipo === 'Otro') {
    container.classList.remove('d-none');
  } else {
    container.classList.add('d-none');
  }
}

function renderFechaOpciones() {
  const cont = document.getElementById('fechas-opciones');
  cont.innerHTML = '';
  const fechas = generarFechasProximas(3);
  const evento = getStoredEvento();

  fechas.forEach((f, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-secondary btn-sm';
    btn.textContent = f.label;
    btn.dataset.fecha = f.value;
    btn.addEventListener('click', () => {
      selectFecha('predefinida', f.value);
      document.getElementById('fecha-otro').value = '';
      highlightFechaSeleccionada(f.value);
    });
    cont.appendChild(btn);

    // Si no hay fecha guardada, pre-seleccionar la primera opción
    if (!evento.evento.fecha && index === 0) {
      selectFecha('predefinida', f.value);
      highlightFechaSeleccionada(f.value);
    }
  });

  // Si hay fecha guardada, resaltarla
  if (evento.evento.fecha) {
    highlightFechaSeleccionada(evento.evento.fecha);
  }
}

function highlightFechaSeleccionada(value) {
  const botones = document.querySelectorAll('#fechas-opciones button');
  botones.forEach(b => {
    b.classList.toggle('active', b.dataset.fecha === value);
  });
}

function selectFecha(type, value) {
  const evento = getStoredEvento();
  if (type === 'predefinida') {
    evento.evento.fecha = value;
  } else if (type === 'otro') {
    evento.evento.fecha = value;
    highlightFechaSeleccionada(value);
  }
  saveEvento(evento);
}

function generarFechasProximas(cantidad) {
  const fechas = [];
  const hoy = new Date();
  let current = new Date(hoy);
  // Buscar el próximo sábado
  while (current.getDay() !== 6) {
    current.setDate(current.getDate() + 1);
  }
  for (let i = 0; i < cantidad; i++) {
    const dia = new Date(current);
    fechas.push({
      value: dia.toISOString().slice(0, 10),
      label: dia.toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: '2-digit' })
    });
    current.setDate(current.getDate() + 7);
  }
  return fechas;
}

function setupPresupuestoOpciones() {
  const botones = document.querySelectorAll('#presupuesto-opciones button');
  botones.forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      if (value === 'otro') {
        document.getElementById('presupuesto-otro').classList.remove('d-none');
        document.getElementById('presupuesto-otro').focus();
        setPresupuestoSeleccionado(null);
      } else {
        document.getElementById('presupuesto-otro').classList.add('d-none');
        document.getElementById('presupuesto-otro').value = '';
        setPresupuestoSeleccionado(Number(value));
      }
    });
  });

  document.getElementById('presupuesto-otro').addEventListener('input', (event) => {
    const value = Number(event.target.value);
    setPresupuestoSeleccionado(isNaN(value) ? null : value);
  });
}

function setPresupuestoSeleccionado(value) {
  const evento = getStoredEvento();
  evento.evento.presupuesto = value || 0;
  saveEvento(evento);

  const botones = document.querySelectorAll('#presupuesto-opciones button');
  botones.forEach(btn => {
    if (btn.dataset.value === String(value)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function guardarConfiguracionYContinuar() {
  const nombre = document.getElementById('organizador-nombre').value.trim();
  const incluido = document.getElementById('organizador-incluido').checked;
  const tipo = document.getElementById('tipo-evento').value;
  const nombreCelebracion = document.getElementById('celebracion-nombre').value.trim();
  const fecha = getStoredEvento().evento.fecha || document.getElementById('fecha-otro').value;
  const presupuesto = getStoredEvento().evento.presupuesto;

  const errorElement = document.getElementById('config-error');
  errorElement.classList.add('d-none');

  if (!nombre) {
    errorElement.textContent = 'Ingresa el nombre del organizador.';
    errorElement.classList.remove('d-none');
    return;
  }

  if (!fecha) {
    errorElement.textContent = 'Selecciona una fecha para el evento.';
    errorElement.classList.remove('d-none');
    return;
  }

  if (!presupuesto || presupuesto <= 0) {
    errorElement.textContent = 'Selecciona o ingresa un presupuesto válido.';
    errorElement.classList.remove('d-none');
    return;
  }

  const evento = getStoredEvento();
  evento.organizador.nombre = nombre;
  evento.organizador.incluido = incluido;
  evento.evento.tipo = tipo;
  evento.evento.nombreCelebracion = tipo === 'Otro' ? nombreCelebracion : tipo;
  evento.evento.fecha = fecha;
  evento.evento.presupuesto = presupuesto;

  saveEvento(evento);
  setEstado('Configuración guardada. Ahora agrega participantes.');
  document.getElementById('btn-continuar-evento').classList.remove('d-none');
  mostrarPantalla('participantes');
}

function agregarParticipante() {
  const input = document.getElementById('participante-nombre');
  const nombre = input.value.trim();
  const errorElement = document.getElementById('participantes-error');
  errorElement.style.display = 'none';

  if (!nombre) {
    errorElement.textContent = 'Ingresa un nombre de participante.';
    errorElement.style.display = 'block';
    return;
  }

  const evento = getStoredEvento();
  const existe = evento.participantes.some(p => p.nombre.toLowerCase() === nombre.toLowerCase());
  if (existe) {
    errorElement.textContent = 'El participante ya está agregado.';
    errorElement.style.display = 'block';
    return;
  }

  const id = `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  evento.participantes.push({ id, nombre });
  saveEvento(evento);

  input.value = '';
  renderParticipantes();
}

function renderParticipantes() {
  const cont = document.getElementById('lista-participantes');
  const evento = getStoredEvento();
  cont.innerHTML = '';

  evento.participantes.forEach(p => {
    const card = document.createElement('div');
    card.className = 'col-12 col-sm-6 col-lg-4';
    card.innerHTML = `
      <div class="card p-3 d-flex align-items-start">
        <div class="flex-grow-1">
          <strong>${p.nombre}</strong>
        </div>
        <button class="btn btn-sm btn-outline-danger" type="button" onclick="eliminarParticipante('${p.id}')">Eliminar</button>
      </div>
    `;
    cont.appendChild(card);
  });

  if (evento.participantes.length === 0) {
    cont.innerHTML = '<p class="text-muted">No hay participantes. Agregá al menos uno.</p>';
  }
}

function eliminarParticipante(id) {
  const evento = getStoredEvento();
  evento.participantes = evento.participantes.filter(p => p.id !== id);
  evento.exclusiones = evento.exclusiones.filter(e => e.from !== id && e.to !== id);
  evento.sorteo = [];
  saveEvento(evento);
  renderParticipantes();
  renderExclusiones();
}

function continuarAExclusiones() {
  const evento = getStoredEvento();
  const cantidad = evento.participantes.length + (evento.organizador.incluido ? 1 : 0);

  if (cantidad < 2) {
    const errorElement = document.getElementById('participantes-error');
    errorElement.textContent = 'Se necesitan al menos 2 participantes para continuar.';
    errorElement.style.display = 'block';
    return;
  }

  // Si organizador está incluido, asegurarse que esté en la lista
  if (evento.organizador.incluido) {
    const existeOrg = evento.participantes.some(p => p.nombre.toLowerCase() === evento.organizador.nombre.toLowerCase());
    if (!existeOrg) {
      const id = `p-org-${Date.now()}`;
      evento.participantes.unshift({ id, nombre: evento.organizador.nombre });
      saveEvento(evento);
    }
  }

  setEstado('Configura las exclusiones (si las hay).');
  mostrarPantalla('exclusiones');
}

function togglePanelExclusiones(show) {
  const panel = document.getElementById('exclusiones-panel');
  panel.classList.toggle('d-none', !show);
  if (show) {
    renderExclusiones();
  }
}

function renderExclusiones() {
  const evento = getStoredEvento();

  const tieneExcl = evento.exclusiones && evento.exclusiones.length > 0;
  document.getElementById('excl-si').checked = tieneExcl;
  document.getElementById('excl-no').checked = !tieneExcl;
  document.getElementById('exclusiones-panel').classList.toggle('d-none', !tieneExcl);

  const drag = document.getElementById('drag-participantes');
  const drop = document.getElementById('drop-participantes');
  const listado = document.getElementById('listado-exclusiones');

  drag.innerHTML = '';
  drop.innerHTML = '';
  listado.innerHTML = '';


  evento.participantes.forEach(p => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'list-group-item list-group-item-action';
    item.textContent = p.nombre;
    item.draggable = true;
    item.dataset.id = p.id;
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', p.id);
      e.dataTransfer.effectAllowed = 'move';
    });
    drag.appendChild(item);

    const target = document.createElement('button');
    target.type = 'button';
    target.className = 'list-group-item list-group-item-light';
    target.textContent = p.nombre;
    target.dataset.id = p.id;
    target.addEventListener('dragover', (e) => {
      e.preventDefault();
      target.classList.add('drag-over');
    });
    target.addEventListener('dragleave', () => {
      target.classList.remove('drag-over');
    });
    target.addEventListener('drop', (e) => {
      e.preventDefault();
      target.classList.remove('drag-over');
      const fromId = e.dataTransfer.getData('text/plain');
      const toId = p.id;
      agregarExclusion(fromId, toId);
    });
    drop.appendChild(target);
  });

  evento.exclusiones.forEach(ex => {
    const de = evento.participantes.find(p => p.id === ex.from)?.nombre || '???';
    const a = evento.participantes.find(p => p.id === ex.to)?.nombre || '???';
    const badge = document.createElement('span');
    badge.className = 'badge bg-secondary d-flex align-items-center gap-2';
    badge.innerHTML = `${de} → ${a} <button type="button" class="btn-close btn-close-white btn-sm" aria-label="Eliminar" onclick="quitarExclusion('${ex.from}','${ex.to}')"></button>`;
    listado.appendChild(badge);
  });

  if (evento.exclusiones.length === 0) {
    listado.innerHTML = '<p class="text-muted">No hay exclusiones definidas aún.</p>';
  }
}

function agregarExclusion(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  const evento = getStoredEvento();
  const existe = evento.exclusiones.some(e => e.from === fromId && e.to === toId);
  if (existe) return;
  evento.exclusiones.push({ from: fromId, to: toId });
  evento.sorteo = [];
  saveEvento(evento);
  renderExclusiones();
}

function quitarExclusion(fromId, toId) {
  const evento = getStoredEvento();
  evento.exclusiones = evento.exclusiones.filter(e => !(e.from === fromId && e.to === toId));
  saveEvento(evento);
  renderExclusiones();
}

function guardarExclusionesYContinuar() {
  const tieneExclusiones = document.getElementById('excl-si').checked;
  const evento = getStoredEvento();
  if (!tieneExclusiones) {
    evento.exclusiones = [];
    saveEvento(evento);
  }
  setEstado('Resumen listo. Podes revisar o ir al sorteo.');
  mostrarPantalla('resumen');
}

function renderResumen() {
  const evento = getStoredEvento();
  document.getElementById('resumen-organizador').textContent = evento.organizador.nombre;
  document.getElementById('resumen-tipo').textContent = evento.evento.tipo;
  document.getElementById('resumen-celebracion').textContent = evento.evento.nombreCelebracion || '---';
  document.getElementById('resumen-fecha').textContent = evento.evento.fecha || '---';
  document.getElementById('resumen-presupuesto').textContent = evento.evento.presupuesto ? `$${evento.evento.presupuesto}` : '---';
  document.getElementById('resumen-participantes').textContent = evento.participantes.map(p => p.nombre).join(', ') || '---';
  document.getElementById('resumen-exclusiones').textContent = evento.exclusiones.map(e => {
    const de = evento.participantes.find(p => p.id === e.from)?.nombre || '???';
    const a = evento.participantes.find(p => p.id === e.to)?.nombre || '???';
    return `${de} → ${a}`;
  }).join(', ') || '---';
}

function renderSorteo() {
  const evento = getStoredEvento();
  const cont = document.getElementById('resultados-sorteo');
  cont.innerHTML = '';
  document.getElementById('sorteo-error').classList.add('d-none');
  if (evento.sorteo && evento.sorteo.length) {
    evento.sorteo.forEach(pair => {
      const giver = evento.participantes.find(p => p.id === pair.giver)?.nombre || '---';
      const receiver = evento.participantes.find(p => p.id === pair.receiver)?.nombre || '---';
      const card = document.createElement('div');
      card.className = 'col-12 col-md-6';
      card.innerHTML = `
        <div class="card">
          <div class="card-body">
            <h5 class="card-title">${giver}</h5>
            <p class="card-text">Regala a <strong>${receiver}</strong></p>
          </div>
        </div>
      `;
      cont.appendChild(card);
    });
  }
}

function realizarSorteo() {
  const evento = getStoredEvento();
  const errorEl = document.getElementById('sorteo-error');
  errorEl.classList.add('d-none');

  const participantes = evento.participantes.map(p => p.id);
  if (participantes.length < 2) {
    errorEl.textContent = 'Se necesitan al menos 2 participantes para realizar el sorteo.';
    errorEl.classList.remove('d-none');
    return;
  }

  const exclusiones = new Set(evento.exclusiones.map(e => `${e.from}->${e.to}`));

  const maxIntents = 5000;
  let resultado = null;

  for (let i = 0; i < maxIntents; i++) {
    const receivers = shuffleArray([...participantes]);
    const conflict = participantes.some((giverId, idx) => {
      const receiverId = receivers[idx];
      if (giverId === receiverId) return true;
      if (exclusiones.has(`${giverId}->${receiverId}`)) return true;
      return false;
    });
    if (!conflict) {
      resultado = participantes.map((giverId, idx) => ({ giver: giverId, receiver: receivers[idx] }));
      break;
    }
  }

  if (!resultado) {
    errorEl.textContent = 'No fue posible generar un sorteo válido con las exclusiones actuales. Podés ajustar exclusiones o agregar más participantes.';
    errorEl.classList.remove('d-none');
    return;
  }

  evento.sorteo = resultado;
  saveEvento(evento);
  renderSorteo();
  setEstado('Sorteo generado.');
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function resetEvento() {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

// Iniciar la app
window.addEventListener('DOMContentLoaded', init);
