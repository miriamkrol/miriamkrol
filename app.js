// ---------- config ----------
const DATA_URL = 'works.json';

// ---------- state ----------
let DATA = null;

// ---------- helpers ----------
function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on')) node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

function findWork(slug) {
  return DATA.works.find(w => w.slug === slug);
}

// Turns a YouTube or Vimeo URL into an embeddable iframe src.
// Any other URL falls back to a plain "watch" link instead of an embed.
function toEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let id = u.searchParams.get('v');
      if (!id && u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
      if (!id && u.pathname.includes('/embed/')) return url;
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ---------- rendering: sidebar ----------
function renderSidebar() {
  document.querySelector('.artist-name').textContent = DATA.artistName || 'Portfolio';
  document.querySelector('.tagline').textContent = DATA.tagline || '';

  const emailLink = document.getElementById('emailLink');
  if (DATA.email) {
    emailLink.href = `mailto:${DATA.email}`;
  } else {
    emailLink.style.display = 'none';
  }

  const instaLink = document.getElementById('instaLink');
  if (DATA.instagram) {
    instaLink.href = DATA.instagram;
    instaLink.style.display = '';
  }

  const list = document.getElementById('worklist');
  list.innerHTML = '';
  DATA.works.forEach(w => {
    const a = el('a', { href: `#/work/${w.slug}` }, [
      el('span', {}, w.title),
      el('span', { class: 'work-year' }, w.year || '')
    ]);
    a.dataset.slug = w.slug;
    list.appendChild(a);
  });
}

function setActiveNav(slug) {
  document.querySelectorAll('.worklist a').forEach(a => {
    a.classList.toggle('active', a.dataset.slug === slug);
  });
}

// ---------- rendering: views ----------
function renderHome() {
  setActiveNav(null);
  const main = document.getElementById('main');
  main.innerHTML = '';

  const grid = el('div', { class: 'grid' });
  DATA.works.forEach(w => {
    const cover = w.images && w.images[0] ? w.images[0] : '';
    const item = el('a', { class: 'grid-item', href: `#/work/${w.slug}` }, [
      el('div', { class: 'thumb-wrap' }, cover ? el('img', { src: cover, alt: w.title, loading: 'lazy' }) : ''),
      el('div', { class: 'g-title' }, w.title),
      el('div', { class: 'g-meta' }, [w.year, w.medium].filter(Boolean).join(' · '))
    ]);
    grid.appendChild(item);
  });
  main.appendChild(grid);
  main.focus();
}

function renderWork(slug) {
  const w = findWork(slug);
  const main = document.getElementById('main');
  main.innerHTML = '';

  if (!w) {
    main.appendChild(el('p', {}, 'Work not found.'));
    main.appendChild(el('a', { class: 'back-link', href: '#/' }, '← Back to all works'));
    return;
  }

  setActiveNav(slug);

  const imagesWrap = el('div', { class: 'work-images' });
  (w.images || []).forEach(src => {
    imagesWrap.appendChild(el('img', { src, alt: w.title, loading: 'lazy' }));
  });

  const labelLines = [];
  if (w.medium) labelLines.push(w.medium);
  if (w.dimensions) labelLines.push(w.dimensions);
  if (w.year) labelLines.push(w.year);

  const header = el('div', { class: 'work-header' }, [
    el('h1', { class: 'work-title' }, w.title),
    el('div', { class: 'wall-label' }, labelLines.map(l => el('div', {}, l))),
    w.description ? el('p', { class: 'work-description' }, w.description) : null
  ]);

  main.appendChild(header);
  main.appendChild(imagesWrap);

  if (w.videoUrl) {
    const embedSrc = toEmbedUrl(w.videoUrl);
    if (embedSrc) {
      main.appendChild(el('div', { class: 'video-embed' }, el('iframe', {
        src: embedSrc,
        title: w.videoLabel || 'Video',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        allowfullscreen: 'true'
      })));
    } else {
      main.appendChild(el('a', {
        class: 'video-link',
        href: w.videoUrl,
        target: '_blank',
        rel: 'noopener'
      }, `▶ ${w.videoLabel || 'Watch video'}`));
    }
  }

  main.appendChild(el('a', { class: 'back-link', href: '#/' }, '← Back to all works'));
  main.focus();
}

function renderAbout() {
  setActiveNav(null);
  const main = document.getElementById('main');
  main.innerHTML = '';
  main.appendChild(el('h1', { class: 'work-title' }, 'About'));
  main.appendChild(el('p', { class: 'about-text' }, DATA.about || ''));
  main.focus();
}

// ---------- router ----------
function route() {
  const hash = location.hash || '#/';
  closeMobileNav();

  const workMatch = hash.match(/^#\/work\/(.+)$/);
  if (workMatch) {
    renderWork(decodeURIComponent(workMatch[1]));
    return;
  }
  if (hash === '#/about') {
    renderAbout();
    return;
  }
  renderHome();
}

// ---------- mobile nav ----------
function closeMobileNav() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('navToggle').setAttribute('aria-expanded', 'false');
}

document.getElementById('navToggle').addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  const isOpen = sidebar.classList.toggle('open');
  document.getElementById('navToggle').setAttribute('aria-expanded', String(isOpen));
});

// ---------- init ----------
fetch(DATA_URL)
  .then(res => {
    if (!res.ok) throw new Error('Could not load works.json');
    return res.json();
  })
  .then(data => {
    DATA = data;
    renderSidebar();
    route();
    window.addEventListener('hashchange', route);
  })
  .catch(err => {
    document.getElementById('main').innerHTML =
      `<p>Could not load works.json. If you're viewing this file directly on your computer, ` +
      `run a local server (see README.md) — browsers block loading local JSON files directly.</p>`;
    console.error(err);
  });
