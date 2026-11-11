import './styles.css'
import 'highlight.js/styles/github-dark.css'
import { renderBlocks, collectHeadings, blocksText, wordCount, escapeHtml, formatInline } from './renderer.js'

// Gradient placeholder used when an article image URL fails to load.
const FALLBACK_IMG =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='630'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#2563eb'/><stop offset='1' stop-color='#0f766e'/></linearGradient></defs><rect width='1200' height='630' fill='url(#g)'/><text x='600' y='330' font-size='72' text-anchor='middle' fill='white' font-family='sans-serif' font-weight='bold' opacity='0.9'>Code Wiki</text></svg>`,
  )
window.__WIKI_FALLBACK_IMG__ = FALLBACK_IMG

const BASE = import.meta.env.BASE_URL
const app = document.getElementById('app')

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
const articleModules = import.meta.glob('./content/*.json', { eager: true })

let config = null
let articles = []
let currentArticle = null

function loadArticles() {
  articles = Object.values(articleModules)
    .map((m) => m.default || m)
    .filter((a) => a && a.slug)
    .sort((a, b) => String(b.dateCreated).localeCompare(String(a.dateCreated)))
}

async function loadConfig() {
  try {
    const res = await fetch(`${BASE}config.json`)
    config = await res.json()
  } catch {
    config = {
      siteTitle: 'Code Wiki',
      siteSubtitle: 'Catatan teknis interaktif',
      siteDescription: '',
      defaultAuthor: 'Deni',
      colors: {},
      colorsDark: {},
    }
  }
  document.title = config.siteTitle
}

