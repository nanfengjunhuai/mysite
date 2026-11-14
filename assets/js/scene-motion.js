(() => {
  "use strict";

  const reel = document.querySelector("#open-story-film");
  const preview = reel.querySelector(".story-reel-preview");
  const film = document.querySelector("#story-film");
  const fullVideo = document.querySelector("#story-film-player");
  const story = document.querySelector("#story");
  const stage = document.querySelector(".workroom-stage");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const hover = matchMedia("(any-hover: hover)");
  const previewStart = 3;
  let active = false;
  let playback = 0;

  function stopPreview() {
    active = false;
    preview.pause();
    delete reel.dataset.preview;
  }

  async function startPreview() {
    if (active || reduced.matches || film.open || story.hidden || document.hidden || !document.hasFocus()) return;
    if (!preview.getAttribute("src")) preview.src = fullVideo.getAttribute("src");
    const attempt = ++playback;
    active = true;
    if (preview.readyState >= HTMLMediaElement.HAVE_METADATA) preview.currentTime = previewStart;
    try {
      await preview.play();
      if (active && attempt === playback && !preview.seeking) showPreviewFrame();
    } catch {
      if (attempt === playback) stopPreview();
    }
  }

  function showPreviewFrame() {
    if (active && !preview.paused && preview.currentTime >= previewStart && preview.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      reel.dataset.preview = "";
    }
  }
  preview.addEventListener("loadedmetadata", () => { if (active) preview.currentTime = previewStart; });
  preview.addEventListener("seeked",showPreviewFrame);
  preview.addEventListener("timeupdate", () => { if (preview.currentTime >= previewStart + 2.8) stopPreview(); });
  preview.addEventListener("ended",stopPreview);
  preview.addEventListener("error",stopPreview);
  reel.addEventListener("pointerenter",event => { if (hover.matches && event.pointerType === "mouse") startPreview(); });
  reel.addEventListener("pointerleave",stopPreview);
  reel.addEventListener("focus",() => { if (reel.matches(":focus-visible")) startPreview(); });
  reel.addEventListener("blur",stopPreview);
  reel.addEventListener("click",stopPreview,{ capture: true });
  window.addEventListener("blur",stopPreview);
  window.addEventListener("pagehide",stopPreview);
  document.addEventListener("visibilitychange",() => { if (document.hidden) stopPreview(); });
  reduced.addEventListener("change",() => { if (reduced.matches) stopPreview(); });
  const observer = new MutationObserver(() => { if (story.hidden || film.open) stopPreview(); });
  observer.observe(story,{ attributes:true,attributeFilter:["hidden"] });
  observer.observe(film,{ attributes:true,attributeFilter:["open"] });

  stage.addEventListener("pointermove",event => {
    if (!hover.matches || event.pointerType !== "mouse" || reduced.matches || stage.parentElement.dataset.phase !== "ready") return;
    const bounds = stage.getBoundingClientRect();
    const x = (event.clientX - bounds.x) / bounds.width;
    const y = (event.clientY - bounds.y) / bounds.height;
    const distance = Math.hypot(x - .70,y - .68);
    const brightness = .67 + .33 * Math.max(0,1 - distance * 2.1);
    stage.style.setProperty("--desk-light",brightness.toFixed(2));
  });
  stage.addEventListener("pointerleave",() => stage.style.removeProperty("--desk-light"));
})();
