import DOMPurify from "dompurify";
import { supabase, isSupabaseConfigured } from "./supabase.js";

const ALLOWED_EMAIL = "shqipeebunjakuu@gmail.com";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const views = {
  auth: document.getElementById("authView"),
  denied: document.getElementById("deniedView"),
  config: document.getElementById("configView"),
  dashboard: document.getElementById("dashboardView"),
  editor: document.getElementById("editorView"),
};

let session = null;
let posts = new Map();
let coverFile = null;
let existingCoverUrl = null;
let slugWasEdited = false;

function showView(name) {
  Object.entries(views).forEach(([key, view]) => {
    view.hidden = key !== name;
  });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function isAuthorized(user) {
  const provider = user?.app_metadata?.provider;
  return user?.email?.toLowerCase() === ALLOWED_EMAIL && provider === "google";
}

async function signInWithGoogle() {
  const redirectTo = `${window.location.origin}/admin/`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: { prompt: "select_account" },
    },
  });
  if (error) window.alert(error.message);
}

async function resolveSession(nextSession) {
  session = nextSession;
  if (!session?.user) {
    showView("auth");
    return;
  }

  if (!isAuthorized(session.user)) {
    await supabase.auth.signOut();
    session = null;
    showView("denied");
    return;
  }

  document.getElementById("adminEmail").textContent = session.user.email;
  showView("dashboard");
  await loadPosts();
}

function escapeHtml(value = "") {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function postRow(post) {
  const published = post.status === "published";
  const viewButton = published
    ? `<a class="icon-button" href="/writings/${encodeURIComponent(post.slug)}" target="_blank" title="View post" aria-label="View ${escapeHtml(post.title)}">&#9673;</a>`
    : "";
  return `<article class="post-row" data-id="${post.id}">
    <div class="post-main">
      <div class="post-title-row">
        <h2 class="post-title">${escapeHtml(post.title)}</h2>
        <span class="status ${published ? "" : "draft"}">${post.status}</span>
      </div>
      <div class="post-meta">Updated ${formatDate(post.updated_at)}</div>
    </div>
    <div class="post-actions">
      ${viewButton}
      <button class="icon-button" type="button" data-action="edit" title="Edit post" aria-label="Edit ${escapeHtml(post.title)}">&#9998;</button>
      <button class="icon-button danger" type="button" data-action="delete" title="Delete post" aria-label="Delete ${escapeHtml(post.title)}">&#128465;</button>
    </div>
  </article>`;
}

async function loadPosts() {
  const list = document.getElementById("postList");
  list.innerHTML = '<p class="empty-state">Loading posts&hellip;</p>';
  const { data, error } = await supabase.from("posts").select("*").order("updated_at", { ascending: false });

  if (error) {
    list.innerHTML = `<p class="empty-state">Could not load posts: ${escapeHtml(error.message)}</p>`;
    return;
  }

  posts = new Map((data || []).map((post) => [post.id, post]));
  document.getElementById("postCount").textContent = posts.size;
  list.innerHTML = data?.length
    ? data.map(postRow).join("")
    : '<p class="empty-state">No posts yet. Create your first writing.</p>';
}

function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120);
}

function setMessage(message = "", type = "") {
  const element = document.getElementById("formMessage");
  element.textContent = message;
  element.className = `form-message ${type}`;
}

function setCoverPreview(url) {
  const preview = document.getElementById("coverPreview");
  const image = document.getElementById("coverPreviewImage");
  if (!url) {
    preview.hidden = true;
    image.removeAttribute("src");
    return;
  }
  image.src = url;
  preview.hidden = false;
}

function openEditor(post = null) {
  document.getElementById("postForm").reset();
  document.getElementById("postId").value = post?.id || "";
  document.getElementById("title").value = post?.title || "";
  document.getElementById("slug").value = post?.slug || "";
  document.getElementById("excerpt").value = post?.excerpt || "";
  document.getElementById("tags").value = post?.tags?.join(", ") || "";
  document.getElementById("contentEditor").innerHTML = post?.content || "";
  document.getElementById("editorHeading").textContent = post ? "Edit Post" : "New Post";
  document.getElementById("publishPost").textContent = post?.status === "published" ? "Update post" : "Publish post";
  coverFile = null;
  existingCoverUrl = post?.cover_image_url || null;
  slugWasEdited = Boolean(post);
  setCoverPreview(existingCoverUrl);
  setMessage();
  showView("editor");
}

function validateImage(file) {
  if (!file?.type.startsWith("image/")) return "Please choose an image file.";
  if (file.size > MAX_IMAGE_BYTES) return "The image must be smaller than 8 MB.";
  return null;
}

function selectCover(file) {
  const error = validateImage(file);
  if (error) {
    setMessage(error, "error");
    return;
  }
  coverFile = file;
  setCoverPreview(URL.createObjectURL(file));
  setMessage();
}

