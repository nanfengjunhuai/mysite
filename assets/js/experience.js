(() => {
  "use strict";

  const stage = document.querySelector("#experience");
  const scenes = document.querySelector("#scenes");
  const visor = document.querySelector("#visor");
  const body = document.querySelector("#visor-content");
  const name = document.querySelector("#location-name");
  const kicker = document.querySelector("#location-kicker");
  const [left,right] = [document.querySelector("#look-left"),document.querySelector("#look-right")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const notes = window.SITE_NOTES.filter(note => note.type === "personal" && !note.sample);
  const feature = notes.find(note => note.id === "cause-or-fate") ?? notes[0];
  const projects = window.SITE_PROJECTS.filter(project => !project.sample);
  const field = window.WORLD_FIELD_STUDY;
  const archive = [...window.SPACE_COLLECTION];
  const data = {
    desk: {
      name: "工作台", image: "workshop", color: "#ffdaa7", center: [.51,.47],
      alt: "傍晚的海边观测站工作台，程序员佩戴蓝色科技眼镜，桌上有三块显示器和一个小机器人。",
      points: [
        { title:"自叙帖", at:[.484,.364], room:"story", primary:true, style:"console" },
        { title:"研究室", at:[.18,.385], room:"research", tint:"#a9ebd9", screen:"research" },
        { title:"项目库", at:[.716,.394], room:"projects", tint:"#e4c8f3", screen:"projects" },
        { title:"收藏室", at:[.961,.459], room:"collection", tint:"#bfeaff" }
      ]
    },
    story: {
      name:"自叙帖", image:"journal", color:"#f4c9ac", center:[.51,.63],
      alt:"私人阅读角的桌上摊着笔记本，右侧有一扇映着极光的放映窗。",
      points:[
        { title:feature?.title ?? "生活记录", at:[.48,.688], action:() => feature ? readNote(feature) : openNotes(), primary:true, style:"paper" },
        { title:"夜空短片", at:[.758,.49], action:showFilm, preview:true },
        { title:"全部记录", at:[.113,.455], action:openNotes }
      ]
    },
    research: {
      name:"研究室", image:"research", color:"#bde9d8", center:[.50,.51],
      alt:"研究室中央是一座海岸城地形模型，右侧放着机器人训练设备。",
      points:[
        { title:"海岸城", at:[.48,.56], room:"coast", primary:true },
        { title:"机器人训练", at:[.776,.496], action:showRobotLab }
      ]
    },
    projects: {
      name:"项目库", image:"projects", color:"#dec6eb", center:[.49,.51],
      alt:"淡紫色机房沿两侧展开，中间亮着一块项目放映屏。",
      points:[{ title:"放映作品", at:[.51,.462], action:showProjects, primary:true, style:"display" }]
    },
    collection: {
      name:"收藏室", image:"collection", color:"#e8c891", center:[.43,.57],
      alt:"收藏室的铜色展柜旁挂着一幅海岸风景，中央玻璃展台里摆着晶石与星形仪器。",
      points:[
        {title:"全部收藏",at:[.49,.723],action:showCollection,primary:true}
      ]
    }
  };
  if (field) {
    data.coast = {
      name:field.start.title, src:field.start.image, alt:field.start.alt, color:"#b2e5ed",center:[.51,.53],
      points:[
        { title:field.routes[0].label, at:[.30,.70], room:"harbor", primary:true },
        { title:field.routes[1].label, at:[.76,.66], room:"ridge", primary:true }
      ]
    };
    for (const route of field.routes) {
      data[route.id] = {
        name:route.title, src:route.image, alt:route.alt, color:"#b2e5ed",center:[.54,.54],
        points:[
          { title:"观察记录",at:[.55,.54],action:() => openVisor(route.title,node("p",route.description)),primary:true },
          { title:"回岔路口",at:[.36,.71],room:"coast" }
        ]
      };
    }
  }

  let active;
  let reel;
  let navigation = 0;
  let offset = 0;
  let gesture = null;
  let suppressUntil = 0;
  let visorReturn = null;
  let requestedOrigin = null;
  const views = new Map();
  const sceneImage = scene => scene.src ?? "assets/img/station-" + scene.image + ".webp";
  document.querySelector("#owner").textContent = window.SITE_CONTENT.workroom.author;

  function node(tag,text,className) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  }
  function safeUrl(value) {
    if (typeof value !== "string") return "";
    if (/^assets\/(?:img|video|collection)\/[\w.-]+$/.test(value)) return value;
    try {
      const url = new URL(value);
      if (url.protocol === "https:" && !url.username && !url.password) return url.href;
    } catch {}
    return "";
  }
  function anchor(text,href) {
    const element = node("a",text);
    element.href = href;
    if (href.startsWith("https://")) {
      element.target = "_blank";
      element.rel = "noopener noreferrer";
    }
    return element;
  }
  function button(text,callback) {
    const element = node("button",text,"visor-choice");
    element.type = "button";
    element.addEventListener("click",callback);
    return element;
  }
  function openVisor(title,...blocks) {
    if (!visor.open) visorReturn = document.activeElement;
    stopReel();
    document.querySelector("#visor-title").textContent = title;
    body.replaceChildren(...blocks);
    body.closest("dialog").scrollTop = 0;
    if (!visor.open) visor.showModal();
    else visor.querySelector("button").focus();
  }
  visor.addEventListener("close",() => {
    if (visor.open) return;
    body.querySelector("video")?.pause();
    body.replaceChildren();
    if (visorReturn?.isConnected && !visorReturn.closest("[inert]")) visorReturn.focus({preventScroll:true});
    visorReturn = null;
  });
  document.addEventListener("visibilitychange",() => {
    if (document.hidden) body.querySelector("video")?.pause();
  });

  function textBlocks(record) {
    const parts = [];
    for (const section of record.sections ?? []) {
      if (section.title) parts.push(node("h3",section.title));
      if (section.text) parts.push(node("p",section.text));
      for (const value of section.blocks ?? []) {
        if (typeof value === "string") parts.push(node("p",value));
        else if (value?.quote) parts.push(node("blockquote",value.quote));
        else if (value?.code) {
          const pre = node("pre");
          pre.append(node("code",typeof value.code === "string" ? value.code : value.code.text));
          parts.push(pre);
        }
      }
    }
    return parts;
  }
  function readNote(note) {
    const date = node("time",note.date);
    date.dateTime = note.date;
    openVisor(note.title,date,...textBlocks(note),button("全部记录 ›",openNotes));
  }
  function openNotes() {
    openVisor("生活记录",node("p",window.SITE_CONTENT.workroom.intro),...notes.map(note => button(note.title + " ↗",() => readNote(note))));
  }
  function showFilm() {
    const video = node("video");
    video.src = "assets/video/story-night-sky.mp4";
    video.poster = "assets/img/story-night-poster.webp";
    video.controls = true; video.playsInline = true; video.preload = "metadata";
    const branches = node("div",null,"visor-secondary");
    for (const chapter of window.SITE_CONTENT.workroom.nightFilmChapters) {
      const pick = button(chapter.title,() => {
        if (video.readyState > 0) video.currentTime = chapter.time;
        else video.addEventListener("loadedmetadata",() => { video.currentTime = chapter.time; },{ once:true });
        video.play().catch(() => {});
      });
      branches.append(pick);
    }
    openVisor("夜空短片",video,branches);
  }
  function stopReel() {
    reel?.pause();
    if (reel) delete reel.dataset.playing;
  }
  function mountReel(plate,target) {
    reel = node("video",null,"reading-reel");
    reel.muted = true;
    reel.playsInline = true;
    reel.preload = "none";
    reel.setAttribute("aria-hidden","true");
    plate.append(reel);
    const start = () => {
      if (reduced.matches || visor.open || document.hidden || active !== "story") return;
      if (!reel.getAttribute("src")) reel.src = "assets/video/story-night-sky.mp4";
      if (reel.readyState && reel.currentTime >= 3) reel.currentTime = 0;
      reel.play().catch(stopReel);
    };
    reel.addEventListener("playing",() => { reel.dataset.playing = ""; });
    reel.addEventListener("timeupdate",() => { if (reel.currentTime >= 3) stopReel(); });
    target.addEventListener("pointerenter",event => { if (event.pointerType === "mouse") start(); });
    target.addEventListener("pointerleave",stopReel);
    target.addEventListener("focus",() => { if (target.matches(":focus-visible")) start(); });
    target.addEventListener("blur",stopReel);
  }
  document.addEventListener("visibilitychange",() => { if (document.hidden) stopReel(); });
  reduced.addEventListener("change",() => { if (reduced.matches) stopReel(); });
  function showRobotLab() {
    const controls = node("div",null,"visor-secondary");
    controls.id = "robot-conditions";
    const map = node("canvas");
    map.id = "robot-map"; map.width = 660; map.height = 370;
    map.setAttribute("role","img");
    const result = node("strong"); result.id = "robot-result";
    result.setAttribute("aria-live","polite");
    const info = node("p"); info.id = "robot-note";
    openVisor("机器人训练场",map,controls,result,info);
    window.mountRobotStudy({ controls,map,result,note:info });
  }
  function showProject(project) {
    const cover = safeUrl(project.image?.url);
    const media = cover ? node("img") : null;
    if (media) { media.src = cover; media.alt = project.image.alt ?? ""; }
    const parts = [node("p",project.description),...textBlocks(project)];
    if (media) parts.unshift(media);
    if (projects.length > 1) parts.push(button("返回作品列表",showProjects));
    openVisor(project.title,...parts);
  }
  function showProjects() {
    if (projects.length === 1) showProject(projects[0]);
    else if (projects.length) openVisor("项目库",...projects.map(project => button(project.title + " ↗",() => showProject(project))));
    else openVisor("项目库",node("p","作品待补充。"));
  }
  function showCollectible(item) {
    const url = safeUrl(item.url ?? item.href);
    if (item.kind === "film") { showFilm(); return; }
    if (item.kind === "field") { location.hash = "coast"; return; }
    const parts = [];
    if (item.kind === "quote") parts.push(node("blockquote",item.quote));
    if (url && item.kind === "image") {
      const image = node("img"); image.src = url; image.alt = item.title; parts.push(image);
    }
    if (url && item.kind === "video") {
      const video = node("video"); video.src = url; video.controls = true; video.playsInline = true; parts.push(video);
    }
    if (url && ["link","video-link"].includes(item.kind)) parts.push(anchor("打开来源 ↗",url));
    if (item.description) parts.push(node("p",item.description));
    openVisor(item.title,...parts,button("返回收藏",showCollection));
  }
  function showCollection() {
    openVisor("收藏室",...archive.map(item => button(item.title + " ↗",() => showCollectible(item))),
      anchor("＋ 添加收藏","collection-editor.html?from=experience"));
  }
  function arrangeExhibits(plate) {
    plate.querySelectorAll(".exhibit").forEach(exhibit => exhibit.remove());
    const slots = [[.261,.43],[.438,.573],[.546,.538]];
    slots.forEach(([x,y],index) => {
      const item = archive[index];
      if (!item) return;
      const exhibit = node("button",null,"focus-point exhibit");
      exhibit.type = "button";
      exhibit.style.setProperty("--x",x*100+"%");
      exhibit.style.setProperty("--y",y*100+"%");
      exhibit.setAttribute("aria-haspopup","dialog");
      const cover = safeUrl(item.image ?? (item.kind === "image" ? item.url : ""));
      if (cover && index === 0) {
        exhibit.dataset.style = "frame";
        const image = node("img");
        image.src = cover;
        image.alt = "";
        image.decoding = "async";
        exhibit.append(image);
      }
      exhibit.append(node("span",item.title,"point-title"));
      exhibit.addEventListener("click",() => showCollectible(item));
      plate.append(exhibit);
    });
  }
  function showAtlas() {
    const rooms = ["desk","story","research","projects","collection"];
    openVisor("舱室",...rooms.map(id => button(data[id].name + (id === active ? " · 当前位置" : " ↗"),() => {
      if (id === active) visor.close();
      else location.hash = id;
    })),anchor("查看三维观测站 ↗","world.html"));
  }
  document.querySelector("#atlas").addEventListener("click",showAtlas);
  if (location.protocol !== "file:") {
    fetch("content/collection-personal.json").then(response => response.ok ? response.json() : []).then(items => {
      if (!Array.isArray(items) || !items.length) return;
      archive.unshift(...items.filter(item => item && typeof item.title === "string"));
      const collectionView = views.get("collection");
      if (collectionView) arrangeExhibits(collectionView.plate);
    }).catch(() => {});
  }

  function mount(id) {
    if (views.has(id)) return views.get(id);
    const room = data[id];
    const frame = node("section",null,"scene");
    frame.inert = true;
    frame.dataset.room = id;
    frame.setAttribute("aria-label",room.name);
    const plate = node("div",null,"plate");
    const image = node("img");
    image.src = sceneImage(room);
    image.alt = room.alt;
    image.width = 1672; image.height = 941; image.decoding = "async";
    if (id === "desk") image.fetchPriority = "high";
    else image.fetchPriority = "low";
    const practical = node("div",null,"practical");
    practical.setAttribute("aria-hidden","true");
    practical.style.setProperty("--light-x",room.center[0]*100+"%");
    practical.style.setProperty("--light-y",room.center[1]*100+"%");
    practical.style.setProperty("--light-color",room.color + "59");
    plate.append(image,practical);
    for (const point of room.points) {
      const target = point.room ? anchor("","#"+point.room) : node("button");
      if (point.room) {
        target.addEventListener("click",event => {
          if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
          const rectangle = target.getBoundingClientRect();
          requestedOrigin = {
            to:point.room,at:point.at,
            x:(rectangle.left+rectangle.width/2)/stage.clientWidth,
            y:(rectangle.top+rectangle.height/2)/stage.clientHeight
          };
        });
      } else {
        target.type = "button";
        target.setAttribute("aria-haspopup","dialog");
        target.addEventListener("click",point.action);
      }
      target.className = "focus-point";
      target.style.setProperty("--x",point.at[0]*100+"%");
      target.style.setProperty("--y",point.at[1]*100+"%");
      if (point.tint) target.style.setProperty("--point-color",point.tint);
      if (point.style) target.dataset.style = point.style;
      target.toggleAttribute("data-primary",!!point.primary);
      target.append(node("span",point.title,"point-title"));
      if (point.style === "console") target.append(node("span",window.SITE_CONTENT.workroom.intro,"console-intro"));
      if (point.style === "display" && projects.length) target.append(node("span",projects[0].title,"display-title"));
      plate.append(target);
      if (point.screen) {
        target.dataset.deskScreen = point.screen;
        const preview = node("span",null,"desk-projection");
        preview.dataset.screen = point.screen;
        preview.setAttribute("aria-hidden","true");
        const source = point.screen === "research" ? field?.start.image : sceneImage(data.projects);
        const show = () => {
          if (source) preview.style.setProperty("--projection",'url("'+source+'")');
          preview.dataset.lit = "";
        };
        const hide = () => { delete preview.dataset.lit; };
        target.addEventListener("focus",show);
        target.addEventListener("blur",() => { if (!target.matches(":hover")) hide(); });
        target.addEventListener("pointerenter",show);
        target.addEventListener("pointerleave",() => { if (!target.matches(":focus-visible")) hide(); });
        plate.append(preview);
      }
      if (point.preview) mountReel(plate,target);
    }
    if (id === "collection") arrangeExhibits(plate);
    frame.append(plate);
    scenes.append(frame);
    const view = { frame,plate,image };
    views.set(id,view);
    return view;
  }
  function align(view,center,delta = 0) {
    const width = view.plate.offsetWidth;
    const height = view.plate.offsetHeight;
    const maxX = Math.max(0,(width-stage.clientWidth)/2);
    const maxY = Math.max(0,(height-stage.clientHeight)/2);
    const x = width*(.5-center[0])+delta;
    const y = height*(.5-center[1]);
    view.plate.style.setProperty("--look-x",Math.max(-maxX,Math.min(maxX,x)) + "px");
    view.plate.style.setProperty("--look-y",Math.max(-maxY,Math.min(maxY,y)) + "px");
    view.plate.style.setProperty("--focus-x",center[0]*100+"%");
    view.plate.style.setProperty("--focus-y",center[1]*100+"%");
    left.disabled = x >= maxX-1;
    right.disabled = x <= -maxX+1;
  }
  function look(delta) {
    if (!active) return;
    const room = data[active];
    const view = views.get(active);
    const maxX = (view.plate.offsetWidth-stage.clientWidth)/2;
    const base = view.plate.offsetWidth*(.5-room.center[0]);
    offset = Math.max(-maxX-base,Math.min(maxX-base,offset+delta));
    align(view,room.center,offset);
  }
  left.addEventListener("click",() => look(stage.clientWidth*.36));
  right.addEventListener("click",() => look(-stage.clientWidth*.36));
  scenes.addEventListener("focusin",event => {
    const target = event.target.closest(".focus-point");
    if (!target || !active) return;
    const bounds = target.getBoundingClientRect();
    if (bounds.right > stage.clientWidth-12 || bounds.left < 12) look(stage.clientWidth/2-bounds.left-bounds.width/2);
  });
  scenes.addEventListener("pointerdown",event => {
    if (!event.isPrimary || event.button !== 0) return;
    gesture = { id:event.pointerId,x:event.clientX,y:event.clientY,offset,active:false };
  });
  scenes.addEventListener("pointermove",event => {
    if (!gesture || gesture.id !== event.pointerId || !active) return;
    const dx = event.clientX-gesture.x;
    if (!gesture.active && Math.abs(dx) < Math.max(9,Math.abs(event.clientY-gesture.y))) return;
    const view = views.get(active);
    if (!gesture.active) {
      scenes.setPointerCapture(event.pointerId);
      view.frame.dataset.dragging = "";
      gesture.active = true;
    }
    look(gesture.offset+dx-offset);
  });
  function release(event) {
    if (event.pointerId !== gesture?.id) return;
    if (gesture.active) {
      suppressUntil = performance.now()+250;
      if (active) delete views.get(active).frame.dataset.dragging;
    }
    gesture = null;
  }
  for (const event of ["pointerup","pointercancel","lostpointercapture"]) scenes.addEventListener(event,release);
  scenes.addEventListener("click",event => {
    if (event.detail && performance.now()<suppressUntil) { event.preventDefault(); event.stopPropagation(); }
  },true);
  window.addEventListener("resize",() => { if (active) look(0); });

  async function openScene(id, moveFocus = false) {
    const step = ++navigation;
    const origin = requestedOrigin?.to === id ? requestedOrigin : null;
    requestedOrigin = null;
    const next = mount(id);
    stopReel();
    if (visor.open) visor.close();
    if (active === id) {
      delete stage.dataset.cut;
      delete next.frame.dataset.departing;
      return;
    }
    if (active && id !== active && !reduced.matches) {
      if (!next.image.complete) await next.image.decode().catch(() => {});
      if (step !== navigation) return;
      const current = views.get(active);
      delete stage.dataset.boot;
      delete stage.dataset.cut;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (step !== navigation) return;
      stage.style.setProperty("--cut-x",(origin?.x ?? .5)*100+"%");
      stage.style.setProperty("--cut-y",(origin?.y ?? .5)*100+"%");
      current.plate.style.setProperty("--departure-x",(origin?.at[0] ?? data[active].center[0])*100+"%");
      current.plate.style.setProperty("--departure-y",(origin?.at[1] ?? data[active].center[1])*100+"%");
      current.frame.dataset.departing = "";
      stage.dataset.transit = id;
      stage.dataset.cut = "";
      await new Promise(resolve => setTimeout(resolve,370));
    }
    if (step !== navigation) return;
    if (active && active !== id) {
      const old = views.get(active).frame;
      old.inert = true;
      delete old.dataset.active;
      delete old.dataset.arriving;
      delete old.dataset.departing;
    }
    active = id;
    offset = 0;
    const room = data[id];
    align(next,room.center);
    next.frame.inert = false;
    next.frame.dataset.active = "";
    if (moveFocus && !reduced.matches) next.frame.dataset.arriving = "";
    stage.dataset.scene = id;
    stage.style.setProperty("--accent",room.color);
    name.textContent = room.name;
    kicker.textContent = ["coast","harbor","ridge"].includes(id) ? "海岸城" : "观测站";
    if (moveFocus) document.querySelector(".home").focus({preventScroll:true});
  }
  const route = () => Object.hasOwn(data,location.hash.slice(1)) ? location.hash.slice(1) : "desk";
  window.addEventListener("hashchange",() => openScene(route(),true));
  window.addEventListener("keydown",event => {
    if (event.key === "Escape" && !visor.open && active !== "desk") location.hash = "desk";
    if (!visor.open && event.key === "ArrowLeft") look(stage.clientWidth*.3);
    if (!visor.open && event.key === "ArrowRight") look(-stage.clientWidth*.3);
  });
  const firstRoom = route();
  openScene(firstRoom);
  const initialImage = views.get(firstRoom).image;
  const warm = () => {
    if (firstRoom === "desk" && active === "desk" && initialImage.naturalWidth && !reduced.matches) stage.dataset.boot = "";
    for (const id of ["story","research","projects","collection"]) mount(id);
  };
  if (initialImage.complete) warm();
  else {
    initialImage.addEventListener("load",warm,{once:true});
    initialImage.addEventListener("error",warm,{once:true});
  }
})();