// ---------------------------------------------------------------------------
// Theme (light/dark) — palette comes from public/config.json
// ---------------------------------------------------------------------------
function getSavedTheme() {
  const saved = localStorage.getItem('wiki-theme')
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

let theme = getSavedTheme()

function applyTheme() {
  const palette = theme === 'dark' ? { ...(config.colors || {}), ...(config.colorsDark || {}) } : config.colors || {}
  const root = document.documentElement
  const map = {
    primary: '--color-primary',
    secondary: '--color-secondary',
    accent: '--color-accent',
    background: '--color-background',
    surface: '--color-surface',
    text: '--color-text',
    muted: '--color-muted',
    border: '--color-border',
    codeBackground: '--color-code-bg',
  }
  for (const [key, cssVar] of Object.entries(map)) {
    if (palette[key]) root.style.setProperty(cssVar, palette[key])
  }
  root.classList.toggle('dark', theme === 'dark')
  const btn = document.getElementById('theme-toggle')
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙'
}

function toggleTheme() {
  theme = theme === 'dark' ? 'light' : 'dark'
  localStorage.setItem('wiki-theme', theme)
  applyTheme()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readingTime(article) {
  const minutes = Math.max(1, Math.ceil(wordCount(article) / 200))
  return `${minutes} mnt baca`
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d)) return iso
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function articleUrl(slug) {
  return `#/article/${slug}`
}

function chip(text, href, active = false) {
  return `<a href="${href}" class="inline-block px-3 py-1 rounded-full text-xs font-semibold border transition ${active ? 'text-white border-transparent' : ''}" style="${active ? 'background:var(--color-primary)' : 'background:var(--color-surface);color:var(--color-text);border-color:var(--color-border)'}">${escapeHtml(text)}</a>`
}

function difficultyBadge(level) {
  const color = level === 'Pemula' ? '#16a34a' : level === 'Menengah' ? '#d97706' : '#dc2626'
  return `<span class="text-xs font-bold px-2 py-0.5 rounded-full text-white" style="background:${color}">${escapeHtml(level || '')}</span>`
}

function categoryBadge(category) {
  return `<span class="text-xs font-bold px-2 py-0.5 rounded-full text-white" style="background:var(--color-secondary)">${escapeHtml(category || '')}</span>`
}

function tagChips(tags) {
  return (tags || [])
    .map((t) => `<a href="#/tag/${encodeURIComponent(t)}" class="text-xs px-2 py-0.5 rounded-full border hover:opacity-80" style="border-color:var(--color-border);color:var(--color-muted)">#${escapeHtml(t)}</a>`)
    .join(' ')
}

function cardImage(article, cls) {
  return `<img src="${escapeHtml(article.image || FALLBACK_IMG)}" alt="${escapeHtml(article.imageAlt || article.title)}" loading="lazy" class="${cls}" onerror="this.onerror=null;this.src=window.__WIKI_FALLBACK_IMG__" />`
}

function articleCard(article, featured = false) {
  return `<article class="rounded-2xl overflow-hidden border shadow-sm hover:shadow-lg transition flex flex-col" style="background:var(--color-surface);border-color:var(--color-border)">
    <a href="${articleUrl(article.slug)}" class="block overflow-hidden">
      ${cardImage(article, featured ? 'w-full h-64 object-cover hover:scale-105 transition duration-300' : 'w-full h-44 object-cover hover:scale-105 transition duration-300')}
    </a>
    <div class="p-5 flex flex-col gap-2 flex-1">
      <div class="flex items-center gap-2 flex-wrap">
        ${categoryBadge(article.category)}
        ${difficultyBadge(article.difficulty)}
        <span class="text-xs ml-auto" style="color:var(--color-muted)">⏱ ${readingTime(article)}</span>
      </div>
      <a href="${articleUrl(article.slug)}"><h3 class="text-lg font-bold leading-snug hover:underline" style="color:var(--color-text)">${escapeHtml(article.title)}</h3></a>
      <p class="text-sm line-clamp-2" style="color:var(--color-muted)">${escapeHtml(article.subtitle || '')}</p>
      <div class="flex flex-wrap gap-1.5 mt-1">${tagChips(article.tags)}</div>
      <div class="mt-auto pt-3 text-xs border-t flex items-center gap-2" style="border-color:var(--color-border);color:var(--color-muted)">
        <span>✍️ ${escapeHtml(article.author || config.defaultAuthor || '')}</span>
        <span>•</span>
        <span>${formatDate(article.dateCreated)}</span>
      </div>
    </div>
  </article>`
}

// ---------------------------------------------------------------------------
// Layout shell
// ---------------------------------------------------------------------------
function shell(content) {
  const categories = [...new Set(articles.map((a) => a.category).filter(Boolean))].sort()
  return `
  <div id="progress-bar" class="fixed top-0 left-0 h-1 z-50 transition-all" style="background:var(--color-primary);width:0%"></div>
  <header class="sticky top-0 z-40 backdrop-blur border-b" style="background:color-mix(in srgb, var(--color-surface) 88%, transparent);border-color:var(--color-border)">
    <div class="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
      <a href="#/" class="flex items-center gap-2 font-extrabold text-lg" style="color:var(--color-text)">
        <span class="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg" style="background:var(--color-primary)">W</span>
        ${escapeHtml(config.siteTitle)}
      </a>
      <nav class="hidden md:flex items-center gap-1 ml-4 text-sm">
        <a href="#/" class="px-3 py-1.5 rounded-lg hover:opacity-75">Beranda</a>
        ${categories.map((c) => `<a href="#/category/${encodeURIComponent(c)}" class="px-3 py-1.5 rounded-lg hover:opacity-75">${escapeHtml(c)}</a>`).join('')}
      </nav>
      <div class="ml-auto flex items-center gap-2">
        <button id="theme-toggle" class="w-9 h-9 rounded-full border flex items-center justify-center" style="border-color:var(--color-border)" title="Ganti tema (terang/gelap)">🌙</button>
      </div>
    </div>
  </header>
  <main class="max-w-6xl mx-auto px-4 pb-16">${content}</main>
  <footer class="border-t py-8" style="border-color:var(--color-border)">
    <div class="max-w-6xl mx-auto px-4 text-sm flex flex-col md:flex-row gap-2 md:items-center justify-between" style="color:var(--color-muted)">
      <span>© ${new Date().getFullYear()} ${escapeHtml(config.siteTitle)} — ${escapeHtml(config.siteDescription || '')}</span>
      <span>${articles.length} artikel • Dibangun dengan Vite + TailwindCSS</span>
    </div>
  </footer>
  <button id="back-to-top" class="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full text-white shadow-lg hidden items-center justify-center text-xl" style="background:var(--color-primary)" title="Kembali ke atas">↑</button>
  <div id="toast" class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-white text-sm font-semibold shadow-lg opacity-0 pointer-events-none" style="background:var(--color-secondary)">Disalin!</div>
  `
}

// ---------------------------------------------------------------------------
// Home view
// ---------------------------------------------------------------------------
const homeState = { q: '', category: '', tag: '', sort: 'newest' }

function filteredArticles() {
  const q = homeState.q.trim().toLowerCase()
  let list = articles.filter((a) => {
    if (homeState.category && a.category !== homeState.category) return false
    if (homeState.tag && !(a.tags || []).includes(homeState.tag)) return false
    if (!q) return true
    const hay = [a.title, a.subtitle, a.category, (a.tags || []).join(' '), blocksText(a.blocks)].join(' ').toLowerCase()
    return q.split(/\s+/).every((word) => hay.includes(word))
  })
  if (homeState.sort === 'oldest') list = [...list].sort((a, b) => String(a.dateCreated).localeCompare(String(b.dateCreated)))
  else if (homeState.sort === 'title') list = [...list].sort((a, b) => a.title.localeCompare(b.title, 'id'))
  else list = [...list].sort((a, b) => String(b.dateCreated).localeCompare(String(a.dateCreated)))
  return list
}

function renderHome() {
  const categories = [...new Set(articles.map((a) => a.category).filter(Boolean))].sort()
  const allTags = [...new Set(articles.flatMap((a) => a.tags || []))].sort()
  const list = filteredArticles()
  const featured = !homeState.q && !homeState.category && !homeState.tag ? articles[0] : null
  const rest = featured ? list.filter((a) => a.slug !== featured.slug) : list

  const filterActive = homeState.q || homeState.category || homeState.tag

  app.innerHTML = shell(`
    <section class="py-10 md:py-14 text-center">
      <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight">${escapeHtml(config.siteTitle)}</h1>
      <p class="mt-3 text-lg font-semibold" style="color:var(--color-primary)">${escapeHtml(config.siteSubtitle || '')}</p>
      <p class="mt-2 max-w-2xl mx-auto" style="color:var(--color-muted)">${escapeHtml(config.siteDescription || '')}</p>
      <div class="mt-6 max-w-xl mx-auto relative">
        <input id="search-input" type="search" value="${escapeHtml(homeState.q)}" placeholder="Cari artikel… (tekan / untuk fokus)" class="w-full px-5 py-3 rounded-full border text-base outline-none focus:ring-2" style="background:var(--color-surface);border-color:var(--color-border);color:var(--color-text)" />
        <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs px-2 py-0.5 rounded border" style="color:var(--color-muted);border-color:var(--color-border)">/</span>
      </div>
    </section>

    <section class="flex flex-wrap items-center gap-2 mb-4">
      ${chip('Semua', '#/', !homeState.category && !homeState.tag)}
      ${categories.map((c) => chip(c, `#/category/${encodeURIComponent(c)}`, homeState.category === c)).join('')}
      <select id="sort-select" class="ml-auto px-3 py-1.5 rounded-full border text-sm" style="background:var(--color-surface);border-color:var(--color-border);color:var(--color-text)">
        <option value="newest" ${homeState.sort === 'newest' ? 'selected' : ''}>Terbaru</option>
        <option value="oldest" ${homeState.sort === 'oldest' ? 'selected' : ''}>Terlama</option>
        <option value="title" ${homeState.sort === 'title' ? 'selected' : ''}>Judul A–Z</option>
      </select>
    </section>

    ${homeState.tag ? `<section class="mb-4"><span class="text-sm" style="color:var(--color-muted)">Tag: </span>${chip('#' + homeState.tag, '#/', true)} <a href="#/" class="text-sm underline ml-2">Hapus filter ✕</a></section>` : ''}
    ${homeState.category ? `<section class="mb-4"><span class="text-sm" style="color:var(--color-muted)">Kategori: <strong>${escapeHtml(homeState.category)}</strong></span> <a href="#/" class="text-sm underline ml-2">Hapus filter ✕</a></section>` : ''}

    <section class="mb-6">
      <p class="text-sm mb-3" style="color:var(--color-muted)">${list.length} artikel ditemukan ${filterActive ? 'dengan filter aktif' : ''}</p>
      ${allTags.length ? `<div class="flex flex-wrap gap-1.5">${allTags.map((t) => chip('#' + t, `#/tag/${encodeURIComponent(t)}`, homeState.tag === t)).join('')}</div>` : ''}
    </section>

    ${featured ? `<section class="mb-8"><h2 class="text-xl font-bold mb-3">⭐ Artikel Pilihan</h2>${articleCard(featured, true)}</section>` : ''}

    <div id="results">
    ${rest.length ? `
    <section class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      ${rest.map((a) => articleCard(a)).join('')}
    </section>` : `
    <section class="text-center py-16 rounded-2xl border" style="border-color:var(--color-border)">
      <p class="text-4xl mb-3">🔍</p>
      <p class="text-lg font-bold">Tidak ada artikel yang cocok</p>
      <p class="text-sm mt-1" style="color:var(--color-muted)">Coba kata kunci lain, atau <a href="#/" class="underline" style="color:var(--color-primary)">reset semua filter</a>.</p>
    </section>`}
    </div>
  `)
  bindHomeEvents()
}

function resultsHtml(list) {
  if (!list.length) {
    return `<section class="text-center py-16 rounded-2xl border" style="border-color:var(--color-border)">
      <p class="text-4xl mb-3">🔍</p>
      <p class="text-lg font-bold">Tidak ada artikel yang cocok</p>
      <p class="text-sm mt-1" style="color:var(--color-muted)">Coba kata kunci lain, atau <a href="#/" class="underline" style="color:var(--color-primary)">reset semua filter</a>.</p>
    </section>`
  }
  return `<section class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">${list.map((a) => articleCard(a)).join('')}</section>`
}

function bindHomeEvents() {
  const search = document.getElementById('search-input')
  if (search) {
    search.addEventListener('input', () => {
      homeState.q = search.value
      const list = filteredArticles()
      const count = document.querySelector('section.mb-6 p')
      if (count) count.textContent = `${list.length} artikel ditemukan dengan filter aktif`
      const results = document.getElementById('results')
      if (results) results.innerHTML = resultsHtml(list)
    })
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') e.preventDefault()
    })
  }
  const sort = document.getElementById('sort-select')
  if (sort) {
    sort.addEventListener('change', () => {
      homeState.sort = sort.value
      renderHome()
      const s2 = document.getElementById('search-input')
      if (s2) s2.focus()
    })
  }
}

// ---------------------------------------------------------------------------
// Article view
// ---------------------------------------------------------------------------
function relatedArticles(article) {
  const bySlug = new Map(articles.map((a) => [a.slug, a]))
  const picked = []
  for (const slug of article.related || []) {
    const a = bySlug.get(slug)
    if (a && a.slug !== article.slug && !picked.includes(a)) picked.push(a)
  }
  if (picked.length < 3) {
    const same = articles.filter(
      (a) =>
        a.slug !== article.slug &&
        !picked.includes(a) &&
        (a.category === article.category || (a.tags || []).some((t) => (article.tags || []).includes(t))),
    )
    for (const a of same) {
      if (picked.length >= 3) break
      picked.push(a)
    }
  }
  return picked.slice(0, 3)
}

function renderArticle(slug) {
  const article = articles.find((a) => a.slug === slug)
  if (!article) {
    app.innerHTML = shell(`
      <section class="text-center py-20">
        <p class="text-5xl mb-4">😕</p>
        <h1 class="text-2xl font-bold">Artikel tidak ditemukan</h1>
        <p class="mt-2" style="color:var(--color-muted)">Slug “${escapeHtml(slug)}” tidak ada di wiki ini.</p>
        <a href="#/" class="inline-block mt-6 px-5 py-2.5 rounded-full text-white font-semibold" style="background:var(--color-primary)">← Kembali ke Beranda</a>
      </section>`)
    return
  }
  currentArticle = article
  const headings = collectHeadings(article.blocks)
  const idx = articles.findIndex((a) => a.slug === slug)
  const prev = articles[idx + 1] || null
  const next = articles[idx - 1] || null
  const related = relatedArticles(article)
  const source = article.source || {}

  app.innerHTML = shell(`
    <article class="pt-6">
      <a href="#/" class="text-sm font-semibold no-print" style="color:var(--color-primary)">← Semua Artikel</a>
      <div class="mt-4 rounded-2xl overflow-hidden border" style="border-color:var(--color-border)">
        ${cardImage(article, 'w-full h-64 md:h-80 object-cover')}
      </div>
      <div class="mt-6 lg:flex lg:gap-10">
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <a href="#/category/${encodeURIComponent(article.category || '')}">${categoryBadge(article.category)}</a>
            ${difficultyBadge(article.difficulty)}
          </div>
          <h1 class="text-3xl md:text-4xl font-extrabold leading-tight mt-3">${escapeHtml(article.title)}</h1>
          <p class="text-lg mt-2" style="color:var(--color-muted)">${escapeHtml(article.subtitle || '')}</p>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pb-4 text-sm border-b" style="border-color:var(--color-border);color:var(--color-muted)">
            <span>✍️ ${escapeHtml(article.author || config.defaultAuthor || '')}</span>
            <span>📅 ${formatDate(article.dateCreated)}</span>
            ${article.dateUpdated ? `<span>🔄 Diperbarui ${formatDate(article.dateUpdated)}</span>` : ''}
            <span>⏱ ${readingTime(article)}</span>
          </div>
          <div class="flex flex-wrap gap-1.5 mt-4">${tagChips(article.tags)}</div>

          <div class="article-body mt-6">
            ${renderBlocks(article.blocks)}
          </div>

          ${source.url ? `<div class="mt-8 p-4 rounded-xl border text-sm" style="border-color:var(--color-border);background:var(--color-surface)">
            <strong>📚 Sumber:</strong>
            <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer" style="color:var(--color-primary)">${escapeHtml(source.label || source.url)}</a>
          </div>` : ''}

          ${related.length ? `<section class="mt-10">
            <h2 class="text-2xl font-bold mb-4">🔗 Konten Terkait</h2>
            <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              ${related.map((a) => articleCard(a)).join('')}
            </div>
          </section>` : ''}

          <nav class="mt-10 grid sm:grid-cols-2 gap-4 no-print">
            ${prev ? `<a href="${articleUrl(prev.slug)}" class="p-4 rounded-xl border hover:shadow transition" style="border-color:var(--color-border);background:var(--color-surface)"><span class="text-xs font-bold" style="color:var(--color-muted)">← SEBELUMNYA</span><span class="block font-bold mt-1">${escapeHtml(prev.title)}</span></a>` : '<span></span>'}
            ${next ? `<a href="${articleUrl(next.slug)}" class="p-4 rounded-xl border hover:shadow transition text-right" style="border-color:var(--color-border);background:var(--color-surface)"><span class="text-xs font-bold" style="color:var(--color-muted)">BERIKUTNYA →</span><span class="block font-bold mt-1">${escapeHtml(next.title)}</span></a>` : '<span></span>'}
          </nav>
        </div>

        ${headings.length ? `<aside id="toc" class="hidden lg:block w-64 shrink-0 no-print">
          <div class="sticky top-24">
            <p class="font-bold text-sm mb-2 px-2">📑 Daftar Isi</p>
            <nav class="space-y-0.5">
              ${headings.map((h) => `<a href="#${h.id}" data-toc="${h.id}" class="toc-link ${h.level === 3 ? 'l3' : ''}">${escapeHtml(h.text)}</a>`).join('')}
            </nav>
          </div>
        </aside>` : ''}
      </div>
    </article>
  `)
  bindArticleEvents(headings)
}

function bindArticleEvents(headings) {
  // Smooth scroll for TOC links (offset handled by scroll-margin-top in CSS)
  document.querySelectorAll('[data-toc]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const el = document.getElementById(link.dataset.toc)
      if (el) el.scrollIntoView({ behavior: 'smooth' })
      history.replaceState(null, '', `#${link.dataset.toc}`)
    })
  })

  // Scroll spy + progress bar + back-to-top
  const onScroll = () => {
    const h = document.documentElement
    const scrolled = h.scrollTop / (h.scrollHeight - h.clientHeight || 1)
    const bar = document.getElementById('progress-bar')
    if (bar) bar.style.width = `${Math.min(100, Math.max(0, scrolled * 100))}%`
    const btt = document.getElementById('back-to-top')
    if (btt) {
      const show = h.scrollTop > 400
      btt.classList.toggle('hidden', !show)
      btt.classList.toggle('flex', show)
    }
    let current = ''
    for (const hd of headings) {
      const el = document.getElementById(hd.id)
      if (el && el.getBoundingClientRect().top <= 120) current = hd.id
    }
    document.querySelectorAll('[data-toc]').forEach((link) => {
      link.classList.toggle('active', link.dataset.toc === current)
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()
}

// ---------------------------------------------------------------------------
// Global events (delegated)
// ---------------------------------------------------------------------------
function showToast(msg) {
  const toast = document.getElementById('toast')
  if (!toast) return
  toast.textContent = msg
  toast.style.opacity = '1'
  toast.style.transform = 'translate(-50%, -8px)'
  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translate(-50%, 0)'
  }, 1800)
}

