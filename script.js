(() => {
  const mobile = window.matchMedia("(max-width: 960px)");

  /* ===== Navigation: mega menus + compact-on-scroll ===== */
  const nav = document.getElementById("nav");
  const links = nav.querySelectorAll(".nav__link");
  const panels = nav.querySelectorAll(".mega");
  const burger = nav.querySelector(".nav__burger");
  let closeTimer;

  links.forEach((l) => {
    const panel = nav.querySelector(`[data-panel="${l.dataset.menu}"]`);
    panel.dataset.title = l.textContent;
  });

  function openMenu(name) {
    clearTimeout(closeTimer);
    nav.classList.add("is-open");
    links.forEach((l) => l.setAttribute("aria-expanded", String(l.dataset.menu === name)));
    panels.forEach((p) => p.classList.toggle("is-active", p.dataset.panel === name));
    updateCompact();
  }
  function closeMenu() {
    nav.classList.remove("is-open");
    links.forEach((l) => l.setAttribute("aria-expanded", "false"));
    burger.setAttribute("aria-expanded", "false");
    updateCompact();
  }

  links.forEach((l) => {
    l.addEventListener("mouseenter", () => !mobile.matches && openMenu(l.dataset.menu));
    l.addEventListener("click", () =>
      l.getAttribute("aria-expanded") === "true" ? closeMenu() : openMenu(l.dataset.menu)
    );
  });
  nav.addEventListener("mouseleave", () => {
    if (!mobile.matches) closeTimer = setTimeout(closeMenu, 180);
  });
  nav.addEventListener("mouseenter", () => clearTimeout(closeTimer));
  burger.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    open ? nav.classList.add("is-open") : closeMenu();
    burger.setAttribute("aria-expanded", String(open));
  });
  nav.querySelectorAll(".nav__panels a").forEach((a) => a.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());

  // Compact after the hero; slide away while scrolling down through the pinned collection.
  const collection = document.getElementById("collection");
  let lastY = window.scrollY;
  function updateCompact() {
    const y = window.scrollY;
    const open = nav.classList.contains("is-open");
    const r = collection.getBoundingClientRect();
    const inCollection = r.top <= 1 && r.bottom > window.innerHeight * 0.5;
    if (!inCollection || y < lastY || open) nav.classList.remove("is-hidden");
    else if (y > lastY) nav.classList.add("is-hidden");
    nav.classList.toggle("is-compact", y > 80 && !open);
    lastY = y;
  }

  /* ===== Hero search ===== */
  document.getElementById("search").addEventListener("submit", (e) => {
    e.preventDefault();
    document.getElementById("collection").scrollIntoView({ behavior: "smooth" });
  });

  /* ===== Country geo map ===== */
  const REGIONS = {
    europe: [
      ["Bulgaria", 25.5, 42.7], ["Croatia", 15.2, 45.1], ["Cyprus", 33.4, 35.1],
      ["Georgia", 43.4, 42.3], ["Greece", 21.8, 39.1], ["Montenegro", 19.4, 42.7],
      ["Spain", -3.7, 40.4], ["Turkey", 35.0, 39.0], ["United Kingdom", -2.0, 54.0],
    ],
    mea: [["Egypt", 30.8, 26.8], ["Oman", 55.9, 21.5], ["Qatar", 51.2, 25.35], ["UAE", 54.4, 24.4]],
    apac: [
      ["Indonesia", 118.0, -2.5], ["Cambodia", 104.9, 12.6], ["Maldives", 73.2, 3.2],
      ["New Zealand", 174.0, -41.0], ["Philippines", 121.8, 12.9], ["Thailand", 100.9, 15.9],
    ],
    americas: [["Florida", -81.7, 27.8], ["Mexico", -102.5, 23.6]],
  };

  const mapEl = document.getElementById("map");
  const listEl = document.getElementById("country-list");
  const regionBtns = document.querySelectorAll("[data-region]");
  const W = 780, H = 439;
  const NS = "http://www.w3.org/2000/svg";
  const pinEls = {};
  let region = "mea";

  function svgEl(tag, attrs) {
    const el = document.createElementNS(NS, tag);
    for (const k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  function setRegion(name) {
    region = name;
    regionBtns.forEach((b) => b.setAttribute("aria-selected", String(b.dataset.region === name)));
    listEl.innerHTML = "";
    listEl.classList.toggle("is-long", REGIONS[name].length > 5);
    REGIONS[name].forEach(([country], i) => {
      const li = document.createElement("li");
      li.style.animationDelay = `${i * 50}ms`;
      const b = document.createElement("button");
      b.textContent = country;
      b.addEventListener("mouseenter", () => highlight(country));
      b.addEventListener("focus", () => highlight(country));
      b.addEventListener("mouseleave", () => highlight(null));
      b.addEventListener("blur", () => highlight(null));
      li.appendChild(b);
      listEl.appendChild(li);
    });
    Object.entries(pinEls).forEach(([country, el]) => {
      const show = el.dataset.region === name;
      el.classList.toggle("is-hidden", !show);
      if (show) {
        const g = el.querySelector(".pin-drop");
        g.style.animation = "none";
        void g.getBoundingClientRect();
        g.style.animation = "";
        g.style.animationDelay = `${300 + REGIONS[name].findIndex((c) => c[0] === country) * 60}ms`;
      }
    });
    if (map.ready && map.inView) map.zoomTo(name);
  }

  function highlight(country) {
    Object.entries(pinEls).forEach(([c, el]) => el.classList.toggle("is-active", c === country));
    listEl.querySelectorAll("button").forEach((b) => b.classList.toggle("is-active", b.textContent === country));
  }

  // Area each region zooms to, as [[west, south], [east, north]].
  const REGION_BOUNDS = {
    europe: [[-12, 33], [48, 59]],
    mea: [[22, 12], [62, 34]],
    apac: [[68, -47], [180, 24]],
    americas: [[-118, 14], [-72, 36]],
  };
  const map = { ready: false, inView: false };

  regionBtns.forEach((b) => b.addEventListener("click", () => setRegion(b.dataset.region)));
  setRegion(region);

  async function drawMap() {
    if (!window.d3 || !window.topojson) return;
    const topo = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json").then((r) => r.json());
    const land = topojson.feature(topo, topo.objects.land);
    const projection = d3.geoMercator().fitExtent([[0, 0], [W, H]], {
      type: "MultiPoint", coordinates: [[-172, -56], [180, 80]],
    });

    const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "World map" });
    const dotLayer = svgEl("g", {});
    svg.appendChild(dotLayer);

    // Dots keep the same on-screen size at every zoom: the land is re-rasterised
    // for the current view and a hex grid is sampled from it.
    const RES = 2;
    const canvas = document.createElement("canvas");
    canvas.width = W * RES; canvas.height = H * RES;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const geoPath = d3.geoPath(projection, ctx);

    function dotsFor(vb) {
      const k = W / vb.w;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(RES * k, 0, 0, RES * k, -vb.x * RES * k, -vb.y * RES * k);
      ctx.beginPath();
      geoPath(land);
      ctx.fill();
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const step = 5.2, rad = 1.6;
      let d = "";
      for (let sy = step / 2, row = 0; sy < H; sy += step * 0.866, row++) {
        for (let sx = (row % 2 ? step / 2 : 0) + step / 2; sx < W; sx += step) {
          if (data[(Math.round(sy * RES) * canvas.width + Math.round(sx * RES)) * 4 + 3] > 128) {
            const x = vb.x + sx / k, y = vb.y + sy / k, r = rad / k;
            d += `M${(x - r).toFixed(2)} ${y.toFixed(2)}a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(2 * r).toFixed(2)} 0a${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(-2 * r).toFixed(2)} 0`;
          }
        }
      }
      const layer = svgEl("path", { d, class: "map-dot map-dots" });
      return layer;
    }

    function viewFor(name) {
      const [[w, s], [e, n]] = REGION_BOUNDS[name];
      const [x0, y0] = projection([w, n]);
      const [x1, y1] = projection([e, s]);
      let vw = x1 - x0, vh = y1 - y0;
      const cx = x0 + vw / 2, cy = y0 + vh / 2;
      if (vw / vh > W / H) vh = vw * H / W; else vw = vh * W / H;
      return { x: cx - vw / 2, y: cy - vh / 2, w: vw, h: vh };
    }

    let view = { x: 0, y: 0, w: W, h: H };
    let currentDots = dotsFor(view);
    dotLayer.appendChild(currentDots);
    let raf;

    function applyView(v) {
      svg.setAttribute("viewBox", `${v.x} ${v.y} ${v.w} ${v.h}`);
      const k = W / v.w;
      Object.values(pinEls).forEach((g) => g.setAttribute("transform", `translate(${g.dataset.x} ${g.dataset.y}) scale(${1 / k})`));
    }

    map.zoomTo = (name) => {
      const from = { ...view }, to = viewFor(name);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const dur = reduce ? 0 : 1100, t0 = performance.now();
      cancelAnimationFrame(raf);
      currentDots.style.opacity = ".55";
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const tick = (now) => {
        const t = dur ? Math.min(1, (now - t0) / dur) : 1, e = ease(t);
        view = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e, w: from.w + (to.w - from.w) * e, h: from.h + (to.h - from.h) * e };
        applyView(view);
        if (t < 1) { raf = requestAnimationFrame(tick); return; }
        // Swap in crisp dots for the new view with a short crossfade.
        const next = dotsFor(view), old = currentDots;
        next.style.opacity = "0";
        dotLayer.appendChild(next);
        requestAnimationFrame(() => { next.style.opacity = "1"; old.style.opacity = "0"; });
        setTimeout(() => old.remove(), 650);
        currentDots = next;
      };
      raf = requestAnimationFrame(tick);
    };

    const pins = svgEl("g", {});
    Object.entries(REGIONS).forEach(([reg, list]) => {
      list.forEach(([country, lon, lat]) => {
        const [x, y] = projection([lon, lat]);
        const g = svgEl("g", { class: "pin", "data-region": reg, "data-x": x.toFixed(2), "data-y": y.toFixed(2), transform: `translate(${x.toFixed(2)} ${y.toFixed(2)})`, tabindex: "-1" });
        const drop = svgEl("g", { class: "pin-drop" });
        drop.appendChild(svgEl("circle", { r: 12, class: "pin__pulse" }));
        drop.appendChild(svgEl("circle", { r: 9, class: "pin__head" }));
        const label = svgEl("text", { class: "pin__label", x: 15, y: -12 });
        label.textContent = country;
        drop.appendChild(label);
        g.appendChild(drop);
        g.addEventListener("mouseenter", () => highlight(country));
        g.addEventListener("mouseleave", () => highlight(null));
        pins.appendChild(g);
        pinEls[country] = g;
      });
    });
    svg.appendChild(pins);
    mapEl.appendChild(svg);
    map.ready = true;
    setRegion(region);

    // Start on the whole world, then zoom into the selected region once the map is seen.
    new IntersectionObserver((entries, obs) => {
      if (!entries[0].isIntersecting) return;
      obs.disconnect();
      map.inView = true;
      setTimeout(() => map.zoomTo(region), 500);
    }, { threshold: 0.5 }).observe(mapEl);
  }
  drawMap().catch(() => {});

  /* ===== Collection: sticky stacked listings ===== */
  const listings = [...document.querySelectorAll(".listing")];
  listings.forEach((l) => {
    const shade = document.createElement("div");
    shade.className = "listing__shade";
    l.appendChild(shade);
  });
  const inObserver = new IntersectionObserver(
    (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("is-in")),
    { threshold: 0.35 }
  );
  listings.forEach((l) => inObserver.observe(l));

  function updateStack() {
    listings.forEach((l, i) => {
      const next = listings[i + 1];
      let p = 0;
      if (next) {
        const top = parseFloat(getComputedStyle(l).top) || 0;
        const h = l.offsetHeight;
        p = Math.min(1, Math.max(0, 1 - (next.getBoundingClientRect().top - top) / h));
      }
      l.style.transform = p ? `scale(${1 - p * 0.04})` : "";
      l.querySelector(".listing__shade").style.opacity = (p * 0.55).toFixed(3);
      l.querySelector(".listing__info").style.opacity = (1 - p * 0.6).toFixed(3);
    });
  }

  /* ===== How it works: pinned section, steps follow scroll ===== */
  const how = document.querySelector(".how");
  const stepItems = [...how.querySelectorAll(".how__steps li")];
  const details = [...how.querySelectorAll(".how__detail")];
  let current = -1;

  function setStep(n) {
    if (n === current) return;
    current = n;
    stepItems.forEach((li, i) => li.classList.toggle("is-active", i === n));
    details.forEach((d, i) => {
      d.classList.toggle("is-active", i === n);
      d.classList.toggle("is-past", i < n);
    });
  }
  function updateHow() {
    const r = how.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    const p = Math.min(0.9999, Math.max(0, -r.top / total));
    setStep(Math.floor(p * details.length));
  }
  how.querySelectorAll("[data-step]").forEach((b) =>
    b.addEventListener("click", () => {
      const total = how.offsetHeight - window.innerHeight;
      const y = how.getBoundingClientRect().top + window.scrollY + total * ((+b.dataset.step + 0.5) / details.length);
      window.scrollTo({ top: y, behavior: "smooth" });
    })
  );

  /* ===== Subtle reveal on scroll ===== */
  const REVEAL = [
    [".hero__copy > *, .search", "up"],
    [".country__intro > *, .country__picker, .country__map", "up"],
    [".collection__head > *", "up"],
    [".currency__copy > *", "up"],
    [".feature", "up"],
    [".inner__heading > *, .inner__body > *", "up"],
    [".inner__img-lg, .inner__img-sm", "media"],
    [".services__head > *", "up"],
    [".service", "up"],
    [".footer__brand > *, .footer__nav a, .footer__links", "up"],
  ];
  const revealObserver = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (!e.isIntersecting) return;
      e.target.classList.add("is-revealed");
      revealObserver.unobserve(e.target);
    }),
    { threshold: 0.15, rootMargin: "0px 0px -6% 0px" }
  );
  REVEAL.forEach(([sel, kind]) => {
    document.querySelectorAll(sel).forEach((el, i) => {
      el.dataset.reveal = kind;
      el.style.setProperty("--d", `${(i % 6) * 110}ms`);
      revealObserver.observe(el);
    });
  });

  /* ===== Scroll loop ===== */
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateCompact();
      updateStack();
      updateHow();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  onScroll();
})();
