(() => {
  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function choices(labels, name, update) {
    const group = node("div", "demo-choices");
    group.setAttribute("role", "group");
    group.setAttribute("aria-label", name);
    for (const [index, label] of labels.entries()) {
      const button = node("button", "demo-choice", label);
      button.type = "button";
      button.setAttribute("aria-pressed", String(index === 0));
      button.addEventListener("click", () => {
        for (const item of group.children) item.setAttribute("aria-pressed", String(item === button));
        update(index);
      });
      group.append(button);
    }
    return group;
  }

  function paletteDemo(preview, project) {
    const { image, colors } = project.workroomDemo;
    const photo = node("img", "demo-photo");
    photo.src = image;
    photo.alt = "海湾码头与石砌街道";
    photo.decoding = "async";
    photo.draggable = false;
    const value = node("output", "palette-value", colors[0]);
    value.style.setProperty("--sample-color", colors[0]);
    const swatches = choices(colors, "选择示例色值", (index) => {
      value.value = colors[index];
      value.style.setProperty("--sample-color", colors[index]);
    });
    swatches.classList.add("palette-choices");
    Array.from(swatches.children).forEach((button, index) => button.style.setProperty("--swatch", colors[index]));
    preview.append(photo, value, swatches);
  }

  function routeDemo(preview) {
    const canvas = node("canvas", "demo-map");
    canvas.width = 720;
    canvas.height = 390;
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", "示例地图，路线从街口经树荫走到石阶");
    const context = canvas.getContext("2d");
    const stops = [[138,291],[360,176],[580,94]];
    const path = [[138,291],[236,291],[236,176],[360,176],[472,176],[472,94],[580,94]];
    const labels = ["街口","树荫","石阶"];
    const readout = node("output", "route-readout");
    const descriptions = ["从街口出发", "沿途树荫可停留", "石阶可绕行"];
    function draw(active) {
      readout.value = descriptions[active];
      if (!context) return;
      context.fillStyle = "#18232e";
      context.fillRect(0,0,720,390);
      context.fillStyle = "#293c41";
      context.fillRect(310,49,116,96);
      context.fillStyle = "#37505a";
      context.fillRect(630,0,90,390);
      context.lineWidth = 2;
      context.strokeStyle = "#52626c";
      for (const x of [58,138,236,310,426,472,580,618]) {
        context.beginPath();
        context.moveTo(x,0);
        context.lineTo(x,390);
        context.stroke();
      }
      for (const y of [49,94,145,176,232,291,347]) {
        context.beginPath();
        context.moveTo(0,y);
        context.lineTo(618,y);
        context.stroke();
      }
      context.beginPath();
      path.forEach(([x,y],i) => i ? context.lineTo(x,y) : context.moveTo(x,y));
      context.lineWidth = 7;
      context.lineJoin = "round";
      context.strokeStyle = "#d6bdff";
      context.stroke();
      stops.forEach(([x,y],index) => {
        context.beginPath();
        context.arc(x,y,index===active?16:9,0,Math.PI*2);
        context.fillStyle=index===active?"#f6d1b7":"#e7d8ff";
        context.fill();
        context.strokeStyle="#18232e";
        context.lineWidth=4;
        context.stroke();
      });
    }
    preview.append(canvas, readout, choices(labels,"选择地图标记",draw));
    draw(0);
  }

  function typeDemo(preview) {
    const sheet = node("div", "demo-proof");
    sheet.dataset.spacing = "compact";
    const paragraphs = [
      ["zh-CN","在字与字之间留一点空隙。","行间有了余地，目光就能顺着句子继续往下走。"],
      ["en","Leave room between the lines.","A little space changes the pace of the page and gives the eye somewhere to rest."]
    ];
    for (const [language, heading, body] of paragraphs) {
      const column = node("section");
      column.lang = language;
      column.append(node("h3","",heading),node("p","",body));
      sheet.append(column);
    }
    preview.append(sheet, choices(["紧凑","舒展"],"切换排版间距",(index) => {
      sheet.dataset.spacing = index ? "relaxed" : "compact";
    }));
  }

  const demos = { swatches: paletteDemo, route: routeDemo, "type-proof": typeDemo };

  window.mountProjectBay = (items, openProject, bindSwipe) => {
    const screens = document.querySelector("#project-screens");
    const controls = document.querySelector("#project-controls");
    const index = document.querySelector("#project-index");
    const previous = document.querySelector("#previous-project");
    const next = document.querySelector("#next-project");
    const status = document.querySelector("#project-position");
    const entries = [];
    let selected = 0;
    function select(position, focus = false) {
      if (!entries.length) return;
      const direction = Math.sign(position - selected);
      selected = (position + entries.length) % entries.length;
      screens.style.setProperty("--project-enter", direction * 28 + "px");
      entries.forEach(({ panel, button }, i) => {
        panel.hidden = i !== selected;
        button.setAttribute("aria-pressed", String(i === selected));
      });
      const active = entries[selected];
      if (direction) active.panel.dataset.direction = String(direction);
      status.textContent = active.button.textContent + "，" + (selected+1) + " / " + entries.length;
      if (focus) active.button.focus({ preventScroll:true });
    }

    for (const [i, project] of items.entries()) {
      const panel = node("article","project-screen");
      panel.id = "project-screen-" + project.id;
      panel.hidden = true;
      const preview = node("div","project-demo");
      const demo = demos[project.workroomVisual];
      if (demo) {
        preview.dataset.demo = project.workroomVisual;
        demo(preview,project);
      } else if (project.image?.url) {
        const image = node("img","demo-photo");
        image.src = project.image.url;
        image.alt = project.image.alt ?? "";
        image.loading = "lazy";
        image.draggable = false;
        preview.append(image);
      }
      const copy = node("div","project-screen-copy");
      const type = node("p","project-type",project.category + (project.sample ? " · 示例" : ""));
      const title = node("h2","",project.title);
      title.id = panel.id + "-title";
      panel.setAttribute("aria-labelledby",title.id);
      const description = node("p","project-summary",project.description);
      const tags = node("ul","project-tags");
      tags.setAttribute("aria-label","技术");
      for (const tag of project.tags ?? []) tags.append(node("li","",tag));
      const details = node("a","project-open","查看实现 ↗");
      details.href = "project.html?id=" + encodeURIComponent(project.id);
      details.setAttribute("aria-haspopup","dialog");
      details.addEventListener("click", (event) => openProject(event,project));
      copy.append(type,title,description,tags,details);
      panel.append(preview,copy);
      screens.append(panel);
      const button = node("button","project-pick",project.title);
      button.type = "button";
      button.setAttribute("aria-controls",panel.id);
      button.addEventListener("click", () => select(i));
      index.append(button);
      entries.push({ panel,button });
    }

    controls.hidden = entries.length < 2;
    previous.disabled = next.disabled = controls.hidden;
    previous.addEventListener("click", () => select(selected-1));
    next.addEventListener("click", () => select(selected+1));
    index.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      select(selected + (event.key === "ArrowLeft" ? -1 : 1),true);
    });
    bindSwipe(screens, () => entries.length > 1,
      () => { screens.dataset.dragging = ""; },
      (distance) => screens.style.setProperty("--slide-drag",Math.max(-22,Math.min(22,distance*.22)) + "px"),
      (distance) => {
        delete screens.dataset.dragging;
        screens.style.removeProperty("--slide-drag");
        if (Math.abs(distance)>26) select(selected-Math.sign(distance));
      });
    if (entries.length) select(0);
    else screens.append(node("p","project-empty","项目待补充"));
  };
})();
