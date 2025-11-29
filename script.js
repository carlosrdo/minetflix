/************  MODELO (datos + persistencia)  ************/
const STORAGE_KEY = 'mis_peliculas';
const KEYWORDS_STORAGE_KEY = 'mis_keywords';

// ya no sembramos nada por defecto
const mis_peliculas_iniciales = [];

let mis_peliculas = [];

// Helpers localStorage
const postAPI   = async (_peliculas) => { setMovies(_peliculas); return 'localStorage'; };
const getAPI    = async () => getMovies();
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

/************  CONFIG TMDb  ************/
const TMDB_BEARER_TOKEN =
  'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJmNDNlOGI3ODc2YTQ1N2NkZDU5YTgwNjZhNmNmNDlmMiIsIm5iZiI6MTc2Mjg3OTM3MS42MDksInN1YiI6IjY5MTM2NzhiZThkMjQxZTdiNWMwNjg2ZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.owzzjV_WW9StabJ9qi-Ow4Smx1EEYS3wHd8meAN876w';

const TMDB_IMG_BASE = 'https://image.tmdb.org/t/p/w500';

const TMDB_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    Authorization: `Bearer ${TMDB_BEARER_TOKEN}`
  }
};

// Últimos resultados de búsqueda TMDb
let tmdb_last_results = [];
let tmdb_last_query = "";
let tmdb_last_page = 1;
let tmdb_last_total_pages = 1;
let tmdb_last_search_type = 'title';   // 'title' | 'keyword' | 'actor'
let tmdb_last_keyword_id = null;       // para la paginación por keyword
let tmdb_last_actor_id = null;         // para la paginación por actor
let tmdb_last_actor_name = '';



/************  UTILIDADES TEXTO / REGEX  ************/
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
    <button class="keyword-link keyword-chip btn btn-ghost"
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

/************  FUNCIONES DE MÉTRICAS  ************/
function computeMetrics(peliculas) {
  const total = peliculas.length;
  let totalRuntime = 0;
  let countRuntime = 0;
  let sumRating = 0;
  let countRating = 0;
  let favs = 0;

  for (const p of peliculas) {
    if (p.runtime && Number.isFinite(p.runtime)) {
      totalRuntime += p.runtime;
      countRuntime++;
    }
    if (p.rating && Number.isFinite(p.rating)) {
      sumRating += p.rating;
      countRating++;
    }
    if (p.favorite) favs++;
  }

  const hours = Math.floor(totalRuntime / 60);
  const minutes = totalRuntime % 60;
  const timeText = totalRuntime > 0 ? `${hours}h ${minutes}m` : '—';

  const avgRating = countRating > 0 ? (sumRating / countRating) : null;

  return {
    total,
    timeText,
    avgRating: avgRating ? avgRating.toFixed(1) : '—',
    favorites: favs
  };
}

