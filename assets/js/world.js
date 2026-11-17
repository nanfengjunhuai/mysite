(() => {
  "use strict";

  const world = document.querySelector("#world");
  const canvas = document.querySelector("#station");
  const ports = [...document.querySelectorAll(".port")];
  const consolePanel = document.querySelector("#room-console");
  const heading = document.querySelector("#room-name");
  const detail = document.querySelector("#room-detail");
  const link = document.querySelector("#room-link");
  const back = document.querySelector("#room-back");
  const controls = document.querySelector(".orbit-controls");
  const reader = document.querySelector("#world-journal");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const featured = window.SITE_NOTES.find(note => note.id === "cause-or-fate");
  const destinations = {
    story:{detail:featured?.title ?? "",tint:"#ffcf94",angle:.22},
    research:{detail:"世界模型、海岸城与机器人训练。",tint:"#b1edd7",angle:-.36},
    projects:{detail:"作品演示和实现记录。",tint:"#e0cafa",angle:.42},
    collection:{detail:"收下的影像、资料和语录。",tint:"#a9dcf7",angle:.54}
  };
  document.querySelector("#station-owner").textContent = window.SITE_CONTENT.workroom.author;
  if (featured) {
    document.querySelector("#world-journal-title").textContent = featured.title;
    const date = reader.querySelector("time");
    date.textContent = date.dateTime = featured.date;
    for (const section of featured.sections ?? []) {
      for (const text of section.blocks ?? []) {
        if (typeof text !== "string") continue;
        const paragraph = document.createElement("p");
        paragraph.textContent = text;
        document.querySelector("#world-journal-body").append(paragraph);
      }
    }
    link.addEventListener("click",event => {
      if (selected !== "story" || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      reader.showModal();
    });
  }

  const T = window.THREE;
  const O = window.Observatory;
  let renderer;
  try { renderer = O?.rendererFor(canvas); } catch {}
  const scene = renderer ? new T.Scene() : null;
  const model = scene ? O.buildStation(scene) : null;
  const camera = scene ? new T.PerspectiveCamera(42,1,.08,710) : null;
  const focus = scene ? new T.Vector3() : null;
  const nextFocus = focus?.clone();
  const projected = focus?.clone();
  const patrol = scene ? O.buildShip(scene) : null;
  let selected = "";
  let width = 0;
  let height = 0;
  let angle = -.69;
  let wantedAngle = -.54;
  let tilt = .22;
  let wantedTilt = .22;
  let distance = 21;
  let wantedDistance = distance;
  let aperture = 0;
  let previousTime = 0;
  let frame = 0;
  let pointer = null;

  if (scene) {
    O.stationsLights(scene,renderer.capabilities.isWebGL2);
    O.backdrop(scene,requestDraw);
    patrol.ship.scale.setScalar(.48);
  }
  function framing() {
    if (!renderer) return;
    width = world.clientWidth;
    height = world.clientHeight;
    camera.aspect = width/Math.max(1,height);
    camera.fov = camera.aspect < 1 ? 56 : 42;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.6));
    renderer.setSize(width,height,false);
    const overview = Math.max(19,15.3/(2*Math.tan(T.MathUtils.degToRad(camera.fov/2))*camera.aspect));
    if (selected) {
      const pin = model.anchors[selected];
      nextFocus.set(pin.x*.46,pin.y*.51-.38,1.42);
      wantedDistance = overview*.74;
    } else {
      nextFocus.set(0,-.18,.22);
      wantedDistance = overview;
    }
  }
  function draw(time) {
    frame = 0;
    if (!renderer || document.hidden) return;
    const dt = Math.min(45,time-(previousTime || time));
    previousTime = time;
    const follow = reduce.matches ? 1 : 1-Math.exp(-dt*.007);
    angle += (wantedAngle-angle)*follow;
    tilt += (wantedTilt-tilt)*follow;
    distance += (wantedDistance-distance)*follow;
    focus.lerp(nextFocus,follow);
    camera.position.set(focus.x+Math.sin(angle)*distance,focus.y+distance*tilt,focus.z+Math.cos(angle)*distance);
    camera.lookAt(focus);
    aperture += ((selected === "story" ? 1 : 0)-aperture)*follow;
    model.open(aperture);
    const t = reduce.matches ? 0 : time*.001;
    patrol.ship.position.set(2.45+1.65*Math.sin(t*.27),-2.15+.22*Math.sin(t*.84),3.8+.62*Math.cos(t*.27));
    patrol.ship.rotation.set(.07,.58+.32*Math.sin(t*.27),.13*Math.cos(t*.27));
    renderer.render(scene,camera);
    for (const port of ports) {
      if (port.hidden) continue;
      projected.copy(model.anchors[port.dataset.room]).project(camera);
      const x = (projected.x*.5+.5)*width;
      const y = (.5-projected.y*.5)*height;
      const margin = port.offsetWidth/2+7;
      port.style.left = Math.min(width-margin,Math.max(margin,x)).toFixed(1)+"px";
      port.style.top = y.toFixed(1)+"px";
    }
    if (!reduce.matches) requestDraw();
  }
  function requestDraw() {
    if (!frame && renderer && !document.hidden) frame = requestAnimationFrame(draw);
  }
  function updateScene(moveFocus) {
    if (reader.open) reader.close();
    const id = location.hash.slice(1);
    selected = Object.hasOwn(destinations,id) ? id : "";
    world.dataset.room = selected;
    consolePanel.hidden = !selected;
    controls.hidden = !renderer || Boolean(selected);
    for (const port of ports) port.hidden = Boolean(selected);
    if (selected) {
      const item = destinations[selected];
      heading.textContent = ports.find(port => port.dataset.room === selected).textContent.trim();
      detail.textContent = item.detail;
      consolePanel.style.setProperty("--room-tint",item.tint);
      link.href = "experience.html#"+selected;
      link.firstChild.textContent = selected === "story" && featured ? "读自叙帖 " : "进入 ";
      wantedAngle = item.angle;
      wantedTilt = .16;
      if (moveFocus) back.focus();
    } else {
      wantedAngle = -.54;
      wantedTilt = .22;
      if (moveFocus) ports[0].focus();
    }
    framing();
    requestDraw();
  }
  function orbit(offset) {
    wantedAngle = Math.min(1.05,Math.max(-1.05,wantedAngle+offset));
    requestDraw();
  }
  if (renderer) {
    new ResizeObserver(() => { framing(); requestDraw(); }).observe(world);
    canvas.addEventListener("pointerdown",event => {
      if (selected || event.button !== 0 || !event.isPrimary) return;
      pointer = {id:event.pointerId,x:event.clientX,y:event.clientY,angle:wantedAngle,tilt:wantedTilt};
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove",event => {
      if (event.pointerId !== pointer?.id) return;
      wantedAngle = pointer.angle;
      wantedTilt = Math.max(-.17,Math.min(.54,pointer.tilt+(event.clientY-pointer.y)*.004));
      orbit((pointer.x-event.clientX)*.006);
    });
    function release(event) { if (event.pointerId === pointer?.id) pointer = null; }
    for (const kind of ["pointerup","pointercancel","lostpointercapture"]) canvas.addEventListener(kind,release);
    document.querySelector("#orbit-left").addEventListener("click",() => orbit(-.28));
    document.querySelector("#orbit-right").addEventListener("click",() => orbit(.28));
    document.addEventListener("visibilitychange",() => {
      previousTime = 0;
      requestDraw();
    });
    reduce.addEventListener("change",requestDraw);
    canvas.addEventListener("webglcontextlost",() => {
      renderer = undefined;
      world.dataset.fallback = "";
      updateScene(false);
    });
  } else world.dataset.fallback = "";
  for (const port of ports) port.addEventListener("click",() => { location.hash = port.dataset.room; });
  back.addEventListener("click",() => { location.hash = ""; });
  window.addEventListener("hashchange",() => updateScene(true));
  window.addEventListener("keydown",event => {
    if (event.key === "Escape" && selected && !reader.open) location.hash = "";
    if (!renderer || selected || reader.open || !event.key.startsWith("Arrow")) return;
    event.preventDefault();
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") orbit(event.key === "ArrowLeft" ? -.20 : .20);
    else {
      wantedTilt = Math.max(-.17,Math.min(.54,wantedTilt+(event.key === "ArrowUp" ? .10 : -.10)));
      requestDraw();
    }
  });
  updateScene(false);
})();
