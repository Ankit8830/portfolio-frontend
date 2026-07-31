/* =================================================================
   PORTFOLIO SCRIPT.JS
   All interactivity and animation logic lives here.
   Written in modern ES6 (const/let, arrow functions, template literals).

   FILE STRUCTURE (read top to bottom):
   1. Setup & feature-detection (reduced motion, GSAP plugin registration)
   2. Preloader
   3. Custom cursor
   4. Smooth scrolling for in-page nav links
   5. Mobile nav toggle
   6. Navbar show/hide + scrolled state
   7. Hero entrance timeline (GSAP timeline)
   8. Hero floating visual animation (infinite loop)
   9. Scroll-triggered section reveals (GSAP + ScrollTrigger)
   10. Card hover animations (email/banner/DAM project cards)
   11. Magnetic button hover effect
   12. Infinite marquee (tech strip)
   13. Footer year + init call

   WHY ONE FILE: for a portfolio of this size, splitting into many small
   JS files would add complexity (module imports/bundlers) without real
   benefit. Everything here is organised into clearly commented, named
   functions instead - each one is a self-contained "why does this exist"
   unit you can find, read, and safely delete if you don't need it.
   ================================================================= */

/* -----------------------------------------------------------------
   1. SETUP
----------------------------------------------------------------- */

// Detect whether the visitor's OS/browser has "reduce motion" turned on.
// WHY: some people get dizzy/uncomfortable from large animations. We
// check this ONCE and store the boolean, then every animation function
// below checks `prefersReducedMotion` before deciding how much motion to use.
// If you removed this check entirely, every animation would always play at
// full strength for every visitor, which is not accessibility-friendly.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Register the ScrollTrigger plugin with GSAP core.
// WHY THIS LINE IS REQUIRED: GSAP ships ScrollTrigger as a separate,
// optional plugin file (loaded via the second <script> tag in index.html).
// Simply loading the file is not enough - GSAP needs to be told "please
// activate this plugin" via gsap.registerPlugin(). If this line is removed
// or run before the ScrollTrigger script has loaded, every ScrollTrigger-based
// animation later in this file will silently fail to trigger on scroll.
gsap.registerPlugin(ScrollTrigger);

/* -----------------------------------------------------------------
   2. PRELOADER
   WHY THIS FUNCTION EXISTS: fonts and the GSAP hero animation need a
   brief moment to be ready. Fading out a simple preloader once the
   window has fully loaded avoids visitors seeing unstyled text or a
   half-finished animation flash on screen.
----------------------------------------------------------------- */
function initPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return; // defensive check: if the element was removed from HTML, don't crash the rest of the script

  // window 'load' fires once ALL page resources (fonts, images, etc.)
  // have finished loading - later than 'DOMContentLoaded', which only
  // waits for the HTML itself to be parsed.
  window.addEventListener('load', () => {
    gsap.to(preloader, {
      opacity: 0,          // fades the preloader out
      duration: 0.6,       // half-second-ish fade - fast enough to not feel like a delay, slow enough to not "pop"
      ease: 'power2.out',  // starts fast, eases to a gentle stop - feels natural for a UI fade
      onComplete: () => {
        // Fully remove it from layout after the fade so it can never
        // block clicks on the page underneath it (it has no pointer-events
        // rule, but display:none is a safe belt-and-braces guarantee).
        preloader.style.display = 'none';
      }
    });
  });
}