/************  VISTAS  ************/
const indexView = (peliculas, localQuery = '') => {
  const metrics = computeMetrics(peliculas);

  // tarjetas de películas como slides Swiper
  const slides = peliculas.map((p) => {
    const idx = mis_peliculas.indexOf(p);
    if (idx === -1) return '';

    const ratingText = p.rating ? p.rating.toFixed(1) : '—';
    const runtimeText = p.runtime ? `${p.runtime}m` : 'Duración desconocida';

    const isFav = !!p.favorite;
    const favClass = isFav ? 'fav-active' : '';

    const keywordBtn = p.tmdbId
      ? `<button class="btn btn-ghost"
                 style="width:100%;margin-top:6px"
                 data-movie-id="${p.tmdbId}"
                 data-movie-title="${encodeURIComponent(p.titulo || '')}"
                 >
             Keywords
         </button>`
      : '';

    return `
      <div class="swiper-slide">
        <div class="movie">
          <div class="movie-img">
            <div class="movie-rating-badge">
              <span>⭐</span><span>${ratingText}</span>
            </div>
            <div class="movie-img-inner">
              <img src="${p.miniatura || 'files/placeholder.png'}"
                   onerror="this.src='files/placeholder.png'">
            </div>
            <div class="movie-hover-actions">
              <button class="icon-circle favorite-toggle ${favClass}"
                      data-my-id="${idx}"
                      title="Marcar como favorita">
                ♥
              </button>
              <button class="icon-circle show"
                      data-my-id="${idx}"
                      title="Ver detalle">
                👁
              </button>
              <button class="icon-circle edit"
                      data-my-id="${idx}"
                      title="Editar">
                ✎
              </button>
              <button class="icon-circle danger delete"
                      data-my-id="${idx}"
                      title="Borrar">
                🗑
              </button>
            </div>
          </div>
          <div class="movie-info">
            <div class="title">${p.titulo || "<em>Sin título</em>"}</div>
            <div class="director">${p.director || "Director desconocido"}</div>
            <div class="meta-row">${runtimeText}</div>
            ${keywordBtn}
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="container">
      <!-- Métricas -->
      <div class="dashboard-row">
        <div class="metric-card">
          <div class="metric-card__label">Total Películas</div>
          <div class="metric-card__value">${metrics.total}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card__label">Tiempo total</div>
          <div class="metric-card__value">${metrics.timeText}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card__label">Valoración media</div>
          <div class="metric-card__value">${metrics.avgRating}</div>
        </div>
        <div class="metric-card">
          <div class="metric-card__label">Favoritos</div>
          <div class="metric-card__value">${metrics.favorites}</div>
        </div>
      </div>

      <!-- Acciones y filtro -->
      <div class="top-actions-row">
        <div class="top-actions-left">
          <button class="btn btn-primary new">Añadir</button>
          <button class="btn btn-ghost search-view">Buscar en TMDb</button>
          <button class="btn btn-ghost my-keywords">Mis palabras clave</button>
          <button class="btn btn-ghost reset">Reset</button>
        </div>
        <div class="top-actions-right">
          <div class="search-local-wrapper">
            <input type="text" id="search_local"
                   placeholder="Filtrar por título o director..."
                   value="${localQuery}">
          </div>
          <span class="movies-count">
            ${peliculas.length} película${peliculas.length === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      <h2 class="section-title">Películas</h2>

      <!-- Carrusel Swiper -->
      <div class="movies-carousel swiper">
        <div class="swiper-wrapper">
          ${slides || '<div class="swiper-slide"><div class="search-results-empty">Aún no tienes películas. Usa "Añadir" o "Buscar en TMDb".</div></div>'}
        </div>
        <div class="swiper-button-prev"></div>
        <div class="swiper-button-next"></div>
        <div class="swiper-pagination"></div>
      </div>
    </div>
  `;
};

// Vista de edición
const editView = (i, pelicula) => `
  <div class="container">
    <h2>Editar Película</h2>
    <div class="detail-layout">
      <div class="detail-poster">
        <img src="${pelicula.miniatura || 'files/placeholder.png'}"
             onerror="this.src='files/placeholder.png'">
      </div>
      <div class="detail-info">
        <div class="detail-label">Título</div>
        <input type="text" id="titulo" value="${pelicula.titulo || ''}" style="width:100%;">

        <div class="detail-label">Director</div>
        <input type="text" id="director" value="${pelicula.director || ''}" style="width:100%;">

        <div class="detail-label">Miniatura</div>
        <input type="text" id="miniatura" value="${pelicula.miniatura || ''}" style="width:100%;">

        <div class="detail-label">Duración (min)</div>
        <input type="number" id="runtime" value="${pelicula.runtime || ''}" style="width:100%;">

        <div class="detail-label">Fecha de estreno</div>
        <input type="text" id="releaseDate" value="${pelicula.releaseDate || ''}" style="width:100%;">

        <div class="detail-label">Sinopsis</div>
        <textarea id="overview" style="width:100%;min-height:100px;border-radius:12px;border:1px solid rgba(148,163,184,0.55);background:rgba(15,23,42,0.9);color:#e5e7eb;padding:10px;">${pelicula.overview || ''}</textarea>

        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary update" data-my-id="${i}">Actualizar</button>
          <button class="btn btn-ghost index">Volver</button>
        </div>
      </div>
    </div>
  </div>
`;

// Vista detalle con sinopsis, fecha y tráiler
const showView = (pelicula) => {
  const runtimeText = pelicula.runtime ? `${pelicula.runtime} min` : 'Sin datos';
  const releaseText = pelicula.releaseDate || 'Sin datos';
  const ratingText = pelicula.rating ? pelicula.rating.toFixed(1) : '—';
  const favText = pelicula.favorite ? 'Sí' : 'No';
  const overviewText = pelicula.overview || 'No hay sinopsis disponible.';

  // 👥 Reparto principal (si viene en la película)
  const castList = Array.isArray(pelicula.cast) && pelicula.cast.length
    ? pelicula.cast
    : null;

  // 🔥 Miniatura del tráiler
  const trailerBlock = pelicula.trailerKey ? `
    <div class="detail-trailer">
      <div class="detail-label">Tráiler</div>

      <a class="trailer-thumb"
         href="https://www.youtube.com/watch?v=${pelicula.trailerKey}"
         target="_blank" rel="noopener">

        <div class="trailer-thumb__image"
             style="background-image:url('https://img.youtube.com/vi/${pelicula.trailerKey}/hqdefault.jpg')">

          <div class="trailer-thumb__overlay">
            <span class="trailer-thumb__icon">▶</span>
            <span class="trailer-thumb__text">Ver tráiler en YouTube</span>
          </div>

        </div>
      </a>
    </div>
  ` : '';

  // Bloque de reparto
  const castBlock = castList ? `
    <div class="detail-label">Reparto principal</div>
    <div class="detail-cast">
      ${castList.map(actor => `
        <button class="actor-link"
                data-actor-id="${actor.id}"
                data-actor-name="${encodeURIComponent(actor.name)}">
          ${actor.name}${actor.character ? ` (${actor.character})` : ''}
        </button>
      `).join('')}
    </div>
  ` : '';

  return `
    <div class="container">
      <h2>Detalles de la película</h2>
      <div class="detail-layout">

        <div class="detail-poster">
          <img src="${pelicula.miniatura || 'files/placeholder.png'}"
               onerror="this.src='files/placeholder.png'">
        </div>

        <div class="detail-info">
          <h2>${pelicula.titulo || "Sin título"}</h2>

          <div class="detail-label">Director</div>
          <div class="detail-value">${pelicula.director || "<em>Desconocido</em>"}</div>

          <div class="detail-label">Información</div>
          <div class="detail-chips-row">
            <div class="detail-chip">Favorita: ${favText}</div>
            <div class="detail-chip">Duración: ${runtimeText}</div>
            <div class="detail-chip">Estreno: ${releaseText}</div>
            <div class="detail-chip">Valoración: ${ratingText}</div>
          </div>

          <div class="detail-label">Sinopsis</div>
          <div class="detail-synopsis">${overviewText}</div>

          ${castBlock}
          ${trailerBlock}

          <div style="margin-top:16px;">
            <button class="btn btn-ghost index">Volver</button>
          </div>

        </div>
      </div>
    </div>
  `;
};


// Vista nueva película manual
const newView = () => `
  <div class="container">
    <h2>Crear Película</h2>
    <div class="detail-layout">
      <div class="detail-poster">
        <img src="files/placeholder.png" onerror="this.src='files/placeholder.png'">
      </div>
      <div class="detail-info">
        <div class="detail-label">Título</div>
        <input type="text" id="new_titulo" placeholder="Título" style="width:100%;">

        <div class="detail-label">Director</div>
        <input type="text" id="new_director" placeholder="Director" style="width:100%;">

        <div class="detail-label">Miniatura</div>
        <input type="text" id="new_miniatura" placeholder="URL de la miniatura (opcional)" style="width:100%;">

        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn btn-primary create">Crear</button>
          <button class="btn btn-ghost index">Volver</button>
        </div>
      </div>
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
        <button class="btn btn-primary search">Buscar</button>
        <button class="btn btn-ghost index">Volver</button>
      </div>

      ${chips}

      <div id="search_results" class="search-results-empty">
        Escribe un título o una palabra clave y pulsa "buscar".
      </div>
    </div>
  `;
};

/************  VISTA RESULTADOS TMDb  ************/
// Vista de resultados TMDb SIN carrusel, en grid normal
const resultsView = (resultados, query, localMovies = [], page = 1, totalPages = 1) => {
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
          <button class="btn btn-primary search">BUSCAR</button>
          <button class="btn btn-ghost index">VOLVER</button>
        </div>

        ${chips}

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
      ? (r.overview.length > 260 ? r.overview.slice(0, 260) + '…' : r.overview)
      : 'Sin sinopsis disponible.';

    const safeTitle = encodeURIComponent(r.title || '');
    const yaEnLista = isMovieInLocalList(r, localMovies);
    const rating10 = r.vote_average || 0;
    const rating5 = rating10 ? (rating10 / 2).toFixed(1) : '—';

    const addBtn = yaEnLista
      ? `<button class="btn btn-ghost add-from-api" data-my-id="${i}" disabled>EN TU LISTA</button>`
      : `<button class="btn btn-primary add-from-api" data-my-id="${i}">AÑADIR</button>`;

    return `
      <div class="movie">
        <div class="movie-img">
          <div class="movie-img-inner">
            <!-- 👇 IMPORTANTE: clase show-api + data-api-index -->
            <img class="show-api"
                 data-api-index="${i}"
                 src="${poster}"
                 onerror="this.src='files/placeholder.png'">
          </div>
        </div>
        <div class="movie-info">
          <div class="title">${r.title || 'Sin título'}</div>
          <div class="extra">Estreno: ${fecha}</div>
          <div class="extra">Valoración TMDb: ${rating5}</div>
          <p class="overview">${overview}</p>
          <div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;justify-content:center;">
            ${addBtn}
            <button class="btn btn-ghost keywords"
                    data-movie-id="${r.id}"
                    data-movie-title="${safeTitle}">
              KEYWORDS
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const pager = totalPages > 1 ? `
    <div class="tmdb-pager">
      <button class="btn btn-ghost tmdb-prev" ${page <= 1 ? 'disabled' : ''}>Anterior</button>
      <span class="tmdb-page-indicator">Página ${page} de ${totalPages}</span>
      <button class="btn btn-primary tmdb-next" ${page >= totalPages ? 'disabled' : ''}>Siguiente</button>
    </div>
  ` : '';

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
        <button class="btn btn-primary search">BUSCAR</button>
        <button class="btn btn-ghost index">VOLVER</button>
      </div>

      ${chips}
      ${pager}

      <div id="search_results" class="movies-grid">
        ${cards}
      </div>

      ${pager}
    </div>
  `;
};



/************  VISTAS PALABRAS CLAVE  ************/
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
        <button class="btn btn-ghost add-keyword"
                data-keyword="${encodeURIComponent(kw)}">
          Agregar a mi lista
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
        o usa el botón "Agregar a mi lista" para guardarla.
      </div>
      ${content}
      <div style="margin-top:12px;">
        <button class="btn btn-ghost my-keywords">Mis palabras clave</button>
        <button class="btn btn-primary index">Volver al inicio</button>
      </div>
    </div>
  `;
};

const myKeywordsView = (keywords) => {
  let content;

  if (!keywords || keywords.length === 0) {
    content = `
      <div class="keywords-empty">
        Aún no has añadido ninguna palabra clave.<br>
        Ve a las <strong>keywords</strong> de una película y pulsa
        "Agregar a mi lista".
      </div>
    `;
  } else {
    const items = keywords.map(kw => `
      <li>
        <span class="keyword-link"
              data-keyword="${encodeURIComponent(kw)}">
          ${kw}
        </span>
        <button class="btn btn-ghost delete-keyword"
                data-keyword="${encodeURIComponent(kw)}">
          Eliminar
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
      <div style="margin-top:12px;">
        <button class="btn btn-primary index">Volver al inicio</button>
      </div>
    </div>
  `;
};

/************  CONTROLADORES BÁSICOS  ************/
let currentLocalQuery = '';

const renderIndex = (peliculas, localQuery = '') => {
  currentLocalQuery = localQuery;
  document.getElementById('main').innerHTML = indexView(peliculas, localQuery);

  // inicializar Swiper para el carrusel
  new Swiper('.movies-carousel', {
    slidesPerView: 1.1,
    spaceBetween: 16,
    grabCursor: true,
    navigation: {
      nextEl: '.movies-carousel .swiper-button-next',
      prevEl: '.movies-carousel .swiper-button-prev',
    },
    pagination: {
      el: '.movies-carousel .swiper-pagination',
      clickable: true,
    },
    breakpoints: {
      640: { slidesPerView: 2.2 },
      900: { slidesPerView: 3.2 },
      1200:{ slidesPerView: 4.2 }
    }
  });

  const input = document.getElementById('search_local');
  if (input) {
    input.focus();
    const len = input.value.length;
    input.setSelectionRange(len, len);
  }
};

const initContr = async () => {
  if (!getMovies()) await postAPI(mis_peliculas_iniciales);
  indexContr();
};

const indexContr = async () => {
  mis_peliculas = (await getAPI()) || [];
  renderIndex(mis_peliculas, currentLocalQuery);
};

const searchLocalContr = (query) => {
  const q = (query || '').trim().toLowerCase();
  currentLocalQuery = query || '';
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

const showContr = async (i) => {
  const peli = mis_peliculas[i];
  if (!peli) return indexContr();

  // Si la peli viene de TMDb, completamos datos (director, sinopsis, reparto, tráiler…)
  if (peli.tmdbId) {
    const extra = await fetchMovieDetailsFromTMDb(peli.tmdbId);
    if (extra && Object.keys(extra).length) {
      peli.director    = extra.director    || peli.director;
      peli.runtime     = extra.runtime     ?? peli.runtime;
      peli.overview    = extra.overview    || peli.overview;
      peli.releaseDate = extra.releaseDate || peli.releaseDate;
      peli.rating      = extra.rating      ?? peli.rating;
      peli.trailerKey  = extra.trailerKey  || peli.trailerKey;
      peli.cast        = extra.cast        || peli.cast;

      await updateAPI(mis_peliculas);
    }
  }

  document.getElementById('main').innerHTML = showView(peli);
};

// Mostrar detalle de una película que viene de tmdb_last_results (sin necesidad de añadirla)
const showApiMovieContr = async (idx) => {
  const peliAPI = tmdb_last_results[idx];
  if (!peliAPI) return;

  // Objeto base con lo que ya viene en la búsqueda
  const peli = {
    titulo: peliAPI.title || peliAPI.original_title || 'Sin título',
    miniatura: peliAPI.poster_path
      ? `${TMDB_IMG_BASE}${peliAPI.poster_path}`
      : 'files/placeholder.png',
    favorite: false,
    director: null,
    runtime: null,
    overview: peliAPI.overview || '',
    releaseDate: peliAPI.release_date || '',
    rating: peliAPI.vote_average ? Number((peliAPI.vote_average / 2).toFixed(1)) : null,
    tmdbId: peliAPI.id || null,
    cast: []
  };

  // Rellenamos con datos extra (director, reparto, tráiler…)
  if (peliAPI.id) {
    const extra = await fetchMovieDetailsFromTMDb(peliAPI.id);
    Object.assign(peli, extra);   // director, runtime, overview, releaseDate, rating, trailerKey, cast...
  }

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
    miniatura: miniatura || 'files/placeholder.png',
    tmdbId: null,
    runtime: null,
    overview: '',
    releaseDate: '',
    rating: null,
    trailerKey: null,
    favorite: false
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

  const runtimeVal = Number(document.getElementById('runtime')?.value || '');
  mis_peliculas[i].runtime = Number.isFinite(runtimeVal) && runtimeVal > 0 ? runtimeVal : null;

  mis_peliculas[i].releaseDate = (document.getElementById('releaseDate')?.value || '').trim();
  mis_peliculas[i].overview    = (document.getElementById('overview')?.value || '').trim();

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
  const ok = confirm('Esto borrará todas tus películas. ¿Continuar?');
  if (!ok) return;
  localStorage.removeItem(STORAGE_KEY);
  mis_peliculas = [];
  indexContr();
};

const toggleFavoriteContr = async (i) => {
  if (!mis_peliculas[i]) return;
  mis_peliculas[i].favorite = !mis_peliculas[i].favorite;
  await updateAPI(mis_peliculas);
  indexContr();
};


/************  CONTROLADORES TMDb  ************/

const searchViewContr = () => {
  tmdb_last_results = [];
  tmdb_last_query = "";
  document.getElementById('main').innerHTML = searchView();
  document.getElementById('search_query')?.focus();
};


// Búsqueda por título con soporte de página
const searchByTitleContr = async (query, page = 1) => {
  // Si viene query vacía desde paginación, reutilizamos la última
  const rawQuery = (typeof query === 'string' && query.trim())
    ? query
    : (tmdb_last_query || '');

  const q = rawQuery.trim();

  if (!q) {
    alert('Escribe un título para buscar.');
    return;
  }

  // Guardamos estado de la última búsqueda
  tmdb_last_query = q;
  tmdb_last_mode  = 'title';
  tmdb_last_page  = page;

  try {
    const url = 'https://api.themoviedb.org/3/search/movie'
      + '?include_adult=false'
      + '&language=es-ES'
      + '&page=' + String(page)
      + '&query=' + encodeURIComponent(q);

    const res = await fetch(url, TMDB_OPTIONS);

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('TMDb error search/movie:', res.status, text);
      alert(
        'TMDb ha devuelto un error (' +
        res.status +
        '). Revisa tu clave o vuelve a intentarlo en un rato.'
      );
      return;
    }

    const data = await res.json();

    tmdb_last_results  = Array.isArray(data.results) ? data.results : [];
    tmdb_total_pages   = Number.isFinite(data.total_pages)
      ? data.total_pages
      : 1;

    const localMovies = getMovies() || [];

    // 🔥 Pasamos página y totalPages a la vista para mostrar los botones
    document.getElementById('main').innerHTML =
      resultsView(
        tmdb_last_results,
        tmdb_last_query,
        localMovies,
        {
          page: tmdb_last_page,
          totalPages: tmdb_total_pages
        }
      );

    document.getElementById('search_query')?.focus();
  } catch (err) {
    console.error('Error de red al conectar con TMDb:', err);
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
          <button class="btn btn-primary search">Buscar</button>
          <button class="btn btn-ghost index">Volver</button>
        </div>
        <div class="error">
          Ha ocurrido un error de conexión con TMDb (red/CORS).
        </div>
      </div>
    `;
  }
};


