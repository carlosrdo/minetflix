/************  MODELO (datos + persistencia)  ************/
const STORAGE_KEY = 'mis_peliculas';

const mis_peliculas_iniciales = [
  { titulo: "Superlópez",    director: "Javier Ruiz Caldera",  miniatura: "files/superlopez.png" },
  { titulo: "Jurassic Park", director: "Steven Spielberg",      miniatura: "files/jurassicpark.png" },
  { titulo: "Interstellar",  director: "Christopher Nolan",     miniatura: "files/interstellar.png" }
];

let mis_peliculas = [];

// Helpers localStorage (API simulada)
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

/************  CONFIG TMDb (2ª PARTE)  ************/
/*
 
 */
const TMDB_BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmNDNlOGI3ODc2YTQ1N2NkZDU5YTgwNjZhNmNmNDlmMiIsIm5iZiI6MTc2Mjg3OTM3MS42MDksInN1YiI6IjY5MTM2NzhiZThkMjQxZTdiNWMwNjg2ZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.owzzjV_WW9StabJ9qi-Ow4Smx1EEYS3wHd8meAN876w';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';


const TMDB_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${TMDB_BEARER_TOKEN}`
  }
};

// Guardamos últimos resultados para poder usar data-my-id en botones "Añadir"
let tmdb_last_results = [];
let tmdb_last_query = "";

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
        <button class="search-view">buscar en TMDb</button>
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

/************  VISTA BÚSQUEDA TMDb  ************/
const searchView = () => `
  <div class="container">
    <h2>Buscar películas en TMDb</h2>
    <div class="search-bar">
      <input type="text" id="search_query"
             placeholder="Escribe el título de una película y pulsa buscar...">
      <button class="search">buscar</button>
      <button class="index">volver</button>
    </div>
    <div id="search_results" class="search-results-empty">
      Escribe un título y pulsa "buscar".
    </div>
  </div>