/* -----------------------------------------------------------------
   3. CUSTOM CURSOR
   WHY gsap.quickTo(): quickTo() creates a highly optimised, reusable
   tween function specifically designed for high-frequency updates like
   mousemove. Calling gsap.to() fresh on every single mousemove event
   would create a new tween object every few milliseconds - wasteful and
   can cause jank. quickTo() instead re-targets ONE existing tween, which
   is dramatically cheaper and smoother.
----------------------------------------------------------------- */
function initCustomCursor() {
  const dot = document.getElementById('cursorDot');
  const ring = document.getElementById('cursorRing');
  if (!dot || !ring) return;

  // Skip entirely on touch devices or if reduced motion is requested -
  // there is no real mouse pointer to follow anyway.
  const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!isFinePointer || prefersReducedMotion) return;

  // quickTo(target, property, config) returns a function you call
  // repeatedly with a new value - GSAP handles the animation internally.
  // duration/ease here control how "laggy"/smooth the follow feels:
  //   - dot uses a very short duration (0.1s) so it feels glued to the pointer
  //   - ring uses a longer duration (0.35s) so it trails behind, giving the
  //     two-part cursor its layered, futuristic feel.
  const moveDotX = gsap.quickTo(dot, 'x', { duration: 0.1, ease: 'power3.out' });
  const moveDotY = gsap.quickTo(dot, 'y', { duration: 0.1, ease: 'power3.out' });
  const moveRingX = gsap.quickTo(ring, 'x', { duration: 0.35, ease: 'power3.out' });
  const moveRingY = gsap.quickTo(ring, 'y', { duration: 0.35, ease: 'power3.out' });

  window.addEventListener('mousemove', (e) => {
    moveDotX(e.clientX);
    moveDotY(e.clientY);
    moveRingX(e.clientX);
    moveRingY(e.clientY);
  });

  // Grow the ring slightly whenever the mouse hovers any clickable element.
  // WHY delegate on document instead of adding a listener to every link:
  // adding one listener to `document` and checking e.target.closest(...)
  // works for elements added to the page later too, and avoids attaching
  // hundreds of individual listeners.
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('a, button, .magnetic, [data-hover-card]')) {
      ring.style.width = '54px';
      ring.style.height = '54px';
      ring.style.borderColor = 'var(--accent-violet)';
    }
  });
  document.addEventListener('mouseout', (e) => {
    if (e.target.closest('a, button, .magnetic, [data-hover-card]')) {
      ring.style.width = '34px';
      ring.style.height = '34px';
      ring.style.borderColor = 'rgba(0,229,255,0.5)';
    }
  });
}

/* -----------------------------------------------------------------
   4. SMOOTH SCROLL FOR IN-PAGE LINKS
   WHY A CUSTOM FUNCTION INSTEAD OF CSS `scroll-behavior: smooth`:
   GSAP's scrollTo (via ScrollToPlugin behaviour built into modern GSAP,
   here implemented manually with gsap.to(window, {scrollTo:...}) equivalent
   using native scrollIntoView + easing) gives us control over duration and
   easing curve, and lets us account for the fixed navbar height so section
   titles don't end up hidden underneath it.
----------------------------------------------------------------- */
function initSmoothScroll() {
  // Select every link that opted in with data-scroll (see index.html).
  const links = document.querySelectorAll('[data-scroll]');
  const navbar = document.getElementById('navbar');

  links.forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.getAttribute('href');
      // Only intercept real in-page anchors (starting with #). This guards
      // against accidentally breaking a link that might later point
      // somewhere else if href values change.
      if (!targetId || !targetId.startsWith('#')) return;

      const targetEl = document.querySelector(targetId);
      if (!targetEl) return;

      e.preventDefault(); // stop the browser's instant, jarring jump-to-anchor behaviour

      // Measure the fixed navbar's height so we can offset the scroll
      // target - otherwise the navbar would visually cover the top of
      // whichever section we scroll to.
      const navHeight = navbar ? navbar.offsetHeight : 0;
      const targetY = targetEl.getBoundingClientRect().top + window.scrollY - navHeight;

      // NOTE ON THIS TECHNIQUE: GSAP has an official ScrollToPlugin that
      // can animate `window` directly, but it requires loading an extra
      // <script> file. To keep the project to just 2 GSAP files (core +
      // ScrollTrigger), we instead animate a plain JS object's `y` value
      // from the current scroll position to the target, and on every
      // animation frame (onUpdate) call the browser's native
      // window.scrollTo() with that value. This gives us the exact same
      // eased scrolling result without an extra plugin dependency.
      const scrollState = { y: window.scrollY };
      gsap.to(scrollState, {
        y: targetY,
        duration: 1,
        ease: 'power3.inOut',
        onUpdate: () => window.scrollTo(0, scrollState.y),
      });

      // Close the mobile menu automatically after clicking a link,
      // so visitors aren't stuck looking at an open menu after navigating.
      document.getElementById('navLinks')?.classList.remove('is-open');
      document.getElementById('navToggle')?.setAttribute('aria-expanded', 'false');
    });
  });
}

