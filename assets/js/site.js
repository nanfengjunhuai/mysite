(() => {
  const root = document.documentElement;
  const systemMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const themeKey = "nearshore-theme";
  const motionKey = "nearshore-motion";

  function readPreference(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function savePreference(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // The active choice still works in browsers that restrict file or private storage.
    }
  }

  let motionDisabled = readPreference(motionKey) === "off";
  const savedTheme = readPreference(themeKey);
  if (savedTheme === "light" || savedTheme === "dark") root.dataset.theme = savedTheme;
  root.dataset.motion = motionDisabled || systemMotion.matches ? "off" : "on";

  document.addEventListener("DOMContentLoaded", () => {
    const page = document.body.dataset.page;
    const views = window.SITE_VIEWS;
    views.render(page);
    const content = window.SITE_CONTENT;
    const projectImages = new Map(window.SITE_PROJECTS.map(({ id, image }) => [id, image]));
    const labels = content.interface;

    document.querySelectorAll("[data-image]").forEach((element) => {
      const image = projectImages.get(element.dataset.image);
      element.alt = image.alt;
      element.addEventListener("load", () => {
        element.classList.add("is-loaded");
      }, { once: true });
      if (image.widths?.length) {
        const urlAtWidth = (width) => {
          const url = new URL(image.url, document.baseURI);
          url.searchParams.set("auto", "format");
          url.searchParams.set("fit", "max");
          url.searchParams.set("w", width);
          url.searchParams.set("q", "79");
          return url.href;
        };
        element.sizes = image.sizes;
        element.srcset = image.widths.map((width) => `${urlAtWidth(width)} ${width}w`).join(", ");
        element.src = urlAtWidth(image.widths[0]);
      } else {
        element.src = image.url;
      }
    });

    const nav = document.querySelector("[data-nav]");
    nav?.setAttribute("aria-label", labels.navigation);
    const navLinks = nav ? content.navigation.map(({ label, href, page }) => {
      const link = document.createElement("a");
      link.href = href;
      link.textContent = label;
      link.dataset.page = page;
      nav.append(link);
      return link;
    }) : [];

    function updateCurrentLink() {
      const section = { project: "projects", article: "notes" }[page] ?? page;
      const current = page === "about" && location.hash === "#contact" ? "contact" : section;
      navLinks.forEach((link) => {
        if (link.dataset.page === current) link.setAttribute("aria-current", page === current ? "page" : "location");
        else link.removeAttribute("aria-current");
      });
    }
    updateCurrentLink();
    window.addEventListener("hashchange", updateCurrentLink);

    const themeToggle = document.querySelector("[data-theme-toggle]");
    function updateThemeButton() {
      const isLight = root.dataset.theme === "light";
      const nextTheme = isLight ? labels.toDark : labels.toLight;
      const themeLabel = labels.themeLabel.replace("{theme}", nextTheme);
      themeToggle.querySelector(".control-label").textContent = themeLabel;
      themeToggle.querySelector("use").setAttribute("href", isLight ? "#icon-moon" : "#icon-sun");
    }
    updateThemeButton();
    themeToggle.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
      savePreference(themeKey, root.dataset.theme);
      updateThemeButton();
    });

    const motionToggle = document.querySelector("[data-motion-toggle]");
    function updateMotionButton() {
      const enabled = !motionDisabled && !systemMotion.matches;
      root.dataset.motion = enabled ? "on" : "off";
      motionToggle.setAttribute("aria-pressed", String(enabled));
      const motionLabel = systemMotion.matches ? labels.motionReduced : enabled ? labels.motionOn : labels.motionOff;
      motionToggle.setAttribute("aria-label", labels.motion);
      motionToggle.querySelector(".control-label").textContent = motionLabel;
      motionToggle.title = motionLabel;
      motionToggle.disabled = systemMotion.matches;
    }
    updateMotionButton();
    systemMotion.addEventListener("change", updateMotionButton);
    motionToggle.addEventListener("click", () => {
      motionDisabled = !motionDisabled;
      savePreference(motionKey, motionDisabled ? "off" : "on");
      updateMotionButton();
    });

    const menuToggle = document.querySelector("[data-menu-toggle]");
    const appearance = document.querySelector("[data-appearance]");
    const appearanceToggle = appearance.querySelector("summary");
    const compactNav = window.matchMedia("(max-width: 760px)");
    function setMenu(open, returnFocus = false) {
      if (!nav || !menuToggle) return;
      nav.classList.toggle("is-open", open);
      nav.inert = compactNav.matches && !open;
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? labels.closeMenu : labels.openMenu);
      menuToggle.querySelector("use").setAttribute("href", open ? "#icon-close" : "#icon-menu");
      if (open) {
        appearance.open = false;
        navLinks[0]?.focus();
      }
      if (returnFocus) menuToggle.focus();
    }
    setMenu(false);
    menuToggle?.addEventListener("click", () => {
      setMenu(menuToggle.getAttribute("aria-expanded") === "false");
    });
    nav?.addEventListener("click", (event) => {
      if (compactNav.matches && event.target.closest("a")) setMenu(false);
    });
    appearance.addEventListener("toggle", () => {
      if (appearance.open) setMenu(false);
    });
    document.addEventListener("click", (event) => {
      if (appearance.open && !appearance.contains(event.target)) appearance.open = false;
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      if (appearance.open) {
        appearance.open = false;
        appearanceToggle.focus();
      } else if (nav?.classList.contains("is-open")) setMenu(false, true);
    });
    compactNav.addEventListener("change", () => setMenu(false));

    const filters = document.querySelector("[data-filters]");
    filters?.addEventListener("click", (event) => {
      const filter = event.target.closest("[data-filter]");
      if (!filter || filter.getAttribute("aria-pressed") === "true") return;
      const type = views.filterType(filter.dataset.filter);
      views.setFilter(type);
      const url = new URL(location.href);
      if (type === "all") url.searchParams.delete("type");
      else url.searchParams.set("type", type);
      url.hash = "";
      history.replaceState(history.state, "", url);
    });

    const reading = document.querySelector("[data-reading]");
    const toc = document.querySelector("[data-toc]");
    if (reading && toc) {
      const progress = document.querySelector("[data-progress]");
      const chapters = [...reading.querySelectorAll("[data-prose] section[id]")];
      const chapterLinks = [...toc.querySelectorAll("a")];
      let pendingFrame = 0;

      function updateReading() {
        const headerHeight = progress.parentElement.offsetHeight;
        const article = reading.getBoundingClientRect();
        const span = Math.max(1, article.height - window.innerHeight + headerHeight);
        const fraction = Math.max(0, Math.min(1, (headerHeight - article.top) / span));
        progress.style.setProperty("--progress", fraction);
        const current = chapters.findLast((chapter) => chapter.getBoundingClientRect().top <= headerHeight + 36) ?? chapters[0];
        chapterLinks.forEach((link) => {
          if (link.hash === "#" + current.id) link.setAttribute("aria-current", "location");
          else link.removeAttribute("aria-current");
        });
        pendingFrame = 0;
      }

      function scheduleReading() {
        if (!pendingFrame) pendingFrame = requestAnimationFrame(updateReading);
      }

      progress.hidden = false;
      toc.open = !compactNav.matches;
      compactNav.addEventListener("change", () => {
        toc.open = !compactNav.matches;
      });
      window.addEventListener("scroll", scheduleReading, { passive: true });
      window.addEventListener("resize", scheduleReading);
      scheduleReading();
    }

    // A directly opened detail or archive URL can refer to a section rendered from data.
    const initialId = location.hash.slice(1);
    if (initialId) {
      const target = document.getElementById(initialId);
      requestAnimationFrame(() => target?.scrollIntoView({ behavior: "instant" }));
    }

    if ("IntersectionObserver" in window) {
      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(({ isIntersecting, target }) => {
          if (!isIntersecting) return;
          target.classList.add("is-revealed");
          revealObserver.unobserve(target);
        });
      }, { threshold: 0.2 });
      document.querySelectorAll("[data-reveal]").forEach((element) => revealObserver.observe(element));
    }
  });
})();
