const DATA_URL = 'stories.json';

// ── Theme ──────────────────────────────────────────────────────────────────
const themeToggle = document.getElementById('themeToggle');
const saved = localStorage.getItem('theme') || 'light';
applyTheme(saved);

themeToggle?.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('theme', next);
});

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  if (themeToggle) themeToggle.textContent = theme === 'dark' ? '🌙' : '☀️';
}

// ── Router ─────────────────────────────────────────────────────────────────
const page = location.pathname.endsWith('story.html') ? 'story' : 'index';

if (page === 'index') {
  loadIndex();
} else {
  loadStory();
}

// ── Data fetching ──────────────────────────────────────────────────────────
let _cache = null;
async function fetchData() {
  if (_cache) return _cache;
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  // Support both old format (plain array) and new format ({ individual, timeline })
  if (Array.isArray(data)) {
    _cache = { individual: data, timeline: [] };
  } else {
    _cache = {
      individual: data.individual || [],
      timeline:   data.timeline   || [],
    };
  }
  return _cache;
}

// ── Index page ─────────────────────────────────────────────────────────────
async function loadIndex() {
  const loading    = document.getElementById('loading');
  const errorEl    = document.getElementById('error');
  const tlSection  = document.getElementById('timeline-section');
  const tlGrid     = document.getElementById('timeline-grid');
  const indSection = document.getElementById('individual-section');
  const indGrid    = document.getElementById('grid');

  try {
    const { individual, timeline } = await fetchData();
    loading.classList.add('hidden');

    if (!individual.length && !timeline.length) {
      errorEl.querySelector('p').textContent = 'No stories yet. Check back soon!';
      errorEl.classList.remove('hidden');
      return;
    }

    if (timeline.length) {
      timeline.forEach(tl => tlGrid.appendChild(makeTimelineCard(tl)));
      tlSection.classList.remove('hidden');
    }

    if (individual.length) {
      individual.forEach(s => indGrid.appendChild(makeCard(s)));
      indSection.classList.remove('hidden');
    }
  } catch (e) {
    loading.classList.add('hidden');
    errorEl.classList.remove('hidden');
    console.error(e);
  }
}

function makeCard(story) {
  const a = document.createElement('a');
  a.className = 'card';
  a.href = `story.html?id=${encodeURIComponent(story.subject)}`;

  const teaser = story.story_text
    ? story.story_text.replace(/\n+/g, ' ').slice(0, 200)
    : '';

  a.innerHTML = `
    <div class="card-wiki">${esc(story.wikipedia_title || '')}</div>
    <div class="card-subject">${esc(story.subject)}</div>
    <div class="card-teaser">${esc(teaser)}…</div>
    <div class="card-footer">
      <span class="card-date">${formatDate(story.created_at)}</span>
      <span class="card-read">पढ़ें →</span>
    </div>
  `;
  return a;
}

function makeTimelineCard(tl) {
  const a = document.createElement('a');
  a.className = 'card card-timeline';
  a.href = `story.html?tl=${encodeURIComponent(tl.title)}`;

  const chapterCount = (tl.chapters || []).length;
  const span = tl.year_to - tl.year_from;

  a.innerHTML = `
    <div class="card-wiki">${esc(tl.region)} · ${tl.year_from}–${tl.year_to} ई.</div>
    <div class="card-subject">${esc(tl.title)}</div>
    <div class="card-teaser timeline-meta">${chapterCount} अध्याय · ${span} वर्ष का इतिहास</div>
    <div class="card-footer">
      <span class="card-date">${formatDate(tl.created_at)}</span>
      <span class="card-read">पढ़ें →</span>
    </div>
  `;
  return a;
}

// ── Story page ─────────────────────────────────────────────────────────────
async function loadStory() {
  const params  = new URLSearchParams(location.search);
  const id      = params.get('id');
  const tlId    = params.get('tl');
  const loading = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const article = document.getElementById('story');

  if (!id && !tlId) { showError(loading, errorEl); return; }

  try {
    const { individual, timeline } = await fetchData();
    loading.classList.add('hidden');

    if (tlId) {
      const tl = timeline.find(t => t.title === tlId);
      if (!tl) { showError(loading, errorEl); return; }
      renderTimeline(tl, article);
    } else {
      const story = individual.find(s => s.subject === id);
      if (!story) { showError(loading, errorEl); return; }
      renderIndividual(story, article);
    }

    article.classList.remove('hidden');
  } catch (e) {
    showError(loading, errorEl);
    console.error(e);
  }
}

function renderIndividual(story, article) {
  document.title = `${story.subject} — Itihas`;
  document.getElementById('storyTitle').textContent = story.subject;
  document.getElementById('storyWiki').textContent  = story.wikipedia_title || '';
  document.getElementById('storyDate').textContent  = formatDate(story.created_at);
  document.getElementById('storyBody').innerHTML    = renderStoryText(story.story_text);
}

function renderTimeline(tl, article) {
  document.title = `${tl.title} — Itihas`;
  document.getElementById('storyTitle').textContent = tl.title;
  document.getElementById('storyWiki').textContent  = `${tl.region} · ${tl.year_from}–${tl.year_to} ई.`;
  document.getElementById('storyDate').textContent  = formatDate(tl.created_at);

  const chapters   = tl.chapters || [];
  const full_story = (tl.full_story || '').trim();
  const nav        = document.getElementById('chapterNav');

  if (!chapters.length) {
    document.getElementById('storyBody').innerHTML = renderStoryText(full_story);
    return;
  }

  // Full story pill first (if synthesis is complete), then per-era chapters
  const allChapters = full_story
    ? [{ era_name: 'पूर्ण महाकाव्य', text: full_story, _full: true }, ...chapters]
    : chapters;

  nav.classList.remove('hidden');
  allChapters.forEach((ch, i) => {
    const btn = document.createElement('button');
    btn.className = 'chapter-pill' + (i === 0 ? ' active' : '');
    btn.textContent = ch._full ? '📖 पूर्ण' : `${i + (full_story ? 0 : 1)}. ${ch.era_name}`;
    btn.addEventListener('click', () => {
      nav.querySelectorAll('.chapter-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('storyBody').innerHTML = renderStoryText(ch.text);
      article.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    nav.appendChild(btn);
  });

  document.getElementById('storyBody').innerHTML = renderStoryText(allChapters[0].text);
}

function showError(loading, errorEl) {
  loading.classList.add('hidden');
  errorEl.classList.remove('hidden');
}

// ── Helpers ────────────────────────────────────────────────────────────────
function toEnglishNumbers(str) {
  return str.replace(/[०-९]/g, d => d.codePointAt(0) - 0x0966);
}

function renderStoryText(text) {
  if (!text) return '';
  text = toEnglishNumbers(text);
  return text
    .split(/\n{2,}/)
    .map(para => para.trim())
    .filter(Boolean)
    .map(para => {
      if (para.startsWith('## '))  return `<h2>${esc(para.slice(3))}</h2>`;
      if (para.startsWith('# '))   return `<h2>${esc(para.slice(2))}</h2>`;
      if (para.startsWith('### ')) return `<h3>${esc(para.slice(4))}</h3>`;
      return `<p>${esc(para)}</p>`;
    })
    .join('\n');
}

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return ''; }
}
