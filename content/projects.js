window.SITE_PROJECTS = [
  /* === [可替换] 项目记录。真实项目使用 sample: false，可在工作台项目库展示。 === */
  {
    id: "my-personal-space",
    sample: false,
    title: "My Personal Space",
    category: "个人网站",
    description: "从一间工作台出发，进入研究室、自叙帖、项目库和收藏室。你现在正在浏览的就是这个项目。",
    tags: ["HTML", "CSS", "JavaScript", "Canvas"],
    deskPreview: "assets/img/universe-projects.webp",
    image: {
      url: "assets/img/personal-space-project-current.webp",
      alt: "My Personal Space 工作台实屏。主屏显示李银的欢迎语，两侧通往研究室和项目库，右侧的机器人旁是收藏室入口。"
    },
    credit: { label: "工作台实屏", href: "experience.html#desk" },
    sections: [
      {
        title: "从工作台出发",
        text: "访客先站在程序员身后。主屏显示我的欢迎语和《因果还是宿命？》，侧屏通往研究室和项目库。收藏室从桌边的小机器人进入，也可以通过站内航图直接前往。手机竖屏另用一个镜头，把这几个入口和人物都留在画面里。"
      },
      {
        title: "两种可探索的演示",
        text: "海岸城从同一个街角分出两条路线，回访时可以核对地标。机器人训练场在同一张网格上改变通道条件，网页重新计算最短路线。"
      },
      {
        title: "落镜时的取舍",
        text: "开场镜头推进后停在原画上。尝试过在固定画面里继续合成手部动作，实屏出现重影，于是把落镜后的变化留给屏框、反光和入口反馈。"
      }
    ],
    relatedNote: "building-my-personal-space",
    links: { source: null, demo: "experience.html#desk" }
  },
  {
    id: "image-palette",
    sample: true,
    featured: true,
    title: "图像色卡",
    category: "浏览器工具",
    description: "从一张照片里提取五种代表色，排成一张可以保存的配色卡。",
    workroomVisual: "swatches",
    workroomDemo: {
      image: "assets/img/world-field-harbor.webp",
      colors: ["#17262A", "#4D706E", "#66A3C8", "#A8BE6A", "#E7CBA1"]
    },
    tags: ["JavaScript", "Canvas", "PNG"],
    image: {
      url: "https://images.unsplash.com/photo-1670786444550-26528a980bc5",
      widths: [440, 720, 1120],
      sizes: "(max-width: 768px) 90vw, 48vw",
      alt: "冰岛冰川湖，冷蓝色浮冰散在水面上，远处是积雪的山"
    },
    credit: {
      label: "示例配图 · Audric Wonkam / Unsplash",
      href: "https://unsplash.com/photos/a-body-of-water-surrounded-by-ice-and-snow-covered-mountains-Pwqk1Cp6vaU"
    },
    preview: {
      label: "一张照片，五种颜色",
      colors: ["#17232d", "#324957", "#688da1", "#a9c3d1", "#edf3f4"]
    },
    sections: [
      {
        title: "问题",
        text: "看到喜欢的照片时，截图可以保留整张图，却很难直接拿到一组可用的颜色。这个工具的示例流程把照片和代表色放在一张卡里，方便在下一次做网页时查找。"
      },
      {
        title: "从输入到输出",
        text: "把图片按原比例缩到便于采样的尺寸，在 Canvas 中读像素。忽略透明区，把接近的颜色归到同一组，再选出面积较大的五组。预览区显示照片、色块和十六进制色值，导出为一张 PNG。"
      },
      {
        title: "设计取舍",
        text: "取样过程留在浏览器里。默认分组尽量保留不同亮度的颜色，用户也可以手动补一个画面里面积很小但很重要的点缀色。纯色图可以只返回一组，避免为了凑数制造相近的颜色。"
      }
    ],
    relatedNote: "image-color-sampling",
    links: { source: null, demo: null }
  },
  {
    id: "corner-map",
    sample: true,
    title: "转角地图",
    category: "地图实验",
    description: "把散步路线整理成一张可打印的小图，标出楼梯、遮阴和可以停一下的地方。",
    workroomVisual: "route",
    tags: ["GeoJSON", "SVG", "CSS Print"],
    image: {
      url: "https://images.unsplash.com/photo-1636736535090-e50adc27d772",
      widths: [480, 800, 1200],
      sizes: "(max-width: 768px) 90vw, 45vw",
      alt: "夹在老房屋之间、向上延伸的窄石阶"
    },
    credit: {
      label: "示例配图 · Manuel Torres Garcia / Unsplash",
      href: "https://unsplash.com/photos/a-narrow-alleyway-with-stone-steps-leading-up-to-a-building-8rxUcZsVwGM"
    },
    sections: [
      {
        title: "问题",
        text: "手机地图适合查询目的地，出门前的纸质路线却要回答另一批问题：坡从哪里开始、哪一段适合休息、绕一点路能不能避开台阶。"
      },
      {
        title: "从输入到输出",
        text: "把一条 GeoJSON 线和带备注的地点投到同一张 SVG 上。保留转弯附近的路名、图例和比例尺。网页中可以浏览完整路线，打印时将路线与说明排在同一页。"
      },
      {
        title: "设计取舍",
        text: "一张图只覆盖一段短步行路线。文字用编号连到图外的说明，缩小到半张纸后仍然容易找。发布示例使用虚构坐标和地点名称。"
      }
    ],
    relatedNote: "route-on-paper",
    links: { source: null, demo: null }
  },
  {
    id: "type-proof",
    sample: true,
    title: "留白校样",
    category: "排版实验",
    description: "让一段中英混排文字同时出现在两栏，对照行宽、标点和段落留白如何影响阅读。",
    workroomVisual: "type-proof",
    tags: ["CSS Grid", "CSS Custom Properties", "JavaScript"],
    image: {
      url: "https://images.unsplash.com/photo-1573591276084-47884b4335f4",
      widths: [480, 800, 1200],
      sizes: "(max-width: 768px) 90vw, 45vw",
      alt: "摊开的一本书，纸面弧度在暗色桌面上形成柔和阴影"
    },
    credit: {
      label: "示例配图 · Artis Kančs / Unsplash",
      href: "https://unsplash.com/photos/opened-book-LrJOULe72zU"
    },
    sections: [
      {
        title: "问题",
        text: "同一个字号看起来合适，两段不同语言的文字却可能有完全不同的密度。频繁在设置里切换参数，容易把上一版的阅读感觉忘掉。"
      },
      {
        title: "从输入到输出",
        text: "输入同一段文本，两栏分别调整每行字数、行高和段间距。桌面并排对照，手机依次展示。每栏以实际可读正文作校样，控件旁直接显示所用的值。"
      },
      {
        title: "设计取舍",
        text: "每次改一个变量，两个样本的正文和段落顺序保持一致。状态通过 CSS 自定义属性传给校样区，避免控件与样式各保存一份参数。"
      }
    ],
    relatedNote: "typesetting-by-measure",
    links: { source: null, demo: null }
  }
];
