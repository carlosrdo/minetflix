/************  MODELO (datos + persistencia)  ************/
const STORAGE_KEY = 'mis_peliculas';
const KEYWORDS_STORAGE_KEY = 'mis_keywords';

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

// CRUD almacenamiento películas
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

// CRUD almacenamiento lista de palabras clave personal
function getStoredKeywords() {
  try {
    const raw = localStorage.getItem(KEYWORDS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function setStoredKeywords(arr) {
  localStorage.setItem(KEYWORDS_STORAGE_KEY, JSON.stringify(arr));
}

/************  CONFIG TMDb (2ª y 3ª PARTE)  ************/
const TMDB_BEARER_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmNDNlOGI3ODc2YTQ1N2NkZDU5YTgwNjZhNmNmNDlmMiIsIm5iZiI6MTc2Mjg3OTM3MS42MDksInN1YiI6IjY5MTM2NzhiZThkMjQxZTdiNWMwNjg2ZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.owzzjV_W9StabJ9qi-Ow4Smx1EEYS3wHd8meAN876w';
const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';

const TMDB_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${TMDB_BEARER_TOKEN}`
  }
};

// Guardamos últimos resultados de búsqueda TMDb
let tmdb_last_results = [];
let tmdb_last_query = "";

/************  UTILIDADES TEXTO / REGEX (3ª PARTE)  ************/
const cleanKeyword = (keyword) => {
  return (keyword || '')
    .replace(/[^a-zñáéíóú0-9 ]+/igm, "") // quitar caracteres especiales
    .trim()
    .toLowerCase();
};

/************  PEQUEÑAS UTILIDADES  ************/
const isMovieInLocalList = (tmdbMovie, localMovies) => {
  if (!tmdbMovie || !Array.isArray(localMovies)) return false;
  const tTitle = (tmdbMovie.title || tmdbMovie.original_title || '').trim().toLowerCase();

  return localMovies.some(p => {
    const localTitle = (p.titulo || '').trim().toLowerCase();
    if (p.tmdbId && tmdbMovie.id && p.tmdbId === tmdbMovie.id) return true;
    return localTitle && localTitle === tTitle;
  });
};

const keywordsChipsBlock = () => {
  const kws = getStoredKeywords();
  if (!kws || !kws.length) return '';

  const chips = kws.map(kw => `
    <button class="keyword-link keyword-chip"
            data-keyword="${encodeURIComponent(kw)}">
      ${kw}
    </button>
  `).join('');

  return `
    <div class="keywords-chips-bar">
      <span class="keywords-chips-title">Mis keywords:</span>
      ${chips}
    </div>
  `;
};

/************  VISTAS  ************/
const indexView = (peliculas, localQuery = '') => {
  let cards = peliculas.map((p, i) => {
    const keywordBtn = p.tmdbId
      ? `<button class="keywords"
                 data-movie-id="${p.tmdbId}"
                 data-movie-title="${encodeURIComponent(p.titulo || '')}">
             keywords
         </button>`
      : '';

    return `
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
          ${keywordBtn}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="container">

      <div class="top-bar">
        <div class="top-actions">
          <button class="new">añadir</button>
          <button class="search-view">buscar en TMDb</button>
          <button class="my-keywords">mis palabras clave</button>
          <button class="reset">reset</button>
        </div>
        <div class="top-search">
          <input type="text" id="search_local"
                 placeholder="Filtrar por título o director..."
                 value="${localQuery}">
          <span class="movies-count">
            ${peliculas.length} película${peliculas.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <div class="hr"></div>

      <div class="movies-grid">
        ${cards}
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

// Vista detalle con tamaño contenido
const showView = (pelicula) => `
  <div class="container">
    <h2>${pelicula.titulo || "Sin título"}</h2>
    <div class="movie movie-detail">
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
const searchView = () => {
  const chips = keywordsChipsBlock();
  return `
    <div class="container">
      <h2>Buscar películas en TMDb</h2>

      <div class="search-bar">
        <input type="text" id="search_query"
               placeholder="Escribe el título o la keyword y pulsa buscar...">
        <div class="search-mode">
          <label>
            <input type="radio" name="search_mode" value="title" checked>
            Título
          </label>
          <label>
            <input type="radio" name="search_mode" value="keyword">
            Keyword
          </label>
        </div>
        <button class="search">buscar</button>
        <button class="index">volver</button>
      </div>

      ${chips}

      <div id="search_results" class="search-results-empty">
        Escribe un título o una palabra clave y pulsa "buscar".
      </div>
    </div>
  `;
};

/************  VISTA RESULTADOS TMDb  ************/
const resultsView = (resultados, query, localMovies = []) => {
  const chips = keywordsChipsBlock();

  if (!resultados || resultados.length === 0) {
    return `
      <div class="container">
        <h2>Buscar películas en TMDb</h2>

        <div class="search-bar">
          <input type="text" id="search_query"
                 placeholder="Escribe el título o la keyword y pulsa buscar..."
                 value="${query || ''}">
          <div class="search-mode">
            <label>
              <input type="radio" name="search_mode" value="title" checked>
              Título
            </label>
            <label>
              <input type="radio" name="search_mode" value="keyword">
              Keyword
            </label>
          </div>
          <button class="search">buscar</button>
          <button class="index">volver</button>
        </div>

        ${chips}

        <div id="search_results" class="search-results-empty">
          No se han encontrado resultados para "<strong>${query || ''}</strong>".
        </div>
      </div>
    `;
  }

  const isKeywordMode = query && query.starts_with && query.startsWith('keyword: ');

  const cards = resultados.map((r, i) => {
    const poster = r.poster_path
      ? `${TMDB_IMG_BASE}${r.poster_path}`
      : 'files/placeholder.png';
    const fecha = r.release_date || 'Fecha desconocida';
    const overview = r.overview
      ? (r.overview.length > 220 ? r.overview.slice(0, 220) + '…' : r.overview)
      : 'Sin sinopsis disponible.';

    const safeTitle = encodeURIComponent(r.title || '');
    const yaEnLista = isMovieInLocalList(r, localMovies);

    const addBtn = yaEnLista
      ? `<button class="add-from-api" data-my-id="${i}" disabled>en tu lista</button>`
      : `<button class="add-from-api" data-my-id="${i}">añadir</button>`;

    return `
      <div class="movie">
        <div class="movie-img">
          <img src="${poster}" onerror="this.src='files/placeholder.png'">
        </div>
        <div class="title">${r.title || 'Sin título'}</div>
        <div class="extra">Estreno: ${fecha}</div>
        <p class="overview">${overview}</p>
        <div class="actions">
          ${addBtn}
          <button class="keywords"
                  data-movie-id="${r.id}"
                  data-movie-title="${safeTitle}">
            keywords
          </button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="container">
      <h2>Buscar películas en TMDb</h2>

      <div class="search-bar">
        <input type="text" id="search_query"
               placeholder="Escribe el título o la keyword y pulsa buscar..."
               value="${query || ''}">
        <div class="search-mode">
          <label>
            <input type="radio" name="search_mode" value="title" ${!isKeywordMode ? 'checked' : ''}>
            Título
          </label>
          <label>
            <input type="radio" name="search_mode" value="keyword" ${isKeywordMode ? 'checked' : ''}>
            Keyword
          </label>
        </div>
        <button class="search">buscar</button>
        <button class="index">volver</button>
      </div>

      ${chips}

      <div id="search_results" class="movies-grid">
        ${cards}
      </div>
    </div>
  `;
};

/************  VISTA PALABRAS CLAVE (3ª PARTE)  ************/
const keywordsView = (movieId, movieTitle, keywordList) => {
  const title = movieTitle || `ID ${movieId}`;

  let content;
  if (!keywordList || keywordList.length === 0) {
    content = `<div class="keywords-empty">
                 No se han encontrado palabras clave para esta película.
               </div>`;
  } else {
    const items = keywordList.map(kw => `
      <li>
        <span class="keyword-link"
              data-keyword="${encodeURIComponent(kw)}">
          ${kw}
        </span>
        <button class="add-keyword"
                data-keyword="${encodeURIComponent(kw)}">
          agregar a mi lista
        </button>
      </li>
    `).join('');

    content = `
      <div class="keywords-list">
        <ul>
          ${items}
        </ul>
      </div>
    `;
  }

  return `
    <div class="container">
      <h2>Palabras clave de: ${title}</h2>
      <div class="keywords-hint">
        Pulsa sobre una palabra clave para buscar películas relacionadas,
        o usa el botón "agregar a mi lista" para guardarla.
      </div>
      ${content}
      <div class="actions">
        <button class="my-keywords">mis palabras clave</button>
        <button class="index">volver al inicio</button>
      </div>
    </div>
  `;
};

/************  VISTA LISTA PERSONAL DE PALABRAS CLAVE  ************/
const myKeywordsView = (keywords) => {
  let content;

  if (!keywords || keywords.length === 0) {
    content = `
      <div class="keywords-empty">
        Aún no has añadido ninguna palabra clave.<br>
        Ve a las <strong>keywords</strong> de una película y pulsa
        "agregar a mi lista".
      </div>
    `;
  } else {
    const items = keywords.map(kw => `
      <li>
        <span class="keyword-link"
              data-keyword="${encodeURIComponent(kw)}">
          ${kw}
        </span>
        <button class="delete-keyword"
                data-keyword="${encodeURIComponent(kw)}">
          eliminar
        </button>
      </li>
    `).join('');

    content = `
      <div class="keywords-list">
        <ul>
          ${items}
        </ul>
      </div>
    `;
  }

  return `
    <div class="container">
      <h2>Mis palabras clave</h2>
      ${content}
      <div class="actions">
        <button class="index">volver al inicio</button>
      </div>
    </div>
  `;
};

/************  CONTROLADORES BÁSICOS  ************/
const renderIndex = (peliculas, localQuery = '') => {
  document.getElementById('main').innerHTML = indexView(peliculas, localQuery);
  // Reenfocar el buscador local y poner el cursor al final
  const input = document.getElementById('search_local');
  if (input) {
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
  }
};

const initContr = async () => {
  if (!getMovies()) await postAPI(mis_peliculas_iniciales); // siembra inicial
  indexContr();
};

const indexContr = async () => {
  mis_peliculas = (await getAPI()) || [];
  renderIndex(mis_peliculas, '');
};

const searchLocalContr = (query) => {
  const q = (query || '').trim().toLowerCase();
  if (!q) {
    renderIndex(mis_peliculas, '');
    return;
  }

  const filtradas = mis_peliculas.filter(p => {
    const t = (p.titulo || '').toLowerCase();
    const d = (p.director || '').toLowerCase();
    return t.includes(q) || d.includes(q);
  });

  renderIndex(filtradas, query);
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

/************  CONTROLADORES TMDb (búsqueda + añadir título)  ************/

// Muestra solo la vista de búsqueda (sin resultados)
const searchViewContr = () => {
  tmdb_last_results = [];
  tmdb_last_query = "";
  document.getElementById('main').innerHTML = searchView();
  document.getElementById('search_query')?.focus();
};

// Ejecuta la búsqueda en TMDb usando el término del usuario (por título)
const searchByTitleContr = async (query) => {
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

    const localMovies = getMovies() || [];
    document.getElementById('main').innerHTML =
      resultsView(tmdb_last_results, tmdb_last_query, localMovies);

    document.getElementById('search_query')?.focus();
  } catch (err) {
    console.error(err);
    document.getElementById('main').innerHTML = `
      <div class="container">
        <h2>Buscar películas en TMDb</h2>
        <div class="search-bar">
          <input type="text" id="search_query"
                 value="${tmdb_last_query}"
                 placeholder="Escribe el título o la keyword y pulsa buscar...">
          <div class="search-mode">
            <label>
              <input type="radio" name="search_mode" value="title" checked>
              Título
            </label>
            <label>
              <input type="radio" name="search_mode" value="keyword">
              Keyword
            </label>
          </div>
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
    if (btn) {
      btn.textContent = 'en tu lista';
      btn.disabled = true;
    }
    return;
  }

  const miniatura = peliAPI.poster_path
    ? `${TMDB_IMG_BASE}${peliAPI.poster_path}`
    : 'files/placeholder.png';

  const nueva = {
    titulo,
    director: 'Desconocido (TMDb)',
    miniatura,
    tmdbId: peliAPI.id
  };

  actual.push(nueva);
  await updateAPI(actual);

  if (btn) {
    btn.textContent = 'en tu lista';
    btn.disabled = true;
  }

  alert(`"${titulo}" se ha añadido a tus películas.`);
  mis_peliculas = actual;
};

/************  CONTROLADORES PALABRAS CLAVE (3ª PARTE)  ************/

// Procesa array {id, name} y devuelve lista de strings limpias
const processKeywords = (keywords) => {
  const result = [];
  const seen = new Set();

  if (!Array.isArray(keywords)) return result;

  for (const k of keywords) {
    const name = k && k.name ? k.name : '';
    const cleaned = cleanKeyword(name);
    if (!cleaned) continue;
    if (seen.has(cleaned)) continue;
    seen.add(cleaned);
    result.push(cleaned);
  }

  result.sort((a, b) => a.localeCompare(b));
  return result;
};

// Controlador que obtiene keywords de una película
const keywordsContr = async (movieId, encodedTitle) => {
  if (!movieId) {
    alert('No se ha encontrado el ID de la película.');
    return;
  }

  const movieTitle = encodedTitle
    ? decodeURIComponent(encodedTitle)
    : '';

  try {
    const url = `https://api.themoviedb.org/3/movie/${movieId}/keywords`;
    const res = await fetch(url, TMDB_OPTIONS);
    if (!res.ok) {
      throw new Error('Error HTTP ' + res.status);
    }

    const data = await res.json();
    const lista = processKeywords(data.keywords || []);

    document.getElementById('main').innerHTML =
      keywordsView(movieId, movieTitle, lista);
  } catch (err) {
    console.error(err);
    document.getElementById('main').innerHTML = `
      <div class="container">
        <h2>Palabras clave</h2>
        <div class="error">
          No se han podido obtener las palabras clave de la película.
          Inténtalo de nuevo más tarde.
        </div>
        <div class="actions">
          <button class="index">volver al inicio</button>
        </div>
      </div>
    `;
  }
};

// Añade una palabra clave a la lista personalizada
const addKeywordToList = (keyword) => {
  const cleaned = cleanKeyword(keyword);
  if (!cleaned) {
    alert('Palabra clave no válida.');
    return;
  }

  const list = getStoredKeywords();
  if (list.includes(cleaned)) {
    alert('Esa palabra clave ya está en tu lista.');
    return;
  }

  list.push(cleaned);
  list.sort((a, b) => a.localeCompare(b));
  setStoredKeywords(list);
  alert(`"${cleaned}" se ha añadido a tu lista de palabras clave.`);
};

// Muestra vista con lista personalizada
const myKeywordsContr = () => {
  const list = getStoredKeywords();
  document.getElementById('main').innerHTML = myKeywordsView(list);
};

// Elimina palabra clave de la lista personalizada
const deleteKeywordContr = (keyword) => {
  const cleaned = cleanKeyword(keyword);
  if (!cleaned) return;

  let list = getStoredKeywords();
  list = list.filter(k => k !== cleaned);
  setStoredKeywords(list);
  document.getElementById('main').innerHTML = myKeywordsView(list);
};

/************  Buscar películas por keyword  ************/
const searchByKeywordContr = async (keyword) => {
  const kw = cleanKeyword(keyword);
  if (!kw) {
    alert('Palabra clave no válida.');
    return;
  }

  tmdb_last_query = `keyword: ${kw}`;

  try {
    // 1) Buscar ID de la keyword
    const urlKw = 'https://api.themoviedb.org/3/search/keyword?query='
      + encodeURIComponent(kw)
      + '&page=1';
    const resKw = await fetch(urlKw, TMDB_OPTIONS);
    if (!resKw.ok) throw new Error('Error HTTP ' + resKw.status);
    const dataKw = await resKw.json();

    if (!dataKw.results || dataKw.results.length === 0) {
      document.getElementById('main').innerHTML = `
        <div class="container">
          <h2>Resultados por palabra clave</h2>
          <div class="keywords-empty">
            No se han encontrado keywords en TMDb para "${kw}".
          </div>
          <div class="actions">
            <button class="index">volver al inicio</button>
          </div>
        </div>
      `;
      return;
    }

    const keywordId = dataKw.results[0].id;

    // 2) Buscar películas con esa keyword
    const urlMovies = 'https://api.themoviedb.org/3/discover/movie'
      + '?include_adult=false&language=es-ES&page=1&with_keywords='
      + keywordId;

    const resMovies = await fetch(urlMovies, TMDB_OPTIONS);
    if (!resMovies.ok) throw new Error('Error HTTP ' + resMovies.status);
    const dataMovies = await resMovies.json();

    tmdb_last_results = Array.isArray(dataMovies.results) ? dataMovies.results : [];

    const localMovies = getMovies() || [];
    document.getElementById('main').innerHTML =
      resultsView(tmdb_last_results, `keyword: ${kw}`, localMovies);
  } catch (err) {
    console.error(err);
    document.getElementById('main').innerHTML = `
      <div class="container">
        <h2>Resultados por palabra clave</h2>
        <div class="error">
          No se han podido obtener películas para la keyword "${keyword}".
        </div>
        <div class="actions">
          <button class="index">volver al inicio</button>
        </div>
      </div>
    `;
  }
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

  // Búsqueda TMDb por título / keyword
  else if (matchEvent(ev, '.search-view'))  searchViewContr();
  else if (matchEvent(ev, '.search')) {
    const query = document.getElementById('search_query')?.value || '';
    const modeEl = document.querySelector('input[name="search_mode"]:checked');
    const mode = modeEl ? modeEl.value : 'title';

    if (mode === 'keyword') {
      searchByKeywordContr(query);
    } else {
      searchByTitleContr(query);
    }
  }
  else if (matchEvent(ev, '.add-from-api')) {
    const btn = ev.target;
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = 'añadiendo...';
    addFromAPIContr(myId(ev), btn);
  }

  // Palabras clave TMDb
  else if (matchEvent(ev, '.keywords')) {
    const movieId = Number(ev.target.dataset.movieId);
    const encodedTitle = ev.target.dataset.movieTitle || '';
    keywordsContr(movieId, encodedTitle);
  }
  else if (matchEvent(ev, '.add-keyword')) {
    const kw = decodeURIComponent(ev.target.dataset.keyword || '');
    addKeywordToList(kw);
  }
  else if (matchEvent(ev, '.my-keywords')) {
    myKeywordsContr();
  }
  else if (matchEvent(ev, '.delete-keyword')) {
    const kw = decodeURIComponent(ev.target.dataset.keyword || '');
    deleteKeywordContr(kw);
  }
  // Clic en cualquier texto/chip de keyword (vista de peli, lista personal o chips)
  else if (matchEvent(ev, '.keyword-link')) {
    const kw = decodeURIComponent(ev.target.dataset.keyword || '');
    searchByKeywordContr(kw);
  }
});

// Buscar al pulsar Enter en el input de búsqueda TMDb
document.addEventListener('keyup', ev => {
  if (ev.key === 'Enter' && ev.target.id === 'search_query') {
    const query = ev.target.value || '';
    const modeEl = document.querySelector('input[name="search_mode"]:checked');
    const mode = modeEl ? modeEl.value : 'title';
    if (mode === 'keyword') {
      searchByKeywordContr(query);
    } else {
      searchByTitleContr(query);
    }
  }

  // Filtro local de películas en la pantalla principal
  if (ev.target.id === 'search_local') {
    searchLocalContr(ev.target.value);
  }
});

/************  Inicialización  ************/
document.addEventListener('DOMContentLoaded', initContr);








