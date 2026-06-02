<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import JSZip from 'jszip';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { saveAs } from 'file-saver';

const REPO_OWNER = 'aakashpuree';
const REPO_NAME = 'class-11-notes';
const API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/`;
const SITE_URL = 'https://com-eng-notes.vercel.app';

const currentPath = ref('');
const pathHistory = ref([]);
const items = ref([]);
const loading = ref(false);
const query = ref('');
const status = reactive({
  visible: false,
  text: '',
  tone: 'info',
});
let statusTimer = null;

const preview = reactive({
  open: false,
  title: '',
  kind: 'text',
  html: '',
  text: '',
  src: '',
  loading: false,
});

let previewObjectUrl = '';
const confirmDialog = reactive({
  open: false,
  title: 'Confirm Action',
  text: '',
  action: null,
});

const faqItems = [
  {
    question: 'What subjects are covered in the notes?',
    answer:
      'The collection is organized around Computer Organization & Architecture, Operating Systems, Java Programming, and Web & Mobile Applications.',
  },
  {
    question: 'Can I download folders as a zip file?',
    answer:
      'Yes. Folder downloads are packaged into a zip file so students can keep the full chapter set offline.',
  },
  {
    question: 'Does the preview support markdown and text files?',
    answer:
      'Yes. Markdown is rendered into readable formatted content, while plain text and code files are shown in a clean preview panel.',
  },
  {
    question: 'Is the site mobile friendly?',
    answer:
      'Yes. The layout is fully responsive, so the explorer, modals, and cards stay usable on smaller screens.',
  },
];

const highlights = [
  {
    title: 'NEB-aligned',
    text: 'Structured for Class 11 and 12 computer engineering study.',
  },
  {
    title: 'Preview first',
    text: 'Open documents, images, markdown, and text before downloading.',
  },
  {
    title: 'Fast access',
    text: 'Folder navigation and search keep the content easy to browse.',
  },
  {
    title: 'Free to use',
    text: 'Students can explore and download the material without friction.',
  },
];

const subjects = [
  {
    code: 'COA',
    name: 'Computer Organization & Architecture',
    summary: 'Core hardware concepts, instruction flow, memory, and system design.',
  },
  {
    code: 'OS',
    name: 'Operating Systems',
    summary: 'Processes, scheduling, memory management, files, and device handling.',
  },
  {
    code: 'JAVA',
    name: 'Java Programming',
    summary: 'Syntax, OOP, methods, arrays, exceptions, and practical coding notes.',
  },
  {
    code: 'WMA',
    name: 'Web & Mobile Applications',
    summary: 'Modern web basics, app ideas, and the workflow behind digital products.',
  },
];

const visibleItems = computed(() => {
  const normalized = query.value.trim().toLowerCase();
  const sorted = [...items.value].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'dir' ? -1 : 1;
  });

  if (!normalized) return sorted;

  return sorted.filter((item) => item.name.toLowerCase().includes(normalized));
});

const pathLabel = computed(() => (currentPath.value ? `/root/${currentPath.value}` : '/root/'));

const canGoBack = computed(() => pathHistory.value.length > 0);

const breadcrumbs = computed(() => {
  const segments = currentPath.value ? currentPath.value.split('/').filter(Boolean) : [];
  const trail = [{ label: 'root', path: '' }];
  let acc = '';

  for (const segment of segments) {
    acc = acc ? `${acc}/${segment}` : segment;
    trail.push({ label: segment, path: acc });
  }

  return trail;
});

function setStatus(text, tone = 'info', autoHide = false) {
  clearTimeout(statusTimer);
  status.visible = true;
  status.text = text;
  status.tone = tone;

  if (autoHide) {
    statusTimer = window.setTimeout(() => {
      status.visible = false;
    }, 2400);
  }
}

function clearStatus() {
  clearTimeout(statusTimer);
  status.visible = false;
  status.text = '';
}

function setPreviewObjectUrl(url) {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
  }
  previewObjectUrl = url;
}

function cleanupPreview() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = '';
  }
}

function getExtension(filename) {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

function getIconTone(item) {
  if (item.type === 'dir') return 'from-cyan-400 to-sky-500';

  const ext = getExtension(item.name);
  if (['pdf'].includes(ext)) return 'from-rose-400 to-red-500';
  if (['doc', 'docx'].includes(ext)) return 'from-indigo-400 to-violet-500';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'from-emerald-400 to-teal-500';
  if (['html', 'htm', 'js', 'json', 'css', 'md', 'txt'].includes(ext)) return 'from-amber-400 to-orange-500';
  return 'from-slate-400 to-slate-500';
}

function iconFor(item) {
  if (item.type === 'dir') {
    return 'M3 8.5A2.5 2.5 0 0 1 5.5 6H10l2 2h6.5A2.5 2.5 0 0 1 21 10.5v7A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5v-9Z';
  }

  const ext = getExtension(item.name);
  if (['pdf'].includes(ext)) {
    return 'M7 2.5h7l5 5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4.5a2 2 0 0 1 2-2Zm6 1.5v4h4';
  }
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
    return 'M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm3 9 3-3 4 4 2-2 3 3';
  }
  if (['md', 'txt', 'html', 'htm', 'js', 'json', 'css'].includes(ext)) {
    return 'M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1.5-1.5Zm6 1.5v4h4M9 12h6M9 15h6M9 18h4';
  }

  return 'M7 3.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V5a1.5 1.5 0 0 1 1.5-1.5Zm6 1.5v4h4';
}

async function loadPath(path, rememberHistory = false) {
  loading.value = true;
  setStatus(`Loading ${path || 'root'}...`, 'info');

  try {
    const response = await fetch(API_BASE + path);
    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const data = await response.json();
    items.value = Array.isArray(data) ? data : [];
    currentPath.value = path;
    query.value = '';

    if (rememberHistory) {
      pathHistory.value.push(currentPath.value);
    }

    document.title = currentPath.value ? `Computer Engineering Notes - ${currentPath.value}` : 'Computer Engineering Notes';
    setStatus(`Loaded ${items.value.length} items`, 'success', true);
  } catch (error) {
    console.error(error);
    setStatus('Unable to load this folder right now. Please try again.', 'error');
  } finally {
    loading.value = false;
  }
}

function openFolder(item) {
  pathHistory.value.push(currentPath.value);
  loadPath(item.path);
}

function goBack() {
  if (!canGoBack.value) return;
  const previous = pathHistory.value.pop();
  loadPath(previous ?? '');
}

function refreshFolder() {
  loadPath(currentPath.value);
}

function jumpToBreadcrumb(path) {
  pathHistory.value = [];
  loadPath(path);
}

function requestConfirm(text, action, title = 'Confirm Download') {
  confirmDialog.title = title;
  confirmDialog.text = text;
  confirmDialog.action = action;
  confirmDialog.open = true;
}

function promptItemDownload(item) {
  requestConfirm(
    item.type === 'dir'
      ? `Download the entire folder "${item.name}" as a zip file?`
      : `Download "${item.name}" to your device?`,
    () => (item.type === 'dir' ? downloadFolder(item) : downloadFile(item)),
    item.type === 'dir' ? 'Confirm Folder Download' : 'Confirm File Download',
  );
}

function closeConfirm() {
  confirmDialog.open = false;
  confirmDialog.action = null;
}

async function downloadFile(item) {
  try {
    setStatus(`Downloading ${item.name}...`, 'info');
    const response = await fetch(item.download_url);
    const blob = await response.blob();
    saveAs(blob, item.name);
    setStatus(`Saved ${item.name}`, 'success', true);
  } catch (error) {
    console.error(error);
    setStatus('File download failed.', 'error');
  }
}

async function fetchFolderRecursive(path, zipFolder) {
  const response = await fetch(API_BASE + path);
  if (!response.ok) {
    throw new Error(`GitHub API responded with ${response.status}`);
  }

  const folderItems = await response.json();

  for (const item of folderItems) {
    if (item.type === 'file') {
      const fileResponse = await fetch(item.download_url);
      const blob = await fileResponse.blob();
      zipFolder.file(item.name, blob);
    } else if (item.type === 'dir') {
      const subFolder = zipFolder.folder(item.name);
      await fetchFolderRecursive(item.path, subFolder);
    }
  }
}

async function downloadFolder(item) {
  try {
    setStatus(`Preparing ${item.name}.zip...`, 'info');
    const zip = new JSZip();
    const rootFolder = zip.folder(item.name);
    await fetchFolderRecursive(item.path, rootFolder);
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${item.name}.zip`);
    setStatus(`Saved ${item.name}.zip`, 'success', true);
  } catch (error) {
    console.error(error);
    setStatus('Folder download failed. The repository may be rate limited.', 'error');
  }
}

