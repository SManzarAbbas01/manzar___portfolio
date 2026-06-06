/* ============================================================
   MAIN.JS — renders the portfolio from Store data + UX behaviour
   ============================================================ */
(function () {
  "use strict";

  var data = null; // populated asynchronously from GET /api/portfolio
  var $ = function (id) { return document.getElementById(id); };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Typewriter effect for a single line of text. */
  function typeText(el, text, speed, startDelay) {
    if (!el) return;
    if (reduceMotion || !text) { el.textContent = text; return; }
    el.textContent = "";
    var i = 0;
    setTimeout(function tick() {
      el.textContent = text.slice(0, i);
      if (i++ <= text.length) setTimeout(tick, speed);
    }, startDelay || 0);
  }

  /* Count a stat up to its numeric target (keeps any +/% suffix). */
  function countUp(el, raw) {
    var m = String(raw).match(/^(\D*)(\d+)(.*)$/);
    if (reduceMotion || !m) { el.textContent = raw; return; }
    var pre = m[1], target = parseInt(m[2], 10), suf = m[3], cur = 0;
    var steps = 40, inc = Math.max(1, Math.ceil(target / steps));
    (function tick() {
      cur = Math.min(target, cur + inc);
      el.textContent = pre + cur + suf;
      if (cur < target) setTimeout(tick, 28);
    })();
  }

  /* ---- icons ---- */
  var ICON = {
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14zM8.34 18.34V9.94H5.56v8.4h2.78zM6.95 8.7a1.61 1.61 0 1 0 0-3.22 1.61 1.61 0 0 0 0 3.22zM18.44 18.34v-4.6c0-2.46-.53-4.35-3.4-4.35-1.38 0-2.3.76-2.68 1.48h-.04V9.94H9.66v8.4h2.77v-4.16c0-1.1.21-2.16 1.57-2.16 1.34 0 1.36 1.25 1.36 2.23v4.09h2.78z"/></svg>',
    github: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2A10 10 0 0 0 8.84 21.5c.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.58 9.58 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85V21c0 .27.16.59.67.5A10 10 0 0 0 12 2z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M7 7h10v10"/></svg>',
    cap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5"/></svg>',
    cert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 21l5-2.5L17 21l-1.5-8.5"/></svg>',
    resume: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>'
  };

  /* ---------- HERO + meta ---------- */
  function renderProfile() {
    var p = data.profile;
    $("navBrand").textContent = p.name;
    $("footBrand").textContent = p.name;
    document.title = p.name + " — " + p.role;

    // split name into words for stacked display, last word accented
    var words = (p.name || "").trim().split(/\s+/);
    var html = words.map(function (w, i) {
      var cls = i === words.length - 1 ? "line accent" : "line";
      return '<span class="' + cls + '">' + esc(w) + "</span>";
    }).join("");
    $("heroName").innerHTML = html;

    typeText($("heroRole"), p.role || "", 45, 650);
    $("heroTagline").textContent = p.tagline;
    $("heroLocation").textContent = p.location;
    $("heroImg").src = p.image || API.DEFAULT_AVATAR;
    $("heroImg").alt = p.name;

    // resume / CV download links (hero + nav)
    var resume = p.resumeUrl || "https://drive.google.com/uc?export=download&id=1UeiaYA8Z82uN04tfaaHR1yid6GG9PHFg";
    // download attribute is ignored for cross-origin (e.g. Google Drive) links,
    // so external resumes are opened in a new tab instead.
    var resumeExternal = /^https?:\/\//i.test(resume);
    var github = p.github || "https://github.com/SManzarAbbas01";
    ["heroResume", "navResume"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      if (resume) {
        el.href = resume;
        el.style.display = "";
        if (resumeExternal) {
          el.target = "_blank";
          el.rel = "noopener";
          el.removeAttribute("download");
        }
      } else { el.style.display = "none"; }
    });

    // socials
    var socials = [];
    if (p.email) socials.push('<a href="mailto:' + esc(p.email) + '" title="Email">' + ICON.mail + "</a>");
    if (p.linkedin) socials.push('<a href="' + esc(p.linkedin) + '" target="_blank" rel="noopener" title="LinkedIn">' + ICON.linkedin + "</a>");
    if (github) socials.push('<a href="' + esc(github) + '" target="_blank" rel="noopener" title="GitHub">' + ICON.github + "</a>");
    if (resume) socials.push('<a href="' + esc(resume) + '"' + (resumeExternal ? ' target="_blank" rel="noopener"' : ' download="Manzar-Abbas-Resume.pdf"') + ' title="Download résumé">' + ICON.resume + "</a>");
    if (p.phone) socials.push('<a href="tel:' + esc(p.phone.replace(/\s/g, "")) + '" title="Call">' + ICON.phone + "</a>");
    $("heroSocials").innerHTML = socials.join("");

    // about
    $("aboutLead").textContent = p.tagline;
    $("aboutBody").textContent = p.about;

    // stats
    $("statsMount").innerHTML = (p.stats || []).map(function (s) {
      return '<div class="stat"><span class="num" data-val="' + esc(s.value) + '">' + esc(s.value) +
        '</span><span class="lbl">' + esc(s.label) + "</span></div>";
    }).join("");

    // contact
    if (p.email) {
      $("contactMail").textContent = p.email;
      $("contactMail").href = "mailto:" + p.email;
    }
    var meta = [];
    if (p.phone) meta.push(esc(p.phone));
    if (p.location) meta.push(esc(p.location));
    if (p.linkedin) meta.push('<a href="' + esc(p.linkedin) + '" target="_blank" rel="noopener" style="color:var(--accent-ink)">LinkedIn</a>');
    if (github) meta.push('<a href="' + esc(github) + '" target="_blank" rel="noopener" style="color:var(--accent-ink)">GitHub</a>');
    if (resume) meta.push('<a href="' + esc(resume) + '"' + (resumeExternal ? ' target="_blank" rel="noopener"' : ' download="Manzar-Abbas-Resume.pdf"') + ' style="color:var(--accent-ink)">Download CV</a>');
    $("contactMeta").innerHTML = meta.join("<span>·</span>");

    $("footNote").textContent = "© " + new Date().getFullYear() + " " + p.name + " · Built with care.";
  }

  /* ---------- EXPERIENCE ---------- */
  function renderExperience() {
    $("timelineMount").innerHTML = (data.experience || []).map(function (e) {
      var pts = (e.points || []).map(function (pt) { return "<li>" + esc(pt) + "</li>"; }).join("");
      return '<div class="tl-item reveal">' +
        '<div class="tl-head"><span class="tl-role">' + esc(e.role) + "</span>" +
        '<span class="tl-period">' + esc(e.period) + "</span></div>" +
        '<div class="tl-company">' + esc(e.company) +
        (e.mode ? ' <span class="mode">· ' + esc(e.mode) + "</span>" : "") + "</div>" +
        (e.tech ? '<div class="tl-tech">' + esc(e.tech) + "</div>" : "") +
        '<ul class="tl-points">' + pts + "</ul></div>";
    }).join("");
  }

  /* ---------- PROJECTS ---------- */
  function renderProjects() {
    $("projectsMount").innerHTML = (data.projects || []).map(function (pr, i) {
      var tags = (pr.tags || []).map(function (t) { return '<span class="tag">' + esc(t) + "</span>"; }).join("");
      var link = pr.link
        ? '<a class="proj-link" href="' + esc(pr.link) + '" target="_blank" rel="noopener">View project ' + ICON.arrow + "</a>"
        : "";
      return '<article class="proj-card reveal">' +
        '<div class="proj-index">PROJECT / ' + pad(i + 1) + "</div>" +
        '<h3 class="proj-title">' + esc(pr.title) + "</h3>" +
        '<p class="proj-desc">' + esc(pr.desc) + "</p>" +
        '<div class="proj-tags">' + tags + "</div>" + link + "</article>";
    }).join("");
  }

  /* ---------- SKILLS ---------- */
  function renderSkills() {
    $("skillsMount").innerHTML = (data.skills || []).map(function (c) {
      var chips = (c.items || []).map(function (it) { return '<span class="chip">' + esc(it) + "</span>"; }).join("");
      return '<div class="skill-cat reveal"><h3>' + esc(c.category) + "</h3>" +
        '<div class="skill-chips">' + chips + "</div></div>";
    }).join("");
  }

  /* ---------- EDUCATION ---------- */
  function renderEducation() {
    $("eduMount").innerHTML = (data.education || []).map(function (ed) {
      return '<div class="edu-card reveal">' +
        '<div class="edu-icon">' + ICON.cap + "</div>" +
        "<div><div class=\"edu-degree\">" + esc(ed.degree) + "</div>" +
        '<div class="edu-school">' + esc(ed.school) + "</div>" +
        '<div class="edu-detail">' + esc(ed.detail || "") + "</div></div>" +
        '<div class="edu-meta"><div class="edu-period">' + esc(ed.period) + "</div>" +
        '<div class="edu-loc">' + esc(ed.location || "") + "</div></div></div>";
    }).join("");
  }

  /* ---------- CERTIFICATIONS ---------- */
  function renderCerts() {
    $("certMount").innerHTML = (data.certifications || []).map(function (c) {
      return '<div class="cert-card reveal"><div class="cert-mark">' + ICON.cert + "</div>" +
        "<div><div class=\"cert-name\">" + esc(c.name) + "</div>" +
        '<div class="cert-issuer">' + esc(c.issuer) + "</div></div></div>";
    }).join("");
  }

  /* ---------- Interactions ---------- */
  function initInteractions() {
    var nav = $("nav");
    var progress = $("scrollProgress");
    var heroGlow = $("heroGlow");
    var gridBg = document.querySelector(".grid-bg");
    var timeline = $("timelineMount");

    /* Single rAF-batched scroll loop: nav state + progress bar + timeline growth */
    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var st = window.scrollY || document.documentElement.scrollTop || 0;
        nav.classList.toggle("scrolled", st > 30);

        if (progress) {
          var docH = document.documentElement.scrollHeight - window.innerHeight;
          progress.style.width = (docH > 0 ? (st / docH) * 100 : 0) + "%";
        }

        if (timeline) {
          var r = timeline.getBoundingClientRect();
          var prog = (window.innerHeight * 0.62 - r.top) / (r.height || 1);
          timeline.style.setProperty("--tl-progress", Math.max(0, Math.min(1, prog)).toFixed(3));
        }
        ticking = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();

    /* Mobile menu */
    var burger = $("burger"), links = $("navLinks");
    burger.addEventListener("click", function () { links.classList.toggle("open"); });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { links.classList.remove("open"); });
    });

    /* Scroll reveal */
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll(".reveal").forEach(function (el, i) {
      el.style.transitionDelay = (i % 6) * 0.05 + "s";
      io.observe(el);
    });

    /* Animated stat counters (fire once when scrolled into view) */
    var statIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          countUp(en.target, en.target.getAttribute("data-val"));
          statIO.unobserve(en.target);
        }
      });
    }, { threshold: 0.6 });
    document.querySelectorAll(".stat .num").forEach(function (el) { statIO.observe(el); });

    /* Nav active-section indicator + sliding glass pill */
    var navLinksWrap = $("navLinks");
    var indicator = $("navIndicator");
    var sectionLinks = Array.prototype.slice.call(
      document.querySelectorAll('.nav-links a[href^="#"]')
    );
    var navMap = {};
    sectionLinks.forEach(function (a) { navMap[a.getAttribute("href").slice(1)] = a; });
    var activeLink = null, hovering = false;

    function moveIndicator(el) {
      if (!indicator) return;
      if (!el) { indicator.style.opacity = "0"; return; }
      indicator.style.left = (el.offsetLeft - 12) + "px";
      indicator.style.width = (el.offsetWidth + 24) + "px";
      indicator.style.opacity = "1";
    }

    sectionLinks.forEach(function (a) {
      a.addEventListener("mouseenter", function () { hovering = true; moveIndicator(a); });
    });
    document.querySelectorAll(".nav-links .nav-cta").forEach(function (c) {
      c.addEventListener("mouseenter", function () { hovering = false; moveIndicator(activeLink); });
    });
    if (navLinksWrap) {
      navLinksWrap.addEventListener("mouseleave", function () { hovering = false; moveIndicator(activeLink); });
    }

    var secIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          Object.keys(navMap).forEach(function (id) { navMap[id].classList.remove("active"); });
          activeLink = navMap[en.target.id] || null;
          if (activeLink) activeLink.classList.add("active");
          if (!hovering) moveIndicator(activeLink);
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px", threshold: 0 });
    Object.keys(navMap).forEach(function (id) {
      var s = document.getElementById(id); if (s) secIO.observe(s);
    });
    window.addEventListener("resize", function () {
      if (!hovering) moveIndicator(activeLink);
    }, { passive: true });

    /* Mouse-driven effects are desktop + motion-friendly only */
    if (reduceMotion || !window.matchMedia("(pointer:fine)").matches) return;

    /* Hero: cursor glow + grid parallax */
    var hero = $("top");
    if (hero) {
      hero.addEventListener("pointermove", function (e) {
        var r = hero.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        if (heroGlow) {
          heroGlow.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
          heroGlow.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        }
        if (gridBg) gridBg.style.transform =
          "translate(" + ((x - 0.5) * -18).toFixed(1) + "px," + ((y - 0.5) * -12).toFixed(1) + "px)";
      });
      hero.addEventListener("pointerleave", function () {
        if (gridBg) gridBg.style.transform = "";
      });
    }

    /* Hero portrait: clamped 3D tilt */
    var pw = document.querySelector(".portrait-wrap");
    var portrait = document.querySelector(".portrait");
    if (pw && portrait) {
      pw.addEventListener("pointermove", function (e) {
        var r = pw.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        portrait.style.transform =
          "perspective(900px) rotateY(" + (x * 11).toFixed(2) + "deg) rotateX(" + (-y * 11).toFixed(2) + "deg)";
      });
      pw.addEventListener("pointerleave", function () {
        portrait.style.transform = "perspective(900px) rotateY(0) rotateX(0)";
      });
    }

    /* Project cards: magnetic pull + spotlight + tilt */
    document.querySelectorAll(".proj-card").forEach(function (card) {
      card.addEventListener("pointermove", function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width;
        var y = (e.clientY - r.top) / r.height;
        card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
        card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
        var rx = (0.5 - y) * 7, ry = (x - 0.5) * 7;
        var tx = (x - 0.5) * 10, ty = (y - 0.5) * 10;
        card.style.transition = "transform 0.08s linear";
        card.style.transform =
          "perspective(900px) rotateX(" + rx.toFixed(2) + "deg) rotateY(" + ry.toFixed(2) +
          "deg) translate3d(" + tx.toFixed(1) + "px," + ty.toFixed(1) + "px, 0)";
      });
      card.addEventListener("pointerleave", function () {
        card.style.transition = "transform 0.55s cubic-bezier(0.16,1,0.3,1)";
        card.style.transform = "";
      });
    });
  }

  /* ---------- Theme toggle (dark / light) ---------- */
  function initTheme() {
    var btn = $("themeToggle");
    var root = document.documentElement;
    function current() { return root.getAttribute("data-theme") || "dark"; }
    function apply(t) {
      root.setAttribute("data-theme", t);
      try { localStorage.setItem("manzar_theme", t); } catch (e) {}
      if (btn) {
        btn.setAttribute("aria-pressed", String(t === "light"));
        btn.setAttribute("title", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
      }
    }
    apply(current());
    if (btn) btn.addEventListener("click", function () {
      apply(current() === "dark" ? "light" : "dark");
    });
  }

  /* ---------- Preloader ---------- */
  function hidePreloader() {
    var pre = $("preloader");
    if (pre) pre.classList.add("done");
  }

  /* ---------- Non-blocking error banner (backend unreachable) ---------- */
  function showError(message) {
    var name = $("heroName");
    if (name && !name.innerHTML) {
      name.innerHTML = '<span class="line accent">Manzar</span><span class="line">Abbas</span>';
    }
    var tag = $("heroTagline");
    if (tag) {
      tag.textContent = message;
      tag.style.color = "#ff6b6b";
    }
  }

  /* ---------- Render everything from fetched data ---------- */
  function renderAll() {
    renderProfile();
    renderExperience();
    renderProjects();
    renderSkills();
    renderEducation();
    renderCerts();
  }

  /* ---------- boot ---------- */
  // Theme + preloader are independent of data and run immediately.
  initTheme();

  function finishPreloader() {
    if (document.readyState === "complete") {
      setTimeout(hidePreloader, 250);
    } else {
      window.addEventListener("load", function () { setTimeout(hidePreloader, 250); });
    }
    // safety net so the loader never gets stuck
    setTimeout(hidePreloader, 2200);
  }

  API.getPortfolio()
    .then(function (fetched) {
      data = fetched || {};
      renderAll();
      // Interactions must run AFTER dynamic content (.reveal / .proj-card) exists.
      initInteractions();
    })
    .catch(function (err) {
      console.error("Failed to load portfolio data:", err);
      showError("Couldn't reach the server. Please try again shortly.");
      // Still wire up baseline interactions for nav/theme/scroll.
      try { initInteractions(); } catch (e) { /* ignore */ }
    })
    .finally(finishPreloader);
})();
