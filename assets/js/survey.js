(() => {
  "use strict";

  const dialog = document.querySelector("#coast-survey");
  if (!dialog) return;
  const field = window.WORLD_FIELD_STUDY;
  const viewport = dialog.querySelector(".survey-viewport");
  const canvas = viewport.querySelector("canvas");
  const pins = viewport.querySelector(".survey-pins");
  const routeName = dialog.querySelector("#survey-route-name");
  const routeImage = dialog.querySelector(".survey-route-media img");
  const routeText = dialog.querySelector(".survey-route-body p");
  const entry = dialog.querySelector("#survey-enter");
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const dimensions = [9.8,9.8*941/1672];
  const shoreline = [[0,.89],[.07,.85],[.14,.82],[.20,.75],[.27,.73],[.34,.65],[.48,.629],[.55,.61],[.60,.536],[.64,.412],[.68,.37],[.75,.36],[.82,.27],[.89,.25],[1,.15]];
  const landmarks = {
    harbor:{spot:[.682,.607],path:[[.503,.467],[.528,.492],[.569,.510],[.580,.542],[.599,.576],[.644,.612],[.682,.607]]},
    ridge:{spot:[.379,.263],path:[[.503,.467],[.471,.432],[.454,.406],[.438,.378],[.414,.363],[.428,.330],[.379,.263]]}
  };
  let selected;
  let resources;
  let threeSource;
  let loaded;
  let view;
  let frame = 0;
  let last = 0;
  let gesture;
  let previousFocus;
  let projectionYaw=-.25;
  const buttons = new Map();

  function setRoute(id) {
    const route = field.routes.find(item=>item.id===id);
    if (!route) return;
    selected=id;
    routeName.textContent=route.title;
    routeText.textContent=route.description;
    routeImage.src=route.image;
    entry.href="#"+route.id;
    for (const [key,button] of buttons) button.setAttribute("aria-pressed",String(key===selected));
    if (view) {
      view.wantedYaw=Math.max(-1.07,Math.min(1.07,view.yaw+(id==="ridge"?.12:-.12)));
      markRoute();
    }
  }
  for (const route of field.routes) {
    const button=document.createElement("button");
    button.type="button";
    button.className="survey-pin";
    button.dataset.site=route.id;
    button.textContent=route.title;
    button.addEventListener("click",()=>setRoute(route.id));
    pins.append(button);
    buttons.set(route.id,button);
  }

  function script(source) {
    return new Promise((resolve,reject)=>{
      const tag=document.createElement("script");
      tag.src=source;
      tag.addEventListener("load",resolve,{once:true});
      tag.addEventListener("error",reject,{once:true});
      document.head.append(tag);
    });
  }

  function prepareThree() {
    return window.THREE ? Promise.resolve() : (threeSource??=script("assets/vendor/three-r159.min.js"));
  }

  function prepare() {
    resources??=Promise.all([
      prepareThree(),
      script("assets/img/survey-terrain.js").catch(()=>{})
    ]);
    return resources;
  }

  function coastAt(v) {
    let i=1;
    while (i<shoreline.length-1 && v>shoreline[i][0]) i++;
    const [a,x]=shoreline[i-1],[b,y]=shoreline[i];
    return x+(y-x)*(v-a)/(b-a);
  }
  function shape(u,v) {
    const distance=coastAt(v)-u;
    if (distance<=0) return 0;
    const coastalFade=Math.min(1,distance*27);
    const gaussian=(x,z,a,b)=>Math.exp(-(((u-x)/a)**2+((v-z)/b)**2));
    const ridge=gaussian(.36,.26,.22,.155)*.89 + gaussian(.17,.39,.16,.25)*.46;
    const terrace=gaussian(.48,.47,.15,.19)*.19;
    const relief=Math.sin(u*57+Math.sin(v*16)*3)*Math.cos(v*57+u*11)*.029;
    return Math.max(0,coastalFade*(.012+ridge+terrace+relief));
  }

  function position(u,v,offset=0) {
    const T=window.THREE;
    return new T.Vector3((u-.5)*dimensions[0],shape(u,v)+offset,(v-.5)*dimensions[1]);
  }

  function reliefGeometry(T,columns,rows) {
    const terrain=new T.PlaneGeometry(...dimensions,columns,rows);
    terrain.rotateX(-Math.PI/2);
    const coords=terrain.getAttribute("position"),uv=terrain.getAttribute("uv");
    for (let i=0;i<coords.count;i++) coords.setY(i,shape(uv.getX(i),1-uv.getY(i)));
    terrain.computeVertexNormals();
    return terrain;
  }

  function routeGeometry(T,landmark) {
    const way=new T.CatmullRomCurve3(landmark.path.map(([u,v])=>new T.Vector3(u,0,v)));
    const line=new T.CatmullRomCurve3(way.getPoints(75).map(point=>position(point.x,point.z,.035)));
    return new T.TubeGeometry(line,120,.026,6,false);
  }

  function makeSurvey() {
    const T=window.THREE;
    const renderer = new T.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:"high-performance"});
    renderer.setClearColor(0x000000,0);
    renderer.outputColorSpace=T.SRGBColorSpace;
    renderer.toneMapping=T.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.08;
    const scene=new T.Scene();
    const camera=new T.PerspectiveCamera(36,1,.08,80);
    scene.add(new T.HemisphereLight("#e8faff","#4b6b64",1.4));
    const key=new T.DirectionalLight("#ffe7c8",2.65);
    key.position.set(-4,6,3);
    scene.add(key);
    const fill=new T.DirectionalLight("#66b9ce",1.08);
    fill.position.set(5,3,-5);
    scene.add(fill);
    const map=new T.Group();
    scene.add(map);
    const [width,depth]=dimensions;
    const terrain=reliefGeometry(T,130,72);
    const textureCanvas=document.createElement("canvas");
    const fallbackWidth=240,fallbackHeight=136;
    textureCanvas.width=fallbackWidth; textureCanvas.height=fallbackHeight;
    const ctx=textureCanvas.getContext("2d"), pixels=ctx.createImageData(fallbackWidth,fallbackHeight);
    for (let y=0;y<fallbackHeight;y++) for (let x=0;x<fallbackWidth;x++) {
      const height=shape(x/(fallbackWidth-1),y/(fallbackHeight-1));
      const offset=(y*fallbackWidth+x)*4;
      const color=height>0?[41+105*height,76+96*height,65+64*height]:[15,51,64];
      color.forEach((value,i)=>{pixels.data[offset+i]=value;});
      pixels.data[offset+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    const defaultTexture=new T.CanvasTexture(textureCanvas);
    defaultTexture.colorSpace=T.SRGBColorSpace;
    const surface=new T.MeshStandardMaterial({map:defaultTexture,roughness:.68,metalness:.08});
    map.add(new T.Mesh(terrain,surface));
    if (window.COAST_SURVEY_TEXTURE) {
      new T.TextureLoader().load(window.COAST_SURVEY_TEXTURE,texture=>{
        texture.colorSpace=T.SRGBColorSpace;
        texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
        surface.map=texture;
        defaultTexture.dispose();
        requestDraw();
      },undefined,()=>{});
    }

    const chassis=new T.MeshStandardMaterial({color:"#203338",metalness:.64,roughness:.39});
    const trim=new T.MeshStandardMaterial({color:"#638d89",metalness:.70,roughness:.32});
    const glow=new T.MeshBasicMaterial({color:"#91d9cc",toneMapped:false});
    const edge=new T.Mesh(new T.BoxGeometry(width+.12,.11,depth+.12),trim);
    edge.position.y=-.066;
    const base=new T.Mesh(new T.BoxGeometry(width+.32,.24,depth+.32),chassis);
    base.position.y=-.238;
    map.add(base,edge);
    for (const x of [-1,1]) for (const z of [-1,1]) {
      const light=new T.Mesh(new T.BoxGeometry(.40,.019,.024),glow);
      light.position.set(x*(width/2-.22),-.121,z*(depth/2+.167));
      map.add(light);
    }

    const waterMaterial=new T.ShaderMaterial({
      transparent:true,depthWrite:false,
      uniforms:{seconds:{value:0},coastline:{value:waterMask(T)}},
      vertexShader:`
        varying vec2 surfaceUv;
        void main(){surfaceUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
      `,
      fragmentShader:`
        uniform float seconds;
        uniform sampler2D coastline;
        varying vec2 surfaceUv;
        void main(){
          vec2 p=vec2(surfaceUv.x,1.-surfaceUv.y);
          float coast=texture2D(coastline,vec2(p.y,.5)).r;
          float sea=smoothstep(coast+.013,coast+.053,p.x);
          float grain=sin(p.x*72.+p.y*121.+sin(p.x*29.+p.y*31.)*.85-seconds*1.4)*.5+.5;
          float drift=sin(p.x*21.-p.y*18.+seconds*.54)*.5+.5;
          float wave=pow(grain,13.)*drift*sea*.060;
          gl_FragColor=vec4(.43,.82,.90,wave);
        }
      `
    });
    const waterGeometry=new T.PlaneGeometry(width,depth);
    waterGeometry.rotateX(-Math.PI/2);
    const water=new T.Mesh(waterGeometry,waterMaterial);
    water.position.y=.006;
    map.add(water);

    const beacon = new T.Group();
    const signal = new T.Mesh(new T.CylinderGeometry(.038,.063,.23,12),new T.MeshStandardMaterial({color:"#ebe1c8",roughness:.61}));
    signal.position.y=.12;
    const lantern = new T.Mesh(new T.CylinderGeometry(.049,.047,.046,12),new T.MeshBasicMaterial({color:"#ffe0a4",toneMapped:false}));
    lantern.position.y=.254;
    const cap = new T.Mesh(new T.ConeGeometry(.056,.036,12),chassis);
    cap.position.y=.289;
    beacon.position.copy(position(...landmarks.harbor.spot,.014));
    beacon.add(signal,lantern,cap);
    map.add(beacon);

    const routeObjects=new Map();
    for (const [id,landmark] of Object.entries(landmarks)) {
      const routeLine=new T.Mesh(routeGeometry(T,landmark),new T.MeshBasicMaterial({color:"#b3ece1",toneMapped:false}));
      const ring=new T.Mesh(new T.RingGeometry(.105,.129,32),new T.MeshBasicMaterial({color:"#b3ece1",side:T.DoubleSide,toneMapped:false}));
      ring.rotateX(-Math.PI/2);
      ring.position.copy(position(...landmark.spot,.071));
      map.add(routeLine,ring);
      routeObjects.set(id,{routeLine,ring});
    }
    return {renderer,scene,camera,map,waterMaterial,routeObjects,yaw:-.25,wantedYaw:-.25,tilt:.62,wantedTilt:.62,onResize:new ResizeObserver(resize)};
  }

  function waterMask(T) {
    const bytes=new Uint8Array(256*4);
    for (let i=0;i<256;i++) {
      bytes[i*4]=Math.round(coastAt(i/255)*255);
      bytes[i*4+3]=255;
    }
    const texture=new T.DataTexture(bytes,256,1,T.RGBAFormat);
    texture.needsUpdate=true;
    return texture;
  }

  function makeProjection(canvas) {
    const T=window.THREE;
    const renderer=new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:"low-power"});
    renderer.setClearColor(0,0);
    const scene=new T.Scene();
    const map=new T.Group();
    scene.add(map);
    const camera=new T.OrthographicCamera(-6,6,3,-3,.1,40);
    const time={value:0};
    const surveyLight={value:0};
    const material=new T.ShaderMaterial({
      transparent:true,
      extensions:{derivatives:true},
      uniforms:{time,surveyLight,coastline:{value:waterMask(T)}},
      vertexShader:`
        varying vec2 tex;
        varying float elevation;
        varying vec3 reliefNormal;
        void main() {
          tex=vec2(uv.x,1.-uv.y);
          elevation=position.y;
          reliefNormal=normal;
          gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
        }
      `,
      fragmentShader:`
        uniform float time;
        uniform float surveyLight;
        uniform sampler2D coastline;
        varying vec2 tex;
        varying float elevation;
        varying vec3 reliefNormal;
        float line(float phase) {
          float d=abs(fract(phase+.5)-.5);
          return 1.-smoothstep(.028,.028+max(.014,fwidth(phase)),d);
        }
        void main() {
          float shore=texture2D(coastline,vec2(tex.y,.5)).r;
          float land=1.-smoothstep(shore-.008,shore+.016,tex.x);
          float silhouette=1.-smoothstep(.83,1.13,length((tex-.5)*2.));
          float key=clamp(dot(normalize(reliefNormal),normalize(vec3(-.5,.8,.42))),0.,1.);
          float contour=line(elevation*16.+.24)*land*smoothstep(.012,.08,elevation);
          float grid=max(line(tex.x*32.),line(tex.y*18.));
          float spray=1.-smoothstep(.007,.025,abs(tex.x-shore));
          float beam=(tex.y-mod(time*.14,1.4)+.16)*28.;
          float scan=exp(-beam*beam);
          vec3 color=mix(vec3(.055,.31,.40),vec3(.09,.36,.40)*(key+.43),land);
          color+=elevation*vec3(.27,.36,.34)+contour*vec3(.24,.47,.53);
          color+=grid*vec3(.045,.11,.13)+spray*vec3(.13,.43,.51);
          color+=scan*vec3(.05,.13,.18)+surveyLight*vec3(.025,.12,.14);
          gl_FragColor=vec4(color,silhouette*(.45+land*.42+spray*.09));
        }
      `
    });
    map.add(new T.Mesh(reliefGeometry(T,112,64),material));
    const blocks=new T.InstancedMesh(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0x8fdfec}),42);
    const placement=new T.Object3D();
    let block=0;
    for (let row=0;row<6;row++) for (let col=0;col<7;col++) {
      const v=.399+row*.028;
      const shore=coastAt(v);
      const u=shore-.047-col*.014+Math.sin(row*1.8+col*1.9)*.003;
      const height=.038+(1+Math.sin(row*2.23+col*4.7))*.061;
      placement.position.copy(position(u,v,height/2));
      placement.scale.set(.073+(col%3)*.015,height,.057+(row%3)*.012);
      placement.updateMatrix();
      blocks.setMatrixAt(block++,placement.matrix);
    }
    map.add(blocks);
    const outlines=[5.32,5.61].map((radius,index)=>{
      const points=new T.EllipseCurve(0,0,radius,2.91+index*.19,0,Math.PI*2).getPoints(104);
      const loop=new T.LineLoop(
        new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(p.x,-.07,p.y))),
        new T.LineBasicMaterial({color:0x5fd9ee,transparent:true,opacity:index?.47:.77})
      );
      map.add(loop);
      return loop;
    });
    const beacons=[];
    for (const [id,landmark] of Object.entries(landmarks)) {
      const color=id==="harbor"?0xffd49a:0xaefff1;
      const routeMaterial=new T.MeshBasicMaterial({color,toneMapped:false});
      map.add(new T.Mesh(routeGeometry(T,landmark),routeMaterial));
      const marker=new T.Group();
      marker.position.copy(position(...landmark.spot,.036));
      const stem=new T.Mesh(new T.CylinderGeometry(.012,.012,.46,8),routeMaterial);
      stem.position.y=.23;
      const jewel=new T.Mesh(new T.OctahedronGeometry(.12),routeMaterial);
      jewel.position.y=.49;
      const pulse=new T.Mesh(new T.RingGeometry(.095,.116,32),new T.MeshBasicMaterial({
        color,side:T.DoubleSide,transparent:true,depthWrite:false,toneMapped:false
      }));
      pulse.rotation.x=-Math.PI/2;
      pulse.position.y=.017;
      marker.add(stem,jewel,pulse);
      map.add(marker);
      beacons.push({jewel,pulse});
    }
    return {
      resize(w,h) {
        const aspect=w/h;
        const compact=aspect<1.5;
        map.scale.y=compact?2.20:1.43;
        camera.position.set(0,compact?9.0:7.3,14.5);
        camera.lookAt(0,compact?1.15:1.02,0);
        camera.top=6/aspect;
        camera.bottom=-camera.top;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.35,1120/w));
        renderer.setSize(w,h,false);
      },
      render(seconds,yaw,inspection) {
        time.value=seconds;
        surveyLight.value=inspection;
        map.rotation.y=yaw;
        outlines[0].material.opacity=.54+inspection*.28;
        beacons.forEach(({jewel,pulse},index)=>{
          const sweep=(seconds*.73+index*.51)%1;
          pulse.scale.setScalar(1+sweep*3.25);
          pulse.material.opacity=(1-sweep)*.69;
          jewel.rotation.y=seconds*.84;
        });
        renderer.render(scene,camera);
      }
    };
  }

  window.mountCoastProjection=(room,plate,background,control)=>{
    const canvas=document.createElement("canvas");
    canvas.className="room-relief";
    canvas.setAttribute("aria-hidden","true");
    plate.insertBefore(canvas,control);
    background.classList.add("room-relief-fallback");
    const dialogs=[...document.querySelectorAll("dialog")];
    const warmImage="assets/img/station-research-table.webp";
    let optics;
    let setup;
    let queued=0;
    let previous=0;
    let seconds=0;
    let dirty=true;
    let yaw=-.17;
    let pressure=0;
    let direction=0;
    let failed=false;
    const visible=()=>room.hasAttribute("data-active") && !room.closest("[inert]") && !document.hidden && !dialogs.some(item=>item.open);

    function restore() {
      delete room.dataset.relief;
    }
    function render(now) {
      queued=0;
      if (!visible() || motion.matches || failed) return;
      const gap=now-previous;
      if (dirty || gap>=40) {
        previous=now;
        seconds+=Math.min(gap,70)*.001;
        const inspected=control.matches(":hover,:focus-visible");
        pressure+=((inspected?1:0)-pressure)*.16;
        yaw+=(-.17+direction*.16*pressure+Math.sin(seconds*.63)*.055-yaw)*.12;
        projectionYaw=yaw;
        if (dirty) {
          optics.resize(Math.max(1,canvas.clientWidth),Math.max(1,canvas.clientHeight));
          dirty=false;
        }
        optics.render(seconds,yaw,pressure);
        if (!room.hasAttribute("data-relief")) room.dataset.relief="";
      }
      queued=requestAnimationFrame(render);
    }
    function sync() {
      if (motion.matches && room.hasAttribute("data-relief")) restore();
      if (!visible() || motion.matches || failed) {
        cancelAnimationFrame(queued);
        queued=0;
        previous=0;
        return;
      }
      if (optics) {
        if (!queued) queued=requestAnimationFrame(render);
        return;
      }
      if (setup) return;
      const clean=new Image();
      clean.className="room-relief-backdrop";
      clean.alt="";
      clean.src=warmImage;
      setup=Promise.all([prepareThree(),clean.decode()]).then(()=>{
        optics=makeProjection(canvas);
        plate.insertBefore(clean,background);
        sync();
      }).catch(()=>{ failed=true; });
    }
    const observer=new MutationObserver(sync);
    observer.observe(room,{attributes:true,attributeFilter:["inert","data-active"]});
    for (const item of dialogs) observer.observe(item,{attributes:true,attributeFilter:["open"]});
    new ResizeObserver(()=>{ dirty=true; }).observe(canvas);
    document.addEventListener("visibilitychange",sync);
    motion.addEventListener("change",sync);
    canvas.addEventListener("webglcontextlost",()=>{
      failed=true;
      restore();
      sync();
    });
    control.addEventListener("pointermove",event=>{
      if (event.pointerType==="touch") return;
      const bounds=control.getBoundingClientRect();
      direction=Math.max(-1,Math.min(1,(event.clientX-bounds.left)/bounds.width*2-1));
    });
    control.addEventListener("pointerleave",()=>{ direction=0; });
  };

  function markRoute() {
    for (const [id,{routeLine,ring}] of view.routeObjects) {
      routeLine.material.color.set(id===selected?"#ffcc81":"#90d5d4");
      ring.material.color.copy(routeLine.material.color);
      ring.scale.setScalar(id===selected?1.4:1);
    }
    requestDraw();
  }

  function resize() {
    if (!view || !dialog.open) return;
    const w=viewport.clientWidth,h=viewport.clientHeight;
    view.camera.aspect=w/Math.max(1,h);
    view.camera.updateProjectionMatrix();
    view.renderer.setPixelRatio(Math.min(devicePixelRatio || 1,1.55));
    view.renderer.setSize(w,h,false);
    requestDraw();
  }

  function requestDraw() {
    if (dialog.open && view && !document.hidden && !frame) frame=requestAnimationFrame(draw);
  }
  function draw(time) {
    frame=0;
    if (!view || !dialog.open || document.hidden) return;
    const follow=motion.matches?1:1-Math.exp(-Math.min(64,time-(last||time))*.012);
    last=time;
    view.yaw+=(view.wantedYaw-view.yaw)*follow;
    view.tilt+=(view.wantedTilt-view.tilt)*follow;
    const w=viewport.clientWidth,h=viewport.clientHeight,aspect=view.camera.aspect;
    const radius=Math.max(9.3,(aspect<1?11.1:10.4)/(Math.tan(Math.PI/10)*2*Math.min(1.12,aspect)));
    const tilt=aspect<1 ? Math.max(.78,view.tilt) : view.tilt;
    view.camera.position.set(Math.sin(view.yaw)*radius*Math.cos(tilt),Math.sin(tilt)*radius,Math.cos(view.yaw)*radius*Math.cos(tilt));
    view.camera.lookAt(aspect<1?.05:.24,0,aspect<1?.07:.48);
    if (aspect<.85) view.camera.rotateZ(.16);
    view.waterMaterial.uniforms.seconds.value=motion.matches?0:time*.001;
    view.renderer.render(view.scene,view.camera);
    for (const [id,button] of buttons) {
      const projected=position(...landmarks[id].spot,.085).project(view.camera);
      const x=(projected.x*.5+.5)*w,y=(.5-projected.y*.5)*h;
      const margin=button.offsetWidth/2+5;
      button.style.left=Math.min(w-margin,Math.max(margin,x))+"px";
      button.style.top=Math.min(h-4,Math.max(90,y))+"px";
    }
    if (!motion.matches) requestDraw();
  }

  function turn(amount) {
    if (!view) return;
    view.wantedYaw=Math.max(-1.07,Math.min(1.07,view.wantedYaw+amount));
    requestDraw();
  }
  dialog.querySelector("[data-view=left]").addEventListener("click",()=>turn(-.25));
  dialog.querySelector("[data-view=right]").addEventListener("click",()=>turn(.25));
  canvas.addEventListener("pointerdown",event=>{
    if (!view || event.button!==0 || !event.isPrimary) return;
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,yaw:view.wantedYaw,tilt:view.wantedTilt};
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove",event=>{
    if (event.pointerId!==gesture?.id) return;
    view.wantedYaw=gesture.yaw;
    view.wantedTilt=Math.max(.42,Math.min(1.10,gesture.tilt+(event.clientY-gesture.y)*.004));
    turn((gesture.x-event.clientX)*.006);
  });
  for (const name of ["pointerup","pointercancel","lostpointercapture"]) {
    canvas.addEventListener(name,event=>{if(event.pointerId===gesture?.id)gesture=undefined;});
  }
  dialog.addEventListener("keydown",event=>{
    if (event.key==="ArrowLeft" || event.key==="ArrowRight") {
      event.preventDefault();
      turn(event.key==="ArrowLeft"?-.25:.25);
    }
  });
  dialog.addEventListener("click",event=>{ if (event.target.closest('a[href^="#"]')) dialog.close(); });
  dialog.addEventListener("close",()=>{
    cancelAnimationFrame(frame);
    frame=0;
    last=0;
    gesture=undefined;
    if(previousFocus?.isConnected&&!previousFocus.closest("[inert]"))previousFocus.focus({preventScroll:true});
  });
  document.addEventListener("visibilitychange",()=>{
    cancelAnimationFrame(frame);
    frame=0;
    last=0;
    requestDraw();
  });
  motion.addEventListener("change",requestDraw);
  window.prepareCoastSurvey=()=>{ prepare().catch(()=>{}); };

  window.openCoastSurvey=()=>{
    if (dialog.open) return;
    previousFocus=document.activeElement;
    if (!selected) setRoute(field.routes[0].id);
    dialog.showModal();
    if (view) { resize(); return; }
    dialog.dataset.fallback="";
    loaded??=prepare().then(()=>{
      view=makeSurvey();
      view.yaw=view.wantedYaw=projectionYaw;
      delete dialog.dataset.fallback;
      view.onResize.observe(viewport);
      markRoute();
      resize();
      canvas.addEventListener("webglcontextlost",()=>{
        cancelAnimationFrame(frame);
        frame=0;
        view.onResize.disconnect();
        view=undefined;
        for (const button of buttons.values()) { button.style.left="";button.style.top=""; }
        dialog.dataset.fallback="";
      },{once:true});
    }).catch(()=>{ dialog.dataset.fallback=""; });
  };
})();
