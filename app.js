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

// Splits text on blank lines into separate <p> elements, so multi-paragraph
// fields (artist statement, about) render as proper paragraphs, not one block.
function renderParagraphs(text) {
  const frag = document.createDocumentFragment();
  text.split(/\n\s*\n/).forEach(para => {
    const trimmed = para.trim();
    if (trimmed) frag.appendChild(el('p', { class: 'about-text' }, trimmed));
  });
  return frag;
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

// ---------- persistent left-side works list ----------
function renderWorklist() {
  const list = document.getElementById('worklist');
  list.innerHTML = '';
  DATA.works.forEach(w => {
    const a = el('a', { href: `#/work/${w.slug}` }, w.title);
    a.dataset.slug = w.slug;
    list.appendChild(a);
  });
}

function setActiveNav(slug) {
  document.querySelectorAll('.plain-worklist a').forEach(a => {
    a.classList.toggle('active', a.dataset.slug === slug);
  });
}

// ---------- footer (name + about + contact) ----------
function renderFooter() {
  document.querySelector('.footer-name').textContent = DATA.artistName || 'Portfolio';

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
}

// ---------- rendering: right-side content views ----------
function renderHome() {
  setActiveNav(null);
  const main = document.getElementById('main');
  main.innerHTML = '';
  if (DATA.artistStatement) {
    main.appendChild(renderParagraphs(DATA.artistStatement));
  }
  main.focus();
}

function renderWork(slug) {
  const w = findWork(slug);
  const main = document.getElementById('main');
  main.innerHTML = '';

  if (!w) {
    main.appendChild(el('p', {}, 'Work not found.'));
    return;
  }

  setActiveNav(slug);

  // "items" mode: a work that's really a series of individual pieces,
  // each with its own photo, year/medium/dimensions, and short description,
  // stacked one after another down the page (e.g. a "Graphics" page).
  if (Array.isArray(w.items) && w.items.length) {
    main.appendChild(el('h1', { class: 'work-title' }, w.title));

    w.items.forEach(item => {
      const itemLabelLines = [];
      if (item.medium) itemLabelLines.push(item.medium);
      if (item.dimensions) itemLabelLines.push(item.dimensions);
      if (item.year) itemLabelLines.push(item.year);

      const block = el('div', { class: 'gallery-item' }, [
        item.image ? el('img', { src: item.image, alt: item.title || w.title, loading: 'lazy' }) : null,
        el('div', { class: 'gallery-item-caption' }, [
          item.title ? el('span', { class: 'gallery-item-title' }, item.title) : null,
          itemLabelLines.length ? el('span', { class: 'gallery-item-meta' }, itemLabelLines.join(', ')) : null
        ]),
        item.description ? el('p', { class: 'gallery-item-description' }, item.description) : null
      ]);
      main.appendChild(block);
    });

    main.focus();
    return;
  }

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

  // Supports the new multi-video "videos" array, and falls back to the
  // older single "videoUrl"/"videoLabel" fields for existing entries.
  const videoList = Array.isArray(w.videos) && w.videos.length
    ? w.videos
    : (w.videoUrl ? [{ url: w.videoUrl, label: w.videoLabel }] : []);

  videoList.forEach(v => {
    if (!v.url) return;
    const embedSrc = toEmbedUrl(v.url);
    if (embedSrc) {
      main.appendChild(el('div', { class: 'video-embed' }, el('iframe', {
        src: embedSrc,
        title: v.label || 'Video',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
        allowfullscreen: 'true'
      })));
    } else {
      main.appendChild(el('a', {
        class: 'video-link',
        href: v.url,
        target: '_blank',
        rel: 'noopener'
      }, `▶ ${v.label || 'Watch video'}`));
    }
  });

  main.focus();
}

function renderAbout() {
  setActiveNav(null);
  const main = document.getElementById('main');
  main.innerHTML = '';
  main.appendChild(el('h1', { class: 'work-title' }, 'About'));
  main.appendChild(el('p', { class: 'about-text' }, DATA.about || ''));

  if (Array.isArray(DATA.exhibitions) && DATA.exhibitions.length) {
    main.appendChild(el('div', { class: 'exhibitions-label' }, 'Exhibitions'));
    const list = el('div', { class: 'exhibitions-list' });
    DATA.exhibitions.forEach(line => {
      list.appendChild(el('div', { class: 'exhibitions-item' }, line));
    });
    main.appendChild(list);
  }

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
fetch(DATA_URL, { cache: 'no-store' })
  .then(res => {
    if (!res.ok) throw new Error('Could not load works.json');
    return res.json();
  })
  .then(data => {
    DATA = data;
    renderWorklist();
    renderFooter();
    route();
    window.addEventListener('hashchange', route);
  })
  .catch(err => {
    document.getElementById('main').innerHTML =
      `<p>Could not load works.json. If you're viewing this file directly on your computer, ` +
      `run a local server (see README.md) — browsers block loading local JSON files directly.</p>`;
    console.error(err);
  });