async function openPreview(item) {
  cleanupPreview();
  preview.open = true;
  preview.title = item.name;
  preview.kind = 'text';
  preview.html = '';
  preview.text = 'Loading preview...';
  preview.src = '';
  preview.loading = true;

  const ext = getExtension(item.name);

  try {
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) {
      preview.kind = 'image';
      preview.src = item.download_url;
    } else if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) {
      preview.kind = 'iframe';
      preview.src = `https://docs.google.com/gview?url=${encodeURIComponent(item.download_url)}&embedded=true`;
    } else {
      const response = await fetch(item.download_url);
      const text = await response.text();

      if (['md', 'markdown'].includes(ext)) {
        preview.kind = 'markdown';
        preview.html = DOMPurify.sanitize(marked.parse(text));
      } else if (['html', 'htm'].includes(ext)) {
        preview.kind = 'iframe';
        const blob = new Blob([text], { type: 'text/html' });
        setPreviewObjectUrl(URL.createObjectURL(blob));
        preview.src = previewObjectUrl;
      } else {
        preview.kind = 'text';
        preview.text = text;
      }
    }
  } catch (error) {
    console.error(error);
    preview.kind = 'text';
    preview.text = 'Error loading preview.';
  } finally {
    preview.loading = false;
  }
}

function closePreview() {
  preview.open = false;
  preview.title = '';
  preview.kind = 'text';
  preview.html = '';
  preview.text = '';
  preview.src = '';
  preview.loading = false;
  cleanupPreview();
}

