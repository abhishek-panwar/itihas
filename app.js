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

// ── Index page ─────────────────────────────────────────────────────────────
async function loadIndex() {
  const grid = document.getElementById('grid');
  const loading = document.getElementById('loading');
  const errorEl = document.getElementById('error');

  try {
    const stories = await fetchStories();
    loading.classList.add('hidden');

    if (!stories.length) {
      errorEl.querySelector('p').textContent = 'No stories yet. Check back soon!';
      errorEl.classList.remove('hidden');
      return;
    }

    grid.classList.remove('hidden');
    stories.forEach(s => grid.appendChild(makeCard(s)));
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

// ── Story page ─────────────────────────────────────────────────────────────
async function loadStory() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const loading = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const article = document.getElementById('story');

  if (!id) {
    showError(loading, errorEl);
    return;
  }

  try {
    const stories = await fetchStories();
    const story = stories.find(s => s.subject === id);

    loading.classList.add('hidden');

    if (!story) {
      showError(loading, errorEl);
      return;
    }

    document.title = `${story.subject} — Itihas`;
    document.getElementById('storyTitle').textContent = story.subject;
    document.getElementById('storyWiki').textContent = story.wikipedia_title || '';
    document.getElementById('storyDate').textContent = formatDate(story.created_at);
    document.getElementById('storyBody').innerHTML = renderStoryText(story.story_text);

    article.classList.remove('hidden');
  } catch (e) {
    showError(loading, errorEl);
    console.error(e);
  }
}

function showError(loading, errorEl) {
  loading.classList.add('hidden');
  errorEl.classList.remove('hidden');
}

// ── Helpers ────────────────────────────────────────────────────────────────
async function fetchStories() {
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function toEnglishNumbers(str) {
  return str.replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d));
}

function renderStoryText(text) {
  if (!text) return '';
  text = toEnglishNumbers(text);
  return text
    .split(/\n{2,}/)
    .map(para => para.trim())
    .filter(Boolean)
    .map(para => {
      if (para.startsWith('## ')) return `<h2>${esc(para.slice(3))}</h2>`;
      if (para.startsWith('# ')) return `<h2>${esc(para.slice(2))}</h2>`;
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
