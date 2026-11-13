# My Personal Space

李银的个人空间。从工作台进入研究室、项目库和自叙帖。站点使用 HTML、CSS 和原生 JavaScript，可直接打开 `workroom.html` 本地预览。

## 修改内容

- 打开工作台的收藏室，点击「添加收藏」，可在手机或电脑上发布图片、短视频、视频链接或语录。图片和 MP4 / WebM 上传上限为 10 MB。较大的视频可使用 HTTPS 分享链接。
- 首次发布时，在 GitHub 为 `mysite` 创建 Fine-grained personal access token，仓库权限只选 `Contents → Read and write`。令牌仅用于当前编辑页的 GitHub API 请求，发布后内容和上传素材会进入公开仓库。
- 网页发布的条目保存在 `content/collection-personal.json`，上传文件保存在 `assets/collection/`。在本地继续修改站点前，先执行 `git pull --ff-only`。
- `content/notes.js` 存放自叙帖和文章。新增文章时复制一条已有记录，给它独立的 ID，再替换标题、日期、摘要和正文。
- `content/projects.js` 存放项目。新增项目时复制一条已有记录，换一个独立的 ID，再填写介绍、技术标签和素材路径。
- `content/site.js`、`content/field-study.js`、`content/robotics-study.js` 和 `content/collection.js` 存放空间文字和研究室资料。
- 图片、视频和声音放在 `assets/` 下对应的目录。替换媒体时同步更新引用它的相对路径。
- `index.html` 是站点入口，`workroom.html` 是当前工作台，`nearshore.html` 是之前的近岸版本。

## GitHub Pages

发布来源选 `Deploy from a branch`，分支选 `main`，目录选 `/(root)`。仓库根目录的 `.nojekyll` 允许 Pages 直接发布静态文件。

修改内容并在本地预览后，用以下命令提交并推送。这里以自叙帖为例，将文件路径换成此次实际修改的文件。

```sh
git add content/notes.js
git commit -m "更新自叙帖"
git push
```

GitHub Pages 会在 `main` 更新后自动发布。可以在 GitHub 仓库的 Actions 页面查看发布进度。