/* -----------------------------------------------------------------
   5. MOBILE NAV TOGGLE
   Plain vanilla JS + CSS transition (no GSAP needed) - this is a simple
   binary show/hide state, GSAP is reserved for richer, multi-property
   animations elsewhere on the page.
----------------------------------------------------------------- */
function initNavToggle() {
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (!toggle || !links) return;

  toggle.addEventListener('click', () => {
    const isOpen = links.classList.toggle('is-open'); // toggle() returns the new state (true/false), so we reuse it below instead of checking again
    toggle.classList.toggle('is-open', isOpen);
    toggle.setAttribute('aria-expanded', String(isOpen)); // keeps screen readers informed of the menu's open/closed state
  });
}

/* -----------------------------------------------------------------
   6. NAVBAR SCROLLED STATE
   WHY: a small, purely cosmetic enhancement - could be removed with no
   functional loss - that adds a subtle stronger background/blur to the
   navbar once the visitor has scrolled past the hero, improving text
   contrast when the hero's transparent-ish nav sits above busier content.
----------------------------------------------------------------- */
function initNavbarScrollState() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  // ScrollTrigger.create with no "trigger element" pinned content - just
  // a plain scroll listener alternative - is used here for its built-in
  // throttling/performance handling instead of a raw 'scroll' event listener.
  ScrollTrigger.create({
    start: 'top -80', // fires once the page has scrolled 80px past the very top
    onUpdate: (self) => {
      navbar.style.borderBottomColor = self.progress > 0 || window.scrollY > 80
        ? 'rgba(255,255,255,0.14)'
        : 'rgba(255,255,255,0.08)';
    },
  });
}

/* -----------------------------------------------------------------
   7. HERO ENTRANCE TIMELINE
   WHY A TIMELINE (gsap.timeline()) INSTEAD OF SEPARATE gsap.to() CALLS:
   A timeline lets us sequence multiple animations with precise relative
   timing using position parameters (e.g. "-=0.4" below), so each element
   animates in slightly after the previous one (a "stagger" feel) without
   manually calculating absolute delay values for every single element.
   If we used isolated gsap.to() calls instead, every element would animate
   at the exact same moment (unless we manually added delay:0.2, delay:0.4,
   etc. to each one) - a timeline manages that relative timing FOR us.
----------------------------------------------------------------- */
function initHeroTimeline() {
  // Grab every hero element marked for entrance animation, in DOM order.
  const heroEls = gsap.utils.toArray('[data-anim-hero]');
  if (heroEls.length === 0) return;

  if (prefersReducedMotion) {
    // If the visitor prefers reduced motion, just show everything
    // immediately at full opacity instead of animating it in.
    gsap.set(heroEls, { opacity: 1, y: 0 });
    return;
  }

  // Set the STARTING state first (invisible, shifted down slightly).
  // WHY gsap.set() here: set() applies values INSTANTLY with no animation -
  // it's how we define the "from" state before the timeline below animates
  // "to" the final state. Without this, elements would already be visible
  // in their HTML/CSS default state and the "fade/slide up" would have
  // nothing to animate from.
  gsap.set(heroEls, { opacity: 0, y: 30 });

  // Create the timeline. `defaults` sets shared properties for every
  // .to() call added to this timeline, so we don't repeat
  // duration/ease on each line individually.
  const heroTl = gsap.timeline({
    defaults: { duration: 0.9, ease: 'power3.out' },
  });

  heroTl.to(heroEls, {
    opacity: 1,
    y: 0,
    stagger: 0.15, // each element in the array starts 0.15s after the previous one - creates the cascading "one line after another" reveal
  });

  // Also fade + scale in the hero visual (orbit rings / chips / core)
  // slightly AFTER the text starts, using a "-=" position parameter.
  // "-=0.6" means "start this tween 0.6 seconds before the previous
  // tween in the timeline finishes" - it overlaps the animations instead
  // of waiting for the text to fully finish first, making the whole
  // entrance feel connected rather than like two separate events.
  heroTl.fromTo(
    '.hero-visual',
    { opacity: 0, scale: 0.85 },
    { opacity: 1, scale: 1, duration: 1.1, ease: 'back.out(1.4)' }, // back.out overshoots slightly then settles - gives a lively "pop" feel appropriate for a creative-developer visual
    '-=0.6'
  );
}