/* Obtener detalle completo de una película en TMDb:
   director, runtime, overview, release_date, rating, trailer (YouTube)
*/
const fetchMovieDetailsFromTMDb = async (movieId) => {
  if (!movieId) return {};
  try {
    const url = `https://api.themoviedb.org/3/movie/${movieId}?language=es-ES&append_to_response=credits,videos`;
    const res = await fetch(url, TMDB_OPTIONS);
    if (!res.ok) {
      console.warn('Error al obtener detalles de TMDb, status:', res.status);
      return {};
    }
    const data = await res.json();

    let director = null;
    if (data.credits && Array.isArray(data.credits.crew)) {
      const dir = data.credits.crew.find(p => p.job === 'Director');
      director = dir ? dir.name : null;
    }

    // 👥 Reparto principal (máx. 5 actores)
    let cast = [];
    if (data.credits && Array.isArray(data.credits.cast)) {
      cast = data.credits.cast
        .filter(m => m.known_for_department === 'Acting')
        .slice(0, 5)
        .map(m => ({
          id: m.id,
          name: m.name,
          character: m.character || ''
        }));
    }

    // 🎬 Tráiler (YouTube)
    let trailerKey = null;
    if (data.videos && Array.isArray(data.videos.results)) {
      const trailer = data.videos.results.find(
        v => v.site === 'YouTube' && v.type === 'Trailer'
      );
      trailerKey = trailer ? trailer.key : null;
    }

    const runtime = Number.isFinite(data.runtime) ? data.runtime : null;
    const overview = data.overview || '';
    const releaseDate = data.release_date || '';
    const rating = data.vote_average ? Number((data.vote_average / 2).toFixed(1)) : null;

    return { director, runtime, overview, releaseDate, rating, trailerKey, cast };
  } catch (err) {
    console.error('Error al obtener detalles desde TMDb:', err);
    return {};
  }
};

