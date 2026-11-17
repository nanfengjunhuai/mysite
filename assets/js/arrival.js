(() => {
  "use strict";

  const layer = document.querySelector("#arrival");
  if (!layer) return;
  const audioButton = layer.querySelector("#arrival-sound");
  const access = layer.querySelector("#flight-access");
  const caption = layer.querySelector("#flight-caption");
  const status = layer.querySelector("#flight-status");
  const workshop = document.querySelector("#experience");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const duration = 11.90;
  const sessionKey = "station-arrived-film";
  const shots = [
    {name:"warp", file:"flight-gravity-lens.webp", start:0, label:"穿越引力透镜", detail:""},
    {name:"orbit-wide", file:"flight-observatory.webp", start:3.08, label:"轨道观测站", detail:""},
    {name:"orbit", file:"flight-orbit-approach.webp", start:4.78, label:"对准泊位", detail:"推进器减速"},
    {name:"hatch", file:"flight-airlock.webp", start:7.12, label:"泊位已锁定", detail:"气闸均压中"}
  ];

  function alreadySeen() {
    try { return sessionStorage.getItem(sessionKey) === "1"; }
    catch { return false; }
  }

  const force = new URLSearchParams(location.search).get("arrival") === "1";
  const route = location.hash.slice(1);
  if (motion.matches || (route && route !== "desk") || (!force && (route || alreadySeen()))) return;

  const film = layer.querySelector(".arrival-film");
  const optics = layer.querySelector("canvas");
  const ctx = optics.getContext("2d");
  const plates = shots.map(({name,file}) => {
    const plate = document.createElement("div");
    plate.className = "film-plate";
    plate.dataset.shot = name;
    const image = document.createElement("img");
    image.alt = "";
    image.decoding = "async";
    if (name === "warp") image.fetchPriority = "high";
    image.src = "assets/img/" + file;
    plate.append(image);
    let backdrop;
    let doorTexture;
    if (name === "warp" || name === "orbit") {
      backdrop = document.createElement("img");
      backdrop.alt = "";
      backdrop.decoding = "async";
      backdrop.src = name === "warp" ? "assets/img/flight-gravity-background.webp" : "assets/img/flight-berth-background.webp";
      backdrop.className = "film-clean";
      image.className = "film-shuttle";
      plate.prepend(backdrop);
    }
    if (name === "hatch") {
      doorTexture = new Image();
      doorTexture.src = "assets/img/flight-airlock-leaves.webp";
      const opening = document.createElement("div");
      opening.className = "airlock-opening";
      for (const side of ["left","right"]) {
        const leaf = document.createElement("div");
        leaf.className = "airlock-leaf";
        leaf.dataset.leaf = side;
        opening.append(leaf);
      }
      plate.append(opening);
    }
    film.append(plate);
    const ready = Promise.all([image.decode(),...(doorTexture ? [doorTexture.decode()] : [])]);
    return {plate,backdrop,ready};
  });

  const clock = {elapsed:0, last:0, frame:0, shot:-1};
  const loadLimit = 3200;
  const bridge = layer.querySelector(".arrival-bridge");
  const resizeObserver = new ResizeObserver(resize);
  let audio;
  let busy = false;
  let ended = false;
  let started = false;
  let w = 1;
  let h = 1;

  function ease(a,b,value) {
    const x = Math.max(0,Math.min(1,(value-a)/(b-a)));
    return x*x*(3-2*x);
  }

  function resize() {
    w = Math.max(1,layer.clientWidth);
    h = Math.max(1,layer.clientHeight);
    const scatterScale = Math.min(devicePixelRatio || 1,1.15);
    optics.width = Math.ceil(w*scatterScale);
    optics.height = Math.ceil(h*scatterScale);
    ctx?.setTransform(scatterScale,0,0,scatterScale,0,0);
  }

  function frameShot(t) {
    const index = t < shots[1].start ? 0 : t < shots[2].start ? 1 : t < shots[3].start ? 2 : 3;
    if (index !== clock.shot) {
      clock.shot = index;
      for (let i=0;i<plates.length;i++) plates[i].plate.toggleAttribute("data-active",i===index);
      layer.dataset.flightStage = String(index);
      status.textContent = shots[index].label;
      caption.textContent = shots[index].detail;
      if (index !== 0) ctx?.clearRect(0,0,w,h);
    }
    const plate = plates[index].plate;
    if (index === 0) {
      const approach = ease(.12,3.11,t);
      plate.style.setProperty("--camera-scale",1.04+approach*.36);
      plate.style.setProperty("--camera-x",(Math.sin(t*.87)*.84-approach*.92)+"%");
      plate.style.setProperty("--camera-y",(-.2-approach*.57)+"%");
      plate.style.setProperty("--ship-x",(.85*Math.sin(t*1.6)-1.1*approach)+"%");
      plate.style.setProperty("--ship-y",(-1.5*Math.sin(t*1.2)-11.5*approach)+"%");
      plate.style.setProperty("--ship-scale",(w < h ? .66 : 1)*(1-.33*approach));
      plate.style.setProperty("--ship-bank",(Math.sin(t*1.85)*1.85-5.5*approach)+"deg");
      layer.style.setProperty("--jump",ease(2.74,3.07,t)*.72);
      drawLens(t,approach);
      return;
    }
    layer.style.setProperty("--jump",(1-ease(3.08,3.36,t))*.72);
    if (index === 1) {
      const approach = ease(3.08,4.78,t);
      plate.style.setProperty("--camera-scale",1.045+approach*.12);
      plate.style.setProperty("--camera-x",(1.15-approach*1.7)+"%");
      plate.style.setProperty("--camera-y",(-.55+approach*.55)+"%");
      return;
    }
    if (index === 2) {
      const approach = ease(4.75,7.14,t);
      plate.style.setProperty("--camera-scale",1.045+approach*.45);
      plate.style.setProperty("--camera-x",(1.1-4.2*approach)+"%");
      plate.style.setProperty("--camera-y",(1.0-1.05*approach)+"%");
      plate.style.setProperty("--ship-x",(.8+approach*9.1)+"%");
      plate.style.setProperty("--ship-y",(-.1-approach*12.1)+"%");
      plate.style.setProperty("--ship-scale",(w < h ? .82 : 1)-approach*.45);
      plate.style.setProperty("--ship-bank",(-1.2+approach*2.5)+"deg");
      layer.style.setProperty("--burn",Math.sin(t*9)*.13+(1-approach)*.47);
      return;
    }
    const door = ease(7.82,10.15,t);
    const inside = ease(9.58,11.82,t);
    plate.style.setProperty("--camera-scale",1.015+inside*.87);
    plate.style.setProperty("--camera-y",(.8-inside*.80)+"%");
    plate.style.setProperty("--door",door);
    plate.style.setProperty("--door-rim",ease(7.39,7.83,t));
    bridge.style.opacity = ease(11.29,11.82,t)*.84;
    if (t > 9.22 && caption.textContent !== "气闸已开启") caption.textContent = "气闸已开启";
  }

  function drawLens(t,approach) {
    if (!ctx) return;
    ctx.clearRect(0,0,w,h);
    ctx.globalCompositeOperation = "screen";
    const x = w*.5 + Math.sin(t*1.23)*w*.012;
    const y = h*.437;
    const reach = Math.hypot(w,h);
    const compression = w<h ? .74 : .86;

    // Sparse, curved reflections expand around the existing lens. The central silhouette stays clear.
    for (let i=0;i<15;i++) {
      const z = ((i*.153+t*.41+approach*.11)%1);
      const radius = reach*(.064+z*z*.51);
      const a = i*1.917+t*.175;
      const alpha = Math.sin(z*Math.PI)*(.13+approach*.12);
      const gradient = ctx.createLinearGradient(x-radius,y+radius*.38,x+radius,y-radius*.38);
      gradient.addColorStop(0,"#27304f00");
      gradient.addColorStop(.43,"rgba(98,139,192,"+alpha+")");
      gradient.addColorStop(.58,"rgba(149,160,207,"+(alpha*.63)+")");
      gradient.addColorStop(1,"#7197c900");
      ctx.strokeStyle = gradient;
      ctx.lineWidth = Math.max(.9,radius*.012);
      ctx.beginPath();
      ctx.ellipse(x,y,radius,radius*compression,.33,a,a+.35+z*.66);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function draw(time) {
    if (ended || document.hidden) return;
    if (clock.last) clock.elapsed += (time-clock.last)*.001;
    clock.last = time;
    frameShot(clock.elapsed);
    if (clock.elapsed >= duration) { finish(); return; }
    clock.frame = requestAnimationFrame(draw);
  }

  function onVisibility() {
    cancelAnimationFrame(clock.frame);
    clock.last = 0;
    if (document.hidden) closeSound();
    else if (started && !ended) clock.frame = requestAnimationFrame(draw);
  }
  function finish() {
    if (ended) return;
    ended = true;
    const hadFocus = layer.contains(document.activeElement);
    cancelAnimationFrame(clock.frame);
    resizeObserver.disconnect();
    document.removeEventListener("visibilitychange",onVisibility);
    window.removeEventListener("pagehide",closeSound);
    window.removeEventListener("keydown",onKey);
    motion.removeEventListener("change",finish);
    audioButton.removeEventListener("click",toggleSound);
    access.removeEventListener("click",finish);
    closeSound();
    workshop.inert = false;
    access.hidden = true;
    if (hadFocus) workshop.querySelector(".home")?.focus({preventScroll:true});
    if (started) {
      try { sessionStorage.setItem(sessionKey,"1"); } catch {}
    }
    layer.dataset.leaving = "";
    setTimeout(() => {
      layer.hidden = true;
      film.replaceChildren();
      optics.width = optics.height = 1;
    },motion.matches ? 0 : 520);
  }
  function onKey(event) { if (event.key === "Escape") finish(); }

  async function toggleSound() {
    if (!started || busy || ended) return;
    if (audio) { closeSound(); return; }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) { audioButton.disabled = true; return; }
    busy = true;
    try {
      const context = new Context();
      audio = context;
      await context.resume();
      if (audio !== context || ended) return;
      mixSound(context,clock.elapsed);
      audioButton.setAttribute("aria-pressed","true");
      audioButton.setAttribute("aria-label","关闭开场音效");
    } catch { closeSound(); }
    finally { busy = false; }
  }
  function closeSound() {
    if (audio) audio.close().catch(() => {});
    audio = undefined;
    audioButton.setAttribute("aria-pressed","false");
    audioButton.setAttribute("aria-label","开启开场音效");
  }

  function mixSound(context,elapsed) {
    const master = context.createGain();
    master.gain.value = .25;
    master.connect(context.destination);
    const zero = context.currentTime+.035-elapsed;
    const available = zero+elapsed;
    const buffer = context.createBuffer(1,context.sampleRate*3,context.sampleRate);
    const samples = buffer.getChannelData(0);
    let brown = 0;
    for (let i=0;i<samples.length;i++) {
      const white = Math.random()*2-1;
      brown = (brown+white*.14)/1.12;
      samples[i] = brown*.72+white*.28;
    }

    function envelope(input,start,end,volume,attack,balance) {
      const gain = context.createGain();
      gain.gain.setValueAtTime(.001,start);
      gain.gain.exponentialRampToValueAtTime(volume,start+(end-start)*attack);
      gain.gain.exponentialRampToValueAtTime(.001,end);
      input.connect(gain);
      if (context.createStereoPanner && balance) {
        const pan = context.createStereoPanner();
        pan.pan.value = balance;
        gain.connect(pan).connect(master);
      } else gain.connect(master);
    }

    function air(mark,length,from,to,q,volume,balance=0,attack=.23) {
      if (mark+length <= elapsed) return;
      const start = Math.max(available,zero+mark);
      const end = Math.max(start+.027,zero+mark+length);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(from,start);
      filter.frequency.exponentialRampToValueAtTime(to,end);
      filter.Q.value = q;
      source.connect(filter);
      envelope(filter,start,end,volume,attack,balance);
      source.start(start);
      source.stop(end+.02);
    }

    function bell(mark,length,from,to,volume,type="sine",balance=0) {
      if (mark < elapsed) return;
      const start = zero+mark, end = start+length;
      const oscillator = context.createOscillator();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(from,start);
      oscillator.frequency.exponentialRampToValueAtTime(to,end);
      envelope(oscillator,start,end,volume,.12,balance);
      oscillator.start(start);
      oscillator.stop(end+.02);
    }

    air(0,3.25,150,470,.7,.41,-.16,.55);
    air(1.5,2.05,540,1720,1.7,.29,.21,.57);
    bell(2.69,.66,93,39,.61);
    air(3.18,3.68,143,73,1.15,.35,-.18);
    bell(5.42,.19,770,756,.21,"sine",.14);
    bell(5.66,.29,885,863,.13,"sine",.14);
    air(7.10,.25,864,115,.91,.59,.11,.14);
    bell(7.14,.51,118,47,.46,"triangle");
    air(7.55,.75,1310,451,1.2,.34,.23,.09);
    air(7.90,2.28,239,151,2.4,.28,-.21,.36);
    air(9.68,.62,882,373,2.7,.18,.10,.19);
    bell(10.50,.95,261,260,.13);
    bell(10.63,1.12,391,390,.10);
    master.gain.setTargetAtTime(0,Math.max(available,zero+duration-.38),.18);
  }

  audioButton.addEventListener("click",toggleSound);
  access.addEventListener("click",finish);
  workshop.inert = true;
  layer.hidden = false;
  resizeObserver.observe(layer);
  document.addEventListener("visibilitychange",onVisibility);
  window.addEventListener("pagehide",closeSound);
  window.addEventListener("keydown",onKey);
  motion.addEventListener("change",finish);

  // A missing plate should never keep a visitor out of the site.
  const ready = Promise.all(plates.map(plate => plate.ready)).then(() => true,() => false);
  const clean = plates.map(({backdrop,plate},index) => backdrop?.decode().then(() => {
    if (clock.shot < index && !ended) plate.dataset.layered = "";
  }).catch(() => {}));
  Promise.all([plates[0].ready,clean[0]]).then(() => {
    if (!started && !ended) { resize(); frameShot(0); }
  }).catch(() => {});
  const deadline = new Promise(resolve => setTimeout(() => resolve(false),loadLimit));
  Promise.race([ready,deadline]).then(ok => {
    if (ended) return;
    if (!ok) { finish(); return; }
    started = true;
    resize();
    layer.dataset.initialized = "";
    frameShot(0);
    if (!document.hidden) clock.frame = requestAnimationFrame(draw);
  });
})();