/* -----------------------------------------------------------------
   8. HERO FLOATING VISUAL - INFINITE AMBIENT ANIMATION
   WHY SEPARATE FROM THE ENTRANCE TIMELINE: the entrance timeline runs
   ONCE on page load. This function sets up a DIFFERENT, INFINITE
   animation that keeps the visual feeling alive for as long as the
   visitor stays on the page. Keeping them as two separate functions
   means you can tweak/disable one without breaking the other.
----------------------------------------------------------------- */
function initFloatingVisual() {
  if (prefersReducedMotion) return; // skip continuous motion entirely for reduced-motion visitors

  // --- Orbit rings: slow continuous 360° rotation ---
  gsap.utils.toArray('[data-float]').forEach((ring, i) => {
    gsap.to(ring, {
      rotate: 360,
      duration: 40 + i * 15, // outer ring (i=0) takes 40s per rotation, inner ring (i=1) takes 55s - different speeds make the layered rotation feel less mechanical/synchronized
      ease: 'none', // "none" = perfectly linear speed, correct for a continuous rotation loop (any easing would cause a visible speed-up/slow-down "jerk" every time the loop repeats)
      repeat: -1, // -1 means "repeat forever"
    });
  });

  // --- Floating chips: each one gets its own gentle up/down float + slight rotation ---
  gsap.utils.toArray('[data-float-item]').forEach((chip, i) => {
    // gsap.timeline({repeat:-1, yoyo:true}) makes the tween play forward
    // then automatically reverse back to its start, forever - perfect for
    // a smooth "floating" up-and-down motion instead of a hard reset/jump.
    gsap.to(chip, {
      y: i % 2 === 0 ? -18 : 18, // alternate direction (even-indexed chips float up, odd-indexed float down) so they don't all move in unison, which looks more organic
      rotate: i % 2 === 0 ? 4 : -4,
      duration: 3 + i * 0.4, // stagger the duration slightly per chip for the same "not perfectly synchronized" reason as above
      ease: 'sine.inOut', // sine easing is smooth in both directions - ideal for infinite yoyo loops (no jarring start/stop)
      yoyo: true,   // after reaching the end value, animate back to the start value
      repeat: -1,   // loop forever
      delay: i * 0.2, // slight offset so all 5 chips don't start their cycle at the exact same instant
    });
  });
}

