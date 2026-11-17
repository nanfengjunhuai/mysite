(() => {
  "use strict";

  if (new URLSearchParams(location.search).get("from") === "experience") {
    for (const link of document.querySelectorAll(".back,#editor-result")) link.href = "experience.html#collection";
  }

  const form = document.querySelector("#collection-editor");
  const fields = form.elements;
  const status = document.querySelector("#editor-status");
  const result = document.querySelector("#editor-result");
  const preview = document.querySelector("#editor-preview");
  const cataloguePath = "content/collection-personal.json";
  const maxBytes = 10_000_000;
  const imageTypes = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };
  const videoTypes = { "video/mp4": "mp4", "video/webm": "webm" };
  const categories = { image: "收藏图片", video: "收藏视频", "video-link": "视频链接", quote: "收藏语录" };
  let previewUrl = "";
  let pending = null;

  function showField(id, input, visible) {
    document.querySelector(id).hidden = !visible;
    input.disabled = !visible;
    input.required = visible;
  }

  function updatePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    preview.replaceChildren();
    const file = fields.file.files[0];
    const image = fields.kind.value === "image";
    const types = image ? imageTypes : videoTypes;
    preview.hidden = fields.file.disabled || !file || !types[file.type] || file.size > maxBytes;
    if (preview.hidden) return;
    previewUrl = URL.createObjectURL(file);
    const media = document.createElement(image ? "img" : "video");
    media.src = previewUrl;
    if (image) media.alt = "待发布图片预览";
    else {
      media.controls = true;
      media.playsInline = true;
    }
    preview.append(media);
  }

  function updateFields() {
    const kind = fields.kind.value;
    const image = kind === "image";
    showField("#editor-file-field",fields.file,image || kind === "video");
    showField("#editor-url-field",fields.url,kind === "video-link");
    showField("#editor-quote-field",fields.quote,kind === "quote");
    fields.file.accept = Object.keys(image ? imageTypes : videoTypes).join(",");
    const label = document.querySelector("#editor-file-field");
    label.firstChild.textContent = image ? "选择图片" : "选择 MP4 或 WebM";
    updatePreview();
  }

  async function github(token,query,variables) {
    const response = await fetch("https://api.github.com/graphql", {
      method: "POST",
      headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables })
    });
    if (response.status === 401 || response.status === 403) throw new Error("GitHub 令牌无效或权限不足，请检查有效期和仓库授权。");
    const payload = await response.json();
    if (payload.errors?.some(error => /expected head|head oid|stale/i.test(error.message))) {
      throw new Error("仓库刚刚有更新，请再点一次发布。");
    }
    if (!response.ok || payload.errors?.length) throw new Error("GitHub 未完成发布。请检查令牌是否授权 mysite 的 Contents 读写权限，再重试。");
    return payload.data;
  }

  async function readCatalogue(token) {
    const data = await github(token,`
      query {
        viewer { login }
        repository(owner: "nanfengjunhuai", name: "mysite") {
          ref(qualifiedName: "refs/heads/main") {
            target {
              oid
              ... on Commit {
                file(path: "content/collection-personal.json") { object { ... on Blob { text isTruncated } } }
              }
            }
          }
        }
      }
    `);
    if (data.viewer?.login?.toLowerCase() !== "nanfengjunhuai") throw new Error("请使用站点所有者的 GitHub 账号。");
    const commit = data.repository?.ref?.target;
    const catalogue = commit?.file?.object;
    if (!commit?.oid || !catalogue?.text || catalogue.isTruncated) throw new Error("无法读取收藏记录，请稍后再试。");
    const items = JSON.parse(catalogue.text);
    if (!Array.isArray(items)) throw new Error("收藏记录格式有误，发布已停止。");
    return { head: commit.oid, items };
  }

  function fileBase64(file) {
    return new Promise((resolve,reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = () => reject(new Error("读取素材失败，请重新选择文件。"));
      reader.readAsDataURL(file);
    });
  }

  function makeItem(id) {
    const kind = fields.kind.value;
    const item = { id, kind, category: categories[kind], title: fields.title.value.trim(), description: fields.description.value.trim() };
    if (!item.title) throw new Error("请填写标题。");
    if (kind === "quote") {
      item.quote = fields.quote.value.trim();
      if (!item.quote) throw new Error("请填写语录正文。");
    }
    if (kind === "video-link") {
      let url;
      try { url = new URL(fields.url.value.trim()); } catch {}
      if (!url || url.protocol !== "https:" || url.username || url.password) throw new Error("请填写完整的 HTTPS 视频链接。");
      item.url = url.href;
    }
    if (kind === "image" || kind === "video") {
      const file = fields.file.files[0];
      const ext = (kind === "image" ? imageTypes : videoTypes)[file?.type];
      if (!ext || !file.size) throw new Error("请重新选择支持的文件格式。");
      if (file.size > maxBytes) throw new Error("文件超过 10 MB。可压缩后上传，或使用视频链接。");
      item.url = "assets/collection/" + id + "." + ext;
      if (kind === "image") item.image = item.url;
    }
    return item;
  }

  fields.kind.addEventListener("change",updateFields);
  fields.file.addEventListener("change",updatePreview);
  form.addEventListener("input",event => {
    if (event.target !== fields.token) pending = null;
  });
  form.addEventListener("submit",async event => {
    event.preventDefault();
    const submit = form.querySelector("button[type=submit]");
    if (submit.disabled) return;
    const token = fields.token.value.trim();
    if (!token.startsWith("github_pat_")) {
      status.textContent = "请使用 GitHub 的 Fine-grained personal access token。";
      return;
    }
    const controls = Array.from(fields).filter(field => !field.disabled);
    controls.forEach(field => { field.disabled = true; });
    result.hidden = true;
    status.textContent = "正在连接 GitHub…";
    try {
      const id = pending ??= crypto.randomUUID();
      const item = makeItem(id);
      const { head, items } = await readCatalogue(token);
      if (!items.some(entry => entry.id === id)) {
        const catalogue = JSON.stringify([item,...items],null,2) + "\n";
        const additions = [{ path: cataloguePath, contents: await fileBase64(new Blob([catalogue])) }];
        if (item.kind === "image" || item.kind === "video") {
          status.textContent = "正在上传素材并发布…";
          additions.push({ path: item.url, contents: await fileBase64(fields.file.files[0]) });
        }
        await github(token,`
          mutation PublishCollection($input: CreateCommitOnBranchInput!) {
            createCommitOnBranch(input: $input) { commit { oid } }
          }
        `, { input: {
          branch: { repositoryNameWithOwner: "nanfengjunhuai/mysite", branchName: "main" },
          expectedHeadOid: head,
          message: { headline: "Add a personal collection item" },
          fileChanges: { additions }
        } });
      }
      form.reset();
      fields.token.value = token;
      pending = null;
      status.textContent = "收藏已提交。GitHub Pages 发布完成后，访客就能看到。";
      result.hidden = false;
    } catch (error) {
      status.textContent = error instanceof TypeError ? "网络连接失败，请检查 GitHub 是否可访问后再试。" : error.message;
    } finally {
      controls.forEach(field => { field.disabled = false; });
      updateFields();
    }
  });

  updateFields();
})();
