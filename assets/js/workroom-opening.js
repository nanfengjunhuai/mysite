(() => {
  "use strict";

  const layer = document.querySelector("#opening-optics");
  const canvas = layer.querySelector("canvas");
  const context = canvas.getContext("2d");
  const turn = Math.PI * 2;
  const rings = [
    { radius: 1, depth: -.19, speed: .56, phase: .40, divisions: 4, color: "106,201,239" },
    { radius: .87, depth: .11, speed: -.48, phase: .23, divisions: 3, color: "139,219,244" },
    { radius: .69, depth: .36, speed: .43, phase: .84, divisions: 5, color: "81,157,203" },
    { radius: .48, depth: .58, speed: -.64, phase: .20, divisions: 4, color: "224,187,140" }
  ];
  let frame = 0;
  let start = 0;
  let release = null;

  function ease(value) {
    const t = Math.min(1,Math.max(0,value));
    return t * t * (3 - 2 * t);
  }

  function paint(now) {
    const elapsed = now - start;
    const width = layer.clientWidth;
    const height = layer.clientHeight;
    const density = Math.min(devicePixelRatio || 1,2);
    if (canvas.width !== Math.round(width * density) || canvas.height !== Math.round(height * density)) {
      canvas.width = Math.round(width * density);
      canvas.height = Math.round(height * density);
    }
    context.setTransform(density,0,0,density,0,0);
    context.clearRect(0,0,width,height);
    const x = width * .5;
    const y = height * .44;
    const unit = Math.min(width,height) * .332;
    const align = ease(elapsed / 910);
    const forward = ease((elapsed - 1020) / 650);
    const pulse = ease((elapsed - 110) / 380);

    function point(radius,depth,angle) {
      const u = radius * Math.cos(angle);
      const v = radius * Math.sin(angle);
      const depthOffset = u * (.53 - align * .50) + v * (.28 - align * .25);
      const perspective = 1 / Math.max(.18,1.62 + depth + depthOffset - forward * 1.38);
      return [
        x + (u * (.85 + align * .15) + depth * (.44 - align * .44)) * unit * perspective,
        y + (v * (.9 + align * .1) + depth * (.19 - align * .19)) * unit * perspective
      ];
    }

    function arc(radius,depth,from,to) {
      context.beginPath();
      const steps = Math.max(2,Math.ceil((to - from) * 28));
      for (let i = 0; i <= steps; i += 1) {
        const [px,py] = point(radius,depth,from + (to - from) * i / steps);
        if (i === 0) context.moveTo(px,py);
        else context.lineTo(px,py);
      }
      context.stroke();
    }

    const haloSize = Math.max(1,unit * (.68 + forward * 1.3));
    const halo = context.createRadialGradient(x,y,0,x,y,haloSize);
    halo.addColorStop(0,`rgba(109,202,240,${.16 * pulse})`);
    halo.addColorStop(.38,`rgba(57,134,174,${.10 * pulse})`);
    halo.addColorStop(1,"rgba(43,114,152,0)");
    context.fillStyle = halo;
    context.fillRect(0,0,width,height);

    for (const ring of rings) {
      const {radius,depth,color,divisions} = ring;
      const angle = ring.phase + ring.speed * elapsed / 1000 + (1 - align) * radius;
      const segment = turn / divisions;
      context.lineWidth = .75;
      context.strokeStyle = `rgba(${color},${.29 * pulse})`;
      arc(radius,depth,0,turn);
      arc(radius + .037,depth,0,turn);
      for (let i = 0; i < divisions; i += 1) {
        const from = angle + i * segment;
        context.lineWidth = 2.1;
        context.strokeStyle = `rgba(${color},${.88 * pulse})`;
        context.shadowColor = `rgb(${color})`;
        context.shadowBlur = 12;
        arc(radius,depth,from,from + segment * .69);
        context.shadowBlur = 0;
        context.strokeStyle = `rgba(${color},${.42 * pulse})`;
        context.lineWidth = .8;
        arc(radius - .028,depth,from + .05,from + segment * .31);
      }
      context.beginPath();
      for (let i = 0; i < 64; i += 1) {
        const tick = angle + i * turn / 64;
        const a = point(radius + .052,depth,tick);
        const b = point(radius + (i % 8 === 0 ? .094 : .072),depth,tick);
        context.moveTo(...a);
        context.lineTo(...b);
      }
      context.stroke();
    }

    const core = unit * (.115 + forward * .38);
    context.globalAlpha = pulse;
    const glass = context.createRadialGradient(x - core * .32,y - core * .29,0,x,y,core * 1.12);
    glass.addColorStop(0,"#dcfbff");
    glass.addColorStop(.18,"#65c5ed");
    glass.addColorStop(.48,"#266990");
    glass.addColorStop(.8,"#102138");
    glass.addColorStop(1,"#87dfff");
    context.fillStyle = glass;
    context.shadowColor = "#5acbff";
    context.shadowBlur = 24;
    context.beginPath();
    context.arc(x,y,core,0,turn);
    context.fill();
    context.shadowBlur = 0;
    context.lineWidth = 1;
    context.strokeStyle = `rgba(205,242,255,${pulse * (.6 + .4 * align)})`;
    context.beginPath();
    context.moveTo(x,y - core * .55);
    context.lineTo(x + core * .55,y);
    context.lineTo(x,y + core * .55);
    context.lineTo(x - core * .55,y);
    context.closePath();
    context.stroke();
    context.fillStyle = "#e5f8ff";
    context.globalAlpha = pulse;
    context.fillRect(x - 1.5,y - 1.5,3,3);
    context.globalAlpha = 1;

    const aperture = ease((elapsed - 1230) / 550) * Math.hypot(width,height) * .6;
    if (aperture > 0) {
      layer.style.maskImage = `radial-gradient(circle at 50% 44%,transparent ${aperture * .83}px,#000 ${aperture}px)`;
    }
    const fade = 1 - ease((elapsed - 1480) / 300);
    layer.style.opacity = fade;
    if (fade > 0) frame = requestAnimationFrame(paint);
    else {
      layer.hidden = true;
      frame = 0;
      release?.();
    }
  }

  window.workroomOpening = {
    play(onReveal) {
      if (!context) {
        this.stop();
        onReveal();
        return;
      }
      release = onReveal;
      layer.hidden = false;
      layer.style.opacity = "";
      layer.style.maskImage = "";
      start = performance.now();
      frame = requestAnimationFrame(paint);
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      layer.hidden = true;
      release = null;
    }
  };
})();