/* -----------------------------------------------------------------
   9. SCROLL-TRIGGERED SECTION REVEALS
   WHY ScrollTrigger INSTEAD OF ANIMATING EVERYTHING ON PAGE LOAD:
   Sections further down the page are off-screen when the page first
   loads - animating them immediately would be wasted (invisible to the
   visitor) and could even cause layout jank. ScrollTrigger instead waits
   until each element scrolls into view before playing its animation,
   which is both more performant and creates a satisfying "reveal as you
   scroll" storytelling effect.
----------------------------------------------------------------- */
function initScrollReveals() {
  const revealEls = gsap.utils.toArray('[data-reveal]');

  revealEls.forEach((el) => {
    if (prefersReducedMotion) {
      gsap.set(el, { opacity: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      el,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,        // the element being watched
          start: 'top 85%',   // animation begins when the element's TOP reaches 85% down the viewport (i.e. just as it starts entering view from the bottom)
          toggleActions: 'play none none none', // play once on enter; do nothing on leave/enter-back/leave-back (change to 'play none none reverse' if you want it to reverse when scrolled back past)
        },
      }
    );
  });

  // Card grids get a slightly different treatment: a staggered reveal
  // across all cards in the same grid, so they cascade in together
  // rather than each card needing its own [data-reveal] attribute.
  gsap.utils.toArray('.card-grid').forEach((grid) => {
    const cards = grid.querySelectorAll('.project-card');
    if (cards.length === 0) return;

    if (prefersReducedMotion) {
      gsap.set(cards, { opacity: 1, y: 0 });
      return;
    }

    gsap.fromTo(
      cards,
      { opacity: 0, y: 60 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15, // cards animate in one after another left-to-right/top-to-bottom in DOM order
        ease: 'power3.out',
        scrollTrigger: {
          trigger: grid,
          start: 'top 85%',
        },
      }
    );
  });
}

/* -----------------------------------------------------------------
   10. PROJECT CARD HOVER ANIMATIONS
   (Email cards, Banner cards, DAM card all share this behaviour.)

   WHY A REUSABLE FUNCTION INSTEAD OF PURE CSS :hover:
   We need to animate MULTIPLE properties together (vertical lift,
   scale, box-shadow "glow", and a subtle secondary movement on the
   inner content) with a specific easing curve, and we want the
   animation to smoothly REVERSE on mouse-leave from wherever it
   currently is (even if the visitor moves the mouse away quickly
   mid-animation). GSAP handles that interruption/reversal gracefully;
   a plain CSS transition can technically do this too, but controlling
   several different eased properties together with this level of
   polish is simpler and more consistent through one JS function.
----------------------------------------------------------------- */
function initCardHoverAnimations() {
  const cards = gsap.utils.toArray('[data-hover-card]');

  cards.forEach((card) => {
    const body = card.querySelector('.project-card-body');

    // Each card gets its OWN gsap.timeline(), paused by default (paused:true).
    // WHY a paused timeline instead of calling gsap.to() directly in the
    // event listeners: pre-building the timeline once means the browser
    // doesn't have to recalculate/create new tweens on every hover -
    // we simply call .play() / .reverse() on the same timeline repeatedly,
    // which is cheaper and guarantees the hover-in and hover-out animations
    // are always exact mirrors of each other.
    const hoverTl = gsap.timeline({ paused: true });

    hoverTl
      .to(card, {
        y: -12,                       // lifts the whole card upward - the "hovering off the page" feel
        scale: 1.02,                  // slight scale-up reinforces the lift without looking cartoonish
        boxShadow: '0 20px 45px rgba(0,229,255,0.18), 0 0 0 1px rgba(0,229,255,0.35)', // soft drop shadow + glowing border-like ring
        duration: 0.4,
        ease: 'power2.out',           // quick, confident ease-out - feels responsive to the cursor
      })
      .to(
        body,
        {
          y: -4, // the text content inside the card shifts up SLIGHTLY LESS/differently than the card itself, creating subtle "parallax" depth between the card shell and its content
          duration: 0.4,
          ease: 'power2.out',
        },
        '<' // "<" position parameter = start this tween at the SAME time as the previous one (fully parallel), unlike the "-=" overlap used in the hero timeline
      );

    // play()/reverse() are what actually trigger the animation.
    // reverse() specifically animates smoothly BACKWARDS from whatever
    // point the timeline is currently at - so if you move the mouse away
    // mid-animation, it doesn't snap, it eases back out naturally.
    card.addEventListener('mouseenter', () => hoverTl.play());
    card.addEventListener('mouseleave', () => hoverTl.reverse());
  });
}

