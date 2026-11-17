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
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const notes = window.SITE_NOTES ?? [];
  const featured = notes.find(note => note.id === "cause-or-fate");
  const destinations = {
    story: { detail: featured?.title ?? "", tint: "#ffcf94", angle: .12 },
    research: { detail: "世界模型、海岸城与机器人训练。", tint: "#b1edd7", angle: -.08 },
    projects: { detail: "作品演示和实现记录。", tint: "#e0cafa", angle: .39 },
    collection: { detail: "收下的影像、资料和语录。", tint: "#a9dcf7", angle: .43 }
  };
  document.querySelector("#station-owner").textContent = window.SITE_CONTENT.workroom.author;

  const T = window.THREE;
  let renderer;
  if (T && window.buildStation) {
    try {
      renderer = new T.WebGLRenderer({ canvas,antialias:true,alpha:true,powerPreference:"high-performance" });
    } catch {
      renderer = undefined;
    }
  }
  const scene = renderer ? new T.Scene() : null;
  const model = scene ? window.buildStation(scene) : null;
  const camera = renderer ? new T.OrthographicCamera(-10,10,6,-6,.1,90) : null;
  const focus = renderer ? new T.Vector3() : null;
  const desiredFocus = focus?.clone();
  const projected = focus?.clone();
  let selected = "";
  let angle = -.32;
  let desiredAngle = -.32;
  let distance = 21;
  let desiredZoom = 1;
  let aperture = 0;
  let animationFrame = 0;
  let previousTime = 0;
  let pointer = null;
  let width = 0;
  let height = 0;

  function updateScene(moveFocus) {
    const id = location.hash.slice(1);
    selected = Object.hasOwn(destinations,id) ? id : "";
    world.dataset.room = selected;
    consolePanel.hidden = !selected;
    controls.hidden = !renderer || Boolean(selected);
    for (const port of ports) port.hidden = Boolean(selected);
    if (selected) {
      const item = destinations[selected];
      const port = ports.find(button => button.dataset.room === selected);
      heading.textContent = port.textContent.trim();
      detail.textContent = item.detail;
      consolePanel.style.setProperty("--room-tint",item.tint);
      link.href = "workroom.html?from=station#" + selected;
      desiredAngle = item.angle;
      if (moveFocus) back.focus();
    } else {
      desiredAngle = -.32;
      if (moveFocus) ports[0].focus();
    }
    updateFraming();
    requestDraw();
  }

  function updateFraming() {
    if (!renderer) return;
    width = world.clientWidth;
    height = world.clientHeight;
    const aspect = width / Math.max(1,height);
    const span = Math.max(7.9,13.6 / aspect);
    camera.left = -span * aspect / 2;
    camera.right = span * aspect / 2;
    camera.top = span / 2;
    camera.bottom = -span / 2;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.6));
    renderer.setSize(width,height,false);
    if (selected) {
      const room = model.details[selected].group.position;
      desiredFocus.set(room.x,room.y - (aspect < 1 ? 2.2 : .12),room.z);
      desiredZoom = aspect < 1 ? 2.55 : 1.67;
    } else {
      desiredFocus.set(0,1.52,0);
      desiredZoom = 1;
    }
  }

  function draw(time) {
    animationFrame = 0;
    if (!renderer || document.hidden) return;
    const dt = Math.min(40,time - (previousTime || time));
    previousTime = time;
    const follow = reduce.matches ? 1 : 1 - Math.exp(-dt * .008);
    angle += (desiredAngle - angle) * follow;
    focus.lerp(desiredFocus,follow);
    camera.zoom += (desiredZoom - camera.zoom) * follow;
    camera.position.set(focus.x + Math.sin(angle) * distance, focus.y + 9.2,focus.z + Math.cos(angle) * distance);
    camera.lookAt(focus);
    camera.updateProjectionMatrix();
    const t = reduce.matches ? 0 : time * .001;
    model.drone.position.set(3.9 * Math.sin(t*.29 - .72),.89 + .17 * Math.sin(t*1.5),2.23 + .35 * Math.cos(t*.58));
    model.drone.rotation.y = .28 + .46 * Math.sin(t*.4);
    model.drone.rotation.z = .08 * Math.sin(t*.8);
    model.iris.rotation.y = t * .9;
    model.iris.rotation.x = t * .55;
    model.dishPivot.rotation.y = .18 + .28 * Math.sin(t*.46);
    aperture += ((selected === "story" ? 1 : 0) - aperture) * follow;
    model.shutters.forEach((shutter,index) => {
      const side = index ? 1 : -1;
      shutter.position.x = -.1 + side * (.355 + aperture * .55);
      shutter.rotation.y = side * aperture * -.32;
    });
    renderer.render(scene,camera);
    for (const port of ports) {
      if (port.hidden) continue;
      projected.copy(model.anchors[port.dataset.room]).project(camera);
      const x = (projected.x * .5 + .5) * width;
      const y = (-projected.y * .5 + .5) * height;
      const margin = port.offsetWidth / 2 + 7;
      port.style.left = Math.min(width-margin,Math.max(margin,x)).toFixed(1) + "px";
      port.style.top = y.toFixed(1) + "px";
      port.toggleAttribute("data-offscreen",x < 12 || x > width-12 || y < 0 || y > height);
    }
    if (!reduce.matches) requestDraw();
  }

  function requestDraw() {
    if (!animationFrame && renderer && !document.hidden) animationFrame = requestAnimationFrame(draw);
  }
  function orbit(offset) {
    desiredAngle = Math.min(.89,Math.max(-.89,desiredAngle + offset));
    requestDraw();
  }
  if (renderer) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    camera.zoom = .92;
    focus.set(0,1.5,0);
    new ResizeObserver(() => { updateFraming(); requestDraw(); }).observe(world);
    canvas.addEventListener("pointerdown",event => {
      if (selected || event.button !== 0 || !event.isPrimary) return;
      pointer = { id:event.pointerId,x:event.clientX,angle:desiredAngle };
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove",event => {
      if (event.pointerId !== pointer?.id) return;
      desiredAngle = pointer.angle;
      orbit((pointer.x - event.clientX) * .006);
    });
    function releasePointer(event) { if (event.pointerId === pointer?.id) pointer = null; }
    canvas.addEventListener("pointerup",releasePointer);
    canvas.addEventListener("lostpointercapture",releasePointer);
    document.querySelector("#orbit-left").addEventListener("click",() => orbit(-.31));
    document.querySelector("#orbit-right").addEventListener("click",() => orbit(.31));
    document.addEventListener("visibilitychange",() => {
      previousTime = 0;
      requestDraw();
    });
    reduce.addEventListener("change",requestDraw);
  } else world.dataset.fallback = "";
  for (const port of ports) port.addEventListener("click",() => { location.hash = port.dataset.room; });
  back.addEventListener("click",() => { location.hash = ""; });
  window.addEventListener("hashchange",() => updateScene(true));
  window.addEventListener("keydown", event => {
    if (event.key === "Escape" && selected) location.hash = "";
  });
  updateScene(false);
})();
