// App simplificada con estado central y helpers
const STORAGE_KEY = 'intercambioRegalos_evento'; // compat: estado actual
const EVENTS_KEY = 'intercambioRegalos_eventos'; // listado de eventos
const CURRENT_EVENT_KEY = 'intercambioRegalos_actual';
const $ = (id) => document.getElementById(id);
const show = (id, on) => $(id).classList.toggle('d-none', !on);
let state = getStoredEvento();

function generateId() {
  return `ev-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyEvento(id = generateId()) {
  return {
    id,
    organizador: { nombre: '', incluido: true },
    evento: { tipo: 'Navidad', nombreCelebracion: '', fecha: '', presupuesto: 0 },
    participantes: [],
    exclusiones: [],
    sorteo: []
  };
}

function loadEvents() {
  const raw = localStorage.getItem(EVENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function isEventEmpty(ev) {
  if (!ev) return true;
  const sinOrg = !ev.organizador?.nombre;
  const sinParticipantes = !ev.participantes?.length;
  const sinExclusiones = !ev.exclusiones?.length;
  const sinSorteo = !ev.sorteo?.length;
  const sinFecha = !ev.evento?.fecha;
  const sinPresupuesto = !ev.evento?.presupuesto;
  return sinOrg && sinParticipantes && sinExclusiones && sinSorteo && sinFecha && sinPresupuesto;
}

function saveEvents(events) {
  localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
}

function getStoredEvento() {
  // intenta usar el evento actual; si no hay, crea uno nuevo
  let events = loadEvents().filter(e => !isEventEmpty(e)); // limpia basura previa
  if (events.length !== loadEvents().length) saveEvents(events);
  const currentId = localStorage.getItem(CURRENT_EVENT_KEY);
  let found = events.find(e => e.id === currentId);
  if (!found && events.length) {
    found = events[0];
    localStorage.setItem(CURRENT_EVENT_KEY, found.id);
  }
  // compat con single evento guardado en STORAGE_KEY
  if (!found) {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const migrated = { id: generateId(), ...parsed };
        events.push(migrated);
        saveEvents(events);
        localStorage.setItem(CURRENT_EVENT_KEY, migrated.id);
        return migrated;
      } catch {
        /* ignore */
      }
    }
  }
  return found ? { ...createEmptyEvento(found.id), ...found } : createEmptyEvento();
}

function saveState() {
  let events = loadEvents().filter(e => !isEventEmpty(e) || e.id === state.id);
  const idx = events.findIndex(e => e.id === state.id);
  if (idx >= 0) events[idx] = state;
  else events.push(state);
  saveEvents(events);
  localStorage.setItem(CURRENT_EVENT_KEY, state.id);
}

function setEstado(text) {
  const label = $('etiqueta-estado');
  if (label) label.textContent = text;
}

function init() {
  setupEventListeners();
  renderFechaOpciones();
  setupPresupuestoOpciones();
  // no guardamos durante carga inicial para evitar ensuciar storage
  setPresupuestoSeleccionado(state.evento.presupuesto, false);

  if (state.evento.fecha) {
    $('fecha-otro').value = state.evento.fecha;
    highlightFechaSeleccionada(state.evento.fecha);
  }

  if (state.organizador.nombre) {
    setEstado('Evento cargado. Puedes continuar desde el resumen.');
    renderResumen();
  } else {
    setEstado('Bienvenido. Comienza creando tu evento.');
  }
}

function mostrarPantalla(id) {
  document.querySelectorAll('.pantalla').forEach(p => p.classList.add('d-none'));
  $(id).classList.remove('d-none');

  if (id === 'resumen') renderResumen();
  if (id === 'participantes') renderParticipantes();
  if (id === 'exclusiones') renderExclusiones();
  if (id === 'sorteo') renderSorteo();
}

function irAConfiguracion() {
  mostrarPantalla('configuracion');
  $('organizador-nombre').value = state.organizador.nombre || '';
  $('organizador-incluido').checked = state.organizador.incluido;
  $('tipo-evento').value = state.evento.tipo || 'Navidad';
  toggleCelebracionNombre();
  $('celebracion-nombre').value = state.evento.nombreCelebracion || '';
  $('fecha-otro').value = state.evento.fecha || '';
  setPresupuestoSeleccionado(state.evento.presupuesto);
}

function setupEventListeners() {
  $('tipo-evento').addEventListener('change', toggleCelebracionNombre);
  $('fecha-otro').addEventListener('change', () => selectFecha('otro', $('fecha-otro').value));
  $('organizador-incluido').addEventListener('change', () => {
    state.organizador.incluido = $('organizador-incluido').checked;
    saveState();
  });
  $('excl-si').addEventListener('change', () => togglePanelExclusiones(true));
  $('excl-no').addEventListener('change', () => togglePanelExclusiones(false));
  $('btn-toggle-eventos')?.addEventListener('click', toggleListaEventos);
}

function toggleListaEventos() {
  const cont = $('eventos-guardados');
  const isHidden = cont?.classList.contains('d-none');
  if (isHidden) {
    renderListaEventos();
    show('eventos-guardados', true);
  } else {
    show('eventos-guardados', false);
  }
}

function renderListaEventos() {
  const cont = $('eventos-lista');
  if (!cont) return;
  const events = loadEvents();
  cont.innerHTML = '';
  if (!events.length) {
    cont.innerHTML = '<div class=\"text-muted\">No hay eventos guardados.</div>';
    return;
  }
  events.forEach(ev => {
    const titulo = ev.evento?.nombreCelebracion || ev.evento?.tipo || 'Sin titulo';
    const fecha = ev.evento?.fecha || 'Sin fecha';
    const item = document.createElement('div');
    item.className = 'list-group-item d-flex flex-column flex-md-row align-items-md-center justify-content-md-between';
    item.innerHTML = `
      <div>
        <div class=\"fw-bold\">${titulo}</div>
        <div class=\"small text-muted\">${fecha}</div>
      </div>
      <div class=\"d-flex gap-2 mt-2 mt-md-0\">
        <button class=\"btn btn-sm btn-outline-secondary\" onclick=\"cargarEvento('${ev.id}', 'resumen')\">Ver</button>
        <button class=\"btn btn-sm btn-primary\" onclick=\"cargarEvento('${ev.id}', 'configuracion')\">Editar</button>
      </div>
    `;
    cont.appendChild(item);
  });
}

function crearNuevoEvento() {
  state = createEmptyEvento();
  localStorage.setItem(CURRENT_EVENT_KEY, state.id);
  setEstado('Nuevo evento listo para configurar.');
  irAConfiguracion();
  show('eventos-guardados', false);
}

function cargarEvento(id, destino = 'resumen') {
  const found = loadEvents().find(e => e.id === id);
  if (!found) return;
  state = { ...createEmptyEvento(found.id), ...found };
  saveState();
  setEstado('Evento cargado.');
  if (destino === 'configuracion') {
    irAConfiguracion();
  } else {
    renderResumen();
    mostrarPantalla('resumen');
  }
}

function toggleCelebracionNombre() {
  const tipo = $('tipo-evento').value;
  const container = $('celebracion-nombre-container');
  container.classList.toggle('d-none', tipo !== 'Otro');
}

function renderFechaOpciones() {
  const cont = $('fechas-opciones');
  cont.innerHTML = '';
  const fechas = generarFechasProximas(3);

  fechas.forEach((f, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-outline-secondary btn-sm';
    btn.textContent = f.label;
    btn.dataset.fecha = f.value;
    btn.addEventListener('click', () => {
      selectFecha('predefinida', f.value);
      $('fecha-otro').value = '';
      highlightFechaSeleccionada(f.value);
    });
    cont.appendChild(btn);
  });

  if (state.evento.fecha) highlightFechaSeleccionada(state.evento.fecha);
}

function highlightFechaSeleccionada(value) {
  document.querySelectorAll('#fechas-opciones button').forEach(b => {
    b.classList.toggle('active', b.dataset.fecha === value);
  });
}

function selectFecha(type, value) {
  if (!value) return;
  state.evento.fecha = value;
  saveState();
  if (type === 'otro') highlightFechaSeleccionada(value);
}

function generarFechasProximas(cantidad) {
  const fechas = [];
  const hoy = new Date();
  let current = new Date(hoy);
  while (current.getDay() !== 6) current.setDate(current.getDate() + 1); // proximo sabado
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
  document.querySelectorAll('#presupuesto-opciones button').forEach(btn => {
    btn.addEventListener('click', () => {
      const value = btn.dataset.value;
      if (value === 'otro') {
        $('presupuesto-otro').classList.remove('d-none');
        $('presupuesto-otro').focus();
        setPresupuestoSeleccionado(null);
      } else {
        $('presupuesto-otro').classList.add('d-none');
        $('presupuesto-otro').value = '';
        setPresupuestoSeleccionado(Number(value));
      }
    });
  });

  $('presupuesto-otro').addEventListener('input', (event) => {
    const value = Number(event.target.value);
    setPresupuestoSeleccionado(isNaN(value) ? null : value);
  });
}

function setPresupuestoSeleccionado(value, shouldSave = true) {
  state.evento.presupuesto = value || 0;
  if (shouldSave) saveState();
  document.querySelectorAll('#presupuesto-opciones button').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === String(value));
  });
}

function guardarConfiguracionYContinuar() {
  const nombre = $('organizador-nombre').value.trim();
  const incluido = $('organizador-incluido').checked;
  const tipo = $('tipo-evento').value;
  const nombreCelebracion = $('celebracion-nombre').value.trim();
  const fecha = state.evento.fecha || $('fecha-otro').value;
  const presupuesto = state.evento.presupuesto;
  const errorElement = $('config-error');
  errorElement.classList.add('d-none');

  if (!nombre) return showConfigError('Ingresa el nombre del organizador.');
  if (!fecha) return showConfigError('Selecciona una fecha para el evento.');
  if (!presupuesto || presupuesto <= 0) return showConfigError('Selecciona o ingresa un presupuesto valido.');

  state.organizador.nombre = nombre;
  state.organizador.incluido = incluido;
  state.evento.tipo = tipo;
  state.evento.nombreCelebracion = tipo === 'Otro' ? nombreCelebracion : tipo;
  state.evento.fecha = fecha;
  state.evento.presupuesto = presupuesto;

  saveState();
  setEstado('Configuracion guardada. Ahora agrega participantes.');
  mostrarPantalla('participantes');

  function showConfigError(msg) {
    errorElement.textContent = msg;
    errorElement.classList.remove('d-none');
  }
}

function agregarParticipante() {
  const input = $('participante-nombre');
  const nombre = input.value.trim();
  const errorElement = $('participantes-error');
  errorElement.style.display = 'none';

  if (!nombre) {
    errorElement.textContent = 'Ingresa un nombre de participante.';
    errorElement.style.display = 'block';
    return;
  }

  const existe = state.participantes.some(p => p.nombre.toLowerCase() === nombre.toLowerCase());
  if (existe) {
    errorElement.textContent = 'El participante ya esta agregado.';
    errorElement.style.display = 'block';
    return;
  }

  const id = `p-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  state.participantes.push({ id, nombre });
  saveState();

  input.value = '';
  renderParticipantes();
}

