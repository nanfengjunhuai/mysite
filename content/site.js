window.SITE_CONTENT = {
  /* === [可替换] 站名与全局导航 === */
  name: "近岸",
  /* === [可替换] 个人空间标题与自叙帖开场 === */
  workroom: {
    title: "My Personal Space",
    author: "李银",
    intro: "您好，我是李银，欢迎来到我的空间。",
    /* === [可替换] 夜空短片章节。时间以秒为单位，按播放顺序排列。 === */
    nightFilmChapters: [
      { title: "树影", time: 0, image: "assets/img/story-night-poster.webp" },
      { title: "星轨", time: 3, image: "assets/img/story-night-trails.webp" },
      { title: "银河", time: 7, image: "assets/img/story-night-milky-way.webp" },
      { title: "雪地极光", time: 11.35, image: "assets/img/story-night-aurora.webp" }
    ]
  },
  navigation: [
    { label: "作品", href: "projects.html", page: "projects" },
    { label: "笔记", href: "blog.html", page: "notes" },
    { label: "关于", href: "about.html", page: "about" },
    { label: "联系", href: "about.html#contact", page: "contact" }
  ],
  interface: {
    navigation: "主导航",
    home: "{name}首页",
    appearance: "外观",
    menu: "菜单",
    skip: "跳到正文",
    toLight: "浅色",
    toDark: "深色",
    themeLabel: "切换至{theme}主题",
    motion: "动效",
    motionOn: "关闭动效",
    motionOff: "开启动效",
    motionReduced: "已按系统设置减少动效",
    openMenu: "打开导航",
    closeMenu: "关闭导航",
    backToTop: "返回顶部",
    sample: "示例内容，待替换",
    projectSample: "示例项目，待替换",
    allProjects: "全部作品",
    projectDetail: "查看项目",
    backProjects: "返回作品列表",
    allNotes: "全部笔记",
    backNotes: "返回笔记列表",
    aboutLink: "了解更多",
    source: "项目源码",
    demo: "在线演示",
    pending: "待填写",
    contents: "文章目录",
    relatedNote: "相关笔记",
    relatedProject: "相关作品",
    readImplementation: "读实现笔记",
    notFound: "这条内容暂时找不到",
    notFoundDescription: "可以返回列表，继续浏览其他内容。"
  },

  /* === [可替换] 首页场景、版块与互动预览文案 === */
  world: {
    title: "临潮站",
    callsign: "NEARSHORE / TIDE STATION",
    label: "个人站点 · 示例署名",
    intro: "做网页和小工具。这里收着它们的成品、实现笔记，以及最近在想的事。",
    enter: "沿站台往下",
    returnTo: "返回临潮站",
    image: {
      url: "assets/img/coast-threshold.webp",
      width: 1672,
      height: 941,
      alt: "潮汐平原上的未来海岸站，巨大的银色环门与蓝色天空倒映在浅水里"
    },
    observatory: {
      url: "assets/img/coast-observatory.webp",
      width: 1672,
      height: 941,
      alt: "临海观测室里，戴着蓝色镜片的 ECHO 面朝落地窗外的海面",
      label: "ECHO / 驻站向导",
      line: "潮位正在下降，前面是日志和观测记录。"
    },
    workshop: {
      title: "手边的工具",
      label: "01 / SELECTED WORK",
      description: "三个小实验，分别从一张照片、一段步行路线和两栏文字开始。",
      details: "展开实现记录",
      palette: "图片取色台",
      colors: ["#0C1C36", "#274366", "#305CA3", "#889DB9", "#DFD1C2"],
      upload: "从本机选图",
      reset: "恢复示例",
      ready: "点击色块复制色值。图像在当前浏览器处理。",
      working: "正在采样图像",
      failed: "这张图片无法读取，请试试 PNG、JPEG 或 WebP。",
      copied: "已复制 {value}",
      selected: "色值 {value}"
    },
    journal: { title: "制作笔记", label: "02 / FIELD NOTES", description: "记录做工具时遇到的具体问题。还有几篇写在离开屏幕后。" },
    profile: { title: "关于近岸", label: "03 / THE AUTHOR" },
    map: {
      label: "一段示例步行路线",
      stops: [
        { name: "街口", detail: "0 m · 从路口的长椅旁出发。" },
        { name: "石阶", detail: "180 m · 十二级台阶，下雨时容易打滑。" },
        { name: "树荫", detail: "420 m · 路线止于有树荫的空地。" }
      ]
    },
    type: {
      label: "排版校样预览",
      sample: "一段文字放在屏幕上，会先遇到它所在的那一行。The line is the first thing the eye meets.",
      options: [{ id: "open", label: "舒展" }, { id: "tight", label: "紧凑" }]
    },
    places: [
      { id: "workshop", title: "手边的工具", x: 59, y: 57 },
      { id: "tower", title: "制作笔记", x: 64, y: 42 },
      { id: "cabin", title: "关于近岸", x: 72, y: 62 }
    ]
  },

  /* === [可替换] 作品与笔记入口文案 === 作品见 projects.js，正文见 notes.js === */
  projects: {
    title: "作品",
    featuredTitle: "作品图册",
    description: "浏览器工具、地图和排版实验。每件作品记录它要解决的问题，以及实现时做过的取舍。"
  },
  notes: {
    title: "笔记",
    recentTitle: "制作笔记",
    description: "大多记下制作时遇到的问题，偶尔写一写离开屏幕后留意到的事。",
    personalTitle: "一篇随笔",
    filters: { all: "全部", technical: "技术笔记", personal: "随笔" },
    filterLabel: "按体裁筛选",
    count: "共 {count} 篇",
    time: "约 {minutes} 分钟",
    empty: "这个分类暂时没有笔记。"
  },

  /* === [可替换] 自我介绍、身份标签与时间轴 === 示例内容，待替换 === */
  about: {
    title: "关于",
    short: "想用代码做些能放在手边的小工具。这里记录作品从草图到可用版本的过程，也留一点地方给散步和读书。",
    description: "我喜欢从一个有边界的问题开始：怎样从一张照片里挑出几种可用的颜色，一条路线怎么缩进半张纸。把想法做成能试用的东西之后，再回头看哪些决定值得记下来。",
    interests: "离开屏幕之后，会留意步行路线、二手书页边的批注，以及街道入夜前后的声音。它们偶尔也会成为小项目的起点。",
    tags: ["前端探索", "小型工具", "散步与阅读"],
    timelineTitle: "时间轴",
    timeline: [
      { label: "现在", title: "整理作品的第一版", text: "为小型项目补上输入、输出、边界与失败时的处理。" },
      { label: "之后", title: "把过程写下来", text: "留下能复现的问题和试过的办法，再把文档放回项目旁边。" },
      { label: "以后", title: "补上真实节点", text: "在这里加入项目发布、学习经历或公开贡献的实际日期。" }
    ]
  },

  /* === [可替换] Now 近况 === 示例内容，待替换 === */
  now: {
    title: "现在",
    items: [
      { label: "在读", text: "翻一册城市步行图集，留意图例怎样帮人认路。" },
      { label: "在写", text: "整理一篇关于图片取色与透明边缘的制作笔记。" },
      { label: "在学", text: "试做小型 Canvas 界面，顺手检查键盘操作与低分辨率显示。" },
      { label: "在哪里", text: "所在城市待填写。" }
    ]
  },

  /* === [可替换] 联系与社交入口 === 填写真实地址后，入口会成为链接 === */
  contact: {
    title: "联系",
    description: "如果想讨论一个项目或交流做工具的想法，可以从这里找到我。",
    links: [
      { label: "邮箱", href: null },
      { label: "GitHub", href: null },
      { label: "其他社交", href: null }
    ]
  },

  /* === [可替换] 页脚版权、备案和收尾文案 === */
  footer: {
    copyright: "© {year} {name}",
    filing: "备案信息待填写",
    signoff: "沿岸走一段，再回来。"
  }
};
