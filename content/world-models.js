window.WORLD_MODEL_STUDY = {
  /* === [可替换] 研究室主题、公开案例与待验证问题 === */
  title: "世界模型",
  question: "走到哪里，世界就延伸到哪里",
  intro: "开放世界能边走边生成到什么程度？绕过街角再折返，入口还在原处吗？我改变的东西会留下来吗？",
  cases: [
    {
      name: "Genie 4",
      focus: "世界怎么回应玩家的动作",
      summary: "Google DeepMind 展示了实时生成的互动环境。玩家的行动可以影响接下来发生的事。官方也把长期一致性和精确空间关系列为仍在研究的问题。",
      observation: "看演示时，留意动作与环境变化之间的因果。若走开前做过改变，回来时那个改变还在不在？",
      sourceLabel: "Google DeepMind 官方演示",
      source: "https://deepmind.google/blog/genie-4-a-new-generation-of-world-simulation/"
    },
    {
      name: "Marble",
      focus: "生成的空间能不能从不同方向看",
      summary: "World Labs 展示了从图片、文字等输入生成可浏览、可编辑的三维场景，并提供 Gaussian splats 或网格等导出方式。",
      observation: "看同一房间换个角度时的门洞、台阶与物体位置。它对游戏场景原型有价值，玩家改动能否保存则还要靠游戏规则与状态管理。",
      sourceLabel: "World Labs 官方示例",
      source: "https://worldlabs.ai/blog/marble-world-model"
    }
  ],
  next: {
    title: "开放世界里的回访测试",
    text: "从同一扇门出发，绕过两个街角，再沿原路返回。记录入口位置、路径连接和出发前留下的物品是否一致。",
    status: "待做。这里收录公开资料，后续再放实测录像和观察记录。"
  }
};