// Añadir desde resultados TMDb
const addFromAPIContr = async (i, btn) => {
  const peliAPI = tmdb_last_results[i];
  if (!peliAPI) return;

  const titulo = (peliAPI.title || peliAPI.original_title || '').trim();
  if (!titulo) {
    alert('No se puede añadir una película sin título.');
    if (btn) { btn.disabled = false; btn.textContent = 'Añadir'; }
    return;
  }

  const actual = (await getAPI()) || [];
  const existe = actual.some(
    p => (p.titulo || '').toLowerCase() === titulo.toLowerCase()
  );

  if (existe) {
    alert('Esa película ya está en tu lista.');
    if (btn) {
      btn.textContent = 'En tu lista';
      btn.disabled = true;
    }
    return;
  }

  const miniatura = peliAPI.poster_path
    ? `${TMDB_IMG_BASE}${peliAPI.poster_path}`
    : 'files/placeholder.png';

  // Extra info (director, runtime, overview, fecha, rating, trailer)
  const extra = await fetchMovieDetailsFromTMDb(peliAPI.id);

  const nueva = {
    titulo,
    director: extra.director || 'Desconocido (TMDb)',
    miniatura,
    tmdbId: peliAPI.id || null,
    runtime: extra.runtime || null,
    overview: extra.overview || '',
    releaseDate: extra.releaseDate || '',
    rating: extra.rating || null,
    trailerKey: extra.trailerKey || null,
    favorite: false
  };

  actual.push(nueva);
  await updateAPI(actual);

  if (btn) {
    btn.textContent = 'En tu lista';
    btn.disabled = true;
  }

  showToast(`🎬 "${titulo}" añadido a tu biblioteca`);

  mis_peliculas = actual;
};