document.addEventListener('click', async (e) => {
  const copyBtn = e.target.closest('.copy-btn')
  if (copyBtn && currentArticle) {
    const idx = Number(copyBtn.dataset.codeIndex)
    const codeBlocks = (currentArticle.blocks || []).filter((b) => b.type === 'code')
    // data-code-index counts all blocks; map back to code blocks in order
    const all = currentArticle.blocks || []
    let codeIdx = -1
    let target = null
    all.forEach((b, i) => {
      if (b.type === 'code') {
        codeIdx++
        if (i === idx) target = b
      }
    })
    void codeBlocks
    const code = target ? target.code : ''
    try {
      await navigator.clipboard.writeText(code)
      showToast('Disalin!')
    } catch {
      showToast('Gagal menyalin')
    }
    return
  }
  const themeBtn = e.target.closest('#theme-toggle')
  if (themeBtn) {
    toggleTheme()
    return
  }
  const btt = e.target.closest('#back-to-top')
  if (btt) {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
})

document.addEventListener('keydown', (e) => {
  if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) {
    const search = document.getElementById('search-input')
    if (search) {
      e.preventDefault()
      search.focus()
    } else {
      location.hash = '#/'
      setTimeout(() => document.getElementById('search-input')?.focus(), 50)
    }
  }
})

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
function route() {
  const hash = location.hash || '#/'
  const parts = hash.replace(/^#\/?/, '').split('/')
  const [page, param] = parts

  window.scrollTo({ top: 0 })
  const btt = document.getElementById('back-to-top')
  if (btt) btt.classList.add('hidden')

  if (page === 'article' && param) {
    homeState.q = ''
    renderArticle(decodeURIComponent(param))
  } else if (page === 'tag' && param) {
    homeState.tag = decodeURIComponent(param)
    homeState.category = ''
    renderHome()
  } else if (page === 'category' && param) {
    homeState.category = decodeURIComponent(param)
    homeState.tag = ''
    renderHome()
  } else {
    homeState.category = ''
    homeState.tag = ''
    renderHome()
  }
  applyTheme()
}

window.addEventListener('hashchange', route)

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  loadArticles()
  await loadConfig()
  applyTheme()
  route()
}

boot()
