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
  const duration = 13.05;
  const sessionKey = "station-arrived-flight";

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
  const plate = (name,file,parent) => {
    const image = new Image();
    image.className = "film-plane";
    image.dataset.surface = name;
    image.alt = "";
    image.decoding = "async";
    image.src = "assets/img/"+file;
    parent.append(image);
    return image;
  };
  const windowLayer = (name,parent) => {
    const view = document.createElement("div");
    view.className = "film-window";
    view.dataset.window = name;
    parent.append(view);
    return view;
  };
  const warp = plate("gravity","flight-gravity-background.webp",film);
  warp.fetchPriority = "high";
  const orbitWindow = windowLayer("orbit",film);
  const station = plate("station","flight-berth-background.webp",orbitWindow);
  const berthWindow = windowLayer("berth",orbitWindow);
  const hull = document.createElement("div");
  hull.className = "film-plane";
  hull.dataset.surface = "airlock";
  berthWindow.append(hull);
  const airlock = plate("hall","flight-airlock.webp",hull);
  const corridorWindow = windowLayer("corridor",hull);
  corridorWindow.hidden = true;
  const corridor = plate("corridor","flight-continuous-corridor.webp",corridorWindow);
  corridor.fetchPriority = "low";
  const doorTexture = new Image();
  doorTexture.src = "assets/img/flight-airlock-leaves.webp";
  const opening = document.createElement("div");
  opening.className = "airlock-opening";
  for (const side of ["left","right"]) {
    const leaf = document.createElement("div");
    leaf.className = "airlock-leaf";
    leaf.dataset.leaf = side;
    opening.append(leaf);
  }
  hull.append(opening);
  const shuttle = plate("shuttle","flight-gravity-lens.webp",film);

  const clock = {elapsed:0, last:0, frame:0, phase:-1};
  const loadLimit = 3200;
  const resizeObserver = new ResizeObserver(resize);
  const flightPath = [
    [0,.50,.72,.84,-3.5], [1.5,.485,.66,.68,1.4], [3.10,.49,.55,.44,-3.1],
    [4.44,.49,.59,.38,-1.6], [5.91,.50,.57,.34,0], [6.78,.502,.56,.31,1.2],
    [7.42,.51,.60,.39,1.8], [8.17,.53,.86,.65,1.5], [8.85,.56,1.32,1.0,2.1]
  ];

  // The openings are measured in the same image coordinates as the station.
  const berthPolygon = [
    [.481,.434],[.631,.434],[.649,.459],[.649,.558],
    [.633,.583],[.482,.583],[.465,.559],[.465,.456]
  ];

  let audio;
  let busy = false;
  let ended = false;
  let started = false;
  let lensDrawn = false;
  let w = 1;
  let h = 1;
  let imageW = 1;
  let imageH = 1;

  function ease(a,b,value) {
    const x = Math.max(0,Math.min(1,(value-a)/(b-a)));
    return x*x*(3-2*x);
  }
  function mix(a,b,amount) { return a+(b-a)*amount; }
  function resize() {
    w = Math.max(1,layer.clientWidth);
    h = Math.max(1,layer.clientHeight);
    imageW = Math.max(w,h*1672/941);
    imageH = imageW*941/1672;
    film.style.setProperty("--plane-width",imageW+"px");
    film.style.setProperty("--plane-height",imageH+"px");
    const scatterScale = Math.min(devicePixelRatio || 1,1.15);
    optics.width = Math.ceil(w*scatterScale);
    optics.height = Math.ceil(h*scatterScale);
    ctx?.setTransform(scatterScale,0,0,scatterScale,0,0);
  }

  function project(element,anchorX,anchorY,z,screenX,screenY,bank=0) {
    const angle=bank*Math.PI/180;
    const ax=anchorX*imageW, ay=anchorY*imageH;
    const x=screenX-z*(ax*Math.cos(angle)-ay*Math.sin(angle));
    const y=screenY-z*(ax*Math.sin(angle)+ay*Math.cos(angle));
    element.style.transform = "translate3d("+x.toFixed(2)+"px,"+y.toFixed(2)+"px,0) scale("+z.toFixed(5)+")";
    if (bank) element.style.transform += " rotate("+bank.toFixed(2)+"deg)";
    return {x,y};
  }

  function pilotAt(t) {
    const i=flightPath.findIndex((key,index)=>index && t<key[0]);
    if (i<0) return flightPath[flightPath.length-1].slice(1);
    const before=flightPath[i-1], after=flightPath[i];
    const prior=flightPath[Math.max(0,i-2)], next=flightPath[Math.min(flightPath.length-1,i+1)];
    const span=after[0]-before[0], s=(t-before[0])/span;
    const s2=s*s,s3=s2*s;
    return before.slice(1).map((value,channel)=>{
      const j=channel+1;
      const outgoing=(after[j]-prior[j])/(after[0]-prior[0])*span;
      const incoming=(next[j]-before[j])/(next[0]-before[0])*span;
      return (2*s3-3*s2+1)*value+(s3-2*s2+s)*outgoing+(-2*s3+3*s2)*after[j]+(s3-s2)*incoming;
    });
  }

  function frameFlight(t) {
    const phase = t<2.6?0:t<5.15?1:t<8.85?2:t<11.64?3:4;
    if (phase!==clock.phase) {
      clock.phase=phase;
      layer.dataset.flightStage=String(phase);
      const messages=[
        ["穿越引力透镜",""],["轨道观测站",""],["对准泊位","推进器减速"],
        ["泊位已锁定","气闸均压中"],["进入工作台",""]
      ];
      [status.textContent,caption.textContent]=messages[phase];
    }

    const tunnel=ease(0,4.55,t);
    const flight=Math.max(0,Math.min(1,(t-2.0)/7.25));
    const iris=ease(2.12,4.58,t);
    const lensX=mix(.493,.506,tunnel)*w, lensY=mix(.384,.468,tunnel)*h;
    project(warp,.49,.375,1.04+tunnel*.50,lensX,lensY);
    const reach=Math.hypot(w,h);
    const radius=reach*.934*iris;
    orbitWindow.style.clipPath = "ellipse("+radius.toFixed(1)+"px "+(.86*radius).toFixed(1)+"px at "+lensX.toFixed(1)+"px "+lensY.toFixed(1)+"px)";
    warp.hidden = iris>=1;

    // The inner view stays registered to the same opening as the exterior moves past the camera.
    const bearingX=mix(.532,.50,flight)*w,bearingY=mix(.468,.505,flight)*h;
    const magnification=1.20+9.10*flight**2.65;
    const stationPose=project(station,.557,.508,magnification,bearingX,bearingY);
    const ring=berthPolygon.map(([x,y])=>[
      stationPose.x+x*imageW*magnification,
      stationPose.y+y*imageH*magnification
    ]);
    berthWindow.style.clipPath="polygon("+ring.map(([x,y])=>x.toFixed(1)+"px "+y.toFixed(1)+"px").join(",")+")";
    const interior=ease(10.19,12.92,t);
    const hatchScale=.34*magnification+interior*.79;
    project(hull,.50,.52,hatchScale,bearingX,bearingY);
    if (!corridorWindow.hidden) {
      const depthScale=Math.min(.70, (1.43+interior*.23)/hatchScale);
      project(corridor,.50,.55,depthScale,.501*imageW,.548*imageH);
    }
    const opened=ease(9.29,11.38,t);
    hull.style.setProperty("--door",opened);
    hull.style.setProperty("--door-rim",ease(8.93,9.28,t)*(1-opened*.8));
    if (phase===3 && opened>.74 && caption.textContent!=="气闸已开启") caption.textContent="气闸已开启";

    const [x,y,scale,bank]=pilotAt(t);
    const phoneScale=(w<h ? .68 : 1);
    shuttle.hidden=t>8.88;
    if (!shuttle.hidden) {
      project(shuttle,.5,.74,scale*phoneScale,x*w,y*h,bank);
      shuttle.style.filter="brightness("+(1-ease(6.7,8.4,t)*.40)+")";
    }

    if (t<4.59) {
      drawLens(t,ease(2.3,4.59,t),lensX,lensY,radius);
      lensDrawn=true;
    } else if (lensDrawn) {
      ctx?.clearRect(0,0,w,h);
      lensDrawn=false;
    }
    if (t >= 11.68) {
      const through=ease(11.68,13.02,t);
      const exitX=mix(bearingX,w*.508,through), exitY=mix(h*.59,h*.48,through);
      const width=1+reach*.98*through, height=1+reach*.87*through;
      const opening=[[-.83,-1],[.83,-1],[1,-.77],[1,.77],[.83,1],[-.83,1],[-1,.77],[-1,-.77],[-.83,-1]];
      const inner=opening.map(([x,y])=>(exitX+x*width).toFixed(1)+"px "+(exitY+y*height).toFixed(1)+"px");
      layer.style.setProperty("--exit-mask","polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,"+inner.join(",")+")");
      // The actual workroom is visible through the opening before it accepts input.
      layer.dataset.handoff="";
    }
  }

  function drawLens(t,approach,x,y,irisRadius) {
    if (!ctx) return;
    ctx.clearRect(0,0,w,h);
    ctx.globalCompositeOperation = "screen";
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
    if (irisRadius>2 && irisRadius<reach*.80) {
      ctx.strokeStyle="rgba(219,217,255,"+(.19*(1-approach))+")";
      ctx.lineWidth=4+irisRadius*.012;
      ctx.beginPath();
      ctx.ellipse(x,y,irisRadius,irisRadius*.86,0,0,2*Math.PI);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = "source-over";
  }

  function draw(time) {
    if (ended || document.hidden) return;
    if (clock.last) clock.elapsed += (time-clock.last)*.001;
    clock.last = time;
    frameFlight(clock.elapsed);
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
    air(2.85,5.84,143,73,1.15,.35,-.18);
    bell(5.42,.19,770,756,.21,"sine",.14);
    bell(5.66,.29,885,863,.13,"sine",.14);
    air(8.79,.25,864,115,.91,.59,.11,.14);
    bell(8.85,.51,118,47,.46,"triangle");
    air(9.04,.72,1310,451,1.2,.34,.23,.09);
    air(9.29,2.16,239,151,2.4,.28,-.21,.36);
    air(10.85,.62,882,373,2.7,.18,.10,.19);
    bell(11.70,.95,261,260,.13);
    bell(11.84,1.09,391,390,.10);
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

  const ready = Promise.all([warp,station,airlock,doorTexture,shuttle].map(image=>image.decode())).then(()=>true,()=>false);
  corridor.decode().then(()=>{ if (!ended && clock.elapsed<9.29) corridorWindow.hidden=false; }).catch(()=>{});
  const deadline = new Promise(resolve => setTimeout(() => resolve(false),loadLimit));
  Promise.race([ready,deadline]).then(ok => {
    if (ended) return;
    if (!ok) { finish(); return; }
    started = true;
    resize();
    layer.dataset.initialized = "";
    frameFlight(0);
    if (!document.hidden) clock.frame = requestAnimationFrame(draw);
  });
})();