function downloadFromPreview() {
  const targetItem = items.value.find((item) => item.name === preview.title);
  if (!targetItem) return;
  closePreview();
  if (targetItem.type === 'dir') {
    requestConfirm(
      `Download the entire folder "${targetItem.name}" as a zip file?`,
      () => downloadFolder(targetItem),
      'Confirm Folder Download',
    );
    return;
  }
  requestConfirm(`Download "${targetItem.name}" to your device?`, () => downloadFile(targetItem));
}

function handleConfirm() {
  if (typeof confirmDialog.action === 'function') {
    confirmDialog.action();
  }
  closeConfirm();
}

function getItemDescription(item) {
  if (item.type === 'dir') return 'Folder of study material';

  const ext = getExtension(item.name);
  if (['pdf'].includes(ext)) return 'PDF document';
  if (['doc', 'docx'].includes(ext)) return 'Word document';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'Image file';
  if (['md', 'markdown'].includes(ext)) return 'Markdown note';
  if (['html', 'htm'].includes(ext)) return 'HTML file';
  if (['js', 'json', 'css', 'txt'].includes(ext)) return 'Text or code file';
  return 'Study file';
}

watch(
  () => preview.open,
  (open) => {
    if (!open) cleanupPreview();
  },
);

onMounted(() => {
  loadPath('');
});

onBeforeUnmount(() => {
  clearStatus();
  cleanupPreview();
});
</script>

