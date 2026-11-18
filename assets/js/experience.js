(() => {
  "use strict";

  const stage = document.querySelector("#experience");
  const scenes = document.querySelector("#scenes");
  const visor = document.querySelector("#visor");
  const atlas = document.querySelector("#station-atlas");
  const body = document.querySelector("#visor-content");
  const name = document.querySelector("#location-name");
  const kicker = document.querySelector("#location-kicker");
  const [left,right] = [document.querySelector("#look-left"),document.querySelector("#look-right")];
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const portrait = matchMedia("(max-aspect-ratio: 4/5)");
  const fieldNote = document.querySelector("#field-note");
  const fieldBack = document.querySelector("#field-back");
  const notes = window.SITE_NOTES.filter(note => note.type === "personal" && !note.sample);
  const feature = notes.find(note => note.id === "cause-or-fate") ?? notes[0];
  const projects = window.SITE_PROJECTS.filter(project => !project.sample);
  const field = window.WORLD_FIELD_STUDY;
  const study = window.WORLD_MODEL_STUDY;
  const walks = new Map();
  const visited = new Set();
  let fieldNoteOrigin;
  const archive = window.SPACE_COLLECTION.filter(item=>!item.sample);
  const data = {
    desk: {
      name: "工作台", image: "workshop", color: "#ffdaa7", center: [.53,.47],
      portrait: "assets/img/station-workshop-portrait.webp", portraitCenter: [.535,.49],
      alt: "傍晚的海边观测站工作台，程序员佩戴蓝色科技眼镜，桌上有三块显示器和一个小机器人。",
      points: [
        { title:"自叙帖", at:[.483,.373], portrait:[.505,.461], room:"story", primary:true, style:"console" },
        { title:"研究室", at:[.18,.365], portrait:[.265,.308], room:"research", tint:"#a9ebd9", screen:"research" },
        { title:"项目库", at:[.716,.394], portrait:[.763,.317], room:"projects", tint:"#e4c8f3", screen:"projects" },
        { title:"收藏室", at:[.961,.429], portrait:[.212,.643], room:"collection", tint:"#f7d9ac", style:"companion" }
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
      name:"研究室", src:"assets/img/station-research-table.webp", color:"#bde9d8", center:[.50,.51],
      portraitCenter:[.456,.51],
      alt:"海边研究室的玻璃展台，窗外是傍晚的海岸。",
      points:[{title:study.title,at:[.43,.552],action:showWorldModels,primary:true,style:"research-console"}]
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
    const observations = marks => marks.map(mark => ({
      title:mark.title, at:mark.at ?? [mark.x,mark.y], portrait:mark.portrait, style:"landmark", inline:true,
      action:() => fieldObservation(mark.title,mark.detail)
    }));
    data.coast = {
      name:field.start.title, src:field.start.image, alt:field.start.alt, color:"#b2e5ed",center:[.51,.53],
      points:[
        { title:field.routes[0].label, at:[.33,.714], room:"harbor", primary:true, style:"trail", direction:"left" },
        { title:field.routes[1].label, at:[.739,.625], room:"ridge", primary:true, style:"trail", direction:"right" },
        ...observations(field.landmarks)
      ]
    };
    for (const route of field.routes) {
      data[route.id] = {
        name:route.title, src:route.image, portrait:route.portrait, alt:route.alt, color:"#b2e5ed",center:[.54,.54],
        portraitCenter:route.id === "ridge" ? [.54,.52] : [.51,.52],
        points:[
          ...observations(route.landmarks ?? []),
          { title:"回岔路口",at:[.207,.667],portrait:[.285,.664],room:"coast",style:"trail",direction:"left",primary:true }
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
  const cameraKey="station-viewpoints";
  let savedCameras={};
  try {
    const snapshot=JSON.parse(sessionStorage.getItem(cameraKey));
    if (snapshot && typeof snapshot==="object" && !Array.isArray(snapshot)) savedCameras=snapshot;
  } catch {}
  const sceneImage = scene => scene.src ?? "assets/img/station-" + scene.image + ".webp";
  const sceneCenter = room => portrait.matches && room.portraitCenter ? room.portraitCenter : room.center;
  const cameraFormat = () => portrait.matches ? "portrait" : "wide";
  const delays={room:{swap:384,total:780},walk:{swap:510,total:1060}};
  document.querySelector("#owner").textContent = window.SITE_CONTENT.workroom.author;

  function fieldObservation(title,detail,origin=document.activeElement) {
    fieldNoteOrigin=origin;
    fieldNote.hidden=false;
    fieldNote.querySelector("h2").textContent=title;
    fieldNote.querySelector("p").textContent=detail;
  }
  function closeFieldObservation(restore=false) {
    const needsFocus=restore && fieldNote.contains(document.activeElement);
    fieldNote.hidden=true;
    if (needsFocus && fieldNoteOrigin?.isConnected && !fieldNoteOrigin.closest("[inert]")) fieldNoteOrigin.focus({preventScroll:true});
    fieldNoteOrigin=undefined;
  }
  fieldNote.querySelector("button").addEventListener("click",()=>closeFieldObservation(true));

  function prepareWalk(route) {
    if (!route?.approach) return null;
    if (walks.has(route.id)) return walks.get(route.id);
    const image=new Image();
    image.decoding="async";
    image.fetchPriority="low";
    image.src=route.approach;
    const walk={image,ready:image.decode().catch(()=>{})};
    walks.set(route.id,walk);
    return walk;
  }
  function pathBetween(from,to) {
    if (from!=="coast" && to!=="coast") return null;
    const route=field?.routes.find(route=>route.id===(from==="coast"?to:from));
    if (!route) return null;
    return {route,direction:(route.id==="harbor")===(from==="coast")?"left":"right"};
  }

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
    if (!visor.open) {
      visorReturn = document.activeElement;
      const artifact = visorReturn?.closest(".focus-point")?.getBoundingClientRect();
      const x = artifact ? (artifact.left+artifact.width/2)/stage.clientWidth : .5;
      const y = artifact ? (artifact.top+artifact.height/2)/stage.clientHeight : .5;
      visor.style.setProperty("--read-origin",Math.max(0,Math.min(x,1))*100+"% "+Math.max(0,Math.min(y,1))*100+"%");
    }
    stopReel();
    delete visor.dataset.surface;
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
    const signature = node("p",null,"paper-signature");
    signature.append(node("span",window.SITE_CONTENT.workroom.author),date);
    const text = node("article",null,"paper-text");
    text.append(...textBlocks(note));
    openVisor(note.title,signature,text,button("全部记录 ›",openNotes));
    visor.dataset.surface = "paper";
  }
  function openNotes() {
    openVisor("生活记录",node("p",window.SITE_CONTENT.workroom.intro),...notes.map(note => button(note.title + " ↗",() => readNote(note))));
    visor.dataset.surface = "paper";
  }
  function showFilm() {
    const video = node("video");
    video.src = "assets/video/story-night-sky.mp4";
    video.poster = "assets/img/story-night-poster.webp";
    video.controls = true; video.playsInline = true; video.preload = "metadata";
    const branches = node("div",null,"reel-chapters");
    branches.setAttribute("aria-label","短片章节");
    const chapters = window.SITE_CONTENT.workroom.nightFilmChapters;
    let pendingTime;
    function markChapter(time) {
      const active = chapters.findLastIndex(chapter=>chapter.time <= time+.02);
      [...branches.children].forEach((pick,index)=>pick.setAttribute("aria-pressed",String(index===active)));
    }
    video.addEventListener("loadedmetadata",()=>{
      if (pendingTime !== undefined) video.currentTime = pendingTime;
      pendingTime = undefined;
    });
    video.addEventListener("timeupdate",()=>markChapter(video.currentTime));
    for (const chapter of chapters) {
      const pick = button("",() => {
        if (video.readyState > 0) video.currentTime = chapter.time;
        else pendingTime = chapter.time;
        markChapter(chapter.time);
        video.play().catch(() => {});
      });
      pick.classList.add("reel-chapter");
      const cover=safeUrl(chapter.image);
      if (cover) {
        const image=node("img");
        image.src=cover;
        image.alt="";
        image.loading="lazy";
        pick.append(image);
      }
      const seconds=Math.floor(chapter.time);
      const duration=[Math.floor(seconds/60),seconds%60].map(part=>String(part).padStart(2,"0")).join(":");
      const label=node("span",null,"chapter-label");
      label.append(node("span",chapter.title),node("small",duration));
      pick.append(label);
      branches.append(pick);
    }
    markChapter(0);
    openVisor("夜空短片",video,branches);
    visor.dataset.surface = "reel";
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
  function showWorldModels() {
    const lead=node("div",null,"research-lead");
    lead.append(node("p",study.question,"research-question"),node("p",study.intro));
    const cases=node("div",null,"research-cases");
    for (const item of study.cases) {
      const card=node("article",null,"research-case");
      card.append(
        node("h3",item.name),
        node("p",item.focus,"research-focus"),
        node("p",item.summary),
        node("p",item.observation,"research-observation"),
        anchor(item.sourceLabel+" ↗",item.source)
      );
      cases.append(card);
    }
    const next=node("section",null,"research-next");
    next.append(node("h3",study.next.title),node("p",study.next.text),node("p",study.next.status,"research-status"));
    openVisor(study.title,lead,cases,next);
    visor.dataset.surface="research";
  }
  function showProject(project) {
    const cover = safeUrl(project.image?.url);
    const media = cover ? node("img") : null;
    if (media) { media.src = cover; media.alt = project.image.alt ?? ""; media.decoding = "async"; }
    const parts = [node("p",project.description),...textBlocks(project)];
    if (project.tags?.length) {
      const stack=node("ul",null,"project-stack");
      stack.setAttribute("aria-label","项目技术");
      stack.append(...project.tags.map(tag=>node("li",tag)));
      parts.unshift(stack);
    }
    if (media) {
      const screen = node("figure",null,"project-screen");
      screen.append(media);
      parts.unshift(screen);
    }
    if (projects.length > 1) parts.push(button("返回作品列表",showProjects));
    openVisor(project.title,...parts);
    visor.dataset.surface = "projection";
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
    const shelf = node("div",null,"collection-shelf");
    for (const item of archive) {
      const exhibit = button("",() => showCollectible(item));
      const cover=safeUrl(item.image ?? (item.kind==="image" ? item.url : ""));
      if (cover) {
        const image=node("img");
        image.src=cover;
        image.alt="";
        image.loading="lazy";
        image.decoding="async";
        exhibit.append(image);
      }
      const label=node("span",null,"shelf-label");
      label.append(node("span",item.title),node("small",item.category));
      exhibit.append(label);
      shelf.append(exhibit);
    }
    openVisor("收藏室",shelf,anchor("＋ 添加收藏","collection-editor.html?from=experience"));
    visor.dataset.surface="cabinet";
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
  window.createStationAtlas?.({dialog:atlas,trigger:document.querySelector("#atlas"),scenes:data,imageFor:sceneImage,
    current:()=>active,navigate:id=>{ location.hash=id; }});
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
    image.alt = room.alt;
    image.width = 1672; image.height = 941; image.decoding = "async";
    if (id === "desk") image.fetchPriority = "high";
    else image.fetchPriority = "low";
    let visual=image;
    if (room.portrait) {
      frame.dataset.portrait="";
      visual=node("picture");
      const vertical=node("source");
      vertical.media=portrait.media;
      vertical.srcset=room.portrait;
      visual.append(vertical,image);
    }
    image.src = sceneImage(room);
    const practical = node("div",null,"practical");
    practical.setAttribute("aria-hidden","true");
    practical.style.setProperty("--light-x",room.center[0]*100+"%");
    practical.style.setProperty("--light-y",room.center[1]*100+"%");
    practical.style.setProperty("--light-color",room.color + "59");
    plate.append(visual,practical);
    for (const point of room.points) {
      const target = point.room ? anchor("","#"+point.room) : node("button");
      if (point.room) {
        target.setAttribute("aria-label",point.title);
        target.addEventListener("click",event => {
          if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
          const rectangle = target.getBoundingClientRect();
          requestedOrigin = {
            to:point.room,at:portrait.matches && point.portrait ? point.portrait : point.at,
            x:(rectangle.left+rectangle.width/2)/stage.clientWidth,
            y:(rectangle.top+rectangle.height/2)/stage.clientHeight
          };
        });
      } else {
        target.type = "button";
        if (!point.inline) target.setAttribute("aria-haspopup","dialog");
        else target.setAttribute("aria-controls","field-note");
        target.addEventListener("click",event=>{
          point.action();
          if (point.inline && event.detail===0) fieldNote.querySelector("button").focus({preventScroll:true});
        });
      }
      target.className = "focus-point";
      target.style.setProperty("--x",point.at[0]*100+"%");
      target.style.setProperty("--y",point.at[1]*100+"%");
      if (point.tint) target.style.setProperty("--point-color",point.tint);
      if (point.style) target.dataset.style = point.style;
      if (point.direction) target.dataset.direction=point.direction;
      if (point.portrait) {
        target.style.setProperty("--portrait-x",point.portrait[0]*100+"%");
        target.style.setProperty("--portrait-y",point.portrait[1]*100+"%");
      }
      target.toggleAttribute("data-primary",!!point.primary);
      target.append(node("span",point.title,"point-title"));
      if (point.style === "console") {
        const greeting=node("span",null,"console-intro");
        const intro=window.SITE_CONTENT.workroom.intro;
        const pause=intro.lastIndexOf("，")+1;
        if (pause && pause<intro.length) {
          greeting.append(node("span",intro.slice(0,pause)),node("span",intro.slice(pause)));
        } else greeting.textContent=intro;
        greeting.id="workshop-greeting";
        target.setAttribute("aria-describedby",greeting.id);
        const prompt=node("span",null,"console-prompt");
        prompt.append(node("span",feature?.title ?? "打开记录"),node("span","↗"));
        prompt.lastElementChild.setAttribute("aria-hidden","true");
        target.append(greeting,prompt);
      }
      if (point.style === "display" && projects.length) target.append(node("span",projects[0].title,"display-title"));
      if (point.style === "research-console") target.append(node("span",study.question,"research-console-question"));
      plate.append(target);
      if (point.screen) {
        target.dataset.deskScreen = point.screen;
        const preview = node("span",null,"desk-projection");
        preview.dataset.screen = point.screen;
        preview.setAttribute("aria-hidden","true");
        const source = sceneImage(data[point.screen]);
        let decoding;
        const show = () => {
          if (!source || reduced.matches) return;
          if (!decoding) {
            const image = new Image();
            image.src = source;
            decoding=image.decode().then(() => {
              preview.style.setProperty("--projection",'url("'+new URL(source,document.baseURI).href+'")');
              preview.dataset.ready = "";
            }).catch(() => { decoding=undefined; });
          }
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
    const stored=savedCameras[id];
    const cameras={wide:0,portrait:0};
    for (const mode of Object.keys(cameras)) {
      if (Number.isFinite(stored?.[mode])) cameras[mode]=Math.max(-1,Math.min(1,stored[mode]));
    }
    const view = { frame,plate,image,cameras };
    views.set(id,view);
    return view;
  }
  function align(view,center,delta = 0) {
    const width = view.plate.offsetWidth;
    const height = view.plate.offsetHeight;
    const maxX = Math.max(0,(width-stage.clientWidth)/2);
    const maxY = Math.max(0,(height-stage.clientHeight)/2);
    const base=width*(.5-center[0]);
    const x = Math.max(-maxX,Math.min(maxX,base+delta));
    const y = height*(.5-center[1]);
    view.plate.style.setProperty("--look-x",x + "px");
    view.plate.style.setProperty("--look-y",Math.max(-maxY,Math.min(maxY,y)) + "px");
    view.plate.style.setProperty("--focus-x",center[0]*100+"%");
    view.plate.style.setProperty("--focus-y",center[1]*100+"%");
    left.disabled = x >= maxX-1;
    right.disabled = x <= -maxX+1;
    stage.toggleAttribute("data-view-travel",maxX>29);
    stage.style.setProperty("--view-travel",(maxX ? (maxX-x)/(2*maxX) : .5)*100+"%");
    return x-base;
  }
  function restoreCamera() {
    if (!active) return;
    const room=data[active],view=views.get(active);
    delete view.frame.dataset.panning;
    const saved=view.cameras[cameraFormat()]*view.plate.offsetWidth;
    offset=align(view,sceneCenter(room),saved);
  }
  function look(delta) {
    if (!active || stage.hasAttribute("data-cut")) return;
    const room = data[active];
    const view = views.get(active);
    const center=sceneCenter(room);
    view.frame.dataset.panning="";
    offset=align(view,center,offset+delta);
    view.cameras[cameraFormat()]=offset/Math.max(1,view.plate.offsetWidth);
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
    if (!active || stage.hasAttribute("data-cut") || !event.isPrimary || event.button !== 0) return;
    gesture = { id:event.pointerId,x:event.clientX,y:event.clientY,offset,active:false,view:views.get(active) };
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
      delete gesture.view.frame.dataset.dragging;
    }
    gesture = null;
  }
  for (const event of ["pointerup","pointercancel","lostpointercapture"]) scenes.addEventListener(event,release);
  scenes.addEventListener("click",event => {
    if (event.detail && performance.now()<suppressUntil) { event.preventDefault(); event.stopPropagation(); }
  },true);
  window.addEventListener("resize",restoreCamera);
  portrait.addEventListener("change",restoreCamera);
  window.addEventListener("pagehide",()=>{
    for (const [id,view] of views) savedCameras[id]=view.cameras;
    try { sessionStorage.setItem(cameraKey,JSON.stringify(savedCameras)); } catch {}
  });

  function clearTransfer() {
    delete stage.dataset.cut;
    delete stage.dataset.walk;
    if (!active) return;
    const current=views.get(active).frame;
    delete current.dataset.departing;
    delete current.dataset.arriving;
    if (gesture) release({pointerId:gesture.id});
  }

  async function openScene(id, moveFocus = false) {
    const step = ++navigation;
    const origin = requestedOrigin?.to === id ? requestedOrigin : null;
    requestedOrigin = null;
    const next = mount(id);
    stopReel();
    closeFieldObservation();
    if (visor.open) visor.close();
    if (atlas.open) atlas.close();
    clearTransfer();
    if (active === id) return;
    const arrivingFrom=active;
    let timing;
    if (active && id !== active && !reduced.matches) {
      const path=pathBetween(active,id);
      const walk=prepareWalk(path?.route);
      if (!next.image.complete) await next.image.decode().catch(() => {});
      if (walk && !walk.image.complete) await Promise.race([walk.ready,new Promise(resolve=>setTimeout(resolve,320))]);
      if (step !== navigation) return;
      const current = views.get(active);
      delete stage.dataset.boot;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (step !== navigation) return;
      stage.style.setProperty("--cut-x",(origin?.x ?? .5)*100+"%");
      stage.style.setProperty("--cut-y",(origin?.y ?? .5)*100+"%");
      stage.style.setProperty("--cut-point",(origin?.x ?? .5)*100+"% "+(origin?.y ?? .5)*100+"%");
      const departure=origin?.at ?? sceneCenter(data[active]);
      current.plate.style.setProperty("--departure-x",departure[0]*100+"%");
      current.plate.style.setProperty("--departure-y",departure[1]*100+"%");
      current.frame.dataset.departing = "";
      stage.dataset.transit = id;
      timing=delays.room;
      stage.style.setProperty("--transfer-light",data[id].color);
      if (path && (walk?.image.naturalWidth || next.image.naturalWidth)) {
        timing=delays.walk;
        stage.dataset.walk=path.direction;
        const source=walk?.image.naturalWidth?path.route.approach:next.image.currentSrc;
        stage.style.setProperty("--walk-image",'url("'+new URL(source,document.baseURI).href+'")');
        stage.style.setProperty("--walk-focus",walk?.image.naturalWidth?(path.route.approachCrop ?? "50% 56%"):"50% 50%");
      }
      stage.style.setProperty("--transfer-duration",timing.total+"ms");
      stage.dataset.cut = "";
      await new Promise(resolve => setTimeout(resolve,timing.swap));
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
    fieldBack.hidden=id!=="coast";
    if (id === "coast" && !reduced.matches) field.routes.forEach(prepareWalk);
    if (field?.routes.some(route=>route.id===id)) visited.add(id);
    const room = data[id];
    restoreCamera();
    next.frame.inert = false;
    next.frame.dataset.active = "";
    if (timing) next.frame.dataset.arriving = "";
    stage.dataset.scene = id;
    stage.style.setProperty("--accent",room.color);
    name.textContent = room.name;
    kicker.textContent = ["coast","harbor","ridge"].includes(id) ? "海岸城" : "观测站";
    if (moveFocus) name.focus({preventScroll:true});
    const recall=id === "coast" && field?.routes.some(route=>route.id===arrivingFrom);
    const showRecall=()=>{
      if (recall && fieldNote.hidden) fieldObservation("石拱岔路",visited.size===field.routes.length?field.compared:field.revisit);
    };
    if (timing) setTimeout(()=>{
      if (step !== navigation) return;
      clearTransfer();
      showRecall();
    },timing.total-timing.swap+34);
    else showRecall();
  }
  const route = () => Object.hasOwn(data,location.hash.slice(1)) ? location.hash.slice(1) : "desk";
  window.addEventListener("hashchange",() => openScene(route(),true));
  window.addEventListener("keydown",event => {
    if (atlas.open) return;
    if (event.key === "Escape" && !visor.open) {
      if (!fieldNote.hidden) closeFieldObservation(true);
      else if (active === "coast") location.hash="research";
      else if (field?.routes.some(route=>route.id===active)) location.hash="coast";
      else if (active !== "desk") location.hash="desk";
    }
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
