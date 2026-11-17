window.mountRobotStudy = ({ controls,map,result,note }) => {
  const { columns,rows,start,goal,shelves,conditions } = window.ROBOTICS_STUDY;
  const context = map.getContext("2d");
  const cell = Math.min((map.width-40)/columns,(map.height-30)/rows);
  const marginX = (map.width-columns*cell)/2;
  const marginY = (map.height-rows*cell)/2;
  const buttons = [];
  const key = ([x,y]) => y*columns+x;

  function shortestRoute(blocked) {
    if (blocked.has(key(start)) || blocked.has(key(goal))) return [];
    const queue = [start];
    const previous = new Map([[key(start),null]]);
    for (let cursor=0;cursor<queue.length;cursor++) {
      const point = queue[cursor];
      const [x,y] = point;
      if (key(point) === key(goal)) {
        const route = [];
        for (let step=point;step;step=previous.get(key(step))) route.push(step);
        return route.reverse();
      }
      for (const [nx,ny] of [[x+1,y],[x,y+1],[x,y-1],[x-1,y]]) {
        const next = [nx,ny];
        const id = key(next);
        if (nx<0 || nx>=columns || ny<0 || ny>=rows || blocked.has(id) || previous.has(id)) continue;
        previous.set(id,point);
        queue.push(next);
      }
    }
    return [];
  }

  function drawMap(condition,route) {
    if (!context) return;
    context.fillStyle = "#0e222b";
    context.fillRect(0,0,map.width,map.height);
    const center = ([x,y]) => [marginX+(x+.5)*cell,marginY+(y+.5)*cell];
    context.strokeStyle = "#3e6268";
    context.lineWidth = 1;
    for (let y=0;y<rows;y++) {
      for (let x=0;x<columns;x++) {
        context.strokeRect(marginX+x*cell,marginY+y*cell,cell,cell);
      }
    }
    for (const [cells,color] of [[shelves,"#31525b"],[condition.blocks,"#966752"]]) {
      context.fillStyle = color;
      for (const point of cells) {
        const [x,y] = center(point);
        context.fillRect(x-cell*.42,y-cell*.42,cell*.84,cell*.84);
      }
    }
    if (route.length) {
      context.beginPath();
      route.forEach((point,index) => {
        const [x,y] = center(point);
        if (index) context.lineTo(x,y);
        else context.moveTo(x,y);
      });
      context.lineWidth = 6;
      context.lineJoin = "round";
      context.strokeStyle = "#9bf4d4";
      context.stroke();
    }
    context.font = '600 23px "Microsoft YaHei",sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    for (const [point,label] of [[start,"起"],[goal,"终"]]) {
      const [x,y] = center(point);
      context.fillStyle = "#cfefdf";
      context.beginPath();
      context.arc(x,y,22,0,Math.PI*2);
      context.fill();
      context.fillStyle = "#12352f";
      context.fillText(label,x,y+1);
    }
  }

  function selectCondition(index) {
    const condition = conditions[index];
    const route = shortestRoute(new Set([...shelves,...condition.blocks].map(key)));
    const label = route.length ? "最短路线 " + (route.length-1) + " 步" : "当前不可达";
    buttons.forEach((button,i) => button.setAttribute("aria-pressed",String(i===index)));
    map.setAttribute("aria-label",condition.name + "的仓库路线图，" + label);
    result.textContent = label;
    result.dataset.reachable = String(route.length>0);
    note.textContent = condition.note;
    drawMap(condition,route);
  }
  for (const [index,condition] of conditions.entries()) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "field-button";
    button.textContent = condition.name;
    button.addEventListener("click",() => selectCondition(index));
    controls.append(button);
    buttons.push(button);
  }
  selectCondition(0);
};

(() => {
  const controls = document.querySelector("#robot-conditions");
  if (controls) window.mountRobotStudy({
    controls,map:document.querySelector("#robot-map"),
    result:document.querySelector("#robot-result"),note:document.querySelector("#robot-note")
  });
})();
