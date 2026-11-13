(() => {
  const scene = document.querySelector("#scene");
  const desk = document.querySelector("#desk");
  const opening = document.querySelector("#opening");
  const ports = document.querySelector("#ports");
  const stage = document.querySelector(".workroom-stage");
  const viewControls = document.querySelector("#view-controls");
  const viewPanorama = document.querySelector("#view-panorama");
  const viewButtons = [...viewControls.querySelectorAll("[data-view]")];
  const monitorCenters = [.345,.566,.839];
  const sound = document.querySelector("#sound");
  const soundState = document.querySelector("#sound-state");
  const tunnel = document.querySelector("#tunnel");
  const tunnelLight = document.querySelector("#tunnel-light");
  const passageTitle = document.querySelector("#passage-title");
  const tunnelImages = new Map(Array.from(tunnel.querySelectorAll("[data-passage]"), (image) => [image.dataset.passage,image]));
  const roomStage = document.querySelector("main");
  const researchRoom = document.querySelector("#research");
  const topic = document.querySelector("#topic");
  const field = document.querySelector("#field-study");
  const fieldTrigger = document.querySelector("#open-topic");
  const robotLab = document.querySelector("#robot-lab");
  const robotLabTrigger = document.querySelector("#open-robot-lab");
  const robotLabHash = "#research/robotics";
  const researchTopics = [...document.querySelectorAll("[data-research-topic]")];
  const fieldViews = document.querySelector("#field-views");
  const fieldWaypoints = document.querySelector("#field-waypoints");
  const fieldLocation = document.querySelector("#field-location");
  const fieldDescription = document.querySelector("#field-description");
  const fieldReturn = document.querySelector("#field-return");
  const fieldInspect = document.querySelector("#field-inspect");
  const fieldLandmarks = document.querySelector("#field-landmarks");
  const fieldMarker = document.querySelector("#field-marker");
  const fieldHash = "#research/field";
  const fieldData = window.WORLD_FIELD_STUDY;
  const fieldPlaces = new Map([["start", fieldData.start], ...fieldData.routes.map((route) => [route.id, route])]);
  const fieldImages = new Map();
  const explored = new Set();
  let fieldRequest = 0;
  let landmarkIndex = -1;
  let robotLabWasShown = false;
  const record = document.querySelector("#record");
  const storyArchive = document.querySelector("#story-archive");
  const storyFilm = document.querySelector("#story-film");
  const storyFilmPlayer = document.querySelector("#story-film-player");
  const storyFilmIndex = document.querySelector("#story-film-chapters");
  const typed = document.querySelector("#typed-intro");
  const storyMonitor = document.querySelector("#story-monitor");
  const fullIntro = document.querySelector("#show-intro");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const roomIds = ["research", "projects", "story", "collection"];
  const deskViews = { research:0, projects:1, story:2, collection:2 };
  const palettes = {
    research: ["#E8F1E9", "#D9E7EF", "#F5D2B4"],
    projects: ["#F6F3F7", "#E4D8E8", "#ECCED6"],
    story: ["#F8EAD8", "#E6D5C3", "#F2C9BC"],
    collection: ["#EAF8F4","#A9D9D4","#F2C8A1"]
  };
  const passageMotion = {
    research: { duration: 880, zoom: .35, rays: 24, strength: .48, axis: .48 },
    projects: { duration: 810, zoom: .29, rays: 20, strength: .41, axis: .60 },
    story: { duration: 930, zoom: .23, rays: 12, strength: .34, axis: .52 },
    collection: { duration: 810, zoom: .26, rays: 15, strength: .32, axis: .48 }
  };

  const { title, intro, nightFilmChapters } = window.SITE_CONTENT.workroom;
  document.querySelector("#desk-title").textContent = title;
  document.title = title;
  const letters = Array.from(intro);
  document.querySelector("#accessible-intro").textContent = intro;
  let current = "";
  let transitionFrame = 0;
  let mediaAttempt = 0;
  let mediaTimeout;
  let typingTimeout;
  let audioContext;
  let keyNoise;
  let audioOn = false;
  let pageFocused = document.hasFocus();
  let pageActive = true;
  let lastEntrance;
  let lastResearchTrigger;
  let viewIndex = 0;
  let cameraX = 0;
  let dragOrigin = 0;
  let cropped = false;

  function moveCamera(x) {
    const width = stage.offsetWidth;
    if (!width) return;
    cameraX = Math.max(0, Math.min(width - innerWidth, x));
    stage.style.setProperty("--camera-x", -cameraX + "px");
    viewControls.style.setProperty("--view-left", 100 * cameraX / width + "%");
    viewControls.style.setProperty("--view-width", 100 * Math.min(1,innerWidth / width) + "%");
  }

  function setView(index) {
    viewIndex = Math.max(0, Math.min(viewButtons.length - 1, index));
    const monitorCenter = monitorCenters[viewIndex];
    moveCamera(stage.offsetWidth * (cropped ? monitorCenter : .60) - innerWidth / 2);
    viewControls.dataset.selectedView = String(viewIndex);
    viewButtons.forEach((button, i) => button.setAttribute("aria-pressed", String(i === viewIndex)));
  }

  function layoutDesk() {
    if (desk.hidden) return;
    cropped = innerWidth / stage.offsetWidth < .77;
    scene.toggleAttribute("data-pan", cropped);
    viewControls.hidden = !cropped;
    stage.style.setProperty("--camera-y", -Math.max(0, stage.offsetHeight - innerHeight) * .32 + "px");
    setView(viewIndex);
  }
  window.addEventListener("resize", layoutDesk);
  window.visualViewport?.addEventListener("resize", layoutDesk);
  viewButtons.forEach((button, i) => button.addEventListener("click", () => setView(i)));
  ports.addEventListener("focusin", (event) => {
    const index = deskViews[event.target.dataset.target];
    if (cropped && index !== undefined && event.target.matches(":focus-visible")) setView(index);
  });

  let panoramaPointer = null;
  function overviewPosition(clientX) {
    const { left, width } = viewPanorama.getBoundingClientRect();
    return Math.max(0,Math.min(1,(clientX-left)/width));
  }
  function panOverview(clientX) {
    moveCamera(stage.offsetWidth * overviewPosition(clientX) - innerWidth / 2);
  }
  viewPanorama.addEventListener("pointerdown", (event) => {
    if (!cropped || scene.dataset.phase !== "ready" || !event.isPrimary || event.button !== 0) return;
    panoramaPointer = event.pointerId;
    viewPanorama.setPointerCapture(panoramaPointer);
    scene.dataset.dragging = "";
    panOverview(event.clientX);
  });
  viewPanorama.addEventListener("pointermove", (event) => {
    if (event.pointerId === panoramaPointer) panOverview(event.clientX);
  });
  function finishOverview(event) {
    if (event.pointerId !== panoramaPointer) return;
    panoramaPointer = null;
    delete scene.dataset.dragging;
    if (event.type !== "pointerup") {
      setView(viewIndex);
      return;
    }
    const position = overviewPosition(event.clientX);
    const nearest = monitorCenters.reduce((closest, center, index) =>
      Math.abs(center-position) < Math.abs(monitorCenters[closest]-position) ? index : closest, 0);
    setView(nearest);
  }
  viewPanorama.addEventListener("pointerup",finishOverview);
  viewPanorama.addEventListener("pointercancel",finishOverview);
  viewPanorama.addEventListener("lostpointercapture",finishOverview);

  function bindSwipe(element, enabled, onStart, onMove, onEnd) {
    let gesture;
    let suppressClickUntil = 0;
    element.addEventListener("pointerdown", (event) => {
      if (!enabled() || !event.isPrimary || event.button !== 0 || event.target.closest("#view-controls")) return;
      gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, active: false };
    });
    element.addEventListener("pointermove", (event) => {
      if (gesture?.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x;
      const dy = event.clientY - gesture.y;
      if (!gesture.active) {
        if (Math.abs(dx) < 8 || Math.abs(dx) <= Math.abs(dy)) return;
        gesture.active = true;
        element.setPointerCapture(event.pointerId);
        onStart();
      }
      onMove(dx);
    });
    function release(event) {
      if (gesture?.id !== event.pointerId) return;
      if (gesture.active) {
        suppressClickUntil = performance.now() + 270;
        onEnd(event.type === "pointerup" ? event.clientX - gesture.x : 0);
      }
      gesture = null;
    }
    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", release);
    element.addEventListener("click", (event) => {
      if (event.detail > 0 && performance.now() < suppressClickUntil) {
        event.preventDefault();
        event.stopPropagation();
      }
    }, true);
  }

  bindSwipe(scene, () => cropped && scene.dataset.phase === "ready",
    () => { dragOrigin = cameraX; scene.dataset.dragging = ""; },
    (distance) => moveCamera(dragOrigin - distance),
    (distance) => {
      delete scene.dataset.dragging;
      setView(viewIndex + (Math.abs(distance) > 26 ? -Math.sign(distance) : 0));
    });

  function pageIsForeground() {
    return pageActive && pageFocused && !document.hidden;
  }

  function syncPageAudio() {
    const foreground = pageIsForeground();
    opening.muted = !audioOn || !foreground || desk.hidden;
    if (!foreground) storyFilmPlayer.pause();
  }

  window.addEventListener("focus", () => { pageFocused = true; syncPageAudio(); });
  window.addEventListener("blur", () => { pageFocused = false; syncPageAudio(); });
  window.addEventListener("pagehide", () => { pageActive = false; syncPageAudio(); });
  window.addEventListener("pageshow", () => {
    pageActive = true;
    pageFocused = document.hasFocus();
    syncPageAudio();
  });
  document.addEventListener("visibilitychange", syncPageAudio);

  function finishOpening() {
    const animateArrival = !reduced.matches && !desk.hidden && !urlRoom() && scene.dataset.phase !== "ready";
    mediaAttempt += 1;
    clearTimeout(mediaTimeout);
    window.workroomOpening.stop();
    opening.pause();
    scene.dataset.phase = "ready";
    if (animateArrival) scene.dataset.arrival = "";
    ports.inert = false;
    syncPageAudio();
  }

  function playOpening() {
    if (reduced.matches) {
      finishOpening();
      return;
    }
    const attempt = ++mediaAttempt;
    scene.dataset.phase = "loading";
    ports.inert = true;
    syncPageAudio();
    opening.currentTime = 0;
    let revealed = false;
    let ended = false;
    const reveal = () => {
      if (attempt !== mediaAttempt) return;
      revealed = true;
      if (ended) finishOpening();
    };
    clearTimeout(mediaTimeout);
    mediaTimeout = setTimeout(() => {
      if (attempt === mediaAttempt) finishOpening();
    }, 3350);
    window.workroomOpening.play(reveal);
    opening.play().then(() => {
      if (attempt === mediaAttempt) scene.dataset.phase = "playing";
    }).catch(() => {
      if (attempt !== mediaAttempt) return;
      ended = true;
      if (revealed) finishOpening();
    });
    opening.onended = opening.onerror = () => {
      if (attempt !== mediaAttempt) return;
      ended = true;
      if (revealed) finishOpening();
    };
  }

  ports.addEventListener("animationend", (event) => {
    if (event.animationName === "workroom-monitor-arrive" && event.target.closest(".monitor--collection")) {
      delete scene.dataset.arrival;
    }
  });

  function unlockTypingAudio() {
    if (!window.AudioContext) return;
    audioContext ??= new AudioContext();
    if (!keyNoise) {
      keyNoise = audioContext.createBuffer(1, Math.round(audioContext.sampleRate * .034), audioContext.sampleRate);
      const samples = keyNoise.getChannelData(0);
      for (let i = 0; i < samples.length; i += 1) {
        const falloff = Math.exp(-i / (samples.length * .15));
        samples[i] = (Math.random() * 2 - 1) * falloff;
      }
    }
    audioContext.resume().catch(() => {});
  }

  sound.addEventListener("click", () => {
    audioOn = !audioOn;
    sound.title = audioOn ? "关闭环境音" : "开启环境音";
    soundState.textContent = audioOn ? "已开启" : "静音";
    sound.setAttribute("aria-pressed", String(audioOn));
    if (audioOn) unlockTypingAudio();
    syncPageAudio();
  });

  function playKey() {
    if (!audioOn || !pageIsForeground() || audioContext?.state !== "running") return;
    const noise = audioContext.createBufferSource();
    const volume = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1880;
    filter.Q.value = .7;
    noise.buffer = keyNoise;
    volume.gain.value = .12;
    noise.connect(filter).connect(volume).connect(audioContext.destination);
    noise.addEventListener("ended", () => {
      noise.disconnect();
      filter.disconnect();
      volume.disconnect();
    }, { once: true });
    noise.start();
  }

  function finishTyping() {
    clearTimeout(typingTimeout);
    delete storyMonitor.dataset.typing;
    typed.textContent = intro;
    if (document.activeElement === fullIntro) {
      document.querySelector("#open-story-film").focus({ preventScroll: true });
    }
    fullIntro.hidden = true;
  }

  function startTyping() {
    clearTimeout(typingTimeout);
    if (reduced.matches) {
      finishTyping();
      return;
    }
    let i = 0;
    typed.textContent = "";
    fullIntro.hidden = false;
    storyMonitor.dataset.typing = "";
    function typeNext() {
      const letter = letters[i++];
      typed.textContent += letter;
      playKey();
      if (i === letters.length) {
        finishTyping();
        return;
      }
      const pause = /[。！？]/.test(letter) ? 305 : /[，、]/.test(letter) ? 175 : 59 + (i % 4) * 10;
      typingTimeout = setTimeout(typeNext, pause);
    }
    typingTimeout = setTimeout(typeNext, 450);
  }
  fullIntro.addEventListener("click", finishTyping);

  function positionLandmark() {
    if (landmarkIndex < 0 || !field.open) return;
    const picture = fieldImages.get("start");
    const image = picture.querySelector("img");
    const { clientWidth: width, clientHeight: height } = fieldViews;
    if (!image.naturalWidth || !width || !height || picture.hidden) return;
    const { x, y } = fieldData.landmarks[landmarkIndex];
    const ratio = image.naturalWidth / image.naturalHeight;
    const renderedWidth = Math.max(width, height * ratio);
    const renderedHeight = Math.max(height, width / ratio);
    const left = Math.max(width - renderedWidth, Math.min(0, width * .5 - x * renderedWidth));
    const top = Math.max(height - renderedHeight, Math.min(0, height * .45 - y * renderedHeight));
    image.style.objectPosition = left + "px " + top + "px";
    fieldMarker.style.left = left + x * renderedWidth + "px";
    fieldMarker.style.top = top + y * renderedHeight + "px";
    fieldMarker.hidden = false;
  }

  function showLandmark(index) {
    landmarkIndex = index;
    const landmark = fieldData.landmarks[index];
    fieldLocation.textContent = landmark.title;
    fieldDescription.textContent = landmark.detail;
    field.dataset.inspecting = "";
    fieldLandmarks.hidden = false;
    fieldWaypoints.hidden = true;
    fieldInspect.textContent = "返回路线";
    fieldInspect.setAttribute("aria-expanded","true");
    Array.from(fieldLandmarks.children).forEach((button, i) => {
      button.setAttribute("aria-pressed",String(index === i));
    });
    positionLandmark();
  }

  function showFieldPlace(id, focus = true) {
    const place = fieldPlaces.get(id);
    const atStart = id === "start";
    if (!atStart) explored.add(id);
    landmarkIndex = -1;
    delete field.dataset.inspecting;
    fieldMarker.hidden = true;
    fieldLandmarks.hidden = true;
    fieldInspect.hidden = !atStart || explored.size !== fieldData.routes.length || !fieldData.landmarks.length;
    fieldInspect.textContent = "核对地标";
    fieldInspect.setAttribute("aria-expanded","false");
    fieldImages.get("start")?.querySelector("img").style.setProperty("object-position",fieldData.start.crop);
    fieldLocation.textContent = place.title;
    fieldDescription.textContent = !atStart || explored.size === 0
      ? place.description
      : explored.size === fieldData.routes.length ? fieldData.compared : fieldData.revisit;
    fieldWaypoints.hidden = !atStart;
    fieldReturn.hidden = atStart;
    for (const [name, picture] of fieldImages) picture.hidden = name !== id || picture.hasAttribute("data-failed");
    for (const button of fieldWaypoints.querySelectorAll("[data-waypoint]")) {
      button.querySelector("small").hidden = !explored.has(button.dataset.waypoint);
    }
    if (focus) fieldLocation.focus({ preventScroll: true });
  }

  function syncField() {
    if (location.hash === fieldHash) {
      if (field.open) return;
      selectResearchTopic("field");
      for (const [id, place] of fieldPlaces) {
        if (fieldImages.has(id)) continue;
        const picture = document.createElement("picture");
        picture.hidden = true;
        if (place.portrait) {
          const source = document.createElement("source");
          source.media = "(max-aspect-ratio: 5/4)";
          source.srcset = place.portrait;
          picture.append(source);
        }
        const image = new Image();
        image.alt = place.alt;
        image.decoding = "async";
        image.style.objectPosition = place.crop;
        image.addEventListener("error", () => {
          picture.dataset.failed = "";
          picture.hidden = true;
        }, { once: true });
        picture.append(image);
        fieldImages.set(id, picture);
        fieldViews.append(picture);
        image.src = place.image;
      }
      showFieldPlace("start", false);
      field.append(sound);
      field.showModal();
    } else if (field.open || sound.parentElement === field) {
      fieldRequest += 1;
      if (topic.open) topic.close();
      if (field.open) field.close();
      document.body.prepend(sound);
      if (current === "research" || current === "collection") {
        const trigger = current === "collection" ? lastResearchTrigger : fieldTrigger;
        requestAnimationFrame(() => {
          if (!field.open && trigger?.closest(".room")?.id === current) trigger.focus({ preventScroll:true });
        });
      }
    }
  }

  function selectResearchTopic(topic) {
    fieldTrigger.hidden = topic !== "field";
    robotLabTrigger.hidden = topic !== "robot";
    for (const button of researchTopics) {
      button.setAttribute("aria-pressed",String(button.dataset.researchTopic === topic));
    }
  }

  function syncResearchViews() {
    syncField();
    if (location.hash === robotLabHash) {
      if (robotLab.open) return;
      selectResearchTopic("robot");
      robotLab.showModal();
      robotLabWasShown = true;
    } else if (robotLabWasShown) {
      robotLabWasShown = false;
      if (robotLab.open) robotLab.close();
      if (current === "research") {
        requestAnimationFrame(() => {
          if (current === "research" && !robotLab.open) robotLabTrigger.focus({ preventScroll:true });
        });
      }
    }
  }

  function leaveResearchView() {
    if (history.state?.fromResearch) {
      history.back();
      return;
    }
    const url = new URL(location.href);
    url.hash = "research";
    history.replaceState(null, "", url);
    syncResearchViews();
  }

  for (const [index, route] of fieldData.routes.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "field-waypoint";
    button.dataset.waypoint = route.id;
    const direction = document.createElement("span");
    direction.setAttribute("aria-hidden", "true");
    direction.textContent = index === 0 ? "↙" : "↗";
    const label = document.createElement("span");
    label.textContent = route.label;
    const visited = document.createElement("small");
    visited.textContent = "已走过";
    visited.hidden = true;
    label.append(visited);
    button.append(direction, label);
    button.addEventListener("click", async () => {
      const request = ++fieldRequest;
      const image = fieldImages.get(route.id).querySelector("img");
      if (!image.complete) {
        button.setAttribute("aria-busy", "true");
        visited.textContent = "正在展开…";
        visited.hidden = false;
        await image.decode().catch(() => {});
        button.removeAttribute("aria-busy");
        visited.textContent = "已走过";
        visited.hidden = !explored.has(route.id);
      }
      if (request === fieldRequest && field.open) showFieldPlace(route.id);
    });
    fieldWaypoints.append(button);
  }
  fieldReturn.addEventListener("click", () => showFieldPlace("start"));
  for (const [index, landmark] of fieldData.landmarks.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "field-button field-landmark-choice";
    button.textContent = landmark.title;
    button.setAttribute("aria-pressed","false");
    button.addEventListener("click", () => showLandmark(index));
    fieldLandmarks.append(button);
  }
  fieldInspect.addEventListener("click", () => {
    if (landmarkIndex >= 0) {
      showFieldPlace("start",false);
      return;
    }
    showLandmark(0);
    fieldLandmarks.firstElementChild.focus({ preventScroll:true });
  });
  window.addEventListener("resize",positionLandmark);
  function openResearchView(hash, trigger = hash === robotLabHash ? robotLabTrigger : fieldTrigger) {
    if (transitionFrame || field.open || robotLab.open) return;
    lastResearchTrigger = trigger;
    trigger.focus({ preventScroll:true });
    const url = new URL(location.href);
    url.hash = hash;
    history.pushState({ fromResearch: true }, "", url);
    if (current === "research") syncResearchViews();
    else showRoom("research",false);
  }
  for (const button of researchTopics) {
    button.addEventListener("click", () => selectResearchTopic(button.dataset.researchTopic));
  }
  fieldTrigger.addEventListener("click", () => openResearchView(fieldHash));
  robotLabTrigger.addEventListener("click", () => openResearchView(robotLabHash));
  document.querySelector("#field-exit").addEventListener("click", leaveResearchView);
  document.querySelector("#robot-lab-exit").addEventListener("click",leaveResearchView);
  document.querySelector("#field-source").addEventListener("click", () => topic.showModal());
  field.addEventListener("cancel", (event) => {
    event.preventDefault();
    leaveResearchView();
  });
  robotLab.addEventListener("cancel", (event) => {
    event.preventDefault();
    leaveResearchView();
  });

  function urlRoom() {
    if (location.hash === fieldHash || location.hash === robotLabHash) return "research";
    const id = location.hash.slice(1);
    return roomIds.includes(id) ? id : "";
  }

  function showRoom(id, moveFocus = true, arriving = false) {
    const previous = current;
    const fieldWasOpen = field.open || sound.parentElement === field;
    const robotWasOpen = robotLabWasShown;
    current = id;
    clearTimeout(typingTimeout);
    if (topic.open && id !== "research") topic.close();
    if (record.open) record.close();
    if (storyArchive.open && id !== "story") storyArchive.close();
    if (storyFilm.open && id !== previous) storyFilm.close();
    desk.hidden = Boolean(id);
    syncPageAudio();
    researchRoom.toggleAttribute("data-arriving", id === "research" && arriving);
    roomIds.forEach((name) => {
      const room = document.getElementById(name);
      room.hidden = name !== id;
      room.toggleAttribute("data-passage-arrival",name === id && arriving);
    });
    document.title = id ? document.querySelector("#" + id + "-title span").textContent + "｜" + title : title;
    window.scrollTo(0, 0);
    if (!id) {
      layoutDesk();
      if (cropped && previous) setView(deskViews[previous]);
    }
    if (id === "story") startTyping();
    syncResearchViews();
    if (!moveFocus || field.open || robotLab.open || (fieldWasOpen && id === "collection")
        || ((fieldWasOpen || robotWasOpen) && id === "research")) return;
    if (id) document.querySelector("#" + id + "-title").focus({ preventScroll: true });
    else {
      const source = lastEntrance?.dataset.target === previous ? lastEntrance
        : ports.querySelector('[data-target="' + previous + '"]');
      source?.focus({ preventScroll: true });
    }
  }

  function resetTunnel() {
    cancelAnimationFrame(transitionFrame);
    transitionFrame = 0;
    roomStage.inert = false;
    tunnel.style.removeProperty("--tunnel-scale");
    tunnel.style.removeProperty("--tunnel-bright");
    tunnel.style.removeProperty("--tunnel-axis-y");
    tunnel.style.removeProperty("--passage-opacity");
    tunnel.style.removeProperty("--passage-color");
    tunnel.style.removeProperty("--passage-window");
    tunnel.style.removeProperty("--passage-fade");
    tunnel.hidden = true;
  }

  function flyTo(id) {
    resetTunnel();
    if (!desk.hidden || scene.dataset.phase !== "ready") finishOpening();
    if (reduced.matches) {
      showRoom(id);
      return;
    }
    animateTunnel(id);
  }

  function animateTunnel(id) {
    const route = id || current;
    const palette = palettes[route];
    const motion = passageMotion[route];
    const ctx = tunnelLight.getContext("2d");
    const preferred = tunnelImages.get(route);
    const image = preferred?.naturalWidth ? preferred : tunnelImages.get("research");
    if (!motion) {
      showRoom(id);
      return;
    }
    for (const candidate of tunnelImages.values()) candidate.hidden = candidate !== image;
    tunnel.dataset.route = route;
    const returning = !id;
    passageTitle.textContent = returning ? "工作台" : document.querySelector("#" + id + "-title span").textContent;
    tunnel.style.setProperty("--passage-color",palette[1]);
    tunnel.style.setProperty("--passage-opacity","0");
    const axis = passageMotion[image.dataset.passage].axis;
    tunnel.dataset.direction = returning ? "return" : "enter";
    tunnel.style.setProperty("--tunnel-axis-y",axis * 100 + "%");
    tunnel.style.setProperty("--tunnel-scale", returning ? "1.23" : "1");
    tunnel.style.setProperty("--tunnel-bright", ".72");
    roomStage.inert = true;
    tunnel.hidden = false;
    const width = innerWidth;
    const height = innerHeight;
    const scale = Math.min(devicePixelRatio, 1.5);
    tunnelLight.width = width * scale;
    tunnelLight.height = height * scale;
    ctx?.scale(scale, scale);
    const centerX = width * .5, centerY = height * axis;
    const length = Math.hypot(width, height);
    const base = Math.min(width,height);
    const originRect = !current && lastEntrance?.querySelector(".monitor-tag").getBoundingClientRect();
    const originX = originRect ? Math.max(0,Math.min(width,originRect.x + originRect.width / 2)) : centerX;
    const originY = originRect ? Math.max(0,Math.min(height,originRect.y + originRect.height / 2)) : centerY;
    const rays = Array.from({ length: motion.rays }, (_, i) => {
      const a = i * 2.399963;
      return [Math.cos(a), Math.sin(a), (i * .137) % 1];
    });
    const duration = returning ? 650 : motion.duration;
    const start = performance.now();
    function frame(time) {
      const t = Math.max(0,Math.min(1,(time - start) / duration));
      const handoff = .68;
      if (t >= handoff && current !== id) showRoom(id, false, true);
      if (t === 1) {
        resetTunnel();
        if (!field.open && !robotLab.open) {
          (id ? document.querySelector("#" + id + "-title") : ports.querySelector('[data-target="' + route + '"]'))?.focus({ preventScroll: true });
        }
        return;
      }
      const fadeIn = Math.min(1, t / .13);
      const fadeOut = Math.max(0, (t - .74) / .26);
      const distance = t * .4 + t ** 3 * .6;
      const zoom = returning ? 1 + .23 * (1 - t) ** 1.6 : 1 + motion.zoom * distance;
      const brightness = .72 + fadeIn * .30 - fadeOut ** 2 * .62;
      tunnel.style.setProperty("--tunnel-scale", zoom.toFixed(3));
      tunnel.style.setProperty("--tunnel-bright", brightness.toFixed(2));
      tunnel.style.setProperty("--passage-fade",Math.min(1,t / .19).toFixed(3));
      tunnel.style.setProperty("--passage-opacity", (fadeIn * (1 - Math.max(0,(t - handoff) / (1 - handoff)))).toFixed(3));
      if (t >= handoff) {
        const hole = length * ((t - handoff) / (1 - handoff)) ** 1.4;
        tunnel.style.setProperty("--passage-window",`radial-gradient(circle at 50% ${axis * 100}%,transparent ${hole * .84}px,#000 ${hole}px)`);
      }
      if (ctx) {
        ctx.clearRect(0, 0, width, height);
        ctx.lineCap = "round";
        ctx.globalAlpha = motion.strength * fadeIn * (1 - fadeOut);
        for (const [i, [x, y, offset]] of rays.entries()) {
          const z = (1 + offset + (returning ? -t : distance) * .92) % 1;
          const near = length * (.025 + z ** 2 * .64);
          const far = near * (.61 + i % 4 * .055);
          ctx.beginPath();
          ctx.moveTo(centerX + x * far, centerY + y * far);
          ctx.lineTo(centerX + x * near, centerY + y * near);
          ctx.strokeStyle = palette[i % 6 === 0 ? 2 : i % 2] + "B0";
          ctx.lineWidth = .6 + z * 1.1;
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        const pull = Math.min(1,t / .48);
        const lock = pull * pull * (3 - 2 * pull);
        const x = originX + (centerX - originX) * lock;
        const y = originY + (centerY - originY) * lock;
        const radius = base * (.03 + .76 * t ** 2.4);
        const light = (1 - fadeOut) * fadeIn;
        const glow = ctx.createRadialGradient(x,y,0,x,y,Math.max(1,radius * 1.3));
        glow.addColorStop(0,palette[0] + "b5");
        glow.addColorStop(.27,palette[1] + "47");
        glow.addColorStop(.54,palette[2] + "21");
        glow.addColorStop(1,palette[1] + "00");
        ctx.globalAlpha = light;
        ctx.fillStyle = glow;
        ctx.fillRect(0,0,width,height);
        ctx.strokeStyle = palette[1];
        ctx.lineWidth = 1.4;
        ctx.shadowColor = palette[2];
        ctx.shadowBlur = 14;
        for (let i = 0; i < 4; i += 1) {
          ctx.globalAlpha = light * (1 - i * .21);
          ctx.beginPath();
          const spin = t * 3.1 + i * 1.8;
          ctx.strokeStyle = palette[i % palette.length];
          ctx.ellipse(x,y,radius * (1 - i * .115),radius * (.69 + lock * .25 - i * .085),t * .62 + i * .26,spin,spin + 3.6);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      transitionFrame = requestAnimationFrame(frame);
    }
    transitionFrame = requestAnimationFrame(frame);
  }

  function go(id) {
    if (id === urlRoom()) return;
    const url = new URL(location.href);
    url.hash = id;
    history.pushState(null, "", url);
    flyTo(id);
  }

  function enterMonitor(button) {
    if (!button || transitionFrame) return;
    lastEntrance = button;
    go(button.dataset.target);
  }
  ports.addEventListener("click", (event) => enterMonitor(event.target.closest("[data-target]")));

  let monitorTap = null;
  scene.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "touch") return;
    const button = event.isPrimary && event.target.closest(".monitor");
    monitorTap = button ? { button, id: event.pointerId, x: event.clientX, y: event.clientY } : null;
  });
  scene.addEventListener("pointerup", (event) => {
    if (monitorTap?.id !== event.pointerId) return;
    const { button,x,y } = monitorTap;
    monitorTap = null;
    if (scene.dataset.phase === "ready" && event.target.closest(".monitor") === button
        && Math.hypot(event.clientX-x,event.clientY-y) < 8) enterMonitor(button);
  });
  scene.addEventListener("pointercancel", (event) => {
    if (monitorTap?.id === event.pointerId) monitorTap = null;
  });
  document.querySelectorAll("[data-desk]").forEach((button) => {
    button.addEventListener("click", () => {
      if (!transitionFrame) go("");
    });
  });
  window.addEventListener("popstate", () => {
    resetTunnel();
    finishOpening();
    showRoom(urlRoom());
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (record.open && storyArchive.open) {
      event.preventDefault();
      record.close();
      return;
    }
    if (current && !field.open && !robotLab.open && !topic.open && !record.open && !storyArchive.open && !storyFilm.open && !transitionFrame) go("");
  });
  reduced.addEventListener("change", () => {
    if (!reduced.matches) return;
    resetTunnel();
    finishOpening();
    showRoom(urlRoom(), false);
  });

  document.querySelector("#open-story-archive").addEventListener("click", () => storyArchive.showModal());
  document.querySelector("#open-story-film").addEventListener("click", () => storyFilm.showModal());
  document.querySelector("#open-collection-from-story").addEventListener("click", () => {
    if (!transitionFrame) go("collection");
  });
  storyFilm.addEventListener("close", () => storyFilmPlayer.pause());
  const collectionShelf = document.querySelector("#collection-shelf");
  const collectionView = document.querySelector("#collection-view");
  const collectionViewContent = document.querySelector("#collection-view-content");
  function collectionUrl(value) {
    if (typeof value !== "string" || !value) return "";
    if (/^assets\/collection\/[a-f\d-]+\.(jpg|png|webp|gif|avif|mp4|webm)$/.test(value)) return value;
    try {
      const url = new URL(value);
      if (url.protocol === "https:" && !url.username && !url.password) return url.href;
    } catch {}
    return "";
  }
  function showCollectionItem(item, url) {
    document.querySelector("#collection-view-title").textContent = item.title;
    const media = document.createElement({ image: "img", video: "video", quote: "blockquote" }[item.kind]);
    if (item.kind === "quote") media.textContent = item.quote;
    else {
      media.src = url;
      if (item.kind === "image") media.alt = item.title;
      else {
        media.controls = true;
        media.playsInline = true;
      }
    }
    collectionViewContent.replaceChildren(media);
    if (item.description) {
      const caption = document.createElement("p");
      caption.textContent = item.description;
      collectionViewContent.append(caption);
    }
    collectionView.showModal();
  }
  collectionView.addEventListener("close", () => collectionViewContent.replaceChildren());
  function addCollectionItem(item, personal = false) {
    const url = personal ? collectionUrl(item.url) : item.href;
    const imageUrl = personal ? collectionUrl(item.image) : item.image;
    const link = ["link", "video-link"].includes(item.kind);
    if (personal && item.kind !== "quote" && !url) return;
    const row = document.createElement("li");
    const exhibit = document.createElement(link ? "a" : "button");
    exhibit.className = "collection-exhibit";
    exhibit.classList.toggle("collection-exhibit--personal",personal);
    if (link) {
      exhibit.href = url;
      exhibit.target = "_blank";
      exhibit.rel = "noopener noreferrer";
    } else {
      exhibit.type = "button";
      exhibit.setAttribute("aria-haspopup","dialog");
      exhibit.addEventListener("click",() => {
        if (personal) showCollectionItem(item,url);
        else if (item.kind === "film") storyFilm.showModal();
        else openResearchView(fieldHash,exhibit);
      });
    }
    if (imageUrl) {
      const image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      image.addEventListener("error",() => image.remove(), { once: true });
      exhibit.append(image);
    }
    const copy = document.createElement("span");
    copy.className = "collection-copy";
    const category = document.createElement("small");
    category.textContent = item.category;
    const heading = document.createElement("strong");
    heading.textContent = item.title;
    const arrow = document.createElement("b");
    arrow.textContent = "↗";
    arrow.setAttribute("aria-hidden","true");
    const description = document.createElement("span");
    description.textContent = item.kind === "quote" ? item.quote : item.description;
    copy.append(category,heading,arrow,description);
    exhibit.append(copy);
    row.append(exhibit);
    collectionShelf.append(row);
  }
  window.SPACE_COLLECTION.forEach(item => addCollectionItem(item));
  fetch("content/collection-personal.json").then(response => response.ok ? response.json() : []).then(items => {
    if (!Array.isArray(items)) return;
    for (const item of items) {
      if (item && typeof item.title === "string" && ["image","video","video-link","quote"].includes(item.kind)) {
        addCollectionItem(item,true);
      }
    }
    collectionShelf.toggleAttribute("data-expanded",collectionShelf.children.length > 3);
  }).catch(() => {});
  const chapterButtons = [];
  let pendingChapter = null;
  function syncStoryFilmChapter() {
    const time = pendingChapter ?? storyFilmPlayer.currentTime;
    const active = nightFilmChapters.findLastIndex((chapter) => chapter.time <= time + .025);
    for (const [index,button] of chapterButtons.entries()) {
      if (index === active) button.setAttribute("aria-current","true");
      else button.removeAttribute("aria-current");
    }
  }
  function applyStoryFilmSeek() {
    if (pendingChapter === null) return;
    storyFilmPlayer.currentTime = pendingChapter;
    pendingChapter = null;
    syncStoryFilmChapter();
  }
  for (const chapter of nightFilmChapters) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "story-chapter";
    const image = document.createElement("img");
    image.src = chapter.image;
    image.alt = "";
    image.width = 720;
    image.height = 326;
    image.loading = "lazy";
    image.decoding = "async";
    const caption = document.createElement("span");
    const time = document.createElement("time");
    time.dateTime = "PT" + chapter.time + "S";
    time.textContent = String(Math.floor(chapter.time/60)).padStart(2,"0") + ":"
      + String(Math.floor(chapter.time%60)).padStart(2,"0");
    caption.append(chapter.title,time);
    button.append(image,caption);
    button.addEventListener("click",() => {
      pendingChapter = chapter.time;
      if (storyFilmPlayer.readyState >= HTMLMediaElement.HAVE_METADATA) applyStoryFilmSeek();
      else {
        syncStoryFilmChapter();
        if (storyFilmPlayer.preload === "none") {
          const loading = storyFilmPlayer.networkState === HTMLMediaElement.NETWORK_LOADING;
          storyFilmPlayer.preload = "auto";
          if (!loading) storyFilmPlayer.load();
        }
      }
    });
    storyFilmIndex.append(button);
    chapterButtons.push(button);
  }
  if (chapterButtons.length) {
    storyFilmIndex.hidden = false;
    storyFilmPlayer.addEventListener("loadedmetadata",applyStoryFilmSeek);
    storyFilmPlayer.addEventListener("timeupdate",syncStoryFilmChapter);
    storyFilmPlayer.addEventListener("seeked",syncStoryFilmChapter);
    storyFilmPlayer.addEventListener("error",() => {
      pendingChapter = null;
      syncStoryFilmChapter();
    });
    syncStoryFilmChapter();
  }
  topic.addEventListener("click", (event) => {
    if (event.target !== topic) return;
    const { left, right, top, bottom } = topic.getBoundingClientRect();
    if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) topic.close();
  });

  function openRecord(event, item, kind) {
    if (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    event.preventDefault();
    record.dataset.kind = kind;
    document.querySelector("#record-title").textContent = item.title;
    document.querySelector("#record-kind").textContent = kind === "story"
      ? item.date + (item.sample ? " · 示例记录" : "")
      : item.category + (item.sample ? " · 示例项目" : "");
    const links = document.querySelector("#record-project-links");
    const tags = document.querySelector("#record-project-tags");
    links.replaceChildren();
    tags.replaceChildren();
    links.hidden = kind !== "project";
    tags.hidden = kind !== "project" || !item.tags?.length;
    if (kind === "project") {
      for (const label of item.tags ?? []) {
        const tag = document.createElement("li");
        tag.textContent = label;
        tags.append(tag);
      }
      const destinations = [
        ["独立项目页", "project.html?id=" + encodeURIComponent(item.id)],
        ["项目预览", item.links?.demo],
        ["源码", item.links?.source]
      ];
      for (const [label, href] of destinations) {
        if (!href) continue;
        const link = document.createElement("a");
        link.href = href;
        link.textContent = label + " ↗";
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        links.append(link);
      }
    }
    const text = document.querySelector("#record-text");
    const lead = document.createElement("p");
    lead.textContent = item.description ?? item.summary;
    text.replaceChildren(lead);
    for (const section of item.sections) {
      const group = document.createElement("section");
      if (section.title) {
        const heading = document.createElement("h3");
        heading.textContent = section.title;
        group.append(heading);
      }
      for (const block of section.blocks ?? [section.text]) {
        const content = typeof block === "string" ? block : block.quote ?? block.code;
        if (!content) continue;
        const element = document.createElement(block.quote ? "blockquote" : block.code ? "pre" : "p");
        element.textContent = content;
        group.append(element);
      }
      text.append(group);
    }
    record.showModal();
    record.scrollTop = 0;
  }

  const personalProjects = window.SITE_PROJECTS.filter((project) => project.sample === false);
  window.mountProjectBay(personalProjects, (event, project) => openRecord(event, project, "project"), bindSwipe);

  const entries = document.querySelector("#story-entries");
  const personalNotes = window.SITE_NOTES.filter(({ type,sample }) => type === "personal" && sample === false)
    .sort((first, second) => second.date.localeCompare(first.date));
  const entryCount = document.querySelector("#story-archive-count");
  entryCount.textContent = personalNotes.length
    ? personalNotes.length + " 篇"
    : "待补充";
  document.querySelector("#story-empty").hidden = personalNotes.length > 0;
  for (const note of personalNotes) {
    const row = document.createElement("li");
    const link = document.createElement("a");
    link.className = "story-link";
    link.href = "article.html?id=" + encodeURIComponent(note.id);
    link.addEventListener("click", (event) => openRecord(event, note, "story"));
    const metadata = document.createElement("span");
    metadata.className = "story-link-meta";
    const date = document.createElement("time");
    date.dateTime = note.date;
    date.textContent = note.date;
    metadata.append(date);
    const title = document.createElement("strong");
    title.textContent = note.title;
    const arrow = document.createElement("span");
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    const detail = document.createElement("small");
    detail.className = "story-link-summary";
    detail.textContent = note.summary;
    link.append(metadata, title, arrow, detail);
    row.append(link);
    entries.append(row);
  }

  const initial = urlRoom();
  layoutDesk();
  if (initial || reduced.matches) finishOpening();
  if (initial) showRoom(initial, false);
  else if (!reduced.matches) playOpening();
})();
