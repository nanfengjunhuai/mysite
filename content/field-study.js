window.WORLD_FIELD_STUDY = {
  /* === [可替换] 海岸城路线与观察提示 === */
  start: {
    title: "石拱岔路",
    image: "assets/img/workroom-worlds.webp",
    alt: "旅人站在石拱下，左边的石路通往海湾，右边沿山而上。路牌和带圆环的高塔在前方。",
    crop: "51% 53%",
    description: "记住头顶的石拱、前方的路牌和远处的环形塔。选一条路，看看转过弯后能走到哪里。"
  },
  routes: [
    {
      id: "harbor",
      label: "沿石阶下到海湾",
      title: "灯塔码头",
      image: "assets/img/world-field-harbor.webp",
      portrait: "assets/img/world-field-harbor-portrait.webp",
      approach: "assets/img/world-walk-harbor.webp",
      approachCrop: "51% 56%",
      alt: "旅人来到海湾的石砌码头，灯塔立在水边，远处是跨过海湾的长拱桥。",
      crop: "51% 53%",
      description: "下到水边，灯塔从远景变成了眼前的建筑。刚才只露出一截的长拱桥，现在能沿着海湾看完整。",
      landmarks: [
        { title: "灯塔", at: [.490,.421], portrait: [.639,.353], detail: "灯塔立在伸入海湾的堤头。从这里抬头看，山脊观景台在海湾对面。" },
        { title: "长拱桥", at: [.730,.438], portrait: [.790,.294], detail: "桥墩沿水面排开，靠近码头的一段被灯塔挡住。上到山脊后，能看见桥是怎样绕过海湾的。" }
      ]
    },
    {
      id: "ridge",
      label: "沿山路走向高处",
      title: "山脊观景台",
      image: "assets/img/world-field-ridge.webp",
      portrait: "assets/img/world-field-ridge-portrait.webp",
      approach: "assets/img/world-walk-ridge.webp",
      approachCrop: "57% 55%",
      alt: "旅人站在山脊的石栏前，前方是环形塔，脚下的屋顶一路延伸到海湾。",
      crop: "56% 52%",
      description: "沿山路抬高视线，环形塔成了近处的地标。往海湾看，码头又变成了城市边缘的一小段。",
      landmarks: [
        { title: "环形塔", at: [.701,.329], portrait: [.788,.273], detail: "在石拱下只能看到塔尖和一段圆环。这里能分辨出圆环的外缘，以及它与塔身的距离。" },
        { title: "海湾", at: [.482,.526], portrait: [.406,.405], detail: "从这一侧看回去，刚才走过的码头沿着海湾的边缘展开，长拱桥把水岸两端接到一起。" }
      ]
    }
  ],
  revisit: "回到石拱下，路牌和环形塔还在原来的位置。换一条路，再看一次这座城。",
  compared: "两条路都走过了。现在可以核对石拱、路牌和环形塔在起点画面里的位置。",
  landmarks: [
    { title: "石拱", x: .235, y: .142, detail: "石拱从左侧墙面伸向头顶，藤叶和暖色灯标出街口的上沿。" },
    { title: "路牌", x: .548, y: .451, detail: "路牌立在岔路中间的矮墙边。它左侧下到海湾，右侧沿山路抬高。" },
    { title: "环形塔", x: .724, y: .23, detail: "环形塔在海湾对岸。从岔路口只能远望，上到山脊以后，塔身和外侧圆环更清楚。" }
  ]
};