function renderParticipantes() {
  const cont = $('lista-participantes');
  cont.innerHTML = '';

  state.participantes.forEach(p => {
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

  if (state.participantes.length === 0) {
    cont.innerHTML = '<p class="text-muted">No hay participantes. Agrega al menos uno.</p>';
  }
}

function eliminarParticipante(id) {
  state.participantes = state.participantes.filter(p => p.id !== id);
  state.exclusiones = state.exclusiones.filter(e => e.from !== id && e.to !== id);
  state.sorteo = [];
  saveState();
  renderParticipantes();
  renderExclusiones();
}

function continuarAExclusiones() {
  const cantidad = state.participantes.length + (state.organizador.incluido ? 1 : 0);

  if (cantidad < 2) {
    const errorElement = $('participantes-error');
    errorElement.textContent = 'Se necesitan al menos 2 participantes para continuar.';
    errorElement.style.display = 'block';
    return;
  }

  if (state.organizador.incluido) {
    const existeOrg = state.participantes.some(p => p.nombre.toLowerCase() === state.organizador.nombre.toLowerCase());
    if (!existeOrg) {
      const id = `p-org-${Date.now()}`;
      state.participantes.unshift({ id, nombre: state.organizador.nombre });
      saveState();
    }
  }

  setEstado('Configura las exclusiones (si las hay).');
  mostrarPantalla('exclusiones');
}

function togglePanelExclusiones(showFlag) {
  const panel = $('exclusiones-panel');
  panel.classList.toggle('d-none', !showFlag);
  if (showFlag) renderExclusiones();
}

function renderExclusiones() {
  const radioSi = $('excl-si');
  const radioNo = $('excl-no');
  const panel = $('exclusiones-panel');

  const tieneExcl = state.exclusiones && state.exclusiones.length > 0;
  const mostrar = radioSi.checked || tieneExcl;

  radioSi.checked = mostrar;
  radioNo.checked = !mostrar;
  panel.classList.toggle('d-none', !mostrar);

  const drag = $('drag-participantes');
  const drop = $('drop-participantes');
  const listado = $('listado-exclusiones');

  drag.innerHTML = '';
  drop.innerHTML = '';
  listado.innerHTML = '';

  state.participantes.forEach(p => {
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
    target.addEventListener('dragleave', () => target.classList.remove('drag-over'));
    target.addEventListener('drop', (e) => {
      e.preventDefault();
      target.classList.remove('drag-over');
      const fromId = e.dataTransfer.getData('text/plain');
      const toId = p.id;
      agregarExclusion(fromId, toId);
    });
    drop.appendChild(target);
  });

  state.exclusiones.forEach(ex => {
    const de = state.participantes.find(p => p.id === ex.from)?.nombre || '???';
    const a = state.participantes.find(p => p.id === ex.to)?.nombre || '???';
    const badge = document.createElement('span');
    badge.className = 'badge bg-secondary d-flex align-items-center gap-2';
    badge.innerHTML = `${de} \u2192 ${a} <button type=\"button\" class=\"btn-close btn-close-white btn-sm\" aria-label=\"Eliminar\" onclick=\"quitarExclusion('${ex.from}','${ex.to}')\"></button>`;
    listado.appendChild(badge);
  });

  if (state.exclusiones.length === 0) {
    listado.innerHTML = '<p class=\"text-muted\">No hay exclusiones definidas aun.</p>';
  }
}

function agregarExclusion(fromId, toId) {
  if (!fromId || !toId || fromId === toId) return;
  const existe = state.exclusiones.some(e => e.from === fromId && e.to === toId);
  if (existe) return;
  state.exclusiones.push({ from: fromId, to: toId });
  state.sorteo = [];
  saveState();
  renderExclusiones();
}

function quitarExclusion(fromId, toId) {
  state.exclusiones = state.exclusiones.filter(e => !(e.from === fromId && e.to === toId));
  saveState();
  renderExclusiones();
}

function guardarExclusionesYContinuar() {
  const tieneExclusiones = $('excl-si').checked;
  if (!tieneExclusiones) {
    state.exclusiones = [];
    saveState();
  }
  setEstado('Resumen listo. Podes revisar o ir al sorteo.');
  mostrarPantalla('resumen');
}

function renderResumen() {
  $('resumen-organizador').textContent = state.organizador.nombre;
  $('resumen-tipo').textContent = state.evento.tipo;
  $('resumen-celebracion').textContent = state.evento.nombreCelebracion || '---';
  $('resumen-fecha').textContent = state.evento.fecha || '---';
  $('resumen-presupuesto').textContent = state.evento.presupuesto ? `$${state.evento.presupuesto}` : '---';
  $('resumen-participantes').textContent = state.participantes.map(p => p.nombre).join(', ') || '---';
  $('resumen-exclusiones').textContent = state.exclusiones.map(e => {
    const de = state.participantes.find(p => p.id === e.from)?.nombre || '???';
    const a = state.participantes.find(p => p.id === e.to)?.nombre || '???';
    return `${de} \u2192 ${a}`;
  }).join(', ') || '---';
}

function renderSorteo() {
  const cont = $('resultados-sorteo');
  cont.innerHTML = '';
  $('sorteo-error').classList.add('d-none');

  if (state.sorteo && state.sorteo.length) {
    state.sorteo.forEach(pair => {
      const giver = state.participantes.find(p => p.id === pair.giver)?.nombre || '---';
      const receiver = state.participantes.find(p => p.id === pair.receiver)?.nombre || '---';
      const card = document.createElement('div');
      card.className = 'col-12 col-md-6';
      card.innerHTML = `
        <div class=\"card\">
          <div class=\"card-body\">
            <h5 class=\"card-title\">${giver}</h5>
            <p class=\"card-text\">Regala a <strong>${receiver}</strong></p>
          </div>
        </div>
      `;
      cont.appendChild(card);
    });
  }
}

function realizarSorteo() {
  const errorEl = $('sorteo-error');
  errorEl.classList.add('d-none');

  const participantes = state.participantes.map(p => p.id);
  if (participantes.length < 2) {
    errorEl.textContent = 'Se necesitan al menos 2 participantes para realizar el sorteo.';
    errorEl.classList.remove('d-none');
    return;
  }

  const exclusiones = new Set(state.exclusiones.map(e => `${e.from}->${e.to}`));
  const maxIntentos = 5000;
  let resultado = null;

  for (let i = 0; i < maxIntentos; i++) {
    const receivers = shuffleArray([...participantes]);
    const conflicto = participantes.some((giverId, idx) => {
      const receiverId = receivers[idx];
      if (giverId === receiverId) return true;
      if (exclusiones.has(`${giverId}->${receiverId}`)) return true;
      return false;
    });
    if (!conflicto) {
      resultado = participantes.map((giverId, idx) => ({ giver: giverId, receiver: receivers[idx] }));
      break;
    }
  }

  if (!resultado) {
    errorEl.textContent = 'No fue posible generar un sorteo valido con las exclusiones actuales. Ajusta exclusiones o agrega mas participantes.';
    errorEl.classList.remove('d-none');
    return;
  }

  state.sorteo = resultado;
  saveState();
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
  const events = loadEvents().filter(e => e.id !== state.id);
  saveEvents(events);
  localStorage.removeItem(CURRENT_EVENT_KEY);
  state = createEmptyEvento();
  saveState();
  window.location.reload();
}

window.addEventListener('DOMContentLoaded', init);
