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
  const beats = { align: 1.25, lock: 3.42, doors: 3.70, open: 5.05, crossing: 5.25, handoff: 5.98, end: 6.65 };
  const duration = beats.end;
  const sessionKey = "station-arrived-flight";

  function alreadySeen() {
    try { return sessionStorage.getItem(sessionKey) === "1"; }
    catch { return false; }
  }
  const force = new URLSearchParams(location.search).get("arrival") === "1";
  const route = location.hash.slice(1);
  if (motion.matches || (route && route !== "desk") || (!force && (route || alreadySeen()))) return;

  const film = layer.querySelector(".arrival-film");
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
  const station = plate("station","flight-berth-background.webp",film);
  station.fetchPriority = "high";
  const berthWindow = windowLayer("berth",film);
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
    [0,.505,.663,.57,-1.7], [.84,.511,.629,.47,-1.3], [1.95,.503,.603,.37,-.4],
    [2.56,.50,.653,.41,0], [3.06,.50,.816,.60,.3], [beats.lock,.50,1.21,.88,.3]
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
    const phase = t<beats.align?0:t<beats.lock?1:t<beats.doors?2:t<beats.crossing?3:4;
    if (phase!==clock.phase) {
      clock.phase=phase;
      layer.dataset.flightStage=String(phase);
      const messages=[
        ["靠近观测站",""],["对准泊位","推进器减速"],["泊位已锁定","气闸均压"],
        ["气闸开启",""],["通过气闸",""]
      ];
      [status.textContent,caption.textContent]=messages[phase];
      if (phase===4) layer.dataset.crossing="";
    }

    // The view through the berth follows the same opening as the station approaches.
    const flight=ease(0,beats.lock,t);
    const interior=ease(beats.doors,beats.end,t);
    const bearingX=mix(.532,.50,flight)*w,bearingY=mix(.472,.497,flight)*h;
    const magnification=1.14+7.95*flight**3.05+interior*2.0;
    const stationPose=project(station,.557,.508,magnification,bearingX,bearingY);
    const ring=berthPolygon.map(([x,y])=>[
      stationPose.x+x*imageW*magnification,
      stationPose.y+y*imageH*magnification
    ]);
    berthWindow.style.clipPath="polygon("+ring.map(([x,y])=>x.toFixed(1)+"px "+y.toFixed(1)+"px").join(",")+")";
    const hatchScale=.34*magnification+interior*.79;
    project(hull,.50,.52,hatchScale,bearingX,bearingY);
    if (!corridorWindow.hidden) {
      const forward=ease(beats.open,beats.handoff,t);
      const depthScale=Math.min(.82, (1.43+interior*.23+forward*.94)/hatchScale);
      project(corridor,.50,.55,depthScale,.501*imageW,.548*imageH);
    }
    const opened=ease(beats.doors,beats.open,t);
    const latched=ease(beats.lock,beats.doors,t);
    hull.style.setProperty("--door",opened);
    hull.style.setProperty("--door-rim",latched*(1-opened*.8));
    hull.style.setProperty("--dock-lights",latched*(1-interior*.38));

    const [x,y,scale,bank]=pilotAt(t);
    const phoneScale=(w<h ? .68 : 1);
    shuttle.hidden=t>=beats.lock;
    if (!shuttle.hidden) {
      project(shuttle,.5,.74,scale*phoneScale,x*w,y*h,bank);
      shuttle.style.filter="brightness("+(1-ease(beats.align,beats.lock,t)*.35)+")";
      shuttle.style.opacity=1-ease(beats.lock-.27,beats.lock,t);
    }

    const shadow=ease(beats.handoff-.23,beats.handoff-.04,t)*(1-ease(beats.handoff+.04,beats.handoff+.37,t));
    layer.style.setProperty("--threshold-shadow",shadow.toFixed(3));
    if (t >= beats.handoff && !layer.hasAttribute("data-handoff")) {
      // The corridor and workshop change places at the darkest point of the threshold.
      layer.dataset.handoff="";
      delete workshop.dataset.boot;
      workshop.dataset.flightLanding="";
    }
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
    delete workshop.dataset.flightLanding;
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

    air(0,beats.lock,152,74,1.15,.34,-.16,.22);
    bell(beats.align,.19,684,674,.16,"sine",.14);
    bell(beats.align+.19,.25,837,820,.12,"sine",.14);
    air(beats.lock-.08,.25,864,115,.91,.50,.11,.14);
    bell(beats.lock,.46,118,47,.41,"triangle");
    air(beats.lock+.10,.60,1310,451,1.2,.31,.23,.09);
    air(beats.doors,beats.open-beats.doors,239,125,2.4,.29,-.21,.24);
    air(beats.open-.21,.36,626,250,2.7,.14,.10,.19);
    bell(beats.handoff-.12,.61,261,260,.11);
    bell(beats.handoff+.03,.56,391,390,.08);
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

  const ready = Promise.all([station,airlock,doorTexture,shuttle].map(image=>image.decode())).then(()=>true,()=>false);
  corridor.decode().then(()=>{ if (!ended && clock.elapsed<beats.open) corridorWindow.hidden=false; }).catch(()=>{});
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
