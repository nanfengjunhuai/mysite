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
  let loaded;
  let view;
  let frame = 0;
  let last = 0;
  let gesture;
  let previousFocus;
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

  function prepare() {
    resources??=Promise.all([
      window.THREE?Promise.resolve():script("assets/vendor/three-r159.min.js"),
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
    const terrain=new T.PlaneGeometry(width,depth,130,72);
    terrain.rotateX(-Math.PI/2);
    const coords=terrain.getAttribute("position"),uv=terrain.getAttribute("uv");
    for (let i=0;i<coords.count;i++) coords.setY(i,shape(uv.getX(i),1-uv.getY(i)));
    terrain.computeVertexNormals();
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
      const way=new T.CatmullRomCurve3(landmark.path.map(([u,v])=>new T.Vector3(u,0,v)));
      const line=new T.CatmullRomCurve3(way.getPoints(75).map(point=>position(point.x,point.z,.035)));
      const routeLine=new T.Mesh(new T.TubeGeometry(line,120,.026,6,false),new T.MeshBasicMaterial({color:"#b3ece1",toneMapped:false}));
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
