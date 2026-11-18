# My Personal Space

李银的个人空间。从海边观测站的工作台进入自叙帖、研究室、项目库和收藏室。打开 `index.html` 即可预览。使用本地 HTTP 服务预览时，收藏室也会读取仓库内发布的新增内容。

```sh
python -m http.server 8000
```

本地预览地址为 `http://localhost:8000/`。桌面可拖动镜头，手机可左右滑动，也可以用屏幕下方的箭头。右下角的「航图」标出当前位置，可预览并进入各个舱室，也可打开观测站的三维外部视图。同一标签页内会记住各舱室的取景位置。

首次打开会播放约 6.7 秒的飞船抵达片头。镜头从观测站外沿泊位轴线推进，经气闸进入工作台。点击音效按钮可以听到推进器、锁扣和气闸声。再次检查片头可直接打开 `experience.html?arrival=1`。航线、空间开口和音效位于 `assets/js/arrival.js`，场景图位于 `assets/img/flight-*.webp`。可交互观测站的三维模型位于 `assets/js/observatory.js`。

## 修改内容

- 打开工作台的收藏室，点击「添加收藏」，可在手机或电脑上发布图片、短视频、视频链接或语录。图片和 MP4 / WebM 上传上限为 10 MB。较大的视频可使用 HTTPS 分享链接。
- 首次发布时，在 GitHub 为 `mysite` 创建 Fine-grained personal access token，仓库权限只选 `Contents → Read and write`。令牌仅用于当前编辑页的 GitHub API 请求，发布后内容和上传素材会进入公开仓库。
- 网页发布的条目保存在 `content/collection-personal.json`，上传文件保存在 `assets/collection/`。在本地继续修改站点前，先执行 `git pull --ff-only`。
- `content/notes.js` 存放自叙帖和文章。新增文章时复制一条已有记录，给它独立的 ID，再替换标题、日期、摘要和正文。
- `content/projects.js` 存放项目。新增项目时复制一条已有记录，换一个独立的 ID，再填写介绍、技术标签和素材路径。
- `content/site.js`、`content/field-study.js`、`content/robotics-study.js` 和 `content/collection.js` 存放空间文字和研究室资料。
- 图片、视频和声音放在 `assets/` 下对应的目录。替换媒体时同步更新引用它的相对路径。
- `experience.html` 是观测站室内体验，热点与取景坐标在 `assets/js/experience.js` 的 `data` 中。航图节点坐标与预览描述在 `assets/js/atlas.js`。更换舱室图片后，需要按新图片的宽高比例重新确定热点坐标。美术素材说明见 `assets/img/SOURCES.md`。
- `world.html` 是三维观测站，`workroom.html` 和 `nearshore.html` 是之前的入口版本。

## 本地走查

每轮美化先看浏览器实屏，选出最明显的断点。改完后，用同样的设备尺寸和路线对照前后画面，再补测实际点击、拖动、键盘关闭和回到房间的状态。

- 从 `experience.html?arrival=1` 播放完整片头。检查飞船、泊位、开门与工作台的接入。
- 在电脑和手机竖屏分别落到工作台。手机应显示专门构图的竖幅工作台。检查欢迎语是否留在主屏内，两侧入口和机器人旁的收藏入口是否与画面中的物件对齐。转屏后再检查一次。在收藏室左右滑动封面，确认能打开收藏，也能找到「添加收藏」。
- 在工作台拖动镜头，再用航图预览并进入一个舱室。返回时核对原取景位置。在收藏室打开站体外部，确认外部的返回入口通向收藏室。用方向键选航图节点，用 Esc 关闭，并检查焦点。
- 在一次舱室转场尚未结束时再次切换路线，确认落在最后选择的位置，画面和操作均能正常恢复。
- 从工作台进入研究室，打开海岸城地形台。旋转模型，分别点灯塔和山脊，进入路线后再回到研究室。
- 从地形台选「从石拱岔路出发」。沿台阶走到灯塔，再回岔路上山，核对途中构图、横竖屏地标和两条路走完后的观察提示。地点与说明位于 `content/field-study.js`，观察点使用对应画面内的比例坐标。
- 打开自叙帖和项目放映。检查正文是否可读、短片是否可控、关闭后焦点是否回到原来的物件。
- 在手机竖屏、横屏和平板重复关键操作。打开减弱动效后检查内容入口，用禁用 WebGL 的环境检查地图的路线备用入口。

## GitHub Pages

发布来源选 `Deploy from a branch`，分支选 `main`，目录选 `/(root)`。仓库根目录的 `.nojekyll` 允许 Pages 直接发布静态文件。

修改内容并在本地预览后，用以下命令提交并推送。这里以自叙帖为例，将文件路径换成此次实际修改的文件。

```sh
git add content/notes.js
git commit -m "更新自叙帖"
git push
```

GitHub Pages 会在 `main` 更新后自动发布。可以在 GitHub 仓库的 Actions 页面查看发布进度。
