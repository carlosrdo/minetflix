/************  MODELO (datos + persistencia)  ************/
const STORAGE_KEY = 'mis_peliculas';

const mis_peliculas_iniciales = [
  { titulo: "Superlópez",    director: "Javier Ruiz Caldera",  miniatura: "files/superlopez.png" },
  { titulo: "Jurassic Park", director: "Steven Spielberg",      miniatura: "files/jurassicpark.png" },
  { titulo: "Interstellar",  director: "Christopher Nolan",     miniatura: "files/interstellar.png" }
];

let mis_peliculas = [];

// Helpers localStorage (mantenemos nombres tipo API para compatibilidad)
const postAPI = async (_peliculas) => { setMovies(_peliculas); return 'localStorage'; };
const getAPI = async () => getMovies();
const updateAPI = async (peliculas) => setMovies(peliculas);

// CRUD almacenamiento
function getMovies() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
function setMovies(arr) { localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }
function seedMovies() { setMovies(mis_peliculas_iniciales.slice()); }

/************  VISTAS  ************/
const indexView = (peliculas) => {
  let cards = peliculas.map((p, i) => `
    <div class="movie">
      <div class="movie-img">
        <img class="show" data-my-id="${i}"
             src="${p.miniatura || 'files/placeholder.png'}"
             onerror="this.src='files/placeholder.png'">
      </div>
      <div class="title">${p.titulo || "<em>Sin título</em>"}</div>
      <div class="actions">
        <button class="show"   data-my-id="${i}">ver</button>
        <button class="edit"   data-my-id="${i}">editar</button>
        <button class="delete" data-my-id="${i}">borrar</button>
      </div>
    </div>
  `).join('');

  return `
    <div class="container">
      <div class="movies-grid">
        ${cards}
      </div>
      <div class="hr"></div>
      <div class="actions">
        <button class="new">añadir</button>
        <button class="reset">reset</button>
      </div>
    </div>`;
};

const editView = (i, pelicula) => `
  <div class="container">
    <h2>Editar Película</h2>
    <div class="field">Título <br>
      <input type="text" id="titulo" placeholder="Título" value="${pelicula.titulo || ''}">
    </div>
    <div class="field">Director <br>
      <input type="text" id="director" placeholder="Director" value="${pelicula.director || ''}">
    </div>
    <div class="field">Miniatura <br>
      <input type="text" id="miniatura" placeholder="URL de la miniatura" value="${pelicula.miniatura || ''}">
      <div class="small">Si se deja vacío o falla, se usará el placeholder.</div>
    </div>
    <div class="actions">
      <button class="update" data-my-id="${i}">actualizar</button>
      <button class="index">volver</button>
    </div>
  </div>
`;

const showView = (pelicula) => `
  <div class="container">
    <h2>${pelicula.titulo || "Sin título"}</h2>
    <div class="movie">
      <div class="movie-img">
        <img src="${pelicula.miniatura || 'files/placeholder.png'}"
             onerror="this.src='files/placeholder.png'">
      </div>
      <div class="field">Director</div>
      <div>${pelicula.director || "<em>Desconocido</em>"}</div>
    </div>
    <div class="actions">
      <button class="index">volver</button>
    </div>
  </div>
`;

const newView = () => `
  <div class="container">
    <h2>Crear Película</h2>
    <div class="field">Título <br>
      <input type="text" id="new_titulo" placeholder="Título">
    </div>
    <div class="field">Director <br>
      <input type="text" id="new_director" placeholder="Director">
    </div>
    <div class="field">Miniatura <br>
      <input type="text" id="new_miniatura" placeholder="URL de la miniatura (opcional)">
    </div>
    <div class="actions">
      <button class="create">crear</button>
      <button class="index">volver</button>
    </div>
  </div>
`;

/************  CONTROLADORES  ************/
const initContr = async () => {
  if (!getMovies()) await postAPI(mis_peliculas_iniciales); // siembra inicial
  indexContr();
};

const indexContr = async () => {
  mis_peliculas = (await getAPI()) || [];
  document.getElementById('main').innerHTML = indexView(mis_peliculas);
};

const showContr = (i) => {
  const peli = mis_peliculas[i];
  if (!peli) return indexContr();
  document.getElementById('main').innerHTML = showView(peli);
};

const newContr = () => {
  document.getElementById('main').innerHTML = newView();
  document.getElementById('new_titulo')?.focus();
};

const createContr = async () => {
  const titulo   = (document.getElementById('new_titulo')?.value || '').trim();
  const director = (document.getElementById('new_director')?.value || '').trim();
  const miniatura= (document.getElementById('new_miniatura')?.value || '').trim();

  if (!titulo || !director) { alert('Título y Director son obligatorios.'); return; }

  const nueva = { titulo, director, miniatura: miniatura || 'files/placeholder.png' };

  const actual = (await getAPI()) || [];
  actual.push(nueva);
  await updateAPI(actual);
  indexContr();
};

const editContr = (i) => {
  document.getElementById('main').innerHTML = editView(i, mis_peliculas[i]);
  document.getElementById('titulo')?.focus();
};

const updateContr = async (i) => {
  mis_peliculas[i].titulo    = (document.getElementById('titulo')?.value || '').trim();
  mis_peliculas[i].director  = (document.getElementById('director')?.value || '').trim();
  mis_peliculas[i].miniatura = (document.getElementById('miniatura')?.value || '').trim() || 'files/placeholder.png';
  await updateAPI(mis_peliculas);
  indexContr();
};

const deleteContr = async (i) => {
  const peli = mis_peliculas[i];
  if (!peli) return;
  const ok = confirm(`¿Seguro que quieres borrar "${peli.titulo || 'esta película'}"?`);
  if (!ok) return;
  const actual = (await getAPI()) || [];
  actual.splice(i, 1);
  await updateAPI(actual);
  indexContr();
};

const resetContr = async () => {
  const ok = confirm('Esto restaurará las películas iniciales. ¿Continuar?');
  if (!ok) return;
  seedMovies();
  indexContr();
};

/************  ROUTER (delegación de eventos)  ************/
const matchEvent = (ev, sel) => ev.target.matches(sel);
const myId = (ev) => Number(ev.target.dataset.myId);

document.addEventListener('click', ev => {
  if      (matchEvent(ev, '.index'))   indexContr();
  else if (matchEvent(ev, '.show'))    showContr(myId(ev));
  else if (matchEvent(ev, '.new'))     newContr();
  else if (matchEvent(ev, '.create'))  createContr();
  else if (matchEvent(ev, '.edit'))    editContr(myId(ev));
  else if (matchEvent(ev, '.update'))  updateContr(myId(ev));
  else if (matchEvent(ev, '.delete'))  deleteContr(myId(ev));
  else if (matchEvent(ev, '.reset'))   resetContr();
});

/************  Inicialización  ************/
document.addEventListener('DOMContentLoaded', initContr);