// Cambiar de página en los resultados TMDb (Anterior / Siguiente)
const tmdbChangePageContr = async (delta) => {
  const newPage = tmdb_last_page + delta;
  if (newPage < 1 || newPage > tmdb_last_total_pages) return;

  if (tmdb_last_search_type === 'title') {
    await searchByTitleContr(tmdb_last_query, newPage, false);
  } else if (tmdb_last_search_type === 'keyword') {
    await searchByKeywordContr(tmdb_last_query, newPage, false);
  } else if (tmdb_last_search_type === 'actor') {
    // solo si estás usando búsqueda por actor
    await searchByActorContr(tmdb_last_actor_id, tmdb_last_actor_name, newPage, false);
  }
};


/************  PALABRAS CLAVE TMDb  ************/

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
        <div style="margin-top:12px;">
          <button class="btn btn-primary index">Volver al inicio</button>
        </div>
      </div>
    `;
  }
};

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

const myKeywordsContr = () => {
  const list = getStoredKeywords();
  document.getElementById('main').innerHTML = myKeywordsView(list);
};

const deleteKeywordContr = (keyword) => {
  const cleaned = cleanKeyword(keyword);
  if (!cleaned) return;

  let list = getStoredKeywords();
  list = list.filter(k => k !== cleaned);
  setStoredKeywords(list);
  document.getElementById('main').innerHTML = myKeywordsView(list);
};

/************  Buscar películas por keyword  ************/
const searchByKeywordContr = async (keyword, page = 1, resetState = true) => {
  const kwClean = cleanKeyword(keyword);
  if (!kwClean && resetState) {
    alert('Palabra clave no válida.');
    return;
  }

  let keywordId = tmdb_last_keyword_id;
  let label = kwClean;

  try {
    if (resetState) {
      // 1) Buscar ID de la keyword
      const urlKw = 'https://api.themoviedb.org/3/search/keyword?query='
        + encodeURIComponent(kwClean)
        + '&page=1';
      const resKw = await fetch(urlKw, TMDB_OPTIONS);
      if (!resKw.ok) throw new Error('Error HTTP ' + resKw.status);
      const dataKw = await resKw.json();

      if (!dataKw.results || dataKw.results.length === 0) {
        document.getElementById('main').innerHTML = `
          <div class="container">
            <h2>Resultados por palabra clave</h2>
            <div class="keywords-empty">
              No se han encontrado keywords en TMDb para "${kwClean}".
            </div>
            <div class="actions">
              <button class="btn btn-ghost index">Volver</button>
            </div>
          </div>
        `;
        return;
      }

      keywordId = dataKw.results[0].id;
      tmdb_last_keyword_id = keywordId;
      tmdb_last_query = kwClean;
      tmdb_last_search_type = 'keyword';
      label = kwClean;
    }

    if (!keywordId) return;

    // 2) Buscar películas con esa keyword (paginadas)
    const urlMovies = 'https://api.themoviedb.org/3/discover/movie'
      + '?include_adult=false&language=es-ES'
      + '&page=' + page
      + '&with_keywords=' + keywordId;

    const resMovies = await fetch(urlMovies, TMDB_OPTIONS);
    if (!resMovies.ok) throw new Error('Error HTTP ' + resMovies.status);
    const dataMovies = await resMovies.json();

    tmdb_last_results = Array.isArray(dataMovies.results) ? dataMovies.results : [];
    tmdb_last_page = dataMovies.page || page;
    tmdb_last_total_pages = dataMovies.total_pages || 1;

    const localMovies = getMovies() || [];
    document.getElementById('main').innerHTML =
      resultsView(tmdb_last_results, label, localMovies, tmdb_last_page, tmdb_last_total_pages);
  } catch (err) {
    console.error(err);
    document.getElementById('main').innerHTML = `
      <div class="container">
        <h2>Resultados por palabra clave</h2>
        <div class="error">
          No se han podido obtener películas para la keyword "${keyword}".
        </div>
        <div class="actions">
          <button class="btn btn-ghost index">Volver</button>
        </div>
      </div>
    `;
  }
};


const searchByActorContr = async (actorId, actorName = '') => {
  if (!actorId) return;

  // 🔹 Guardamos el contexto de la búsqueda para la paginación
  tmdb_last_search_type = 'actor';
  tmdb_last_actor_id = actorId;
  tmdb_last_actor_name = actorName || '';
  tmdb_last_page = 1;                      // empezamos siempre en la página 1
  tmdb_last_query = actorName
    ? `actor: ${actorName}`
    : `actor ID: ${actorId}`;

  try {
    const url = 'https://api.themoviedb.org/3/discover/movie'
      + '?include_adult=false'
      + '&language=es-ES'
      + '&sort_by=popularity.desc'
      + '&page=' + tmdb_last_page
      + '&with_cast=' + encodeURIComponent(actorId);

    const res = await fetch(url, TMDB_OPTIONS);
    if (!res.ok) throw new Error('Error HTTP ' + res.status);

    const data = await res.json();

    tmdb_last_results      = Array.isArray(data.results) ? data.results : [];
    tmdb_last_total_pages  = data.total_pages || 1;

    const localMovies = getMovies() || [];

    document.getElementById('main').innerHTML =
      resultsView(tmdb_last_results, tmdb_last_query, localMovies);

  } catch (err) {
    console.error(err);
    document.getElementById('main').innerHTML = `
      <div class="container">
        <h2>Películas por actor</h2>
        <div class="error">
          No se han podido obtener películas para este actor en este momento.
        </div>
        <div class="actions">
          <button class="btn btn-ghost index">Volver</button>
        </div>
      </div>
    `;
  }
};


/************  ROUTER (delegación de eventos)  ************/
const matchEvent = (ev, sel) => ev.target.matches(sel);
const myId = (ev) => Number(ev.target.dataset.myId);

document.addEventListener('click', ev => {
  if      (matchEvent(ev, '.index'))             indexContr();
  else if (matchEvent(ev, '.show'))              showContr(myId(ev));
  // 👇 abrir detalle de una peli que viene de TMDb (búsqueda)
  else if (matchEvent(ev, '.show-api')) {
    const idx = Number(ev.target.dataset.apiIndex);
    showApiMovieContr(idx);
  }
  else if (matchEvent(ev, '.new'))               newContr();
  else if (matchEvent(ev, '.create'))            createContr();
  else if (matchEvent(ev, '.edit'))              editContr(myId(ev));
  else if (matchEvent(ev, '.update'))            updateContr(myId(ev));
  else if (matchEvent(ev, '.delete'))            deleteContr(myId(ev));
  else if (matchEvent(ev, '.reset'))             resetContr();
  else if (matchEvent(ev, '.favorite-toggle'))   toggleFavoriteContr(myId(ev));

  // Búsqueda TMDb por título / keyword
  else if (matchEvent(ev, '.search-view'))  searchViewContr();
  else if (matchEvent(ev, '.search')) {
    const query  = document.getElementById('search_query')?.value || '';
    const modeEl = document.querySelector('input[name="search_mode"]:checked');
    const mode   = modeEl ? modeEl.value : 'title';

    if (mode === 'keyword') {
      // página 1 y reseteando estado
      searchByKeywordContr(query);
    } else {
      // página 1 y reseteando estado
      searchByTitleContr(query);
    }
  }
  else if (matchEvent(ev, '.add-from-api')) {
    const btn = ev.target;
    if (btn.disabled) return;
    btn.disabled = true;
    btn.textContent = 'Añadiendo...';
    addFromAPIContr(myId(ev), btn);
  }

  // Palabras clave TMDb
  else if (matchEvent(ev, '.keywords')) {
    const movieId      = Number(ev.target.dataset.movieId);
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

  // 🔥 Clic en nombre de actor → buscar películas de ese actor
  else if (matchEvent(ev, '.actor-link')) {
    const actorId   = ev.target.dataset.actorId;
    const actorName = ev.target.dataset.actorName || '';
    searchByActorContr(actorId, actorName);
  }

  // Clic en cualquier chip/enlace de keyword
  else if (matchEvent(ev, '.keyword-link')) {
    const kw = decodeURIComponent(ev.target.dataset.keyword || '');
    searchByKeywordContr(kw);
  }

  // 🔥 NUEVO: paginación de resultados TMDb
  else if (matchEvent(ev, '.tmdb-next')) {
    tmdbChangePageContr(1);     // pasar a la página siguiente
  }
  else if (matchEvent(ev, '.tmdb-prev')) {
    tmdbChangePageContr(-1);    // volver a la página anterior
  }
});



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

  if (ev.target.id === 'search_local') {
    searchLocalContr(ev.target.value);
  }
});

/************  Inicialización  ************/
document.addEventListener('DOMContentLoaded', initContr);

function showToast(message) {
  // Crear contenedor si no existe
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  // Crear toast
  const toast = document.createElement("div");
  toast.className = "toast-message";
  toast.innerHTML = message;

  container.appendChild(toast);

  // Animación de entrada
  setTimeout(() => toast.classList.add("show"), 10);

  // Eliminar tras 3s
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
