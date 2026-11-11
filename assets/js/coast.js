(() => {
  document.addEventListener("DOMContentLoaded", () => {
    const page = document.querySelector("[data-coast]");
    if (!page) return;
    const content = window.SITE_CONTENT;
    const world = content.world;
    const palette = page.querySelector("[data-palette]");
    const hero = page.querySelector(".coast-hero");
    const observatory = page.querySelector(".coast-observatory");
    const notes = [...page.querySelectorAll("[data-coast-note]")];
    const filters = [...page.querySelectorAll("[data-coast-filter]")];
    const count = page.querySelector("[data-coast-count]");
    let scrollFrame = 0;

    function updateScroll() {
      scrollFrame = 0;
      const motion = document.documentElement.dataset.motion === "on";
      const amount = motion ? Math.min(46, Math.max(0, -hero.getBoundingClientRect().top) * .077) : 0;
      hero.style.setProperty("--coast-drift", amount.toFixed(2) + "px");
      const view = observatory.getBoundingClientRect();
      if (motion && view.top < innerHeight && view.bottom > 0) {
        const phase = (view.top + view.height / 2) / innerHeight;
        const shift = Math.max(-1, Math.min(1, .5 - phase)) * 13;
        observatory.style.setProperty("--coast-observe-shift", shift.toFixed(2) + "px");
      }
    }
    window.addEventListener("scroll", () => {
      if (!scrollFrame && document.documentElement.dataset.motion === "on") scrollFrame = requestAnimationFrame(updateScroll);
    }, { passive: true });

    function filter(type) {
      let shown = 0;
      notes.forEach((note) => {
        const match = type === "all" || note.dataset.coastNote === type;
        note.hidden = !match;
        if (match) shown += 1;
      });
      filters.forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.coastFilter === type)));
      count.textContent = content.notes.count.replace("{count}", shown);
    }

    filters.forEach((button) => button.addEventListener("click", () => filter(button.dataset.coastFilter)));

    function openLinkedNote() {
      const id = location.hash.slice(1);
      const note = id.startsWith("note-") ? document.getElementById(id) : null;
      if (!note || !note.matches("[data-coast-note]")) return;
      if (note.hidden) filter("all");
      note.open = true;
      requestAnimationFrame(() => note.scrollIntoView({ block: "start" }));
    }
    window.addEventListener("hashchange", openLinkedNote);
    page.addEventListener("click", (event) => {
      const link = event.target.closest('a[href^="#note-"]');
      if (link?.hash === location.hash) openLinkedNote();
    });
    openLinkedNote();

    page.querySelectorAll("[data-map-stop]").forEach((button) => {
      button.addEventListener("click", () => {
        const index = button.dataset.mapStop;
        page.querySelectorAll("[data-map-stop]").forEach((control) => {
          control.setAttribute("aria-pressed", String(control === button));
        });
        page.querySelectorAll("[data-map-point]").forEach((point) => {
          point.setAttribute("fill", point.dataset.mapPoint === index ? "#2456d4" : "#fff");
        });
        page.querySelector("[data-map-detail]").textContent = world.map.stops[Number(index)].detail;
      });
    });

    page.querySelectorAll("[data-density-choice]").forEach((button) => {
      button.addEventListener("click", () => {
        page.querySelector("[data-proof]").dataset.density = button.dataset.densityChoice;
        page.querySelectorAll("[data-density-choice]").forEach((control) => {
          control.setAttribute("aria-pressed", String(control === button));
        });
      });
    });

    if (palette) {
      const upload = palette.querySelector("[data-palette-upload]");
      const reset = palette.querySelector("[data-palette-reset]");
      const image = palette.querySelector("[data-palette-image]");
      const status = palette.querySelector("[data-palette-status]");
      const swatches = palette.querySelector("[data-swatches]");
      const original = [...swatches.querySelectorAll("[data-color]")].map((button) => button.dataset.color);
      const workshop = world.workshop;
      let currentUrl;
      let revision = 0;

      function showColors(colors) {
        swatches.replaceChildren(...colors.map((color) => {
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.color = color;
          button.style.setProperty("--paint", color);
          const label = document.createElement("span");
          label.textContent = color;
          button.append(label);
          return button;
        }));
      }

      function sample(bitmap) {
        const canvas = document.createElement("canvas");
        const ratio = 126 / Math.max(bitmap.width, bitmap.height);
        canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
        canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        const bins = new Map();
        for (let i = 0; i < pixels.length; i += 4) {
          const alpha = pixels[i + 3] / 255;
          if (alpha < .3) continue;
          const red = pixels[i], green = pixels[i + 1], blue = pixels[i + 2];
          const key = ((red >> 5) << 6) | ((green >> 5) << 3) | (blue >> 5);
          const group = bins.get(key) ?? { count: 0, rgb: [0, 0, 0] };
          group.count += alpha;
          group.rgb[0] += red * alpha;
          group.rgb[1] += green * alpha;
          group.rgb[2] += blue * alpha;
          bins.set(key, group);
        }
        const colors = [...bins.values()].sort((a, b) => b.count - a.count).slice(0, 5).map(({ count, rgb }) =>
          "#" + rgb.map((value) => Math.round(value / count).toString(16).padStart(2, "0")).join("").toUpperCase());
        if (!colors.length) throw Error("Empty image");
        return colors;
      }

      upload.addEventListener("change", async () => {
        const file = upload.files[0];
        if (!file) return;
        const token = ++revision;
        let bitmap;
        status.textContent = workshop.working;
        try {
          bitmap = await createImageBitmap(file);
          if (token !== revision) return;
          const colors = sample(bitmap);
          if (currentUrl) URL.revokeObjectURL(currentUrl);
          currentUrl = URL.createObjectURL(file);
          image.src = currentUrl;
          image.alt = file.name;
          showColors(colors);
          reset.hidden = false;
          status.textContent = workshop.ready;
        } catch {
          if (token === revision) status.textContent = workshop.failed;
        } finally {
          bitmap?.close();
        }
      });

      reset.addEventListener("click", () => {
        revision += 1;
        if (currentUrl) URL.revokeObjectURL(currentUrl);
        currentUrl = null;
        upload.value = "";
        image.src = world.image.url;
        image.alt = world.image.alt;
        showColors(original);
        status.textContent = workshop.ready;
        reset.hidden = true;
        upload.focus();
      });

      swatches.addEventListener("click", async (event) => {
        const button = event.target.closest("[data-color]");
        if (!button) return;
        const value = button.dataset.color;
        let label = workshop.selected;
        try {
          await navigator.clipboard.writeText(value);
          label = workshop.copied;
        } catch {
          // The color remains visible on file URLs and in restricted browser contexts.
        }
        status.textContent = label.replace("{value}", value);
      });
    }
  });
})();
