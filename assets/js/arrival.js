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
  const frame = film.getContext("2d");
  if (!frame) return;
  function image(file, priority = "auto") {
    const source = new Image();
    source.fetchPriority = priority;
    source.src = "assets/img/"+file;
    return source;
  }
  const station=image("flight-berth-background.webp","high");
  const airlock=image("flight-airlock.webp");
  const corridor=image("flight-continuous-corridor.webp");
  const doorTexture=image("flight-airlock-leaves.webp");
  const shuttle=image("flight-gravity-lens.webp");

  const clock = {elapsed:0, last:0, frame:0, phase:-1};
  const loadLimit = 3200;
  const resizeObserver = new ResizeObserver(()=>{
    resize();
    if (started && !ended) frameFlight(clock.elapsed);
  });
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
  const airlockOpening=[
    [.282,.187],[.712,.187],[.753,.2463],[.753,.787],
    [.7176,.846],[.282,.846],[.247,.787],[.247,.2463]
  ];
  const shuttleOutline=[
    [.3135,.779],[.357,.742],[.412,.716],[.452,.687],[.476,.652],[.498,.623],
    [.52,.618],[.54,.623],[.554,.652],[.571,.687],[.598,.716],[.64,.755],
    [.679,.796],[.678,.822],[.647,.814],[.605,.803],[.572,.812],[.55,.835],
    [.51,.834],[.491,.84],[.465,.841],[.448,.815],[.414,.82],[.377,.801],
    [.344,.795],[.313,.794]
  ];

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
    const density=Math.min(devicePixelRatio||1,1.4,1920/w,1440/h);
    const width=Math.max(1,Math.round(w*density)),height=Math.max(1,Math.round(h*density));
    if (film.width!==width || film.height!==height) {
      film.width=width;
      film.height=height;
    }
    frame.setTransform(film.width/w,0,0,film.height/h,0,0);
  }

  function pose(x,y,z,screenX,screenY) {
    return [screenX-x*imageW*z,screenY-y*imageH*z,imageW*z,imageH*z];
  }
  function clip(points,[x,y,width,height]) {
    frame.beginPath();
    points.forEach(([u,v],i)=>{
      if (i) frame.lineTo(x+u*width,y+v*height);
      else frame.moveTo(x+u*width,y+v*height);
    });
    frame.closePath();
    frame.clip();
  }
  function drawDoors(opened,hullPose,latched) {
    const [left,top,width,height]=hullPose;
    const x=left+width*.247,y=top+height*.187;
    const leaf=width*.2545,length=height*.659;
    frame.save();
    clip(airlockOpening,hullPose);
    for (const direction of [-1,1]) {
      const start=x+(direction===1?leaf-.006*width:0);
      const slide=direction*leaf*opened;
      frame.save();
      frame.beginPath();
      frame.rect(start+slide,y,leaf+.003*width,length);
      frame.clip();
      frame.drawImage(doorTexture,left+slide,top,width,height);
      if (latched>0) {
        frame.fillStyle="rgba(255,199,128,"+(latched*(1-opened*.8)*.55)+")";
        frame.fillRect(start+slide+(direction===-1?leaf*.99:0),y+length*.17,Math.max(1,width*.002),length*.61);
      }
      frame.restore();
    }
    frame.restore();
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

    // Draw all moving windows onto one viewport-sized frame before presenting it.
    const flight=ease(0,beats.lock,t);
    const interior=ease(beats.doors,beats.end,t);
    const x=mix(.532,.50,flight)*w,y=mix(.472,.497,flight)*h;
    const magnification=1.14+7.95*flight**3.05+interior*2.0;
    const stationPose=pose(.557,.508,magnification,x,y);
    frame.fillStyle="#17232c";
    frame.fillRect(0,0,w,h);
    frame.drawImage(station,...stationPose);
    const hatchScale=.34*magnification+interior*.79;
    const hullPose=pose(.50,.52,hatchScale,x,y);
    frame.save();
    clip(berthPolygon,stationPose);
    frame.drawImage(airlock,...hullPose);
    const [left,top,width,height]=hullPose;
    frame.save();
    clip(airlockOpening,hullPose);
    const forward=ease(beats.open,beats.handoff,t);
    const depth=Math.min(.82*hatchScale,1.43+interior*.23+forward*.94);
    frame.drawImage(corridor,...pose(.50,.55,depth,left+.501*width,top+.548*height));
    frame.restore();
    drawDoors(ease(beats.doors,beats.open,t),hullPose,ease(beats.lock,beats.doors,t));
    frame.restore();

    if (t<beats.lock) {
      const [shipX,shipY,scale,bank]=pilotAt(t);
      const zoom=scale*(w<h?.68:1);
      const shipPose=pose(.50,.74,zoom,0,0);
      frame.save();
      frame.translate(shipX*w,shipY*h);
      frame.rotate(bank*Math.PI/180);
      frame.globalAlpha=1-ease(beats.lock-.27,beats.lock,t);
      clip(shuttleOutline,shipPose);
      frame.drawImage(shuttle,...shipPose);
      frame.restore();
    }

    if (t>=beats.handoff) {
      layer.style.setProperty("--flight-opacity",1-ease(beats.handoff,beats.handoff+.40,t));
      if (!layer.hasAttribute("data-handoff")) {
        layer.dataset.handoff="";
        delete workshop.dataset.boot;
        workshop.dataset.flightLanding="";
      }
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
    window.removeEventListener("hashchange",onRouteChange);
    motion.removeEventListener("change",finish);
    audioButton.removeEventListener("click",toggleSound);
    access.removeEventListener("click",finish);
    film.removeEventListener("contextlost",finish);
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
      film.width=film.height=1;
    },motion.matches ? 0 : 520);
  }
  function onKey(event) { if (event.key === "Escape") finish(); }
  function onRouteChange() { if (location.hash && location.hash!=="#desk") finish(); }

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
  film.addEventListener("contextlost",finish);
  workshop.inert = true;
  layer.hidden = false;
  resizeObserver.observe(layer);
  document.addEventListener("visibilitychange",onVisibility);
  window.addEventListener("pagehide",closeSound);
  window.addEventListener("keydown",onKey);
  window.addEventListener("hashchange",onRouteChange);
  motion.addEventListener("change",finish);

  const workshopImage=workshop.querySelector(".scene[data-active] img");
  const stationReady=station.decode();
  stationReady.then(()=>{
    if (!started && !ended) {
      resize();
      frame.drawImage(station,...pose(.557,.508,1.14,.532*w,.472*h));
    }
  }).catch(()=>{});
  const ready=Promise.all([stationReady,airlock.decode(),corridor.decode(),doorTexture.decode(),shuttle.decode(),workshopImage?.decode()])
    .then(()=>Boolean(workshopImage?.naturalWidth),()=>false);
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