/* -----------------------------------------------------------------
   11. MAGNETIC BUTTON HOVER EFFECT
   WHY: a small but memorable interaction detail common in modern
   "creative developer" portfolios - the button subtly moves TOWARD the
   cursor as if magnetically attracted, then springs back to center on
   mouse-leave. This reinforces the "polished, animation-savvy developer"
   positioning of the whole page.
----------------------------------------------------------------- */
function initMagneticButtons() {
  if (prefersReducedMotion) return;

  const buttons = gsap.utils.toArray('.magnetic');

  buttons.forEach((btn) => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      // Calculate the cursor's position RELATIVE TO THE BUTTON'S CENTER
      // (not the page) - this is what lets the button "pull toward"
      // wherever inside itself the cursor currently is.
      const relX = e.clientX - rect.left - rect.width / 2;
      const relY = e.clientY - rect.top - rect.height / 2;

      gsap.to(btn, {
        x: relX * 0.35, // multiplying by 0.35 (instead of 1) dampens the movement - the button moves PART of the way toward the cursor, not the full distance, which looks magnetic rather than glued to the pointer
        y: relY * 0.35,
        duration: 0.3,
        ease: 'power2.out',
      });
    });

    btn.addEventListener('mouseleave', () => {
      // Snap back to its resting position (0,0 offset) with a slightly
      // bouncy ease - "elastic.out" overshoots and settles, mimicking a
      // real magnet releasing.
      gsap.to(btn, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: 'elastic.out(1, 0.4)', // params: (amplitude, period) - amplitude 1 = normal overshoot strength, period 0.4 = fairly quick oscillation. Increase period for a slower, wobblier settle.
      });
    });
  });
}

/* -----------------------------------------------------------------
   12. INFINITE MARQUEE (tech/tools strip)
   WHY xPercent INSTEAD OF x (pixels): xPercent moves the element based
   on a PERCENTAGE OF ITS OWN WIDTH rather than a fixed pixel value.
   Since both .marquee-track elements are exactly the same width as each
   other (they contain identical content), animating xPercent from 0 to
   -100 moves a track EXACTLY one full track-width to the left, which is
   precisely the distance needed for the second, identical track to have
   seamlessly taken its place - creating the illusion of an infinite loop.
   If we used a fixed pixel value instead, the loop would only line up
   correctly at one specific screen width and break responsively.
----------------------------------------------------------------- */
function initMarquee() {
  const tracks = gsap.utils.toArray('.marquee-track');
  if (tracks.length === 0 || prefersReducedMotion) return;

  gsap.to(tracks, {
    xPercent: -100,
    duration: 30,     // total seconds for one full loop - LOWER this number for a faster scroll, RAISE it for a slower/more relaxed scroll
    ease: 'none',     // linear speed is essential for a marquee - any easing would make it visibly speed up/slow down every time it loops, which looks broken
    repeat: -1,       // loop forever
  });
}

