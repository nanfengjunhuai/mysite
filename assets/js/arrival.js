(() => {
  "use strict";

  const layer = document.querySelector("#arrival");
  const O = window.Observatory;
  const T = window.THREE;
  if (!layer || !O || !T) return;
  const canvas = layer.querySelector("canvas");
  const audioButton = layer.querySelector("#arrival-sound");
  const caption = layer.querySelector("#flight-caption");
  const status = layer.querySelector("#flight-status");
  const workshop = document.querySelector("#experience");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const length = 12.65;
  const flightText = [
    ["跃迁中", "正在前往观测站"],
    ["已脱离跃迁", "观测站出现于前方"],
    ["进近许可", "减速并对准泊位"],
    ["已停靠", "正在开启观测站舱门"]
  ];

  function sessionStatus() {
    try { return sessionStorage.getItem("station-arrived") === "1"; }
    catch { return false; }
  }

  const force = new URLSearchParams(location.search).get("arrival") === "1";
  const route = location.hash.slice(1);
  if (motion.matches || (route && route !== "desk") || (!force && (route || sessionStatus()))) return;

  let renderer;
  try { renderer = O.rendererFor(canvas); }
  catch { return; }
  const scene = new T.Scene();
  O.stationsLights(scene);
  const station = O.buildStation(scene);
  const ship = O.buildShip(scene);
  const space = O.backdrop(scene);
  const camera = new T.PerspectiveCamera(44,1,.08,710);
  const tunnel = buildTunnel();
  scene.add(tunnel);
  const target = new T.Vector3();
  const clock = { elapsed:0, last:0, frame:0, stage:-1, slow:0 };
  let density = Math.min(devicePixelRatio || 1,1.55);
  let sound;
  let busy = false;
  let ended = false;

  function smooth(a,b,x) {
    const p = Math.max(0,Math.min(1,(x-a)/(b-a)));
    return p*p*(3-2*p);
  }

  function buildTunnel() {
    const lens = new T.ShaderMaterial({
      depthTest:false,depthWrite:false,toneMapped:false,
      uniforms:{time:{value:0},aspect:{value:1},exit:{value:0}},
      vertexShader:`
        varying vec2 screen;
        void main(){screen=uv; gl_Position=vec4(position.xy,1.,1.);}
      `,
      fragmentShader:`
        varying vec2 screen;
        uniform float time;
        uniform float aspect;
        uniform float exit;
        void main(){
          vec2 p=(screen-.5)*vec2(aspect,1.0);
          vec2 vanishing=vec2(-.075+.095*sin(time*1.21),.058*cos(time*.92));
          p-=vanishing;
          float r=length(p);
          float a=atan(p.y,p.x), depth=.23/max(.051,r);
          float bend=a+.17*sin(depth*.95-time*2.9)+time*.22+sin(depth*.31)*.57;
          float angular=max(0.,cos(bend*6.+depth*1.6));
          float fabric=.53+.47*cos(bend*3.-depth*1.8+time*.38);
          float threads=pow(angular,10.)+pow(max(0.,cos(bend*13.1-depth*.82)),24.)*.39;
          float shutters=pow(max(0.,cos(depth*4.4-time*12.)),16.);
          float gates=shutters*(.09+pow(max(0.,cos(bend*3.)),8.)*.57);
          float flux=sin(bend*18.+depth*1.3-time*12.)*sin(depth*11.-time*19.);
          float dust=pow(max(0.,flux),26.)*smoothstep(.07,.41,r);
          float contours=pow(max(0.,sin(16.*bend+sin(depth*7.4-time*4.3)*1.15-depth*2.)),8.);
          float mist=(.5+.5*sin(bend*7.+depth*11.-time*2.1))*(.5+.5*cos(bend*3.6-depth*3.8));
          vec3 violet=vec3(.105,.064,.27), teal=vec3(.040,.58,.73);
          vec3 color=vec3(.018,.025,.080)+(threads*.52+gates)*mix(violet,teal,fabric);
          color+=vec3(.54,.40,.77)*dust*.45;
          color+=mix(vec3(.14,.07,.27),vec3(.033,.24,.33),fabric)*(contours*.35+mist*.26);
          color*=1.-.48*smoothstep(.37,.96,r);
          float core=exp(-r*(7.-exit*4.5));
          color+=vec3(.61,.76,1.)*core*(.31+1.05*exit);
          color+=vec3(.20,.36,.53)*pow(1.-smoothstep(.04,.16,r),2.)*(.38+exit);
          gl_FragColor=vec4(color,1.);
        }
      `
    });
    const plane = new T.Mesh(new T.PlaneGeometry(2,2),lens);
    plane.frustumCulled = false;
    plane.renderOrder = -10;
    return plane;
  }

  function resize() {
    const {clientWidth:w,clientHeight:h} = layer;
    if (!w || !h) return;
    camera.aspect = w/h;
    camera.fov = camera.aspect < 1 ? 60 : 43;
    camera.updateProjectionMatrix();
    tunnel.material.uniforms.aspect.value = w/h;
    renderer.setPixelRatio(density);
    renderer.setSize(w,h,false);
  }

  function place() {
    const t = clock.elapsed;
    const warp = t < 3.58;
    space.visible = station.station.visible = !warp;
    tunnel.visible = warp;
    tunnel.material.uniforms.time.value = t;
    tunnel.material.uniforms.exit.value = smooth(3.0,3.56,t);
    const burst = smooth(3.22,3.54,t) * (1-smooth(3.56,4.13,t));
    layer.style.setProperty("--jump",burst*.90);
    const stage = t < 3.58 ? 0 : t < 6.12 ? 1 : t < 8.27 ? 2 : 3;
    if (stage !== clock.stage) {
      clock.stage = stage;
      status.textContent = flightText[stage][0];
      caption.textContent = flightText[stage][1];
      layer.dataset.flightStage = String(stage);
    }
    if (warp) {
      ship.ship.visible = true;
      ship.ship.position.set(-.68+.32*Math.sin(t*1.9),-.49+.14*Math.sin(t*2.2),0);
      ship.ship.scale.setScalar(.84);
      ship.ship.rotation.set(.045*Math.sin(t),.09*Math.cos(t*.9),.21*Math.cos(t*1.35));
      camera.position.set(2.1-.51*t,1.07+.14*t,5.9-.31*t);
      target.set(-.28,.43,-.62);
      ship.drive.forEach((light,i) => { light.material.opacity=.84+.12*Math.sin(t*8+i); });
      camera.lookAt(target);
      return;
    }

    const approach = 1-Math.pow(1-Math.max(0,Math.min(1,(t-3.58)/4.46)),2.18);
    const settle = smooth(6.3,8.04,t);
    const lean = smooth(8.04,9.56,t);
    const move = smooth(9.62,11.96,t);
    const x = 4.9*(1-approach);
    const z = 6.63+26.7*(1-approach);
    const y = -.89+1.44*(1-approach)-.60*settle;
    ship.ship.scale.setScalar(.49);
    ship.ship.position.set(x,y,z);
    ship.ship.visible = t < 11.14;
    ship.ship.rotation.set(.12*(1-approach),-.36*(1-approach),-.28*(1-approach));
    ship.drive.forEach(light => { light.material.opacity=1-.91*settle; });
    const mobile = camera.aspect < 1;
    camera.position.set(
      (mobile ? 2.1 : 8.2)*(1-approach)+.78*(1-lean),
      1.13+2.46*(1-approach)-1.34*lean-.43*move,
      z+T.MathUtils.lerp(8.4,3.6,approach)-2.50*lean-4.02*move
    );
    target.set(
      (mobile ? .46 : -1.33)*(1-approach),
      .88*(1-approach)-.55*lean-.10*move,
      1.6+3.15*approach-2.23*move
    );
    camera.lookAt(target);
    station.open(smooth(8.44,10.72,t));
    station.guide(t,settle);
    layer.style.setProperty("--bridge",smooth(11.64,12.55,t));
  }

  function tick(time) {
    if (ended || document.hidden) return;
    if (clock.last) {
      const delta = (time-clock.last)*.001;
      clock.elapsed += delta;
      clock.slow = delta > .04 ? clock.slow+1 : 0;
      if (clock.slow > 7 && density > .79) {
        density = Math.max(.78,density*.82);
        clock.slow = 0;
        resize();
      }
    }
    clock.last = time;
    place();
    renderer.render(scene,camera);
    if (clock.elapsed >= length) { finish(); return; }
    clock.frame = requestAnimationFrame(tick);
  }

  const resizeObserver = new ResizeObserver(resize);
  const handleVisibility = () => {
    cancelAnimationFrame(clock.frame);
    clock.last = 0;
    if (document.hidden) {
      closeSound();
    } else if (!ended) clock.frame = requestAnimationFrame(tick);
  };
  function finish() {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(clock.frame);
    closeSound();
    resizeObserver.disconnect();
    document.removeEventListener("visibilitychange",handleVisibility);
    window.removeEventListener("pagehide",closeSound);
    motion.removeEventListener("change",finish);
    window.removeEventListener("keydown",escape);
    canvas.removeEventListener("webglcontextlost",finish);
    workshop.inert = false;
    if (layer.contains(document.activeElement)) workshop.querySelector(".home")?.focus({preventScroll:true});
    document.querySelector("#flight-access")?.setAttribute("hidden","");
    try { sessionStorage.setItem("station-arrived","1"); } catch {}
    layer.dataset.leaving = "";
    setTimeout(() => {
      layer.hidden = true;
      renderer.dispose();
      renderer.forceContextLoss();
    },motion.matches ? 0 : 520);
  }
  function escape(event) { if (event.key === "Escape") finish(); }

  async function toggleSound() {
    if (busy || ended) return;
    if (sound) { closeSound(); return; }
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) { audioButton.disabled = true; return; }
    busy = true;
    try {
      const audio = new Context();
      sound = audio;
      await audio.resume();
      if (sound !== audio || ended) return;
      scheduleSound(audio,clock.elapsed);
      audioButton.setAttribute("aria-pressed","true");
      audioButton.setAttribute("aria-label","关闭开场音效");
    } catch { closeSound(); }
    finally { busy = false; }
  }

  function closeSound() {
    if (sound) sound.close().catch(() => {});
    sound = undefined;
    audioButton.setAttribute("aria-pressed","false");
    audioButton.setAttribute("aria-label","开启开场音效");
  }

  function scheduleSound(audio,elapsed) {
    const master = audio.createGain();
    master.gain.value = .24;
    master.connect(audio.destination);
    const startAt = audio.currentTime+.04;
    const last = length-elapsed+.15;
    const at = mark => startAt+mark-elapsed;
    const buffer = audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate);
    const samples = buffer.getChannelData(0);
    let low = 0;
    for (let i=0;i<samples.length;i++) {
      low = (low+(Math.random()*2-1)*.12)/1.11;
      samples[i] = low;
    }

    function texture(mark,duration,frequency,resonance,volume) {
      if (mark+duration <= elapsed) return;
      const source = audio.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const band = audio.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = frequency;
      band.Q.value = resonance;
      const gain = audio.createGain();
      const from = Math.max(startAt,at(mark));
      const to = Math.max(from+.027,at(mark+duration));
      gain.gain.setValueAtTime(.001,from);
      gain.gain.exponentialRampToValueAtTime(volume,from+(to-from)*.23);
      gain.gain.exponentialRampToValueAtTime(.001,to);
      source.connect(band).connect(gain).connect(master);
      source.start(from);
      source.stop(to+.03);
    }

    function pulse(mark,duration,lowHz,highHz,volume,shape="sine") {
      if (mark < elapsed) return;
      const time = at(mark);
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = shape;
      oscillator.frequency.setValueAtTime(lowHz,time);
      oscillator.frequency.exponentialRampToValueAtTime(highHz,time+duration);
      gain.gain.setValueAtTime(.001,time);
      gain.gain.exponentialRampToValueAtTime(volume,time+duration*.19);
      gain.gain.exponentialRampToValueAtTime(.001,time+duration);
      oscillator.connect(gain).connect(master);
      oscillator.start(time);
      oscillator.stop(time+duration+.025);
    }
    texture(0,3.72,280,.58,.43);
    texture(2.6,1.60,1120,.82,.28);
    texture(3.62,4.6,159,1.1,.36);
    texture(8.21,.53,266,.8,.6);
    texture(8.47,2.13,478,3,.23);
    texture(10.41,.56,1180,.78,.28);
    pulse(3.5,.57,104,48,.53);
    pulse(6.02,.34,825,798,.29);
    pulse(6.32,.54,584,582,.23);
    pulse(8.07,.6,140,54,.50,"triangle");
    pulse(8.42,.17,250,96,.37);
    pulse(10.57,.85,417,414,.16);
    pulse(10.76,1.10,619,614,.1);
    master.gain.setTargetAtTime(0,startAt+Math.max(0,last-.48),.18);
  }

  audioButton.addEventListener("click",toggleSound);
  document.querySelector("#flight-access").addEventListener("click",finish);
  canvas.addEventListener("webglcontextlost",finish);
  workshop.inert = true;
  layer.hidden = false;
  resize();
  renderer.compile(scene,camera);
  resizeObserver.observe(layer);
  motion.addEventListener("change",finish);
  document.addEventListener("visibilitychange",handleVisibility);
  window.addEventListener("pagehide",closeSound);
  window.addEventListener("keydown",escape);
  clock.frame = requestAnimationFrame(tick);
})();
