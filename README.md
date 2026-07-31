# Portfolio Landing Page — Email Developer / Digital Creative Developer

A dark, futuristic, fully responsive portfolio landing page built with
plain **HTML5 + CSS3 + JavaScript (ES6) + GSAP + ScrollTrigger**.
No frameworks, no build tools, no npm install — just open `index.html`.

## Folder structure

```
portfolio/
├── index.html          # All page content & structure
├── css/
│   └── style.css        # All visual styling (design tokens at the top)
├── js/
│   └── script.js         # All animation & interaction logic (GSAP + contact form fetch)
├── assets/
│   └── placeholders/     # Put your real screenshots/PDFs/images here later
└── backend/              # Node.js + Express + Nodemailer server that makes
    ├── server.js          # the contact form actually send you real emails.
    ├── package.json        # See backend/README.md for full setup steps.
    ├── .env.example
    └── README.md
```

## Contact form — now with a real backend

The contact form is wired up end-to-end:

1. Visitor submits the form → `js/script.js` (`initContactForm()`)
   intercepts it and sends the data as JSON via `fetch()` to
   `/api/contact` instead of reloading the page.
2. `backend/server.js` (Node + Express + Nodemailer) receives it,
   validates it, and emails it straight to your inbox — with
   Reply-To set to the visitor's address, so you can just hit Reply.
3. The frontend shows a "Thanks, message sent" or error message
   right under the form (`#formStatus` in `index.html`).

**You must run/deploy the backend for this to work** — see
`backend/README.md` for the full step-by-step (Gmail App Password,
`.env` setup, running locally, and deploying). Until the backend is
running and `EMAIL_USER`/`EMAIL_PASS`/`EMAIL_TO` are filled in, the
form will show an error message instead of sending anything.

## How to run it

Just double-click `index.html`, or for the best results (so relative
paths and fonts behave exactly like a real server), serve the folder
locally, e.g.:

```bash
# Python 3
cd portfolio
python3 -m http.server 8000
# then open http://localhost:8000
```

## What to customize first

1. **Your name** — replace every `[Dummy Name Placeholder]` in `index.html`
   (hero section + footer).
2. **Project screenshots/PDFs** — each project card has a
   `<div class="placeholder-box" data-placeholder>` block containing
   `[Add Email Screenshot/PDF Here Later]` text. Replace the *contents*
   of that div with an `<img src="assets/placeholders/your-file.jpg" alt="...">`
   or an embedded PDF/link — the surrounding card styling and hover
   animation will keep working automatically.
3. **Theme colors** — open `css/style.css` and edit the values inside the
   `:root { ... }` block at the top of the file. Every color across the
   whole site is derived from those ~10 variables.
4. **Contact form** — the form in the Contact section currently has no
   backend. Point its `action`/`method` at your own endpoint (e.g.
   Formspree, Netlify Forms, or a custom API) when you're ready to
   receive real submissions.
5. **Resume PDF** — there's a dedicated Resume section with a
   "Download Resume" button. A placeholder PDF already exists at
   `assets/resume/Ankit-Mishra-Resume.pdf` so the button works
   immediately. Replace that file with your real resume, keeping the
   exact same filename — or, if you rename it, update both the `href`
   and `download` attributes on that button in `index.html` to match.

## Code comments

Every section of `index.html`, `css/style.css`, and `js/script.js` is
heavily commented, explaining:
- What the code does
- Why it's written that way
- What happens if you change or remove it
- For every function: why that function exists
- For every animation: which GSAP property/timeline/easing controls it,
  and how to adjust its speed

Read `js/script.js` top-to-bottom — it's organised into 13 clearly
labelled, self-contained sections (preloader, custom cursor, smooth
scroll, nav toggle, hero timeline, floating visual, scroll reveals,
card hover animations, magnetic buttons, marquee, footer year).

## Key animation concepts used (quick reference)

| Concept | Where | Purpose |
|---|---|---|
| `gsap.timeline()` | Hero entrance | Sequences multiple elements with relative timing (stagger, overlap) |
| `ScrollTrigger` | Section reveals | Plays an animation only when an element scrolls into view |
| `gsap.quickTo()` | Custom cursor | High-performance repeated tweening for mousemove |
| `yoyo: true, repeat: -1` | Floating hero chips | Infinite back-and-forth "floating" loop |
| Paused timeline + `.play()/.reverse()` | Project card hover | Smooth, interruptible hover-in/hover-out |
| `xPercent: -100, repeat: -1` | Tech marquee | Seamless infinite horizontal scroll |
| `prefers-reduced-motion` check | Everywhere | Skips/reduces animation for visitors who need it |

## Browser support

Modern evergreen browsers (Chrome, Edge, Firefox, Safari — latest 2
versions). Uses `aspect-ratio`, `clamp()`, `backdrop-filter`, and CSS
custom properties, all widely supported as of 2024+.
