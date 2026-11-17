(() => {
  "use strict";
  if (!window.THREE) return;
  const T = window.THREE;

  window.buildStation = scene => {
    const station = new T.Group();
    scene.add(station);
    const standard = (color, roughness = .55, metalness = .22) => new T.MeshStandardMaterial({ color, roughness, metalness });
    const lit = (color, intensity = 2.2) => new T.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: intensity, roughness: .42
    });
    const ceramic = standard("#e7e6d8", .42, .17);
    const shaded = standard("#8caaa9", .46, .31);
    const steel = standard("#26333b", .43, .55);
    const black = standard("#101720", .59);
    const copper = standard("#c26439", .48, .37);
    const amber = lit("#ff963c",5);
    const mint = lit("#43d3ae",3.7);
    const violet = lit("#9a69f0",3.5);
    const ice = lit("#58badf",3.5);
    const anchors = {};
    const details = {};
    const unit = new T.BoxGeometry(1,1,1);
    const sphere = new T.SphereGeometry(1,28,16);

    function mesh(parent, geometry, material, x, y, z) {
      const shape = new T.Mesh(geometry,material);
      shape.position.set(x,y,z);
      shape.castShadow = true;
      shape.receiveShadow = true;
      parent.add(shape);
      return shape;
    }
    function box(parent, w,h,d, x,y,z, material) {
      const shape = mesh(parent,unit,material,x,y,z);
      shape.scale.set(w,h,d);
      return shape;
    }
    function capsule(parent, radius,length, x,y,z, material) {
      return mesh(parent,new T.CapsuleGeometry(radius,length,5,12),material,x,y,z);
    }
    function ring(parent, radius, thick, x,y,z, material) {
      return mesh(parent,new T.TorusGeometry(radius,thick,9,58),material,x,y,z);
    }
    function pipe(parent, points, radius, material) {
      const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
      return mesh(parent,new T.TubeGeometry(curve,35,radius,7,false),material,0,0,0);
    }
    function bevel(w,h,d,cut) {
      const points = [[-w/2+cut,-h/2],[w/2-cut,-h/2],[w/2,-h/2+cut],[w/2,h/2-cut],
        [w/2-cut,h/2],[-w/2+cut,h/2],[-w/2,h/2-cut],[-w/2,-h/2+cut]];
      const face = new T.Shape(points.map(p => new T.Vector2(...p)));
      const geometry = new T.ExtrudeGeometry(face,{depth:d,bevelEnabled:true,bevelThickness:.035,bevelSize:.035,bevelSegments:2,steps:1});
      geometry.translate(0,0,-d/2);
      return geometry;
    }
    function glowTexture() {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      const context = canvas.getContext("2d");
      const gradient = context.createRadialGradient(64,64,0,64,64,63);
      gradient.addColorStop(0,"#ffffffc9");
      gradient.addColorStop(.24,"#ffffff63");
      gradient.addColorStop(.62,"#ffffff14");
      gradient.addColorStop(1,"#ffffff00");
      context.fillStyle = gradient;
      context.fillRect(0,0,128,128);
      return new T.CanvasTexture(canvas);
    }
    const bloom = glowTexture();
    function glow(parent, x,y,z, color, sizeX,sizeY, opacity, floor = false) {
      if (floor) {
        const panel = new T.Mesh(new T.PlaneGeometry(sizeX,sizeY),new T.MeshBasicMaterial({
          map:bloom,color,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity,toneMapped:false
        }));
        panel.position.set(x,y,z);
        panel.rotation.x = -Math.PI/2;
        parent.add(panel);
        return panel;
      }
      const sprite = new T.Sprite(new T.SpriteMaterial({map:bloom,color,transparent:true,blending:T.AdditiveBlending,depthWrite:false,opacity,toneMapped:false}));
      sprite.position.set(x,y,z);
      sprite.scale.set(sizeX,sizeY,1);
      parent.add(sprite);
      return sprite;
    }
    function label(text, materialColor, value) {
      const canvas = document.createElement("canvas");
      canvas.width = 512; canvas.height = 160;
      const context = canvas.getContext("2d");
      context.fillStyle = materialColor;
      context.fillRect(0,0,512,160);
      context.fillStyle = "#222a2c";
      context.font = "600 35px sans-serif";
      context.fillText(text,24,58);
      context.font = "700 58px monospace";
      context.fillText(value,23,130);
      context.fillRect(255,111,220,4);
      context.fillRect(411,90,64,6);
      const map = new T.CanvasTexture(canvas);
      map.colorSpace = T.SRGBColorSpace;
      return new T.MeshStandardMaterial({map,roughness:.79});
    }

    const base = mesh(station,bevel(11.3,5.45,.36,.52),steel,0,.06,0);
    base.rotation.x = -Math.PI / 2;
    const deck = mesh(station,bevel(10.94,5.11,.10,.49),black,0,.3,0);
    deck.rotation.x = -Math.PI / 2;
    box(station,8.7,.055,.055,0,.34,2.52,amber);
    box(station,7.7,.07,.06,-.4,.34,-2.35,ice);
    for (const side of [-1,1]) {
      box(station,.07,.07,3.35,side*5.47,.34,.02,ice);
      for (let i = 0; i < 8; i += 1) box(station,.14,.045,.45,side*(3.6+i*.21),.36,1.65,copper).rotation.y = -.32;
      for (let i = 0; i < 8; i += 1) box(station,.33,.12,.045,side*(.75+i*.55),.11,2.72,i%4?shaded:copper);
    }
    for (let i = -4; i <= 4; i += 1) box(station,.012,.015,.93,i*1.07,.355,1.94,steel);
    box(station,8.95,.18,.34,0,.48,-1.9,shaded);
    box(station,8.95,.048,.16,0,.58,-1.76,ice);

    function room(id, x,y,z, w,h, depth, lightMaterial, code) {
      const group = new T.Group();
      group.position.set(x,y,z);
      station.add(group);
      const shell = mesh(group,bevel(w,h,depth,.26),ceramic,0,0,0);
      mesh(group,bevel(w-.29,h-.27,.07,.18),black,0,0,depth/2+.035);
      box(group,w-.38,.047,.05,0,h/2-.17,depth/2+.1,lightMaterial);
      for (let i = 0; i < 9; i += 1) {
        box(group,w*.61,.012,.047,0,h/2+.042,-depth*.37+i*depth*.077,steel);
      }
      for (const side of [-1,1]) {
        box(group,.057,h*.67,depth*.67,side*(w/2+.03),-.02,-.025,shaded);
        for (let i=0;i<5;i+=1) box(group,.031,.039,depth*.47,side*(w/2+.065),-.27+i*.137,-.03,steel);
      }
      const color = lightMaterial.emissive;
      glow(group,0,h/2-.18,depth/2+.16,color,w,.42,.68);
      glow(station,x,.37,z+depth/2+.35,color,w*1.26,1.49,.49,true);
      const lamp = new T.PointLight(color,5.6,3.2,2);
      lamp.position.set(0,h/2-.19,depth/2+.46);
      group.add(lamp);
      box(group,w-.41,.085,.06,0,-h/2+.18,depth/2+.10,shaded);
      box(group,.075,h-.46,.055,-w/2+.15,0,depth/2+.08,copper);
      box(group,.21,h*.48,.07,w/2-.23,.06,depth/2+.08,steel);
      const sticker = mesh(group,new T.PlaneGeometry(.85,.265),label("LI YIN","#b4bdb2",code),-w/2+.61,-h/2+.39,depth/2+.12);
      sticker.castShadow = false;
      for (let i = 0; i < 6; i += 1) {
        box(group,.14,.055,.12,w/2-.47,-h/2+.35+i*.11,depth/2+.13,i%3===0?lightMaterial:shaded);
      }
      anchors[id] = new T.Vector3(x,y-h/2+.16,z+depth/2+.18);
      details[id] = { group,shell,depth,w,h };
      return { group,z:depth/2+.14 };
    }

    const journal = room("story",-.15,1.86,.6,3.48,2.71,1.79,amber,"01");
    const j = journal.group;
    const jz = journal.z;
    mesh(j,bevel(2.28,1.62,.08,.21),copper,-.1,.16,jz+.035);
    mesh(j,bevel(2.10,1.44,.08,.18),black,-.1,.16,jz+.09);
    ring(j,.55,.042,-.1,.18,jz+.17,amber);
    ring(j,.66,.019,-.1,.18,jz+.18,shaded);
    ring(j,.38,.009,-.1,.18,jz+.2,amber);
    const iris = mesh(j,new T.IcosahedronGeometry(.28,1),copper,-.1,.18,jz+.22);
    const irisCore = mesh(iris,sphere,amber,0,0,0);
    irisCore.scale.setScalar(.115);
    glow(j,-.1,.18,jz+.36,"#ffa348",1.15,1.15,.37);
    const shutters = [-1,1].map(side => {
      const shutter = mesh(j,bevel(.69,.87,.095,.13),steel,-.1+side*.355,.18,jz+.35);
      box(shutter,.31,.029,.035,0,.07,.050,copper);
      box(shutter,.14,.028,.043,-side*.19,-.12,.05,amber);
      return shutter;
    });
    for (let i = 0; i < 12; i += 1) {
      const a = i*Math.PI/6;
      const dash = box(j,.10,.024,.05,-.1+Math.cos(a)*.71,.18+Math.sin(a)*.71,jz+.17,i%3===0?amber:shaded);
      dash.rotation.z = a;
    }
    box(j,1.68,.13,.15,0,-.67,jz+.21,steel);
    for (let i = 0; i < 10; i += 1) box(j,.11,.025,.14,-.67+i*.146,-.60,jz+.22,i%3===0?amber:ceramic);
    pipe(j,[[-1.58,1.24,-.78],[-1.8,1.35,-.73],[-1.85,1.35,.55],[-1.7,1.24,.8]],.055,copper);

    const lab = room("research",-3.69,1.36,.13,2.72,1.83,2.22,mint,"02");
    const l = lab.group;
    for (const x of [-.77,-.11,.55]) {
      const tank = mesh(l,new T.CylinderGeometry(.235,.235,.94,22),standard("#2b6363",.25,.36),x,.05,lab.z+.17);
      tank.material.emissive.set("#2c8178");
      tank.material.emissiveIntensity = .42;
      for (const y of [-.43,.53]) mesh(l,new T.CylinderGeometry(.28,.28,.095,22),ceramic,x,y,lab.z+.17);
      for (let i = 0; i < 4; i += 1) box(l,.27,.022,.06,x,-.23+i*.15,lab.z+.397,mint);
    }
    pipe(l,[[-1.17,.86,-.74],[-1.12,1.06,-.49],[1.02,1.06,-.49],[1.10,.86,.05]],.055,shaded);

    const projects = room("projects",3.57,1.38,-.18,2.90,1.87,2.42,violet,"03");
    const g = projects.group;
    for (let i = 0; i < 4; i += 1) {
      const x = -.96+i*.53;
      box(g,.40,.96,.22,x,.02,projects.z,steel);
      for (let s = 0; s < 6; s += 1) {
        const y = -.35+s*.144;
        box(g,.32,.071,.058,x,y,projects.z+.129,shaded);
        box(g,.065,.021,.027,x+.11,y,projects.z+.168,(s+i)%3?violet:amber);
      }
    }

    const archive = room("collection",2.57,2.91,-1.21,2.3,1.18,1.34,ice,"04");
    const a = archive.group;
    for (let i = 0; i < 3; i += 1) {
      const x = -.63 + i*.54;
      box(a,.38,.57,.22,x,.02,archive.z,shaded);
      box(a,.25,.37,.055,x,.05,archive.z+.14,steel);
      box(a,.045,.16,.04,x,.03,archive.z+.18,ice);
    }
    box(station,2.94,.17,1.93,2.65,2.24,-1.1,steel);
    box(station,2.9,.05,.085,2.65,2.31,-.12,ice);

    const tower = new T.Group();
    tower.position.set(-2.68,.35,-1.45);
    station.add(tower);
    box(tower,.9,3.17,.82,0,1.59,0,steel);
    box(tower,.65,2.86,.68,0,1.65,0,ceramic);
    box(tower,.11,2.76,.07,.15,1.66,.37,ice);
    for (let i=0;i<7;i+=1) box(tower,.27,.085,.06,-.12,.65+i*.35,.37,i%3?shaded:copper);
    const dishPivot = new T.Group();
    dishPivot.position.set(0,3.44,0);
    dishPivot.rotation.set(-.38,.18,.18);
    tower.add(dishPivot);
    ring(dishPivot,.52,.065,0,0,0,ceramic);
    ring(dishPivot,.37,.016,0,0,.07,ice);
    for (let i=0;i<3;i+=1) box(dishPivot,.045,.96,.04,0,0,.03,steel).rotation.z = i*Math.PI/3;
    capsule(dishPivot,.10,.35,0,0,.13,copper).rotation.x = Math.PI/2;
    box(tower,.07,.64,.07,-.5,3.26,-.16,copper);
    mesh(tower,sphere,amber,-.5,3.61,-.16).scale.setScalar(.075);

    const drone = new T.Group();
    station.add(drone);
    mesh(drone,bevel(1.06,.26,.61,.11),ceramic,0,0,0);
    const canopy = mesh(drone,sphere,black,0,.11,.055);
    canopy.scale.set(.40,.20,.32);
    box(drone,.76,.035,.055,0,.01,.33,ice);
    for (const side of [-1,1]) {
      mesh(drone,bevel(.58,.13,.45,.09),steel,side*.67,-.055,0);
      box(drone,.25,.04,.17,side*.7,-.118,.09,ice);
      box(drone,.13,.081,.30,side*.48,.04,-.14,copper);
    }
    glow(drone,0,-.075,.24,"#70cfff",1.02,.55,.59);
    for (let i=0;i<10;i+=1) {
      const x=-4.65+i*1.04;
      box(station,.055,.045,.095,x,.36,2.21,ice);
    }
    const key = new T.DirectionalLight("#ffe0b5",3.25);
    key.position.set(-4.5,8,6);
    key.castShadow = true;
    key.shadow.mapSize.set(1024,1024);
    Object.assign(key.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.5,far:25});
    key.shadow.bias = -.00045;
    key.shadow.normalBias = .026;
    scene.add(key,new T.HemisphereLight("#bedcff","#514447",1.12));
    const rim = new T.DirectionalLight("#8eb8fe",2.15);
    rim.position.set(2,4,-5);
    scene.add(rim);
    const ground = mesh(scene,new T.PlaneGeometry(180,180),standard("#182229",.81,.12),0,-.34,0);
    ground.rotation.x = -Math.PI/2;
    ground.castShadow = false;
    scene.fog = new T.FogExp2("#101924",.020);
    const grid = new T.GridHelper(70,56,"#4f6469","#42555d");
    grid.position.y = -.33;
    grid.material.transparent = true;
    grid.material.opacity = .19;
    scene.add(grid);
    glow(scene,-4,-.325,-2,"#305f86",17,14,.23,true);
    glow(scene,3,-.323,3,"#9d653e",13,8,.16,true);

    return { anchors,details,drone,iris,shutters,dishPivot };
  };
})();