async function uploadImage(file, folder) {
  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${session.user.id}/${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("post-images").upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (error) throw error;
  return supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
}

async function savePost(status) {
  const form = document.getElementById("postForm");
  if (!form.reportValidity()) return;

  const contentEditor = document.getElementById("contentEditor");
  if (!contentEditor.textContent.trim() && !contentEditor.querySelector("img")) {
    setMessage("Add some article content before saving.", "error");
    contentEditor.focus();
    return;
  }

  const submitButtons = document.querySelectorAll(".editor-actions button");
  submitButtons.forEach((button) => (button.disabled = true));
  setMessage(coverFile ? "Uploading cover image…" : "Saving post…");

  try {
    let coverImageUrl = existingCoverUrl;
    if (coverFile) coverImageUrl = await uploadImage(coverFile, "covers");

    const id = document.getElementById("postId").value;
    const previous = id ? posts.get(id) : null;
    const payload = {
      title: document.getElementById("title").value.trim(),
      slug: document.getElementById("slug").value.trim(),
      excerpt: document.getElementById("excerpt").value.trim(),
      tags: document.getElementById("tags").value.split(",").map((tag) => tag.trim()).filter(Boolean),
      content: DOMPurify.sanitize(contentEditor.innerHTML),
      cover_image_url: coverImageUrl,
      status,
      author_id: session.user.id,
      published_at: status === "published" ? previous?.published_at || new Date().toISOString() : null,
    };

    const query = id
      ? supabase.from("posts").update(payload).eq("id", id)
      : supabase.from("posts").insert(payload);
    const { error } = await query;
    if (error) throw error;

    setMessage(status === "published" ? "Post published successfully." : "Draft saved successfully.", "success");
    await loadPosts();
    window.setTimeout(() => showView("dashboard"), 450);
  } catch (error) {
    const message = error.code === "23505" ? "That slug is already used by another post." : error.message;
    setMessage(message, "error");
  } finally {
    submitButtons.forEach((button) => (button.disabled = false));
  }
}

async function deletePost(id) {
  const post = posts.get(id);
  if (!post || !window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
  const { error } = await supabase.from("posts").delete().eq("id", id);
  if (error) window.alert(error.message);
  else await loadPosts();
}

function runEditorCommand(command, value = null) {
  document.getElementById("contentEditor").focus();
  document.execCommand(command, false, value);
}

document.getElementById("googleSignIn").addEventListener("click", signInWithGoogle);
document.getElementById("tryAgain").addEventListener("click", signInWithGoogle);
document.getElementById("signOut").addEventListener("click", async () => {
  await supabase.auth.signOut();
  showView("auth");
});
document.getElementById("newPost").addEventListener("click", () => openEditor());
document.getElementById("backToDashboard").addEventListener("click", () => showView("dashboard"));
document.getElementById("postList").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  const row = event.target.closest(".post-row");
  if (!button || !row) return;
  if (button.dataset.action === "edit") openEditor(posts.get(row.dataset.id));
  if (button.dataset.action === "delete") deletePost(row.dataset.id);
});

document.getElementById("title").addEventListener("input", (event) => {
  if (!slugWasEdited) document.getElementById("slug").value = slugify(event.target.value);
});
document.getElementById("slug").addEventListener("input", (event) => {
  slugWasEdited = true;
  const cursor = event.target.selectionStart;
  event.target.value = slugify(event.target.value);
  event.target.setSelectionRange(cursor, cursor);
});

const coverInput = document.getElementById("coverImage");
coverInput.addEventListener("change", () => coverInput.files[0] && selectCover(coverInput.files[0]));
const coverDrop = document.getElementById("coverDrop");
["dragenter", "dragover"].forEach((type) => coverDrop.addEventListener(type, (event) => {
  event.preventDefault();
  coverDrop.classList.add("dragging");
}));
["dragleave", "drop"].forEach((type) => coverDrop.addEventListener(type, (event) => {
  event.preventDefault();
  coverDrop.classList.remove("dragging");
}));
coverDrop.addEventListener("drop", (event) => event.dataTransfer.files[0] && selectCover(event.dataTransfer.files[0]));
document.getElementById("removeCover").addEventListener("click", () => {
  coverFile = null;
  existingCoverUrl = null;
  coverInput.value = "";
  setCoverPreview(null);
});

document.getElementById("editorToolbar").addEventListener("click", (event) => {
  const button = event.target.closest("button[data-command],button[data-block]");
  if (!button) return;
  if (button.dataset.command) runEditorCommand(button.dataset.command);
  if (button.dataset.block) runEditorCommand("formatBlock", button.dataset.block);
});
document.getElementById("insertLink").addEventListener("click", () => {
  const url = window.prompt("Paste the link URL:");
  if (url) runEditorCommand("createLink", url);
});
document.getElementById("insertEmoji").addEventListener("click", () => runEditorCommand("insertText", "✨"));
document.getElementById("insertImage").addEventListener("click", () => document.getElementById("inlineImage").click());
document.getElementById("inlineImage").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  const error = file && validateImage(file);
  if (!file) return;
  if (error) return setMessage(error, "error");
  try {
    setMessage("Uploading article image…");
    const url = await uploadImage(file, "content");
    runEditorCommand("insertImage", url);
    setMessage("Image inserted.", "success");
  } catch (uploadError) {
    setMessage(uploadError.message, "error");
  }
  event.target.value = "";
});

document.getElementById("saveDraft").addEventListener("click", () => savePost("draft"));
document.getElementById("postForm").addEventListener("submit", (event) => {
  event.preventDefault();
  savePost("published");
});

async function initialize() {
  if (!isSupabaseConfigured) {
    showView("config");
    return;
  }
  const { data } = await supabase.auth.getSession();
  await resolveSession(data.session);
  supabase.auth.onAuthStateChange((event, nextSession) => {
    if (event === "SIGNED_IN" && nextSession?.user?.id !== session?.user?.id) resolveSession(nextSession);
    if (event === "SIGNED_OUT") session = null;
  });
}

initialize();