/* -----------------------------------------------------------------
   13.5. CONTACT FORM SUBMISSION (real backend call)
   WHY THIS FUNCTION EXISTS: the form previously had nowhere to send its
   data, so clicking "Send Message" did nothing useful. This function
   intercepts the browser's default form submission (which would cause
   a full page reload) and instead sends the form's data as JSON to a
   backend endpoint using the Fetch API - the modern, promise-based way
   to make HTTP requests from the browser without a page reload.

   The matching backend lives in /backend/server.js (Node.js + Express +
   Nodemailer) - see that file's comments for how the email actually
   gets sent from the server side. This function only cares about the
   FRONTEND half: collect the data, send it, and show the visitor
   whether it worked.
----------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const statusEl = document.getElementById('formStatus');
  const submitBtn = document.getElementById('contactSubmitBtn');
  const btnLabel = submitBtn.querySelector('.btn-label');

  // Read the backend URL from the form's data-api-endpoint attribute
  // (set in index.html) instead of hardcoding it here - see the comment
  // on that attribute in index.html for why.
  const endpoint = form.dataset.apiEndpoint;

  // Small helper to show a status message in either the success or
  // error color state. WHY A HELPER FUNCTION: this exact same 4-line
  // sequence (set text, set class, add is-visible) is needed in both
  // the success AND error branches below - extracting it avoids
  // repeating the same code twice and keeps both messages behaving
  // identically (same classes toggled the same way).
  function showStatus(message, type) {
    statusEl.textContent = message;
    statusEl.className = `form-status is-visible form-status--${type}`; // type is either 'success' or 'error'
  }

  form.addEventListener('submit', async (e) => {
    // Stop the browser's default behaviour, which would normally
    // navigate to a new URL (e.g. index.html?name=...) and reload the
    // whole page, wiping out any in-progress GSAP animations/state.
    e.preventDefault();

    // FormData automatically reads every <input>/<textarea> inside the
    // form by its `name` attribute - so we don't have to manually grab
    // document.getElementById('name').value, .getElementById('email').value,
    // etc. one by one. Object.fromEntries() then converts that FormData
    // into a plain { name, email, message } object, which is the shape
    // our backend expects as JSON.
    const data = Object.fromEntries(new FormData(form).entries());

    // Disable the button + swap its label while the request is in
    // flight. WHY: prevents the visitor from clicking "Send Message"
    // multiple times and accidentally emailing you the same message
    // several times before the first request has even finished.
    submitBtn.disabled = true;
    btnLabel.textContent = 'Sending...';
    statusEl.className = 'form-status'; // hide any previous status message while a new request is running

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // tells the backend to expect/parse a JSON body
        body: JSON.stringify(data),
      });

      // fetch() only rejects on NETWORK failure (e.g. no internet) - a
      // 4xx/5xx response from the server still resolves successfully,
      // so we must manually check `response.ok` (true for status 200-299)
      // to know whether the backend actually accepted the message.
      if (!response.ok) {
        throw new Error('Server responded with an error');
      }

      showStatus("Thanks! Your message has been sent - I'll reply soon.", 'success');
      form.reset(); // clears all input fields back to empty, ready for another message
    } catch (err) {
      // Runs if: the network request failed outright, OR the backend
      // responded with a non-2xx status (see the `throw` above).
      showStatus('Something went wrong sending your message. Please email me directly instead.', 'error');
      console.error('Contact form submission failed:', err);
    } finally {
      // `finally` runs whether the request succeeded or failed - always
      // re-enable the button so the visitor can try again if needed.
      submitBtn.disabled = false;
      btnLabel.textContent = 'Send Message';
    }
  });
}

/* -----------------------------------------------------------------
   13. FOOTER YEAR + INITIALISE EVERYTHING
   WHY A DYNAMIC YEAR: hardcoding "2026" in the HTML would silently
   become outdated every January 1st. Reading it from `new Date()` means
   the footer is always correct with zero maintenance.
----------------------------------------------------------------- */
function setFooterYear() {
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

// Run every setup function once the HTML has been fully parsed.
// WHY 'DOMContentLoaded' AND NOT JUST RUNNING THE CODE INLINE:
// this script tag is loaded at the very end of <body> (after all HTML
// above it), so in THIS specific file placement DOMContentLoaded has
// technically already fired-ish for elements above the script tag -
// but wrapping everything in this listener is still a defensive best
// practice: it guarantees this code only runs once ALL of the DOM
// (including anything below the script tag, if the file is ever moved)
// is guaranteed to exist, so querySelector calls never fail silently
// just because of script placement.
document.addEventListener('DOMContentLoaded', () => {
  initPreloader();
  initCustomCursor();
  initSmoothScroll();
  initNavToggle();
  initNavbarScrollState();
  initHeroTimeline();
  initFloatingVisual();
  initScrollReveals();
  initCardHoverAnimations();
  initMagneticButtons();
  initMarquee();
  initContactForm();
  setFooterYear();
});
