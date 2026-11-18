(() => {
  "use strict";

  const layout = [
    {id:"desk", x:.49,y:.52,note:"从显示器进入各个舱室。"},
    {id:"story",x:.25,y:.32,note:"生活记录和夜空短片。"},
    {id:"research",x:.72,y:.28,note:"世界模型与开放世界游戏的观察记录。"},
    {id:"projects",x:.75,y:.72,note:"在机房看作品及实现过程。"},
    {id:"collection",x:.24,y:.72,note:"收藏的影像、语录和资料。"}
  ];

  window.createStationAtlas = ({dialog,trigger,scenes,imageFor,current,navigate}) => {
    const map=dialog.querySelector(".atlas-map");
    const preview=dialog.querySelector(".atlas-window img");
    const name=dialog.querySelector("#atlas-room-name");
    const note=dialog.querySelector(".atlas-room-info p");
    const entry=dialog.querySelector("#atlas-enter");
    const status=dialog.querySelector("#atlas-location");
    const exterior=dialog.querySelector(".atlas-orbit");
    const nodes=new Map();
    const links=new Map();
    let selected;
    let origin;
    let restoring=true;

    function position(node,x,y) {
      node.style.setProperty("--pin-x",x*100+"%");
      node.style.setProperty("--pin-y",y*100+"%");
    }

    function select(id,focus=false) {
      selected=id;
      const scene=scenes[id];
      name.textContent=scene.name;
      note.textContent=layout.find(room=>room.id===id).note;
      preview.alt=scene.alt;
      preview.src=imageFor(scene);
      dialog.style.setProperty("--atlas-light",scene.color);
      if (id===origin) entry.textContent="回到"+scene.name;
      else entry.textContent="进入"+scene.name;
      for (const [key,node] of nodes) node.setAttribute("aria-pressed",String(key===id));
      for (const [key,line] of links) line.toggleAttribute("data-selected",key===id);
      if (focus) nodes.get(id).focus({preventScroll:true});
    }
    const base=layout[0];
    for (const item of layout) {
      if (item!==base) {
        const link=document.createElement("div");
        link.className="atlas-link";
        position(link,item.x,item.y);
        link.style.setProperty("--base-x",base.x*100+"%");
        link.style.setProperty("--base-y",base.y*100+"%");
        link.dataset.side=item.x<base.x?"left":"right";
        link.dataset.vertical=item.y<base.y?"upper":"lower";
        link.setAttribute("aria-hidden","true");
        map.append(link);
        links.set(item.id,link);
      }
      const pin=document.createElement("button");
      pin.type="button";
      pin.className="atlas-node";
      pin.dataset.atlasRoom=item.id;
      pin.textContent=scenes[item.id].name;
      position(pin,item.x,item.y);
      pin.addEventListener("click",()=>select(item.id));
      map.append(pin);
      nodes.set(item.id,pin);
    }
    map.addEventListener("keydown",event=>{
      const focused=event.target.closest(".atlas-node");
      const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[event.key];
      if (!focused || !direction) return;
      event.preventDefault();
      const from=layout.find(item=>item.id===focused.dataset.atlasRoom);
      const [dx,dy]=direction;
      let closest,score=Infinity;
      for (const item of layout) {
        const x=item.x-from.x,y=item.y-from.y;
        const forward=x*dx+y*dy;
        if (forward<=.02) continue;
        const sideways=x*dy-y*dx;
        const cost=forward+1.8*Math.abs(sideways);
        if (cost<score) {closest=item;score=cost;}
      }
      if (closest) select(closest.id,true);
    });
    trigger.addEventListener("click",()=>{
      if (dialog.open) return;
      origin=current();
      restoring=true;
      status.textContent="当前位置 · "+scenes[origin].name;
      exterior.href="world.html?return="+encodeURIComponent(origin);
      for (const [id,node] of nodes) {
        if(id===origin) node.setAttribute("aria-current","location");
        else node.removeAttribute("aria-current");
      }
      select(nodes.has(origin)?origin:"research");
      dialog.showModal();
      nodes.get(selected).focus({preventScroll:true});
    });
    entry.addEventListener("click",()=>{
      if (selected===origin) { dialog.close(); return; }
      restoring=false;
      dialog.close();
      navigate(selected);
    });
    dialog.addEventListener("close",()=>{
      if (!dialog.open && restoring) trigger.focus({preventScroll:true});
    });
  };
})();
