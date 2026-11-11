# Code Wiki

Wiki pribadi yang interaktif untuk catatan teknis: NGINX, Kafka, OpenShift, Grafana, Prometheus, ELK Stack, dan Elastic APM. Dibangun dengan **vanilla JavaScript + Vite + TailwindCSS v4**, tanpa framework.

🌐 **Live:** https://denitriyono03.github.io/code-wiki/

## Cara kerja (data-driven)

Semua konten dan tampilan dikendalikan oleh file JSON — **tidak ada konten yang di-hardcode di JavaScript**:

| Yang diubah | File | Keterangan |
|---|---|---|
| Tema & warna | `public/config.json` | Satu file untuk semua warna, judul situs, dan penulis default. Berlaku untuk mode terang dan gelap. |
| Artikel baru | `src/content/<slug>.json` | Drop satu file JSON baru, artikel langsung muncul. Tidak perlu edit index atau kode apa pun. |
| Kode aplikasi | `src/main.js`, `src/renderer.js` | Router, pencarian, dan renderer blok. |

Artikel dimuat otomatis dengan:

```js
import.meta.glob('./content/*.json', { eager: true })
```

## Menjalankan lokal

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output ke dist/
npm run preview  # cek hasil build lokal
```

## Menambah artikel baru

1. Duplikat salah satu file di `src/content/`, mis. `src/content/nginx.json`.
2. Ubah `slug` (harus unik, huruf kecil, tanpa spasi) dan isi kontennya.
3. Ikuti skema di `docs/CONTENT_GUIDE.md` — ada contoh lengkap semua tipe blok.
4. Jalankan `npm run build` untuk memastikan tidak ada error, lalu push.

> Artikel diurutkan berdasarkan `dateCreated` (terbaru dulu). `related[]` berisi slug artikel lain; kalau kosong atau kurang dari 3, aplikasi otomatis mengisi dari kategori/tag yang sama.

## Mengubah tema (warna)

Edit `public/config.json`:

```json
{
  "siteTitle": "Code Wiki",
  "siteSubtitle": "Catatan teknis interaktif",
  "colors": {
    "primary": "#2563eb",
    "secondary": "#0f766e",
    "accent": "#f59e0b",
    "background": "#f8fafc",
    "surface": "#ffffff",
    "text": "#0f172a",
    "muted": "#64748b",
    "border": "#e2e8f0",
    "codeBackground": "#0f172a"
  },
  "colorsDark": { "...": "palet untuk dark mode" }
}
```

Warna diterapkan saat aplikasi start sebagai CSS custom properties (`--color-primary`, dst.) dan dipakai semua komponen Tailwind lewat `var()`. Tidak perlu rebuild CSS — cukup edit file dan refresh (di production, rebuild + deploy ulang).

## Fitur

- **Home (`#/`):** hero, live search (judul, tag, kategori, isi artikel), filter kategori & tag, sort (terbaru/terlama/A–Z), artikel pilihan, kartu artikel dengan estimasi waktu baca.
- **Artikel (`#/article/:slug`):** cover, meta (penulis, tanggal, difficulty), daftar isi otomatis dengan scroll-spy, reading progress bar, blok kode dengan tombol salin + toast, navigasi prev/next, dan seksi **Konten Terkait**.
- **Tag & kategori (`#/tag/:tag`, `#/category/:name`):** tampilan home yang sudah terfilter.
- **Dark/light mode:** toggle di header, tersimpan di `localStorage`, mengikuti `prefers-color-scheme` saat pertama kali dibuka.
- **Shortcut keyboard:** tekan `/` untuk fokus ke kotak pencarian.
- **Lainnya:** tombol back-to-top, tampilan ramah print, fallback gambar otomatis kalau URL gambar mati.

## Blok konten yang didukung

`heading` (h2/h3) · `paragraph` (dengan `**bold**`, `` `kode` ``, `[link](url)`, `==highlight==`) · `callout` (info/tip/warning/danger) · `code` (syntax highlighting + tombol salin) · `list` (bernomor/tidak) · `table` · `quote` · `image` · `divider`. Lihat `docs/CONTENT_GUIDE.md` untuk contoh lengkap.

## Deploy ke GitHub Pages

Repo sudah dibuat: **denitriyono03/code-wiki** (public, branch `main`).

1. **Push kode** (file non-workflow) ke branch `main`.
2. **Buat workflow deploy:** di GitHub, buat file `.github/workflows/deploy.yml` dan paste isi file `.github/workflows/deploy.yml` dari repo ini (file workflow tidak bisa di-push oleh integrasi GitHub App, jadi harus dipaste manual lewat web UI).
3. **Aktifkan Pages:** buka repo → **Settings → Pages → Build and deployment → Source: GitHub Actions**. (Kalau deploy pertama gagal di langkah `deploy-pages`, biasanya Pages belum diaktifkan — aktifkan lalu re-run workflow.)
4. Tunggu workflow selesai — situs akan live di **https://denitriyono03.github.io/code-wiki/**.

Catatan: `vite.config.js` sudah mengatur `base: '/code-wiki/'`, jadi semua aset dimuat relatif terhadap path tersebut.

## Struktur folder

```
code-wiki/
├── index.html
├── vite.config.js
├── package.json
├── public/
│   └── config.json          # tema & identitas situs (SATU file)
├── src/
│   ├── main.js              # router hash + semua logika aplikasi
│   ├── renderer.js          # renderer blok + parser inline formatting
│   ├── styles.css           # Tailwind + gaya kustom (callout, TOC, code)
│   └── content/             # satu file JSON per artikel
│       ├── nginx.json
│       ├── kafka.json
│       ├── openshift-ocp.json
│       ├── grafana.json
│       ├── prometheus.json
│       ├── kibana-elk.json
│       └── apm.json
├── docs/
│   └── CONTENT_GUIDE.md     # panduan & template artikel
└── .github/workflows/
    └── deploy.yml           # deploy ke GitHub Pages (paste manual)
```

## Teknologi

- [Vite](https://vite.dev/) — build tool & dev server
- [TailwindCSS v4](https://tailwindcss.com/) — utility-first CSS
- [highlight.js](https://highlightjs.org/) — syntax highlighting (di-bundle, tanpa CDN)