`;

/************  VISTA RESULTADOS TMDb  ************/
const resultsView = (resultados, query) => {
  if (!resultados || resultados.length === 0) {
    return `
      <div class="container">
        <h2>Buscar películas en TMDb</h2>
        <div class="search-bar">
          <input type="text" id="search_query"
                 placeholder="Escribe el título de una película y pulsa buscar..."
                 value="${query || ''}">
          <button class="search">buscar</button>
          <button class="index">volver</button>
        </div>
        <div id="search_results" class="search-results-empty">
          No se han encontrado resultados para "<strong>${query || ''}</strong>".
        </div>
      </div>
    `;
  }

  const cards = resultados.map((r, i) => {
    const poster = r.poster_path
      ? `${TMDB_IMG_BASE}${r.poster_path}`
      : 'files/placeholder.png';
    const fecha = r.release_date || 'Fecha desconocida';
    const overview = r.overview
      ? (r.overview.length > 220 ? r.overview.slice(0, 220) + '…' : r.overview)
      : 'Sin sinopsis disponible.';

    return `
      <div class="movie">
        <div class="movie-img">
          <img src="${poster}" onerror="this.src='files/placeholder.png'">
        </div>
        <div class="title">${r.title || 'Sin título'}</div>
        <div class="extra">Estreno: ${fecha}</div>
        <p class="overview">${overview}</p>
        <div class="actions">
          <button class="add-from-api" data-my-id="${i}">añadir</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="container">
      <h2>Buscar películas en TMDb</h2>
      <div class="search-bar">
        <input type="text" id="search_query"
               placeholder="Escribe el título de una película y pulsa buscar..."
               value="${query || ''}">
        <button class="search">buscar</button>
        <button class="index">volver</button>
      </div>
      <div id="search_results" class="movies-grid">
        ${cards}
      </div>
    </div>
  `;
};

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
  const titulo    = (document.getElementById('new_titulo')?.value || '').trim();
  const director  = (document.getElementById('new_director')?.value || '').trim();
  const miniatura = (document.getElementById('new_miniatura')?.value || '').trim();

  if (!titulo || !director) {
    alert('Título y Director son obligatorios.');
    return;
  }

  const nueva = {
    titulo,
    director,
    miniatura: miniatura || 'files/placeholder.png'
  };

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
  mis_peliculas[i].miniatura =
    (document.getElementById('miniatura')?.value || '').trim() || 'files/placeholder.png';

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

/************  CONTROLADORES TMDb  ************/

// Muestra solo la vista de búsqueda (sin resultados)
const searchViewContr = () => {
  tmdb_last_results = [];
  tmdb_last_query = "";
  document.getElementById('main').innerHTML = searchView();
  document.getElementById('search_query')?.focus();
};

// Ejecuta la búsqueda en TMDb usando el término del usuario
const searchContr = async (query) => {
  const q = (query || '').trim();
  if (!q) {
    alert('Escribe un título para buscar.');
    return;
  }

  tmdb_last_query = q;

  try {
    const url = 'https://api.themoviedb.org/3/search/movie'
      + '?include_adult=false&language=es-ES&page=1&query='
      + encodeURIComponent(q);

    const res = await fetch(url, TMDB_OPTIONS);
    if (!res.ok) {
      throw new Error('Error HTTP ' + res.status);
    }

    const data = await res.json();
    tmdb_last_results = Array.isArray(data.results) ? data.results : [];

    document.getElementById('main').innerHTML =
      resultsView(tmdb_last_results, tmdb_last_query);

    document.getElementById('search_query')?.focus();
  } catch (err) {
    console.error(err);
    document.getElementById('main').innerHTML = `
      <div class="container">
        <h2>Buscar películas en TMDb</h2>
        <div class="search-bar">
          <input type="text" id="search_query"
                 value="${tmdb_last_query}"
                 placeholder="Escribe el título de una película y pulsa buscar...">
          <button class="search">buscar</button>
          <button class="index">volver</button>
        </div>
        <div class="error">
          Ha ocurrido un error al conectar con TMDb.
          Comprueba tu conexión o tu clave de API.
        </div>
      </div>
    `;
  }
};

// Añade película seleccionada desde los resultados TMDb al modelo local
const addFromAPIContr = async (i, btn) => {
  const peliAPI = tmdb_last_results[i];
  if (!peliAPI) return;

  const titulo = (peliAPI.title || peliAPI.original_title || '').trim();
  if (!titulo) {
    alert('No se puede añadir una película sin título.');
    if (btn) { btn.disabled = false; btn.textContent = 'añadir'; }
    return;
  }

  const actual = (await getAPI()) || [];
  const existe = actual.some(
    p => (p.titulo || '').toLowerCase() === titulo.toLowerCase()
  );

  if (existe) {
    alert('Esa película ya está en tu lista.');
    if (btn) { btn.disabled = false; btn.textContent = 'añadir'; }
    return;
  }

  const miniatura = peliAPI.poster_path
    ? `${TMDB_IMG_BASE}${peliAPI.poster_path}`
    : 'files/placeholder.png';

  const nueva = {
    titulo,
    director: 'Desconocido (TMDb)',
    miniatura
  };

  actual.push(nueva);
  await updateAPI(actual);

  if (btn) {
    btn.textContent = 'añadido';
  }

  alert(`"${titulo}" se ha añadido a tus películas.`);
};

/************  ROUTER (delegación de eventos)  ************/
const matchEvent = (ev, sel) => ev.target.matches(sel);
const myId = (ev) => Number(ev.target.dataset.myId);

document.addEventListener('click', ev => {
  if      (matchEvent(ev, '.index'))        indexContr();
  else if (matchEvent(ev, '.show'))         showContr(myId(ev));
  else if (matchEvent(ev, '.new'))          newContr();
  else if (matchEvent(ev, '.create'))       createContr();
  else if (matchEvent(ev, '.edit'))         editContr(myId(ev));
  else if (matchEvent(ev, '.update'))       updateContr(myId(ev));
  else if (matchEvent(ev, '.delete'))       deleteContr(myId(ev));
  else if (matchEvent(ev, '.reset'))        resetContr();

  // 2ª parte: vistas y acciones de búsqueda TMDb
  else if (matchEvent(ev, '.search-view'))  searchViewContr();
  else if (matchEvent(ev, '.search')) {
    const query = document.getElementById('search_query')?.value || '';
    searchContr(query);
  }
  else if (matchEvent(ev, '.add-from-api')) {
    const btn = ev.target;
    btn.disabled = true;
    btn.textContent = 'añadiendo...';
    addFromAPIContr(myId(ev), btn);
  }
});

// Buscar al pulsar Enter en el input de búsqueda
document.addEventListener('keyup', ev => {
  if (ev.key === 'Enter' && ev.target.id === 'search_query') {
    const query = ev.target.value || '';
    searchContr(query);
  }
});

/************  Inicialización  ************/
document.addEventListener('DOMContentLoaded', initContr);


