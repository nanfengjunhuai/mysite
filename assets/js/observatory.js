(() => {
  "use strict";

  const T = window.THREE;
  if (!T) return;
  const TAU = Math.PI * 2;
  const v = (x,y,z) => new T.Vector3(x,y,z);
  const boxGeo = new T.BoxGeometry();
  const pipeGeo = new T.CylinderGeometry(1,1,1,10);
  const rings = new Map();
  const material = (color,roughness=.4,metalness=.42) => new T.MeshStandardMaterial({color,roughness,metalness});
  const light = color => new T.MeshBasicMaterial({color,toneMapped:false});
  const steel = material("#617889",.38,.66);
  const alloy = material("#b6c4c4",.39,.53);
  const graphite = material("#263641",.54,.51);
  const oxide = material("#87634e",.44,.56);
  const deep = material("#101821",.53,.48);
  const glass = material("#173d57",.27,.49);
  const cold = light("#91d7f6");
  const honey = light("#ffc586");
  const red = light("#fd614a");
  const irisWhite = light("#fbe1b6");
  const faces = new Map();

  function hullFinish() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const context = canvas.getContext("2d");
    const pixels = context.createImageData(256,256);
    let seed = 2952;
    for (let i=0;i<pixels.data.length;i+=4) {
      seed = (Math.imul(seed,1664525)+1013904223)>>>0;
      const y = Math.floor(i/1024);
      const grit = 118+(seed>>>28)*2+(y%3)*7;
      pixels.data[i] = pixels.data[i+1] = pixels.data[i+2] = grit;
      pixels.data[i+3] = 255;
    }
    context.putImageData(pixels,0,0);
    const texture = new T.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.repeat.set(1,3);
    for (const finish of [steel,alloy,oxide]) {
      finish.bumpMap = texture;
      finish.bumpScale = .013;
    }
  }
  hullFinish();

  function group(parent,x=0,y=0,z=0) {
    const result = new T.Group();
    result.position.set(x,y,z);
    parent.add(result);
    return result;
  }

  function mesh(parent,geometry,finish,x=0,y=0,z=0) {
    const object = new T.Mesh(geometry,finish);
    object.position.set(x,y,z);
    parent.add(object);
    return object;
  }

  function box(parent,finish,x,y,z,w,h,d) {
    const object = mesh(parent,boxGeo,finish,x,y,z);
    object.scale.set(w,h,d);
    return object;
  }

  function beam(parent,finish,a,b,r,flat=false) {
    const delta = b.clone().sub(a);
    const object = mesh(parent,flat ? boxGeo : pipeGeo,finish);
    object.position.copy(a).addScaledVector(delta,.5);
    object.quaternion.setFromUnitVectors(v(0,1,0),delta.clone().normalize());
    object.scale.set(r,delta.length(),r);
    return object;
  }

  function section(parent,finish,x,y,z,w,h,d,cut=.16) {
    const key = [w,h,d,cut].join("/");
    if (!faces.has(key)) {
      const x0 = w/2, y0 = h/2, shape = new T.Shape();
      shape.moveTo(-x0+cut,-y0);
      for (const [x,y] of [[x0-cut,-y0],[x0,-y0+cut],[x0,y0-cut],[x0-cut,y0],[-x0+cut,y0],[-x0,y0-cut],[-x0,-y0+cut]]) shape.lineTo(x,y);
      shape.closePath();
      const geometry = new T.ExtrudeGeometry(shape,{depth:d,steps:1,bevelEnabled:true,bevelSize:.035,bevelThickness:.04,bevelSegments:2});
      geometry.translate(0,0,-d/2);
      faces.set(key,geometry);
    }
    return mesh(parent,faces.get(key),finish,x,y,z);
  }

  function ring(parent,finish,r,t,x=0,y=0,z=0,arc=TAU) {
    const key = [r,t,arc].join("/");
    if (!rings.has(key)) rings.set(key,new T.TorusGeometry(r,t,8,Math.ceil(78*arc/TAU),arc));
    return mesh(parent,rings.get(key),finish,x,y,z);
  }

  let glowMap;
  function glow(parent,color,x,y,z,size,opacity=.65) {
    if (!glowMap) {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const context = canvas.getContext("2d");
      const gradient = context.createRadialGradient(64,64,0,64,64,64);
      gradient.addColorStop(0,"#ffffff");
      gradient.addColorStop(.18,"#ffffff80");
      gradient.addColorStop(.54,"#ffffff1a");
      gradient.addColorStop(1,"#ffffff00");
      context.fillStyle = gradient;
      context.fillRect(0,0,128,128);
      glowMap = new T.CanvasTexture(canvas);
    }
    const sprite = new T.Sprite(new T.SpriteMaterial({map:glowMap,color,opacity,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));
    sprite.position.set(x,y,z);
    sprite.scale.set(size,size,1);
    parent.add(sprite);
    return sprite;
  }

  function marking(parent,label,x,y,z,width,height,ink="#afbec7") {
    const image = document.createElement("canvas");
    image.width = 512;
    image.height = 128;
    const ctx = image.getContext("2d");
    ctx.fillStyle = ink;
    ctx.font = '600 80px monospace';
    ctx.textAlign = "center";
    ctx.fillText(label,256,96,485);
    const map = new T.CanvasTexture(image);
    map.colorSpace = T.SRGBColorSpace;
    map.anisotropy = 4;
    return mesh(parent,new T.PlaneGeometry(width,height),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false}),x,y,z);
  }

  function stationsLights(scene) {
    scene.add(new T.HemisphereLight("#d6e7ff","#344550",1.7));
    const key = new T.DirectionalLight("#fff0d7",3.3);
    key.position.set(12,18,11);
    scene.add(key);
    const rim = new T.DirectionalLight("#5ca5ff",2.65);
    rim.position.set(-13,-3,-12);
    scene.add(rim);
  }

  function makeDock(parent) {
    const dock = group(parent,0,-.77,3.05);
    for (const s of [-1,1]) {
      section(dock,deep,s*1.43,0,0,1.07,2.90,1.86,.32);
      section(dock,steel,s*1.44,0,.92,.8,2.70,.20,.33);
      section(dock,steel,0,s*1.2,.24,2.43,.40,1.76,.16);
    }
    section(dock,oxide,0,-1.05,1.30,2.48,.2,.16,.065);
    marking(dock,"OBS / 01",0,1.18,1.144,1.34,.26);
    const runway = group(dock,0,-.94,1.53);
    box(runway,graphite,0,0,.60,2.35,.16,2.1);
    const tracks = [];
    for (const s of [-1,1]) {
      section(dock,alloy,s*1.52,0,1.075,.27,1.85,.14,.085);
      beam(runway,oxide,v(s*1.04,.12,-.44),v(s*1.17,.12,1.63),.07,true);
      for (let i=0;i<8;i++) {
        tracks.push(box(runway,i%3===0?honey:cold,s*(1.08+i*.012),.16,-.36+i*.28,.055,.035,.13));
        box(runway,steel,s*.76,.09,-.36+i*.26,.22,.015,.021);
      }
      box(dock,cold,s*1.4,.72,1.18,.047,.24,.04);
      glow(dock,"#8ad8ed",s*1.39,.72,1.24,.52,.43);
    }

    for (let i=0;i<5;i++) {
      const z = 1-i*.38;
      section(dock,i%2?oxide:steel,0,1.0-i*.026,z,2.29,.12,.12,.045);
      box(dock,honey,0,.93-i*.026,z,.72,.021,.055);
      box(dock,i%2?oxide:steel,0,-.86+i*.026,z,2.21,.082,.33);
      box(dock,light("#bb7f57"),0,-.811+i*.026,z,.48,.016,.038);
      for (const s of [-1,1]) {
        box(dock,i%2?honey:irisWhite,s*(1.05-i*.035),.26,z,.035,1.26-i*.105,.055);
        box(dock,deep,s*(1.17-i*.035),0,z,.19,1.91-i*.12,.11);
        box(dock,oxide,s*1.02,-.39,z,.11,.19,.33);
      }
    }

    const shutters = [-1,1].map((s,index) => {
      const slide = group(dock,s*.545,0,1.16);
      slide.userData.movable = true;
      section(slide,graphite,0,0,0,1.08,1.89,.12,.15);
      section(slide,alloy,0,.16,.081,.79,1.38,.035,.16);
      section(slide,steel,0,-.1,.115,.71,1.11,.035,.14);
      box(slide,oxide,s*.17,-.68,.14,.43,.079,.043);
      box(slide,honey,-s*.44,0,.127,.026,1.05,.02);
      for (let i=0;i<5;i++) box(slide,deep,s*.14,-.22-i*.064,.143,.43,.017,.019);
      for (let i=0;i<3;i++) {
        const slash = box(slide,oxide,s*.16+(i-1)*.07,-.64,.168,.026,.116,.016);
        slash.rotation.z = -.60;
      }
      marking(slide,index ? "B" : "A",0,.24,.146,.28,.15,"#d3c9b5");
      return slide;
    });
    section(dock,light("#573827"),0,0,-.91,1.94,1.84,.12,.23);
    section(dock,oxide,0,.15,-.83,1.52,1.25,.08,.19);
    section(dock,light("#b58a63"),0,.15,-.75,1.34,1.13,.08,.16);
    box(dock,irisWhite,0,.54,-.67,1.16,.09,.1);
    const inside = glow(dock,"#ffc789",0,.43,-.58,1.85,0);
    const interior = new T.PointLight("#ffca96",11,5,2.3);
    interior.position.set(0,.45,-.32);
    dock.add(interior);
    function open(amount) {
      shutters.forEach((slide,i) => { slide.position.x = (i?1:-1)*(.545+.99*amount); });
      inside.material.opacity = amount*.61;
      interior.intensity = .9+amount*8.4;
    }
    tracks.forEach(item => { item.userData.movable = true; });
    function guide(time,amount=1) {
      tracks.forEach((track,index) => {
        track.material = amount < 1 && index%8 < Math.floor((time*3)%8) ? oxide : index%8%3===0?honey:cold;
      });
    }
    return {dock,open,guide};
  }

  function batchHull(station) {
    station.updateMatrixWorld(true);
    const groups = new Map();
    station.traverse(object => {
      if (!object.isMesh || object.material.transparent || object.userData.movable) return;
      for (let parent = object.parent; parent && parent !== station; parent = parent.parent) {
        if (parent.userData.movable) return;
      }
      const key = object.geometry.id + "/" + object.material.id;
      if (!groups.has(key)) groups.set(key,[]);
      groups.get(key).push(object);
    });
    const origin = station.matrixWorld.clone().invert();
    for (const objects of groups.values()) {
      if (objects.length < 4) continue;
      const {geometry,material} = objects[0];
      const batch = new T.InstancedMesh(geometry,material,objects.length);
      const matrix = new T.Matrix4();
      objects.forEach((object,index) => {
        batch.setMatrixAt(index,matrix.multiplyMatrices(origin,object.matrixWorld));
        object.removeFromParent();
      });
      batch.computeBoundingSphere();
      station.add(batch);
    }
  }

  function buildStation(scene) {
    const station = group(scene);
    const core = group(station,0,0,-.4);
    section(core,graphite,0,0,0,3.64,4.62,3.75,.63);
    section(core,alloy,0,2.05,.10,3.1,1.02,2.8,.24);
    section(core,deep,0,-2.0,-.05,2.7,1.08,3.3,.33);
    for (let i=0;i<10;i++) {
      const z = -1.62+i*.36;
      section(core,i%3?steel:alloy,0,.69,z,3.83,1.58,.085,.32);
      box(core,i%4?deep:cold,0,2.54,z,.48,.065,.17);
      for (const s of [-1,1]) {
        box(core,i%2?graphite:steel,s*1.94,.59,z,.095,.72,.14);
        box(core,i%3===0?honey:glass,s*1.985,.88,z,.042,.22,.16);
      }
    }
    for (const s of [-1,1]) {
      section(core,oxide,s*1.61,1.24,1.71,.41,1.16,.25,.15);
      beam(core,steel,v(s*.94,1.96,1.50),v(s*1.6,2.94,1.45),.14,true);
      beam(core,cold,v(s*.93,1.94,1.58),v(s*1.6,2.86,1.52),.025,true);
    }
    const lookout = group(core,0,1.32,1.94);
    section(lookout,steel,0,.02,0,2.55,1.14,.44,.26);
    section(lookout,deep,0,.08,.253,2.42,.79,.079,.24);
    section(lookout,glass,0,.11,.305,2.20,.58,.067,.19);
    box(lookout,oxide,0,-.205,.326,1.99,.05,.065);
    for (let pane=-4;pane<=4;pane++) {
      box(lookout,alloy,pane*.215,.11,.358,.017,.46,.054);
      box(lookout,pane%3===0?honey:cold,pane*.213,.031,.382,.088,.067,.014);
    }
    for (const s of [-1,1]) {
      section(core,alloy,s*1.54,.54,1.88,.36,.93,.24,.12);
      for (let slot=0;slot<4;slot++) box(core,slot%3===0?honey:graphite,s*1.54,.23+slot*.202,2.028,.15,.043,.037);
    }

    const halo = group(station,0,.21,-.55);
    halo.rotation.set(-.38,.14,-.18);
    const radius = 6.23;
    for (const z of [-.53,.53]) {
      ring(halo,graphite,radius,.24,0,0,z);
      ring(halo,alloy,radius+.16,.108,0,0,z);
      ring(halo,oxide,radius-.29,.052,0,0,z);
      ring(halo,light("#5d829c"),radius+.36,.018,0,0,z);
    }
    const tracer = ring(halo,steel,5.64,.1,0,0,-1.32,TAU*.74);
    tracer.rotation.z = .67;
    const lattice = ring(halo,oxide,5.48,.044,0,0,-1.42,TAU*.70);
    lattice.rotation.z = .74;
    for (let i=0;i<64;i++) {
      const theta = (i+.5)*TAU/64;
      const segment = group(halo,Math.cos(theta)*radius,Math.sin(theta)*radius,0);
      segment.rotation.z = theta-Math.PI/2;
      section(segment,i%8===0?oxide:i%4===0?steel:alloy,0,0,0,.532,.64,.98,.10);
      box(segment,graphite,0,.34,.02,.41,.081,.73);
      box(segment,deep,-.03,-.329,.04,.43,.052,.68);
      box(segment,i%8===0?honey:glass,0,-.36,.07,.31,.029,.50);
      box(segment,i%6===0?honey:cold,0,.034,.526,.32,.045,.027);
      box(segment,steel,0,.21,.522,.44,.057,.057);
      if (i%8===0) glow(segment,"#c1ddff",0,.08,.60,.46,.27);
    }
    for (let i=0;i<6;i++) {
      const theta = (i+.26)*TAU/6;
      const axis = v(Math.cos(theta),Math.sin(theta),0);
      const tangent = v(-axis.y,axis.x,0);
      for (const side of [-1,1]) {
        const a = axis.clone().multiplyScalar(1.54).addScaledVector(tangent,side*.53);
        const b = axis.clone().multiplyScalar(6.0).addScaledVector(tangent,side*.22);
        a.z = side*.46;
        b.z = side*.46;
        beam(halo,graphite,a,b,.28,true);
        beam(halo,steel,a.clone().add(v(0,0,.14)),b.clone().add(v(0,0,.14)),.095,true);
        for (let k=0;k<8;k++) {
          const p = a.clone().lerp(b,k/8);
          const q = a.clone().lerp(b,(k+.77)/8).addScaledVector(tangent,-side*.44);
          p.z += .07;
          q.z += .07;
          beam(halo,oxide,p,q,.061,true);
        }
      }
    }
    const walkway = light("#659eaf");
    for (let i=0;i<3;i++) {
      const theta = [2.45,3.86,5.31][i];
      const reach = [6.33,6.52,6.44][i];
      const annex = group(halo,Math.cos(theta)*reach,Math.sin(theta)*reach,0);
      annex.rotation.z = theta-Math.PI/2;
      section(annex,steel,0,.25,-.05,1.76,.91,1.33,.20);
      section(annex,alloy,0,.63,-.02,1.77,.24,1.39,.095);
      section(annex,glass,0,.1,.63,1.57,.42,.073,.15);
      section(annex,oxide,0,-.28,.01,1.52,.22,1.17,.09);
      for (let window=-3;window<=3;window++) {
        box(annex,steel,window*.19,.1,.68,.025,.39,.057);
        box(annex,window%3===0?honey:walkway,window*.19,.05,.70,.081,.045,.023);
        box(annex,graphite,window*.21,.764,.01,.14,.046,1.2);
      }
    }
    for (const s of [-1,1]) {
      const wing = group(station,s*(s===1?4.30:3.72),s===1?-2.45:-2.34,-1.95);
      wing.rotation.z = s*.12;
      wing.rotation.x = -.30;
      beam(wing,steel,v(-2.76,0,0),v(2.76,0,0),.16,true);
      for (let unit=-1;unit<=1;unit++) {
        const tile = group(wing,unit*1.63,0,0);
        box(tile,graphite,0,0,0,1.49,.13,1.87);
        box(tile,glass,0,.075,0,1.41,.029,1.77);
        for (let line=-4;line<=4;line++) box(tile,steel,line*.14,.099,0,.012,.017,1.74);
        for (let line=-3;line<=3;line++) box(tile,steel,0,.105,line*.24,1.4,.013,.013);
      }
      glow(wing,s===1?"#9fe4ff":"#ffa972",s*2.55,.12,0,.54,.61);
    }
    for (const s of [-1,1]) {
      const tower = group(station,s*2.38,2.48,-.36);
      beam(tower,steel,v(0,-1.5,0),v(s*1.02,1.57,-.45),.18,true);
      beam(tower,alloy,v(0,-1.03,.15),v(s*.72,1.23,-.22),.12,true);
      beam(tower,graphite,v(s*.55,.2,-.03),v(s*1.05,2.18,-.39),.053);
      glow(tower,"#ff704d",s*1.04,2.17,-.39,.41,.65);
      for (let i=0;i<6;i++) {
        const fin = box(tower,i%2?oxide:graphite,s*.24,-.76+i*.21,.12,.74,.085,1.08);
        fin.rotation.z = s*.25;
      }
    }
    const neck = group(station,0,-.62,1.22);
    section(neck,steel,0,0,0,2.24,1.9,1.6,.32);
    for (let i=0;i<5;i++) section(neck,i===4?oxide:deep,0,0,-.44+i*.28,2.34,1.99,.105,.32);
    const {dock,open,guide} = makeDock(station);

    const anchors = {
      story:v(-2.52,-1.25,3.05),
      research:v(-4.65,3.28,1.02),
      projects:v(4.61,3.11,.60),
      collection:v(4.76,-2.78,1.22)
    };
    const finishes = {story:honey,research:light("#a9ebd4"),projects:light("#e2b6ff"),collection:cold};
    for (const [id,anchor] of Object.entries(anchors)) {
      const {x,y,z} = anchor;
      box(station,finishes[id],x,y-.38,z,.46,.06,.048);
      glow(station,finishes[id].color,x,y-.38,z+.04,.53,.44);
    }
    batchHull(station);
    return {station,dock,open,guide,anchors};
  }

  function buildShip(scene) {
    const ship = group(scene);
    const hull = group(ship);
    const hullShape = (parent,finish,coords,depth,y) => {
      const shape = new T.Shape();
      coords.forEach(([x,z],index) => index?shape.lineTo(x,-z):shape.moveTo(x,-z));
      shape.closePath();
      const geometry = new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.065,bevelSize:.068,bevelSegments:2});
      const body = mesh(parent,geometry,finish,0,y,0);
      body.rotation.x = -Math.PI/2;
      return body;
    };
    hullShape(hull,steel,[[-.26,-1.84],[.26,-1.84],[.57,-.88],[.74,.64],[.48,1.11],[-.48,1.11],[-.74,.64],[-.57,-.88]],.30,.02);
    hullShape(hull,alloy,[[-.24,-1.55],[.24,-1.55],[.53,-.78],[.59,.57],[.39,.89],[-.39,.89],[-.59,.57],[-.53,-.78]],.105,.289);
    hullShape(hull,graphite,[[-.29,-1.49],[.29,-1.49],[.37,-.35],[.29,.63],[-.29,.63],[-.37,-.35]],.23,.32);
    hullShape(hull,glass,[[-.21,-1.38],[.21,-1.38],[.31,-.52],[.29,-.24],[-.29,-.24],[-.31,-.52]],.105,.53);
    const drive = [];
    for (const s of [-1,1]) {
      hullShape(hull,graphite,[[s*.45,-.89],[s*1.17,.05],[s*1.91,.77],[s*1.71,1.17],[s*.46,.84]],.09,.12);
      hullShape(hull,steel,[[s*.61,-.53],[s*1.14,.12],[s*1.72,.74],[s*1.52,.93],[s*.56,.68]],.077,.217);
      hullShape(hull,oxide,[[s*1.33,.41],[s*1.78,.78],[s*1.61,.97],[s*1.21,.78]],.05,.282);
      const fin = section(hull,steel,s*.91,.37,.77,.15,.68,.51,.064);
      fin.rotation.z = -s*.23;
      box(hull,graphite,s*.92,.19,-.05,.32,.073,.29);
      for (let n=0;n<5;n++) box(hull,deep,s*.91,.233,-.15+n*.047,.22,.02,.018);
      for (let n=0;n<3;n++) box(hull,n===2?cold:deep,s*.44,.391,.26+n*.10,.041,.024,.065);
      section(hull,graphite,s*.72,.01,.75,.40,.43,.76,.12);
      ring(hull,alloy,.15,.061,s*.72,.02,1.18);
      ring(hull,cold,.105,.028,s*.72,.02,1.245);
      drive.push(glow(hull,"#5dbdff",s*.72,.02,1.31,.81,.78));
      const plume = glow(hull,"#719fff",s*.72,.001,1.87,.6,.39);
      plume.scale.set(.42,.53,1);
      drive.push(plume);
      beam(hull,deep,v(s*.37,-.225,-.62),v(s*.44,-.26,.74),.12,true);
      beam(hull,steel,v(s*.26,-.12,-.32),v(s*.41,-.26,-.48),.074,true);
      box(hull,s<0?red:honey,s*1.705,.29,.73,.07,.035,.105);
      box(hull,cold,s*.28,.443,.65,.026,.016,.31);
      beam(hull,steel,v(s*.47,.14,.54),v(s*.74,.42,.95),.053,true);
    }
    section(hull,deep,0,.209,1.11,.71,.25,.09,.10);
    for (let n=-2;n<=2;n++) box(hull,n%2?steel:oxide,n*.08,.205,1.168,.024,.13,.018);
    marking(hull,"LY",0,.37,1.14,.33,.12);
    return { ship,drive };
  }

  function backdrop(scene,withSky=true) {
    const sphere = mesh(scene,new T.SphereGeometry(370,36,22),new T.ShaderMaterial({
      side:T.BackSide,depthWrite:false,
      uniforms:{image:{value:null},ready:{value:0}},
      vertexShader:`
        varying vec3 ray;
        void main(){ray=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
      `,
      fragmentShader:`
        varying vec3 ray;
        uniform sampler2D image;
        uniform float ready;
        float h(vec2 p) {return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        void main(){
          vec3 d=normalize(ray);
          vec2 u=vec2(atan(d.x,-d.z)/6.283185+.5,asin(d.y)/3.14159+.5);
          vec2 cell=u*vec2(1420.,740.);
          float rnd=h(floor(cell));
          float star=smoothstep(.17,0.,length(fract(cell)-.5))*pow(rnd,40.)*.8;
          vec3 bg=vec3(.019,.028,.054)+vec3(.05,.07,.12)*pow(max(0.,dot(d,normalize(vec3(.9,.22,-1.)))),22.);
          float horizon=length(vec2((d.x-.19)*1.26,d.y+.71))-.64;
          vec3 ocean=mix(vec3(.025,.067,.114),vec3(.094,.182,.244),smoothstep(-.13,-.04,horizon));
          vec3 fallback=mix(ocean,bg,smoothstep(-.008,.012,horizon));
          fallback+=vec3(.21,.35,.54)*exp(-abs(horizon)*186.)*.42;
          bg=mix(fallback,bg,ready);
          vec2 screen=vec2(.52+atan(d.x,-d.z)*.32,.47+d.y*.95);
          vec3 photograph=texture2D(image,clamp(screen,0.,1.)).rgb;
          float mask=smoothstep(0.,.11,screen.x)*smoothstep(0.,.11,1.-screen.x)*smoothstep(0.,.11,screen.y)*smoothstep(0.,.11,1.-screen.y);
          gl_FragColor=vec4(mix(bg+star,photograph*.80,mask*ready),1.);
        }
      `
    }));
    sphere.renderOrder = -2;
    if (withSky) new T.TextureLoader().load("assets/img/orbit-deep-space.webp",texture => {
      sphere.material.uniforms.image.value = texture;
      sphere.material.uniforms.ready.value = 1;
    },undefined,() => {});
    return sphere;
  }

  function rendererFor(canvas) {
    const renderer = new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = .99;
    return renderer;
  }

  window.Observatory = {buildStation,buildShip,stationsLights,backdrop,rendererFor};
})();