<template>
  <div class="relative min-h-screen overflow-hidden">
    <div class="pointer-events-none absolute inset-0 opacity-80">
      <div class="absolute left-[-8rem] top-[-6rem] h-72 w-72 rounded-full bg-sky-500/20 blur-3xl"></div>
      <div class="absolute right-[-7rem] top-28 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl"></div>
      <div class="absolute bottom-[-8rem] left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl"></div>
    </div>

    <header class="sticky top-0 z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div class="flex items-center gap-3">
          <div
            class="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/20"
          >
            <svg viewBox="0 0 24 24" class="h-6 w-6 text-white" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H11l2 2h4.5A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5v-10Z" />
            </svg>
          </div>
          <div>
            <p class="font-display text-lg font-bold text-white sm:text-xl">Computer Engineering Notes</p>
            <p class="text-xs text-slate-300 sm:text-sm">Class 11 and 12 notes, preview tools, and folder downloads</p>
          </div>
        </div>

        <a
          href="#explorer"
          class="hidden rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/50 hover:bg-cyan-400/20 sm:inline-flex"
        >
          Jump to explorer
        </a>
      </div>
    </header>

    <main class="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <section
        class="grid gap-8 overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl lg:grid-cols-[1.5fr_1fr] lg:p-8"
      >
        <div class="space-y-6">
          <div class="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100">
            <span class="h-2 w-2 rounded-full bg-cyan-300"></span>
            Free NEB-aligned study material
          </div>

          <div class="space-y-4">
            <h1 class="font-display max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Explore, preview, and download computer engineering notes with a cleaner learning experience.
            </h1>
            <p class="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              The explorer below connects directly to the notes repository, so students can browse folders, preview
              files, and download what they need without leaving the page.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <a
              href="#explorer"
              class="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Explore notes
            </a>
            <button
              class="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              @click="refreshFolder"
            >
              Refresh current folder
            </button>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <div
            v-for="highlight in highlights"
            :key="highlight.title"
            class="rounded-2xl border border-white/10 bg-slate-950/60 p-4 shadow-lg shadow-slate-950/30"
          >
            <p class="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">{{ highlight.title }}</p>
            <p class="mt-2 text-sm leading-6 text-slate-300">{{ highlight.text }}</p>
          </div>
        </div>
      </section>

      <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article
          v-for="subject in subjects"
          :key="subject.code"
          class="group rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-xl shadow-slate-950/30 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-slate-900/80"
        >
          <div class="flex items-center justify-between gap-4">
            <div
              class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 text-sm font-bold text-white shadow-lg shadow-cyan-500/20"
            >
              {{ subject.code }}
            </div>
            <span class="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">Notes</span>
          </div>
          <h2 class="mt-4 font-display text-xl font-bold text-white">{{ subject.name }}</h2>
          <p class="mt-2 text-sm leading-6 text-slate-300">{{ subject.summary }}</p>
        </article>
      </section>

      <section
        id="explorer"
        class="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:p-6 lg:p-8"
      >
        <div class="flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-2">
            <p class="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Explorer</p>
            <h2 class="font-display text-2xl font-bold text-white sm:text-3xl">Browse the repository contents</h2>
            <p class="max-w-2xl text-sm leading-6 text-slate-300">
              Current path: <span class="font-mono text-cyan-200">{{ pathLabel }}</span>
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!canGoBack"
              @click="goBack"
            >
              <span aria-hidden="true">←</span>
              Back
            </button>
            <button
              class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
              @click="refreshFolder"
            >
              Refresh
            </button>
          </div>
        </div>

        <div class="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div class="flex flex-wrap items-center gap-2">
            <button
              v-for="crumb in breadcrumbs"
              :key="crumb.path || 'root'"
              class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/30 hover:text-cyan-100"
              @click="jumpToBreadcrumb(crumb.path)"
            >
              <span v-if="crumb.path">/</span>
              {{ crumb.label }}
            </button>
          </div>

          <label class="flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-slate-300">
            <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="m20 20-3.5-3.5"></path>
            </svg>
            <input
              v-model="query"
              type="search"
              placeholder="Search files and folders"
              class="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
            />
          </label>
        </div>

        <transition name="fade">
          <div
            v-if="status.visible"
            :class="[
              'mt-5 rounded-2xl border px-4 py-3 text-sm font-medium',
              status.tone === 'success'
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100'
                : status.tone === 'error'
                  ? 'border-rose-400/30 bg-rose-400/10 text-rose-100'
                  : 'border-cyan-400/30 bg-cyan-400/10 text-cyan-100',
            ]"
          >
            {{ status.text }}
          </div>
        </transition>

        <div class="mt-6">
          <div v-if="loading" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <div
              v-for="n in 6"
              :key="n"
              class="h-56 animate-pulse rounded-3xl border border-white/10 bg-slate-950/50"
            ></div>
          </div>

          <div v-else-if="visibleItems.length === 0" class="rounded-3xl border border-dashed border-white/15 bg-slate-950/40 p-10 text-center">
            <p class="font-display text-2xl font-bold text-white">Nothing found here</p>
            <p class="mt-2 text-sm text-slate-300">
              Try a different search term or open another folder in the repository.
            </p>
          </div>

          <div v-else class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <article
              v-for="item in visibleItems"
              :key="item.path"
              class="group flex h-full flex-col rounded-3xl border border-white/10 bg-slate-950/60 p-5 shadow-xl shadow-slate-950/30 transition hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-slate-900/90"
            >
              <div class="flex items-start gap-4">
                <div
                  :class="[
                    'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br shadow-lg',
                    getIconTone(item),
                  ]"
                >
                  <svg
                    viewBox="0 0 24 24"
                    class="h-7 w-7 text-white"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  >
                    <path :d="iconFor(item)"></path>
                  </svg>
                </div>

                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-2">
                    <p class="truncate font-display text-lg font-bold text-white">{{ item.name }}</p>
                    <span class="rounded-full border border-white/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                      {{ item.type }}
                    </span>
                  </div>
                  <p class="mt-1 text-sm leading-6 text-slate-400">{{ getItemDescription(item) }}</p>
                </div>
              </div>

              <div class="mt-5 flex flex-wrap gap-3">
                <button
                  v-if="item.type === 'dir'"
                  class="inline-flex flex-1 items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  @click="openFolder(item)"
                >
                  Open
                </button>
                <button
                  v-else
                  class="inline-flex flex-1 items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                  @click="openPreview(item)"
                >
                  Preview
                </button>

                <button
                  class="inline-flex flex-1 items-center justify-center rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                  @click="promptItemDownload(item)"
                >
                  Download
                </button>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div class="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <p class="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Why this layout works</p>
          <h2 class="mt-2 font-display text-2xl font-bold text-white">Designed for study sessions, not just browsing</h2>
          <p class="mt-3 max-w-2xl text-sm leading-7 text-slate-300">
            The landing area gives context, the explorer handles the content, and the preview modal lets students
            inspect files before they commit to a download.
          </p>
          <div class="mt-6 grid gap-4 sm:grid-cols-2">
            <div
              v-for="subject in subjects"
              :key="subject.code + '-detail'"
              class="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
            >
              <p class="text-sm font-semibold text-cyan-200">{{ subject.code }}</p>
              <p class="mt-2 text-sm font-medium text-white">{{ subject.name }}</p>
              <p class="mt-2 text-sm leading-6 text-slate-300">{{ subject.summary }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
          <p class="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">FAQ</p>
          <h2 class="mt-2 font-display text-2xl font-bold text-white">Quick answers for students</h2>

          <div class="mt-5 space-y-3">
            <details
              v-for="faq in faqItems"
              :key="faq.question"
              class="group rounded-2xl border border-white/10 bg-slate-950/50 p-4"
            >
              <summary class="cursor-pointer list-none font-medium text-white">
                {{ faq.question }}
              </summary>
              <p class="mt-3 text-sm leading-7 text-slate-300">
                {{ faq.answer }}
              </p>
            </details>
          </div>
        </div>
      </section>
    </main>

    <footer class="border-t border-white/10 bg-slate-950/70">
      <div class="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-6 text-sm text-slate-400 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
        <p>Developed for the Computer Engineering notes collection.</p>
        <p>
          Repository:
          <a class="text-cyan-300 transition hover:text-cyan-200" :href="SITE_URL" target="_blank" rel="noreferrer">
            {{ SITE_URL }}
          </a>
        </p>
      </div>
    </footer>

    <transition name="fade">
      <div
        v-if="preview.open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-xl"
        @click.self="closePreview"
      >
        <div class="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-50 shadow-2xl shadow-slate-950/60">
          <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">Preview</p>
              <h3 class="mt-1 font-display text-xl font-bold text-slate-900">{{ preview.title }}</h3>
            </div>
            <button
              class="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              @click="closePreview"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18"></path>
                <path d="m6 6 12 12"></path>
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6">
            <div
              v-if="preview.loading"
              class="flex h-64 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-slate-500"
            >
              Loading preview...
            </div>

            <div
              v-else-if="preview.kind === 'image'"
              class="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3"
            >
              <img :src="preview.src" :alt="preview.title" class="mx-auto h-auto max-w-full rounded-2xl" />
            </div>

            <div
              v-else-if="preview.kind === 'iframe'"
              class="overflow-hidden rounded-3xl border border-slate-200 bg-white"
            >
              <iframe
                :src="preview.src"
                class="h-[72vh] w-full"
                title="File preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              ></iframe>
            </div>

            <div
              v-else-if="preview.kind === 'markdown'"
              class="markdown-preview rounded-3xl border border-slate-200 bg-white p-5 text-slate-700 sm:p-6"
              v-html="preview.html"
            ></div>

            <pre
              v-else
              class="whitespace-pre-wrap rounded-3xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 sm:p-6"
            >{{ preview.text }}</pre>
          </div>

          <div class="flex flex-col gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            <button
              class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              @click="closePreview"
            >
              Close
            </button>
            <button
              class="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              @click="downloadFromPreview"
            >
              Download
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div
        v-if="confirmDialog.open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 py-6 backdrop-blur-xl"
        @click.self="closeConfirm"
      >
        <div class="w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-50 p-6 shadow-2xl shadow-slate-950/60">
          <p class="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-700">{{ confirmDialog.title }}</p>
          <h3 class="mt-2 font-display text-2xl font-bold text-slate-900">Please confirm</h3>
          <p class="mt-3 text-sm leading-7 text-slate-600">{{ confirmDialog.text }}</p>

          <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              class="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              @click="closeConfirm"
            >
              Cancel
            </button>
            <button
              class="inline-flex items-center justify-center rounded-full bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
              @click="handleConfirm"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
