# My Personal Space

李银的个人空间。从海边观测站的工作台进入自叙帖、研究室、项目库和收藏室。打开 `index.html` 即可预览。使用本地 HTTP 服务预览时，收藏室也会读取仓库内发布的新增内容。

```sh
python -m http.server 8000
```

本地预览地址为 `http://localhost:8000/`。桌面可拖动镜头，手机可左右滑动，也可以用屏幕下方的箭头。右下角的「舱室」可直接进入各个空间，并可打开观测站的三维外部视图。

首次打开会播放约 13 秒的飞船抵达片头。镜头沿同一条航线穿出虫洞、靠近泊位、进入气闸和工作台。点击音效按钮可以听到推进器、锁扣和气闸声。再次检查片头可直接打开 `experience.html?arrival=1`。航线、空间开口和音效位于 `assets/js/arrival.js`，场景图位于 `assets/img/flight-*.webp`。可交互观测站的三维模型位于 `assets/js/observatory.js`。

## 修改内容

- 打开工作台的收藏室，点击「添加收藏」，可在手机或电脑上发布图片、短视频、视频链接或语录。图片和 MP4 / WebM 上传上限为 10 MB。较大的视频可使用 HTTPS 分享链接。
- 首次发布时，在 GitHub 为 `mysite` 创建 Fine-grained personal access token，仓库权限只选 `Contents → Read and write`。令牌仅用于当前编辑页的 GitHub API 请求，发布后内容和上传素材会进入公开仓库。
- 网页发布的条目保存在 `content/collection-personal.json`，上传文件保存在 `assets/collection/`。在本地继续修改站点前，先执行 `git pull --ff-only`。
- `content/notes.js` 存放自叙帖和文章。新增文章时复制一条已有记录，给它独立的 ID，再替换标题、日期、摘要和正文。
- `content/projects.js` 存放项目。新增项目时复制一条已有记录，换一个独立的 ID，再填写介绍、技术标签和素材路径。
- `content/site.js`、`content/field-study.js`、`content/robotics-study.js` 和 `content/collection.js` 存放空间文字和研究室资料。
- 图片、视频和声音放在 `assets/` 下对应的目录。替换媒体时同步更新引用它的相对路径。
- `experience.html` 是观测站室内体验，热点与取景坐标在 `assets/js/experience.js` 的 `data` 中。更换 `assets/img/station-*.webp` 后，需要按新图片的宽高比例重新确定热点坐标。美术素材说明见 `assets/img/SOURCES.md`。
- `world.html` 是三维观测站，`workroom.html` 和 `nearshore.html` 是之前的入口版本。

## GitHub Pages

发布来源选 `Deploy from a branch`，分支选 `main`，目录选 `/(root)`。仓库根目录的 `.nojekyll` 允许 Pages 直接发布静态文件。

修改内容并在本地预览后，用以下命令提交并推送。这里以自叙帖为例，将文件路径换成此次实际修改的文件。

```sh
git add content/notes.js
git commit -m "更新自叙帖"
git push
```

GitHub Pages 会在 `main` 更新后自动发布。可以在 GitHub 仓库的 Actions 页面查看发布进度。
