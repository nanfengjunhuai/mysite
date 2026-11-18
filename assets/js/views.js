(() => {
  const site = window.SITE_CONTENT;
  const projects = window.SITE_PROJECTS;
  const notes = [...window.SITE_NOTES].sort((a, b) => b.date.localeCompare(a.date));
  const ui = site.interface;
  const params = new URLSearchParams(location.search);

  const symbols = {
    shore: '<path d="m3 10 8.8-5.5 9.2 5.4-8.9 5.7L3 10Zm0 4.1 9.1 5.5 8.9-5.7"/>',
    moon: '<path d="M19.8 15.1A8.5 8.5 0 0 1 9 4.2a8.5 8.5 0 1 0 10.8 10.9Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2m0 15v2m9.5-9.5h-2m-15 0h-2m16.2-6.7-1.4 1.4m-10.6 10.6-1.4 1.4m13.4 0-1.4-1.4M6.7 6.7 5.3 5.3"/>',
    motion: '<path d="M2.5 12h4l3-6 4 12 3-6h5"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    arrow: '<path d="M4.5 12h14.8m-6-6 6 6-6 6"/>',
    diagonal: '<path d="M6 18 18 6M8 6h10v10"/>',
    plus: '<path d="M5 12h14m-7-7v14"/>'
  };

  function escape(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  const icon = (name, className = "") => `<svg class="icon ${className}" aria-hidden="true"><use href="#icon-${name}"></use></svg>`;
  const projectUrl = (id) => `project.html?id=${encodeURIComponent(id)}`;
  const noteUrl = (id, type = "all") => `article.html?id=${encodeURIComponent(id)}${type === "all" ? "" : `&type=${encodeURIComponent(type)}`}`;
  const filterType = (type) => Object.hasOwn(site.notes.filters, type) ? type : "all";
  const button = (label, href, kind = "quiet", arrow = "arrow", direction = "") => `
    <a class="action action--${kind}" href="${escape(href)}">
      <span>${escape(label)}</span><span class="action-icon">${icon(arrow, direction)}</span>
    </a>`;

  function tags(values) {
    return `<ul class="tags">${values.map((tag) => `<li>${escape(tag)}</li>`).join("")}</ul>`;
  }

  function stationFor(page) {
    const id = { projects: "workshop", project: "workshop", notes: "tower", article: "tower", about: "cabin" }[page];
    return site.world.places.find((place) => place.id === id);
  }

  function appearanceControl() {
    return `<details class="appearance" data-appearance>
      <summary class="icon-button" aria-label="${escape(ui.appearance)}">${icon("sun")}</summary>
      <div class="preference-actions">
        <button class="icon-button" type="button" data-theme-toggle>${icon("sun")}<span class="control-label"></span></button>
        <button class="icon-button motion-button" type="button" data-motion-toggle>${icon("motion")}<span class="control-label"></span></button>
      </div>
    </details>`;
  }

  function shell() {
    const page = document.body.dataset.page;
    const station = stationFor(page);
    const worldHref = station ? "nearshore.html#relay-" + station.id : "nearshore.html";
    const brandLabel = station ? site.world.returnTo : ui.home.replace("{name}", site.name);
    const landmarks = `
      <span class="top-marker" id="top" aria-hidden="true"></span>
      <svg class="icons" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        ${Object.entries(symbols).map(([name, paths]) => `<symbol id="icon-${name}" viewBox="0 0 24 24">${paths}</symbol>`).join("")}
      </svg>
      <a class="skip-link" href="#main">${escape(ui.skip)}</a>`;
    if (page === "home") {
      document.querySelector("[data-shell-header]").outerHTML = landmarks;
      document.querySelector("[data-shell-footer]").remove();
      return;
    }
    const header = `${landmarks}
      <header class="site-header">
        <div class="frame header-inner">
          <a class="brand" href="${escape(worldHref)}" aria-label="${escape(brandLabel)}">
            ${icon("shore", "brand-mark")}<span>${escape(site.name)}</span>
          </a>
          <nav class="site-nav" id="site-nav" data-nav></nav>
          <div class="header-actions">
            ${appearanceControl()}
            <button class="icon-button menu-button" type="button" data-menu-toggle aria-controls="site-nav" aria-expanded="false">
              <span>${escape(ui.menu)}</span>${icon("menu")}
            </button>
          </div>
        </div>
        <div class="reading-progress" data-progress aria-hidden="true" hidden></div>
      </header>`;

    const copyright = site.footer.copyright
      .replace("{year}", new Date().getFullYear())
      .replace("{name}", site.name);
    const footer = `
      <footer class="site-footer">
        <div class="frame footer-inner">
          <div>
            <a class="footer-brand" href="nearshore.html">${icon("shore")}<span>${escape(site.name)}</span></a>
            <p class="footer-signoff">${escape(site.footer.signoff)}</p>
          </div>
          ${button(ui.backToTop, "#top", "quiet", "arrow", "arrow-up")}
          <div class="footer-meta"><span>${escape(copyright)}</span><span>${escape(site.footer.filing)}</span></div>
        </div>
      </footer>`;

    document.querySelector("[data-shell-header]").outerHTML = header;
    document.querySelector("[data-shell-footer]").outerHTML = footer;
  }

  function pageIntro(title, description) {
    const station = stationFor(document.body.dataset.page);
    if (!station) return `<header class="page-intro"><h1>${escape(title)}</h1><p>${escape(description)}</p></header>`;
    const art = site.world.image;
    return `<header class="page-intro page-intro--world">
      <img class="chapter-art" src="${escape(art.url)}" alt="" width="${art.width}" height="${art.height}" loading="lazy" decoding="async"
        style="--chapter-x: ${station.x}%; --chapter-y: ${station.y}%">
      <div class="chapter-copy">
        <p class="chapter-locator"><a href="nearshore.html#relay-${escape(station.id)}">${escape(site.world.returnTo)}</a><span aria-hidden="true">/</span>${escape(station.title)}</p>
        <h1>${escape(title)}</h1>
        <p>${escape(description)}</p>
      </div>
    </header>`;
  }

  function sectionHead(title, side = "") {
    return `<header class="section-heading"><h2>${escape(title)}</h2>${side}</header>`;
  }

  function imageFigure(project, reveal = false) {
    return `
      <figure class="project-figure">
        <div class="project-media"${reveal ? " data-reveal" : ""}>
          <img loading="lazy" decoding="async" data-image="${escape(project.id)}">
        </div>
        <figcaption><a href="${escape(project.credit.href)}">${escape(project.credit.label)}</a></figcaption>
      </figure>`;
  }

  function paletteFigure(project) {
    return `<figure class="palette-figure" data-reveal>
      <div class="palette-orbit" aria-hidden="true"></div>
      <div class="palette-image">
        <img loading="lazy" decoding="async" data-image="${escape(project.id)}">
      </div>
      <ul class="palette-samples" aria-label="${escape(project.preview.label)}">
        ${project.preview.colors.map((color) => `<li style="--paint: ${escape(color)}"><span>${escape(color)}</span></li>`).join("")}
      </ul>
      <figcaption>${escape(project.preview.label)} <a href="${escape(project.credit.href)}">${escape(project.credit.label)}</a></figcaption>
    </figure>`;
  }

  function featuredCard(project) {
    const related = notes.find(({ id }) => id === project.relatedNote);
    return `<article class="featured${project.preview ? " featured--palette" : ""}">
      <div class="project-copy">
        <p class="sample-label">${escape(project.sample === false ? project.category : ui.projectSample + " · " + project.category)}</p>
        <h3>${escape(project.title)}</h3>
        <p class="project-description">${escape(project.description)}</p>
        ${tags(project.tags)}
        <div class="project-actions">
          ${button(ui.projectDetail, projectUrl(project.id), "accent", "diagonal")}
          ${related ? button(ui.readImplementation, noteUrl(related.id)) : ""}
        </div>
      </div>
      ${project.preview ? paletteFigure(project) : imageFigure(project, true)}
    </article>`;
  }

  function projectCard(project) {
    return `<article class="project-card">
      ${imageFigure(project)}
      <div class="project-card-copy">
        <p class="sample-label">${escape(project.sample === false ? project.category : ui.projectSample + " · " + project.category)}</p>
        <h3>${escape(project.title)}</h3>
        <p class="project-description">${escape(project.description)}</p>
        ${tags(project.tags)}
        ${button(ui.projectDetail, projectUrl(project.id))}
      </div>
    </article>`;
  }

  function nowList() {
    return `<div class="now-card">
      <div class="now-heading"><h2>${escape(site.now.title)}</h2><span class="sample-label">${escape(ui.sample)}</span></div>
      <dl class="now-list">${site.now.items.map(({ label, text }) => `<div><dt>${escape(label)}</dt><dd>${escape(text)}</dd></div>`).join("")}</dl>
    </div>`;
  }

  function optionalLink({ label, href }) {
    return href
      ? button(label, href, "quiet", "diagonal")
      : `<span class="pending-link"><span>${escape(label)}</span><span>${escape(ui.pending)}</span></span>`;
  }

  function contactSection() {
    return `<section class="contact-panel" id="contact" tabindex="-1">
      <div><h2>${escape(site.contact.title)}</h2><p>${escape(site.contact.description)}</p></div>
      <ul class="contact-links">${site.contact.links.map((link) => `<li>${optionalLink(link)}</li>`).join("")}</ul>
    </section>`;
  }

  function minutes(note) {
    const text = note.sections.flatMap(({ blocks }) => blocks).map((block) => typeof block === "string" ? block : block.quote || block.code || "").join("");
    return Math.max(1, Math.ceil(text.replace(/\s/g, "").length / 290));
  }

  function noteMeta(note) {
    return `<div class="note-meta">
      <span>${escape(site.notes.filters[note.type])}</span>
      <time datetime="${escape(note.date)}">${escape(note.date.replaceAll("-", "."))}</time>
      <span>${escape(site.notes.time.replace("{minutes}", minutes(note)))}</span>
    </div>`;
  }

  function noteRow(note, type = "all") {
    return `<article class="note-row" id="note-${escape(note.id)}" tabindex="-1">
      <div class="note-row-date"><time datetime="${escape(note.date)}">${escape(note.date.slice(5).replace("-", "."))}</time></div>
      <div class="note-row-copy">
        <div class="note-row-label"><span>${escape(site.notes.filters[note.type])}</span>${note.sample === false ? "" : `<span>${escape(ui.sample)}</span>`}</div>
        <h3><a href="${escape(noteUrl(note.id, type))}">${escape(note.title)}</a></h3>
        <p>${escape(note.summary)}</p>
        <div class="note-row-foot">${tags(note.tags)}<span>${escape(site.notes.time.replace("{minutes}", minutes(note)))}</span></div>
      </div>
      <span class="row-arrow" aria-hidden="true">${icon("arrow")}</span>
    </article>`;
  }

  function coastImage(art, className, eager = false) {
    return `<img class="${className}" src="${escape(art.url)}" alt="${escape(art.alt)}" width="${art.width}" height="${art.height}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
  }

  function coastHeading({ title, label, description }, id) {
    return `<header class="coast-heading">
      <p class="coast-index"><i aria-hidden="true"></i>${escape(label)}</p>
      <h2 id="${id}">${escape(title)}</h2>
      ${description ? `<p>${escape(description)}</p>` : ""}
    </header>`;
  }

  function coastProject(project, number) {
    const workshop = site.world.workshop;
    const related = notes.find(({ id }) => id === project.relatedNote);
    return `<div class="coast-project-copy">
      <p class="coast-project-kind"><span>${number}</span>${escape(project.category)}</p>
      <h3>${escape(project.title)}</h3>
      <p>${escape(project.description)}</p>
      ${tags(project.tags)}
      <details class="coast-project-detail">
        <summary>${escape(workshop.details)}${icon("plus")}</summary>
        ${project.sample === false ? "" : `<p class="sample-label">${escape(ui.projectSample)}</p>`}
        ${project.sections.map(({ title, text }) => `<section><h4>${escape(title)}</h4><p>${escape(text)}</p></section>`).join("")}
        <div class="project-links">
          ${optionalLink({ label: ui.source, href: project.links.source })}
          ${optionalLink({ label: ui.demo, href: project.links.demo })}
        </div>
        ${related ? `<a class="coast-inline" href="#note-${escape(related.id)}">${escape(ui.readImplementation)}${icon("diagonal")}</a>` : ""}
      </details>
    </div>`;
  }

  function coastPalette(project) {
    const world = site.world;
    const { palette, upload, reset, ready } = world.workshop;
    return `<section class="coast-palette" data-palette aria-label="${escape(palette)}">
      <div class="coast-toolbar"><div aria-hidden="true"><i></i><i></i><i></i></div><span>${escape(palette)}</span><span class="coast-local">LOCAL / PNG</span></div>
      <div class="coast-palette-work">
        <div class="coast-palette-photo">
          <img src="${escape(world.image.url)}" width="${world.image.width}" height="${world.image.height}" alt="${escape(world.image.alt)}" loading="lazy" decoding="async" data-palette-image>
        </div>
        <div class="coast-swatches" data-swatches>
          ${(world.workshop.colors ?? project.preview.colors).map((color) => `<button type="button" data-color="${escape(color)}" style="--paint:${escape(color)}"><span>${escape(color)}</span></button>`).join("")}
        </div>
      </div>
      <div class="coast-palette-controls">
        <label class="coast-upload">${icon("plus")}<span>${escape(upload)}</span><input type="file" accept="image/*" data-palette-upload></label>
        <button type="button" class="coast-reset" data-palette-reset hidden>${escape(reset)}</button>
        <p data-palette-status role="status">${escape(ready)}</p>
      </div>
    </section>`;
  }

  function coastMap() {
    const map = site.world.map;
    const points = [[54,180],[189,102],[300,65]];
    return `<section class="coast-map" aria-label="${escape(map.label)}">
      <svg viewBox="0 0 356 220" role="img" aria-label="${escape(map.label)}">
        <defs><pattern id="coast-map-grid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0V18" fill="none" stroke="#c8d5e6" stroke-width=".6"/></pattern></defs>
        <rect width="356" height="220" fill="#e6eef7"/><rect width="356" height="220" fill="url(#coast-map-grid)"/>
        <path d="M-12 194C37 177 30 140 59 120S136 121 153 87 155 45 197 37 267 56 280 30 299-1 360-10M-20 175C38 160 22 128 48 110S124 114 141 81 145 35 194 26 258 44 270 20 292-14 353-20M74 222C110 191 169 201 191 163S205 126 241 127 300 117 312 96 339 59 363 52M93 232C132 202 173 213 201 175S215 138 251 138 310 127 323 107 350 71 378 62M123 246C157 213 182 225 215 186S228 148 269 150 325 134 336 118 370 78 386 75" fill="none" stroke="#afc5dc" stroke-width="1.2"/>
        <path d="M54 180 84 162 108 171 134 147 137 124 189 102 214 109 250 79 272 89 300 65" fill="none" stroke="white" stroke-width="9" stroke-linejoin="round"/>
        <path d="M54 180 84 162 108 171 134 147 137 124 189 102 214 109 250 79 272 89 300 65" fill="none" stroke="#2456d4" stroke-width="3.5" stroke-linejoin="round"/>
        ${points.map(([x,y], i) => `<circle cx="${x}" cy="${y}" r="6" data-map-point="${i}" fill="${i === 0 ? "#2456d4" : "#fff"}" stroke="#2456d4" stroke-width="2"/>`).join("")}
        <path d="M302 189h33m-33-3v6m33-6v6" fill="none" stroke="#4e6582"/>
        <text x="304" y="205" fill="#4e6582" font-size="8" font-family="monospace">100 m</text>
      </svg>
      <div class="coast-map-controls">${map.stops.map(({ name }, index) => `<button type="button" data-map-stop="${index}" aria-pressed="${index === 0}">${escape(name)}</button>`).join("")}</div>
      <p class="coast-map-detail" role="status" data-map-detail>${escape(map.stops[0].detail)}</p>
    </section>`;
  }

  function coastProof() {
    const type = site.world.type;
    return `<section class="coast-proof" data-proof data-density="open" aria-label="${escape(type.label)}">
      <div class="coast-proof-paper"><span aria-hidden="true">Aa <i></i> 近岸</span><p>${escape(type.sample)}</p></div>
      <div class="coast-type-controls">${type.options.map(({ id, label }, index) => `<button type="button" data-density-choice="${escape(id)}" aria-pressed="${index === 0}">${escape(label)}</button>`).join("")}</div>
    </section>`;
  }

  function coastNote(note) {
    return `<details class="coast-note" id="note-${escape(note.id)}" data-coast-note="${escape(note.type)}">
      <summary>
        <span class="coast-note-date"><time datetime="${escape(note.date)}">${escape(note.date.replaceAll("-", "."))}</time></span>
        <span class="coast-note-heading"><span>${escape(site.notes.filters[note.type])} <i></i> ${escape(site.notes.time.replace("{minutes}", minutes(note)))}</span>
          <strong>${escape(note.title)}</strong><small>${escape(note.summary)}</small>
        </span>
        <span class="coast-note-icon">${icon("plus")}</span>
      </summary>
      <div class="coast-note-body">
        <p class="sample-label">${escape(ui.sample)}</p>
        ${tags(note.tags)}
        <div class="prose">${note.sections.map(({ title, blocks }) => `<section>
          ${title ? `<h3>${escape(title)}</h3>` : ""}
          ${blocks.map(proseBlock).join("")}
        </section>`).join("")}</div>
      </div>
    </details>`;
  }

  function home() {
    const world = site.world;
    const project = projects.find((item) => item.featured) ?? projects[0];
    const examples = { "corner-map": coastMap, "type-proof": coastProof };
    const stamp = site.footer.copyright.replace("{year}", new Date().getFullYear()).replace("{name}", site.name);
    return `<div class="coast" data-coast>
      <section class="coast-hero" aria-labelledby="coast-title">
        ${coastImage(world.image, "coast-hero-image", true)}
        <div class="coast-hero-shade" aria-hidden="true"></div>
        <div class="coast-hero-top coast-frame">
          <span class="coast-mark">${icon("shore")}<span>${escape(world.callsign)}</span></span>
          <span class="coast-position"><i></i> 00 / ${escape(world.title)}</span>
        </div>
        <div class="coast-hero-inner coast-frame">
          <p class="coast-hero-label">${escape(world.label)}</p>
          <h1 id="coast-title">${escape(site.name)}</h1>
          <p class="coast-hero-description">${escape(world.intro)}</p>
          <a class="coast-enter" href="#relay-workshop"><span>${escape(world.enter)}</span>${icon("arrow", "arrow-down")}</a>
        </div>
        <div class="coast-hero-bottom coast-frame" aria-hidden="true"><span>NEARSHORE © ${new Date().getFullYear()}</span><span>01—03</span></div>
      </section>

      <section class="coast-work coast-frame" id="relay-workshop" aria-labelledby="coast-work-title">
        ${coastHeading(world.workshop, "coast-work-title")}
        <p class="coast-sample">${escape(ui.projectSample)}</p>
        <article class="coast-feature" id="work-${escape(project.id)}">
          ${project.preview?.colors?.length ? coastPalette(project) : imageFigure(project)}
          ${coastProject(project, "01")}
        </article>
        <div class="coast-experiments">
          ${projects.filter((item) => item !== project).map((item, i) => `<article class="coast-experiment" id="work-${escape(item.id)}">
            ${examples[item.id]?.() ?? imageFigure(item)}
            ${coastProject(item, "0" + (i + 2))}
          </article>`).join("")}
        </div>
      </section>

      <figure class="coast-observatory">
        ${coastImage(world.observatory, "coast-observatory-image")}
        <figcaption class="coast-frame"><span class="coast-index"><i></i>${escape(world.observatory.label)}</span><p>${escape(world.observatory.line)}</p></figcaption>
      </figure>

      <section class="coast-journal coast-frame" id="relay-tower" aria-labelledby="coast-journal-title">
        ${coastHeading(world.journal, "coast-journal-title")}
        <div class="coast-filters" role="group" aria-label="${escape(site.notes.filterLabel)}">
          ${Object.entries(site.notes.filters).map(([type, label]) => `<button type="button" data-coast-filter="${escape(type)}" aria-pressed="${type === "all"}">${escape(label)}</button>`).join("")}
          <p role="status" data-coast-count>${escape(site.notes.count.replace("{count}", notes.length))}</p>
        </div>
        <div class="coast-notes">${notes.map(coastNote).join("")}</div>
      </section>

      <div class="coast-profile-band">
        <section class="coast-profile coast-frame" id="relay-cabin" aria-labelledby="coast-profile-title">
          ${coastHeading(world.profile, "coast-profile-title")}
          <div class="coast-profile-grid">
            <div class="coast-profile-copy">
              <p class="sample-label">${escape(ui.sample)}</p>
              <p class="coast-profile-lead">${escape(site.about.short)}</p>
              <p>${escape(site.about.description)}</p>
              <p>${escape(site.about.interests)}</p>
              ${tags(site.about.tags)}
            </div>
            ${nowList()}
          </div>
          <div class="coast-timeline">
            <h3>${escape(site.about.timelineTitle)}</h3>
            <ol class="timeline">${site.about.timeline.map(({ label, title, text }) => `<li><span>${escape(label)}</span><div><h4>${escape(title)}</h4><p>${escape(text)}</p></div></li>`).join("")}</ol>
          </div>
          ${contactSection()}
        </section>
      </div>
      <footer class="coast-footer">
        <div class="coast-frame">
          <div><p class="coast-mark">${icon("shore")}<span>${escape(site.name)}</span></p><p>${escape(site.footer.signoff)}</p></div>
          <div class="coast-footer-controls">${appearanceControl()}<a href="#top">${escape(ui.backToTop)}${icon("arrow", "arrow-up")}</a></div>
          <div class="coast-footer-meta"><span>${escape(stamp)}</span><span>${escape(site.footer.filing)}</span></div>
        </div>
      </footer>
    </div>`;
  }

  function projectIndex() {
    const featured = projects.filter(({ featured }) => featured);
    return `<div class="frame inner-page">
      ${pageIntro(site.projects.title, site.projects.description)}
      <section class="project-catalog">
        ${sectionHead(ui.allProjects)}
        ${featured.map(featuredCard).join("")}
        <div class="project-grid">${projects.filter((project) => !project.featured).map(projectCard).join("")}</div>
      </section>
    </div>`;
  }

  function notFound(kind) {
    const isProject = kind === "project";
    document.title = `${ui.notFound}｜${site.name}`;
    return `<div class="frame inner-page">${pageIntro(ui.notFound, ui.notFoundDescription)}
      ${button(isProject ? ui.backProjects : ui.backNotes, isProject ? "projects.html" : "blog.html", "quiet", "arrow", "arrow-back")}</div>`;
  }

  function projectDetail() {
    const project = projects.find(({ id }) => id === params.get("id"));
    if (!project) return notFound("project");
    const personal = project.sample === false;
    const related = notes.find(({ id }) => id === project.relatedNote);
    document.title = personal ? project.title : `${project.title}｜${site.name}`;
    document.querySelector('meta[name="description"]').content = project.description;
    return `<div class="frame inner-page detail-page">
      ${button(personal ? "返回项目库" : ui.backProjects, personal ? "experience.html#projects" : "projects.html", "quiet", "arrow", "arrow-back")}
      <article>
        <div class="project-lead">
          <header class="detail-heading">
            <p class="sample-label">${escape(personal ? project.category : ui.projectSample + " · " + project.category)}</p>
            <h1>${escape(project.title)}</h1>
            <p class="lead-summary">${escape(project.description)}</p>
            ${tags(project.tags)}
            <div class="project-links">
              ${optionalLink({ label: ui.source, href: project.links.source })}
              ${optionalLink({ label: ui.demo, href: project.links.demo })}
            </div>
          </header>
          ${imageFigure(project)}
        </div>
        <div class="project-sections">
          ${project.sections.map(({ title, text }) => `<section><h2>${escape(title)}</h2><p>${escape(text)}</p></section>`).join("")}
        </div>
      </article>
      ${related ? relatedLink(ui.relatedNote, related.title, noteUrl(related.id)) : ""}
    </div>`;
  }

  function relatedLink(label, title, href) {
    return `<div class="related-link"><p class="sample-label">${escape(label)}</p>${button(title, href, "quiet", "diagonal")}</div>`;
  }

  function archiveRows(type) {
    const matching = notes.filter((note) => type === "all" || note.type === type);
    const byYear = new Map();
    matching.forEach((note) => {
      const year = note.date.slice(0, 4);
      if (!byYear.has(year)) byYear.set(year, []);
      byYear.get(year).push(note);
    });

    return {
      count: matching.length,
      html: matching.length ? Array.from(byYear, ([year, entries]) => `
        <section class="archive-year"><h2>${escape(year)}</h2>
          <div>${entries.map((note) => noteRow(note, type)).join("")}</div>
        </section>`).join("") : `<p class="archive-empty">${escape(site.notes.empty)}</p>`
    };
  }

  function notesIndex() {
    const type = filterType(params.get("type"));
    const current = archiveRows(type);
    return `<div class="frame inner-page">
      ${pageIntro(site.notes.title, site.notes.description)}
      <section class="archive">
        <div class="archive-controls">
          <div class="filters" role="group" aria-label="${escape(site.notes.filterLabel)}" data-filters>
            ${Object.entries(site.notes.filters).map(([value, label]) => `
              <button type="button" data-filter="${escape(value)}" aria-pressed="${value === type}">${escape(label)}</button>`).join("")}
          </div>
          <p class="archive-count" role="status" data-note-count>${escape(site.notes.count.replace("{count}", current.count))}</p>
        </div>
        <div data-note-list>${current.html}</div>
      </section>
    </div>`;
  }

  function proseBlock(block) {
    if (typeof block === "string") return `<p>${escape(block)}</p>`;
    if (block.quote) return `<blockquote>${escape(block.quote)}</blockquote>`;
    if (block.projectImage) {
      const project = projects.find(({ id }) => id === block.projectImage);
      return project ? imageFigure(project) : "";
    }
    return `<figure class="code-sample">
      <figcaption>${escape(block.language)}</figcaption>
      <pre tabindex="0" aria-label="${escape(block.language)}"><code>${escape(block.code)}</code></pre>
    </figure>`;
  }

  function articleDetail() {
    const note = notes.find(({ id }) => id === params.get("id"));
    if (!note) return notFound("article");
    const personal = note.sample === false;
    const type = filterType(params.get("type"));
    const back = `blog.html${type === "all" ? "" : `?type=${encodeURIComponent(type)}`}#note-${encodeURIComponent(note.id)}`;
    const relatedProject = projects.find(({ id }) => id === note.relatedProject);
    const otherNote = notes.find(({ id,type,sample }) => id !== note.id && type === note.type && (sample === false) === personal);
    const chapters = note.sections.filter(({ title }) => title);
    document.title = `${note.title}｜${personal ? site.workroom.title : site.name}`;
    document.querySelector('meta[name="description"]').content = note.summary;
    return `<div class="frame inner-page reading-page">
      ${button(personal ? "返回自叙帖" : ui.backNotes, personal ? "experience.html#story" : back, "quiet", "arrow", "arrow-back")}
      <article data-reading>
        <header class="article-heading">
          ${personal ? "" : `<p class="sample-label">${escape(ui.sample)}</p>`}
          <h1>${escape(note.title)}</h1>
          ${noteMeta(note)}
          <p class="lead-summary">${escape(note.summary)}</p>
          ${tags(note.tags)}
        </header>
        <div class="reading-grid">
          ${chapters.length > 1 ? `<aside class="reading-aside">
            <details class="toc" data-toc open>
              <summary>${escape(ui.contents)}${icon("plus")}</summary>
              <nav aria-label="${escape(ui.contents)}">
                ${chapters.map(({ id, title }) => `<a href="#${escape(id)}">${escape(title)}</a>`).join("")}
              </nav>
            </details>
          </aside>` : ""}
          <div class="prose" data-prose>
            ${note.sections.map(({ id, title, blocks }) => `<section id="${escape(id)}" tabindex="-1">
              ${title ? `<h2>${escape(title)}</h2>` : ""}
              ${blocks.map(proseBlock).join("")}
            </section>`).join("")}
          </div>
        </div>
      </article>
      <div class="article-end">
        ${relatedProject ? relatedLink(ui.relatedProject, relatedProject.title, projectUrl(relatedProject.id)) : ""}
        ${otherNote ? relatedLink(ui.relatedNote, otherNote.title, noteUrl(otherNote.id)) : ""}
      </div>
    </div>`;
  }

  function aboutPage() {
    return `<div class="frame inner-page about-page">
      ${pageIntro(site.about.title, site.about.short)}
      <div class="home-about">
        <div class="about-summary">
          <p class="sample-label">${escape(ui.sample)}</p>
          <p>${escape(site.about.description)}</p>
          <p>${escape(site.about.interests)}</p>
          ${tags(site.about.tags)}
        </div>
        ${nowList()}
      </div>
      <section class="timeline-section">
        ${sectionHead(site.about.timelineTitle, `<p class="sample-label">${escape(ui.sample)}</p>`)}
        <ol class="timeline">${site.about.timeline.map(({ label, title, text }) => `
          <li><span>${escape(label)}</span><div><h3>${escape(title)}</h3><p>${escape(text)}</p></div></li>`).join("")}</ol>
      </section>
      ${contactSection()}
    </div>`;
  }

  const pages = { home, projects: projectIndex, notes: notesIndex, about: aboutPage, project: projectDetail, article: articleDetail };

  function render(page) {
    shell();
    document.querySelector("[data-view]").innerHTML = pages[page]();
  }

  function setFilter(type) {
    const results = archiveRows(type);
    const list = document.querySelector("[data-note-list]");
    list.dataset.updated = "";
    list.innerHTML = results.html;
    document.querySelector("[data-note-count]").textContent = site.notes.count.replace("{count}", results.count);
    document.querySelectorAll("[data-filter]").forEach((element) => {
      element.setAttribute("aria-pressed", String(element.dataset.filter === type));
    });
  }

  window.SITE_VIEWS = { render, setFilter, filterType };
})();
