<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { saveAs } from 'file-saver';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const API_BASE = 'https://api.github.com/repos/aakashpuree/class-11-notes/contents/';
const ROOT_PATH = 'Class 11';

const navOpen = ref(false);
const search = ref('');
const currentPath = ref(ROOT_PATH);
const items = ref([]);
const pathHistory = ref([]);
const loading = ref(true);
const apiError = ref('');
const previewItem = ref(null);
const shareMenuOpen = ref(false);
const previewState = ref({
  open: false,
  title: '',
  kind: 'text',
  src: '',
  html: '',
  text: '',
  loading: false,
});
const newsletterEmail = ref('');
const newsletterError = ref('');
const toasts = ref([]);

let toastId = 0;
let revealObserver = null;
let previewObjectUrl = '';

const visibleItems = computed(() => {
  const query = search.value.trim().toLowerCase();
  const sorted = [...items.value].sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === 'dir' ? -1 : 1;
  });

  if (!query) return sorted;

  return sorted.filter((item) => {
    const haystack = [item.name, item.path, item.type].join(' ').toLowerCase();
    return haystack.includes(query);
  });
});

const dirCount = computed(() => items.value.filter((item) => item.type === 'dir').length);
const fileCount = computed(() => items.value.filter((item) => item.type === 'file').length);
const totalSize = computed(() => items.value.reduce((sum, item) => sum + (item.size || 0), 0));

const breadcrumbs = computed(() => {
  const segments = currentPath.value.split('/').filter(Boolean);
  const trail = [{ label: 'root', path: ROOT_PATH }];
  let acc = '';

  for (const segment of segments) {
    acc = acc ? `${acc}/${segment}` : segment;
    trail.push({ label: segment, path: acc });
  }

  return trail;
});

function encodeRepoPath(path) {
  return path
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
}

async function fetchRepoContents(path) {
  const response = await fetch(`${API_BASE}${encodeRepoPath(path)}`);
  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

function getLocationUrl(path = currentPath.value, previewPath = '') {
  if (typeof window === 'undefined') return '';

  const url = new URL(window.location.href);
  url.searchParams.set('path', path || ROOT_PATH);

  if (previewPath) {
    url.searchParams.set('preview', previewPath);
  } else {
    url.searchParams.delete('preview');
  }

  return url.toString();
}

function syncLocation(path = currentPath.value, previewPath = '') {
  if (typeof window === 'undefined') return;
  window.history.replaceState({}, '', getLocationUrl(path, previewPath));
}

function readLocationState() {
  if (typeof window === 'undefined') {
    return { path: ROOT_PATH, preview: '' };
  }

  const url = new URL(window.location.href);
  return {
    path: url.searchParams.get('path') || ROOT_PATH,
    preview: url.searchParams.get('preview') || '',
  };
}

function openSection(id) {
  navOpen.value = false;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadPath(path, { pushHistory = false } = {}) {
  loading.value = true;
  apiError.value = '';

  try {
    const data = await fetchRepoContents(path);
    items.value = data;
    currentPath.value = path;
    syncLocation(currentPath.value);

    if (pushHistory) {
      pathHistory.value.push(pathHistory.value.length ? currentPath.value : ROOT_PATH);
    }
  } catch (error) {
    console.error(error);
    apiError.value = 'Unable to load items from GitHub right now.';
  } finally {
    loading.value = false;
  }
}

function openFolder(item) {
  pathHistory.value.push(currentPath.value);
  loadPath(item.path);
}

function openRoot() {
  pathHistory.value = [];
  loadPath(ROOT_PATH);
}

function goBack() {
  if (!pathHistory.value.length) return;
  const previous = pathHistory.value.pop();
  loadPath(previous ?? ROOT_PATH);
}

function jumpToBreadcrumb(path) {
  const target = path || ROOT_PATH;
  pathHistory.value = [];
  loadPath(target);
}

function nameToExt(name) {
  return name.includes('.') ? name.split('.').pop().toLowerCase() : '';
}

function showToast(message, type = 'info') {
  const id = ++toastId;
  toasts.value.push({ id, message, type });

  window.setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }, 2600);
}

async function fetchFolderRecursive(path, zipFolder) {
  const data = await fetchRepoContents(path);

  for (const item of data) {
    if (item.type === 'file') {
      const response = await fetch(item.download_url);
      const blob = await response.blob();
      zipFolder.file(item.name, blob);
    } else if (item.type === 'dir') {
      const child = zipFolder.folder(item.name);
      await fetchFolderRecursive(item.path, child);
    }
  }
}

async function downloadFolder(item) {
  try {
    showToast(`Preparing zip for "${item.name}"...`, 'info');
    const { default: JSZip } = await import('jszip');
    const zip = new JSZip();
    const root = zip.folder(item.name);
    await fetchFolderRecursive(item.path, root);
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, `${item.name}.zip`);
    showToast(`Folder download complete: "${item.name}"`, 'success');
  } catch (error) {
    console.error(error);
    showToast(`Unable to download folder "${item.name}"`, 'error');
  }
}

async function downloadFile(item) {
  try {
    showToast(`Downloading "${item.name}"...`, 'info');
    const response = await fetch(item.download_url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const blob = await response.blob();
    saveAs(blob, item.name);
    showToast(`Download complete: "${item.name}"`, 'success');
  } catch (error) {
    console.error(error);
    showToast(`Unable to download "${item.name}"`, 'error');
  }
}

async function previewFile(item) {
  closePreview();
  previewItem.value = item;
  shareMenuOpen.value = false;
  previewState.value = {
    open: true,
    title: item.name,
    kind: 'text',
    src: '',
    html: '',
    text: 'Loading preview...',
    loading: true,
  };

  const ext = nameToExt(item.name);

  try {
    syncLocation(currentPath.value, item.path);

    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'webp') {
      previewState.value.kind = 'image';
      previewState.value.src = item.download_url;
      return;
    }

    if (ext === 'pdf' || ext === 'doc' || ext === 'docx' || ext === 'ppt' || ext === 'pptx' || ext === 'xls' || ext === 'xlsx') {
      const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(item.download_url)}&embedded=true`;
      previewState.value.kind = 'iframe';
      previewState.value.src = viewerUrl;
      return;
    }

    const response = await fetch(item.download_url);
    const text = await response.text();

    if (ext === 'md' || ext === 'markdown') {
      previewState.value.kind = 'markdown';
      previewState.value.html = DOMPurify.sanitize(marked.parse(text));
    } else if (ext === 'html' || ext === 'htm') {
      previewState.value.kind = 'iframe';
      const blob = new Blob([text], { type: 'text/html' });
      if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = URL.createObjectURL(blob);
      previewState.value.src = previewObjectUrl;
    } else {
      previewState.value.kind = 'text';
      previewState.value.text = text;
    }
  } catch (error) {
    console.error(error);
    previewState.value.kind = 'text';
    previewState.value.text = 'Error loading preview.';
  } finally {
    previewState.value.loading = false;
  }
}

function closePreview() {
  shareMenuOpen.value = false;
  previewState.value.open = false;
  previewState.value.title = '';
  previewState.value.kind = 'text';
  previewState.value.src = '';
  previewState.value.html = '';
  previewState.value.text = '';
  previewState.value.loading = false;
  previewItem.value = null;

  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = '';
  }

  syncLocation(currentPath.value);
}

function getShareUrl() {
  if (!previewItem.value) return '';
  return getLocationUrl(currentPath.value, previewItem.value.path);
}

function toggleShareMenu() {
  shareMenuOpen.value = !shareMenuOpen.value;
}

async function copyShareLink() {
  if (!previewItem.value) return;

  const shareUrl = getShareUrl();
  shareMenuOpen.value = false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl);
      showToast('Website link copied.', 'success');
      return;
    }

    window.prompt('Copy this share link', shareUrl);
    showToast('Copy the website link from the prompt.', 'info');
  } catch (error) {
    console.error(error);

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Website link copied.', 'success');
        return;
      }
    } catch (clipboardError) {
      console.error(clipboardError);
    }

    showToast('Unable to share this note right now.', 'error');
  }
}

function requestAction(item, kind) {
  if (kind === 'folder-open') {
    openFolder(item);
  } else if (kind === 'folder-download') {
    downloadFolder(item);
  } else if (kind === 'file-view') {
    previewFile(item);
  } else if (kind === 'file-download') {
    downloadFile(item);
  }
}

function onCardKeydown(event, item) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    if (item.type === 'dir') {
      openFolder(item);
    } else {
      previewFile(item);
    }
  }
}

function submitNewsletter() {
  const email = newsletterEmail.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    newsletterError.value = 'Please enter a valid email address.';
    return;
  }

  newsletterError.value = '';
  newsletterEmail.value = '';
  showToast('Thanks for subscribing. You are on the list.', 'success');
}

function revealSections() {
  const elements = document.querySelectorAll('[data-reveal]');
  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          revealObserver?.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 },
  );

  elements.forEach((element) => revealObserver.observe(element));
}

onMounted(async () => {
  revealSections();
  const initial = readLocationState();
  await loadPath(initial.path || ROOT_PATH);

  if (initial.preview) {
    const match = items.value.find((item) => item.path === initial.preview);
    if (match) {
      await previewFile(match);
    }
  }
});

onBeforeUnmount(() => {
  revealObserver?.disconnect();
  if (previewObjectUrl) URL.revokeObjectURL(previewObjectUrl);
  document.body.style.overflow = '';
});
</script>

<template>
  <div class="min-h-screen bg-[#F8F0DD] text-[#2F261C]">
    <header class="sticky top-0 z-40 border-b border-[#E8D5A3] bg-[#F8F0DD]/95 backdrop-blur-md">
      <div class="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <button class="flex items-center gap-3" @click="openRoot">
          <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E9E96] text-white shadow-lg shadow-[#2E9E96]/25">
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="M12 2c-4.4 0-8 3.3-8 7.4 0 3.6 2.7 6.6 6.3 7.2V21h3.4v-4.4C17.3 16 20 13 20 9.4 20 5.3 16.4 2 12 2zm-1 11.4c-2.8-.5-4.9-2.5-4.9-5 0-2.8 2.5-5.1 5.9-5.1 3.3 0 5.9 2.3 5.9 5.1 0 2.5-2.1 4.5-4.9 5 .1-1.4-.2-2.6-1-3.5-.8.9-1.1 2.1-1 3.5z" />
            </svg>
          </span>
          <div class="text-left">
            <p class="font-display text-2xl font-semibold tracking-tight text-[#2F261C]">ComEng</p>
            <p class="text-xs font-medium uppercase tracking-[0.28em] text-[#7B6C59]">Folder explorer</p>
          </div>
        </button>

        <nav class="hidden items-center gap-2 md:flex">
          <button class="rounded-full px-4 py-2 text-[#2E9E96] transition hover:bg-[#F2E4C8]" @click="openSection('home')">Home</button>
          <button class="rounded-full px-4 py-2 text-[#7B6C59] transition hover:bg-[#F2E4C8]" @click="openSection('browse')">Explorer</button>
          <button class="rounded-full px-4 py-2 text-[#7B6C59] transition hover:bg-[#F2E4C8]" @click="openSection('subscribe')">Subscribe</button>
          <button
            class="ml-2 rounded-full bg-[#2E9E96] px-5 py-2.5 font-semibold text-white shadow-lg shadow-[#2E9E96]/25 transition hover:bg-[#1A7A72]"
            @click="openSection('browse')"
          >
            Get Started
          </button>
        </nav>

        <button
          class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-[#E8D5A3] bg-white/70 text-[#2F261C] md:hidden"
          @click="navOpen = !navOpen"
          aria-label="Toggle navigation"
        >
          <svg v-if="!navOpen" viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <svg v-else viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <transition name="fade">
        <div v-if="navOpen" class="border-t border-[#E8D5A3] bg-[#F8F0DD] md:hidden">
          <div class="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6">
            <button class="rounded-2xl px-4 py-3 text-left font-medium text-[#2E9E96] hover:bg-[#F2E4C8]" @click="openSection('home')">Home</button>
            <button class="rounded-2xl px-4 py-3 text-left font-medium text-[#7B6C59] hover:bg-[#F2E4C8]" @click="openSection('browse')">Explorer</button>
            <button class="rounded-2xl px-4 py-3 text-left font-medium text-[#7B6C59] hover:bg-[#F2E4C8]" @click="openSection('subscribe')">Subscribe</button>
          </div>
        </div>
      </transition>
    </header>

    <main id="home" class="mx-auto w-full max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
      <section
        data-reveal
        class="reveal rounded-[2rem] border border-[#E8D5A3] bg-[radial-gradient(circle_at_top_left,_rgba(232,213,163,0.55),_transparent_30%),linear-gradient(180deg,#F8F0DD_0%,#F2E4C8_100%)] px-5 py-10 shadow-[0_24px_80px_rgba(46,94,138,0.10)] sm:px-8 sm:py-14 lg:px-12 lg:py-16"
      >
        <div class="mx-auto max-w-4xl text-center">
          <div class="mx-auto inline-flex items-center rounded-full border border-[#B7D7D7] bg-white/60 px-5 py-2 text-sm font-semibold uppercase tracking-[0.24em] text-[#2E9E96]">
            Free study resources
          </div>

          <h1 class="font-display mt-8 text-4xl font-semibold leading-[0.98] tracking-tight text-[#2F261C] sm:text-6xl lg:text-7xl">
            Study Smarter with
            <span class="block bg-gradient-to-r from-[#2E9E96] via-[#3BB5AB] to-[#4A7EB5] bg-clip-text text-transparent">
              Curated Notes
            </span>
          </h1>

          <p class="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#7B6C59] sm:text-xl">
            Browse folders first, open into the next branch, preview files, and download exactly what you need from the
            GitHub repository.
          </p>

          <div class="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-[1.4rem] border border-white/70 bg-white/65 px-4 py-5 text-center shadow-[0_10px_30px_rgba(46,94,138,0.08)]">
              <p class="font-display text-4xl font-semibold text-[#2E9E96] sm:text-5xl">{{ dirCount }}</p>
              <p class="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#7B6C59]">Folders</p>
            </div>
            <div class="rounded-[1.4rem] border border-white/70 bg-white/65 px-4 py-5 text-center shadow-[0_10px_30px_rgba(46,94,138,0.08)]">
              <p class="font-display text-4xl font-semibold text-[#2E9E96] sm:text-5xl">{{ fileCount }}</p>
              <p class="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#7B6C59]">Files</p>
            </div>
            <div class="rounded-[1.4rem] border border-white/70 bg-white/65 px-4 py-5 text-center shadow-[0_10px_30px_rgba(46,94,138,0.08)]">
              <p class="font-display text-4xl font-semibold text-[#2E9E96] sm:text-5xl">{{ formatBytes(totalSize) }}</p>
              <p class="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#7B6C59]">Size</p>
            </div>
            <div class="rounded-[1.4rem] border border-white/70 bg-white/65 px-4 py-5 text-center shadow-[0_10px_30px_rgba(46,94,138,0.08)]">
              <p class="font-display truncate text-2xl font-semibold text-[#2E9E96] sm:text-4xl">{{ currentPath }}</p>
              <p class="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#7B6C59]">Current path</p>
            </div>
          </div>
        </div>
      </section>

      <section id="browse" data-reveal class="reveal mt-10 rounded-[2rem] border border-[#E8D5A3] bg-white/75 p-5 shadow-[0_16px_35px_rgba(46,94,138,0.08)] sm:p-6 lg:p-8">
        <div class="flex flex-col gap-4 border-b border-[#E8D5A3] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div class="space-y-2">
            <p class="text-sm font-semibold uppercase tracking-[0.25em] text-[#2E9E96]">Explorer</p>
            <h2 class="font-display text-2xl font-bold text-[#2F261C] sm:text-3xl">Folders first, then files inside each branch</h2>
            <p class="max-w-2xl text-sm leading-6 text-[#7B6C59]">
              Open a folder to move deeper into the repository. Folders show `Open` and `Download`, while files show
              `View` and `Download`.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              class="inline-flex items-center gap-2 rounded-full border border-[#E8D5A3] bg-white px-4 py-2 text-sm font-medium text-[#2F261C] transition hover:bg-[#F2E4C8] disabled:opacity-50"
              :disabled="pathHistory.length === 0"
              @click="goBack"
            >
              <span>←</span>
              Back
            </button>
            <button
              class="inline-flex items-center gap-2 rounded-full border border-[#E8D5A3] bg-white px-4 py-2 text-sm font-medium text-[#2F261C] transition hover:bg-[#F2E4C8]"
              @click="openRoot"
            >
              Root
            </button>
          </div>
        </div>

        <div class="mt-5 flex flex-wrap items-center gap-2">
          <button
            v-for="crumb in breadcrumbs"
            :key="crumb.path"
            class="inline-flex items-center gap-2 rounded-full border border-[#E8D5A3] bg-white px-3 py-2 text-sm text-[#7B6C59] transition hover:bg-[#F2E4C8]"
            @click="jumpToBreadcrumb(crumb.path)"
          >
            <span v-if="crumb.path !== ROOT_PATH">/</span>
            {{ crumb.label }}
          </button>
        </div>

        <div class="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label class="flex w-full max-w-md items-center gap-3 rounded-2xl border border-[#E8D5A3] bg-[#F8F0DD] px-4 py-3 text-[#7B6C59]">
            <svg viewBox="0 0 24 24" class="h-5 w-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="7"></circle>
              <path d="m20 20-3.5-3.5"></path>
            </svg>
            <input
              v-model="search"
              type="search"
              placeholder="Search files in this folder"
              class="w-full bg-transparent text-sm text-[#2F261C] outline-none placeholder:text-[#A48E70]"
            />
          </label>

          <p class="text-sm text-[#7B6C59]">
            Showing <span class="font-semibold text-[#2E9E96]">{{ visibleItems.length }}</span> items in
            <span class="font-semibold text-[#2F261C]">{{ currentPath }}</span>
          </p>
        </div>

        <div v-if="loading" class="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <div v-for="n in 6" :key="n" class="h-56 animate-pulse rounded-[1.8rem] border border-[#E8D5A3] bg-[#F8F0DD]"></div>
        </div>

        <div v-else-if="apiError" class="mt-6 rounded-[1.6rem] border border-[#F1C7C3] bg-[#FFF2F0] px-5 py-4 text-[#A94442]">
          {{ apiError }}
        </div>

        <div v-else-if="visibleItems.length === 0" class="mt-6 rounded-[1.8rem] border border-dashed border-[#E8D5A3] bg-[#FFFDF8] px-6 py-12 text-center">
          <p class="font-display text-3xl font-semibold text-[#2F261C]">This folder is empty</p>
          <p class="mt-2 text-[#7B6C59]">Try going back or searching a different branch.</p>
        </div>

        <div v-else class="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="item in visibleItems"
            :key="item.path"
            tabindex="0"
            role="button"
            class="group rounded-[1.8rem] border border-[#E8D5A3] bg-white/90 p-5 shadow-[0_16px_35px_rgba(46,94,138,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(46,94,138,0.16)] focus:outline-none focus:ring-4 focus:ring-[#2E9E96]/15"
            @click="item.type === 'dir' ? openFolder(item) : previewFile(item)"
            @keydown="onCardKeydown($event, item)"
          >
            <div class="min-w-0">
              <h3 class="font-display break-words text-2xl font-semibold leading-tight text-[#2F261C]">
                {{ item.name }}
              </h3>
            </div>

            <div class="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                v-if="item.type === 'dir'"
                class="flex-1 rounded-full bg-[#2E9E96] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3BB5AB]"
                @click.stop="requestAction(item, 'folder-open')"
              >
                Open
              </button>
              <button
                v-if="item.type === 'dir'"
                class="flex-1 rounded-full border border-[#E8D5A3] bg-white px-4 py-3 text-sm font-semibold text-[#2F261C] transition hover:bg-[#F2E4C8]"
                @click.stop="requestAction(item, 'folder-download')"
              >
                Download
              </button>

              <template v-else>
                <button
                  class="flex-1 rounded-full bg-[#2E9E96] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3BB5AB]"
                  @click.stop="requestAction(item, 'file-view')"
                >
                  View
                </button>
                <button
                  class="flex-1 rounded-full border border-[#E8D5A3] bg-white px-4 py-3 text-sm font-semibold text-[#2F261C] transition hover:bg-[#F2E4C8]"
                  @click.stop="requestAction(item, 'file-download')"
                >
                  Download
                </button>
              </template>
            </div>
          </article>
        </div>
      </section>

      <section data-reveal class="reveal mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="rounded-[2rem] border border-[#E8D5A3] bg-white/80 p-6 shadow-[0_16px_35px_rgba(46,94,138,0.08)] sm:p-8">
          <p class="text-sm font-semibold uppercase tracking-[0.26em] text-[#2E9E96]">Why it works</p>
          <h2 class="font-display mt-2 text-3xl font-semibold text-[#2F261C] sm:text-4xl">A real repository browser, not a fake note list</h2>
          <p class="mt-4 max-w-2xl text-sm leading-7 text-[#7B6C59]">
            Folders are displayed first, each branch opens into its next level, and files expose separate view and
            download actions. That keeps the experience aligned with the actual GitHub structure.
          </p>
          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <div class="rounded-[1.4rem] border border-[#F0E0BA] bg-[#F8F0DD] px-4 py-4 text-sm leading-7 text-[#2F261C]">
              <span class="mr-2 text-[#C9A84C]">●</span>Folders first, files after
            </div>
            <div class="rounded-[1.4rem] border border-[#F0E0BA] bg-[#F8F0DD] px-4 py-4 text-sm leading-7 text-[#2F261C]">
              <span class="mr-2 text-[#C9A84C]">●</span>Open folder or download zip
            </div>
            <div class="rounded-[1.4rem] border border-[#F0E0BA] bg-[#F8F0DD] px-4 py-4 text-sm leading-7 text-[#2F261C]">
              <span class="mr-2 text-[#C9A84C]">●</span>Preview files before saving
            </div>
            <div class="rounded-[1.4rem] border border-[#F0E0BA] bg-[#F8F0DD] px-4 py-4 text-sm leading-7 text-[#2F261C]">
              <span class="mr-2 text-[#C9A84C]">●</span>Breadcrumbs and back navigation
            </div>
          </div>
        </div>

        <div id="subscribe" class="rounded-[2rem] border border-[#E8D5A3] bg-[linear-gradient(180deg,#FFFDF8_0%,#F2E4C8_100%)] p-6 shadow-[0_16px_35px_rgba(46,94,138,0.08)] sm:p-8">
          <p class="text-sm font-semibold uppercase tracking-[0.26em] text-[#2E9E96]">Newsletter</p>
          <h2 class="font-display mt-2 text-3xl font-semibold text-[#2F261C]">Subscribe for new notes</h2>
          <p class="mt-3 text-sm leading-7 text-[#7B6C59]">
            Get updates when new files and folders are added to the collection.
          </p>

          <form class="mt-6 space-y-3" @submit.prevent="submitNewsletter">
            <label class="block text-sm font-medium text-[#2F261C]">
              Email address
              <input
                v-model="newsletterEmail"
                type="email"
                placeholder="you@example.com"
                class="mt-2 w-full rounded-[1.2rem] border border-[#E8D5A3] bg-white px-4 py-3 text-[#2F261C] outline-none transition placeholder:text-[#A48E70] focus:border-[#2E9E96] focus:ring-4 focus:ring-[#2E9E96]/10"
              />
            </label>

            <p v-if="newsletterError" class="text-sm font-medium text-[#A94442]">
              {{ newsletterError }}
            </p>

            <button
              type="submit"
              class="inline-flex w-full items-center justify-center rounded-full bg-[#2E9E96] px-5 py-3.5 font-semibold text-white shadow-lg shadow-[#2E9E96]/20 transition hover:bg-[#1A7A72]"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </main>

    <footer class="border-t border-[#E8D5A3] bg-[#F2E4C8]/65">
      <div class="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-center text-sm text-[#7B6C59] sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between md:text-left">
        <p>Designed with a warm editorial palette and student-first interactions.</p>
        <p>Built with Vue, Vite, and Tailwind CSS.</p>
      </div>
    </footer>

    <transition-group name="toast" tag="div" class="fixed right-4 top-4 z-50 flex w-[calc(100%-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="rounded-[1.4rem] border px-4 py-3 shadow-[0_16px_35px_rgba(46,94,138,0.18)] backdrop-blur-sm"
        :class="toast.type === 'success'
          ? 'border-[#9FD8CB] bg-[#ECF8F3] text-[#1A7A72]'
          : toast.type === 'error'
            ? 'border-[#F1C7C3] bg-[#FFF2F0] text-[#A94442]'
            : 'border-[#CFE1F0] bg-white/95 text-[#2E5F8A]'"
      >
        {{ toast.message }}
      </div>
    </transition-group>

    <transition name="fade">
      <div
        v-if="previewState.open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#1A7A72]/45 px-2 py-2 backdrop-blur-sm sm:px-4 sm:py-4"
        @click.self="closePreview"
      >
        <div class="flex h-[96vh] w-[96vw] max-w-[96vw] flex-col overflow-hidden rounded-[2rem] border border-white/60 bg-[#FFFDF8] shadow-[0_24px_70px_rgba(26,122,114,0.25)]">
          <div class="flex items-start justify-between gap-4 border-b border-[#E8D5A3] px-4 py-4 sm:px-6">
            <div class="flex min-w-0 items-start gap-3">
              <button
                class="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E8D5A3] bg-white text-[#2F261C] transition hover:bg-[#F2E4C8]"
                @click="goBack"
                aria-label="Go back"
                :disabled="pathHistory.length === 0"
              >
                <span class="text-xl font-semibold leading-none">*</span>
              </button>

              <h3 class="min-w-0 break-words font-display text-2xl font-semibold leading-tight text-[#2F261C] sm:text-3xl">
                {{ previewState.title }}
              </h3>
            </div>

            <button
              class="rounded-full border border-[#E8D5A3] bg-white p-2 text-[#7B6C59] transition hover:bg-[#F2E4C8]"
              @click="closePreview"
              aria-label="Close preview"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div class="flex min-h-0 flex-1 flex-col bg-[#F8F0DD]/70 p-4 sm:p-6">
            <div class="flex min-h-0 flex-1 flex-col rounded-[1.4rem] border border-[#E8D5A3] bg-white p-4 shadow-[0_12px_25px_rgba(46,94,138,0.05)] sm:p-5">
              <p class="text-sm font-semibold uppercase tracking-[0.22em] text-[#2E9E96]">Preview</p>

              <div class="mt-4 min-h-0 flex-1 overflow-hidden rounded-2xl border border-[#E8D5A3] bg-[#2D2D2D] p-3 sm:p-4">
                <div v-if="previewState.loading" class="flex h-full min-h-[55vh] items-center justify-center rounded-xl bg-white text-[#7B6C59]">
                  Loading preview...
                </div>
                <div
                  v-else-if="previewState.kind === 'image'"
                  class="flex h-full min-h-[55vh] items-center justify-center overflow-auto rounded-xl bg-[#FAF7F0] p-4"
                >
                  <img
                    :src="previewState.src"
                    :alt="previewState.title"
                    class="h-auto max-h-full w-full rounded-xl object-contain"
                  />
                </div>
                <iframe
                  v-else-if="previewState.kind === 'iframe'"
                  :src="previewState.src"
                  class="h-full min-h-[55vh] w-full rounded-xl border-0 bg-white"
                  title="File preview"
                ></iframe>
                <div
                  v-else-if="previewState.kind === 'markdown'"
                  class="markdown-preview h-full min-h-[55vh] overflow-auto rounded-xl bg-white p-6 text-[#2F261C] sm:p-8"
                  v-html="previewState.html"
                ></div>
                <pre
                  v-else
                  class="h-full min-h-[55vh] overflow-auto whitespace-pre-wrap rounded-xl bg-white p-6 text-sm leading-7 text-[#2F261C] sm:p-8"
                >{{ previewState.text }}</pre>
              </div>
            </div>

            <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div class="relative w-full sm:w-auto">
                <button
                  class="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E8D5A3] bg-white px-5 py-3.5 font-semibold text-[#2F261C] transition hover:bg-[#F2E4C8] sm:w-auto sm:min-w-[148px]"
                  @click.stop="toggleShareMenu"
                  :aria-expanded="shareMenuOpen"
                  aria-label="Share this preview"
                >
                  <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                    <path d="m12 3 4 4-4 4" />
                    <path d="M12 7c-3.7 0-6.9 2.2-8 5.5" />
                  </svg>
                  <span>Share</span>
                </button>

                <div
                  v-if="shareMenuOpen"
                  class="absolute bottom-full left-0 z-20 mb-2 w-full overflow-hidden rounded-[1.2rem] border border-[#E8D5A3] bg-white shadow-[0_14px_30px_rgba(46,94,138,0.18)] sm:w-64"
                >
                  <button
                    class="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-[#2F261C] transition hover:bg-[#F8F0DD]"
                    @click="copyShareLink"
                  >
                    <svg viewBox="0 0 24 24" class="h-4 w-4 text-[#2E9E96]" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M10 13a5 5 0 0 0 7.07 0l1.93-1.93a5 5 0 1 0-7.07-7.07L10.5 6.5" />
                      <path d="M14 11a5 5 0 0 0-7.07 0L5 12.93a5 5 0 1 0 7.07 7.07L13.5 17.5" />
                    </svg>
                    Copy website link
                  </button>
                </div>
              </div>

              <button
                class="w-full rounded-full bg-[#2E9E96] px-5 py-3.5 font-semibold text-white shadow-lg shadow-[#2E9E96]/20 transition hover:bg-[#3BB5AB] sm:w-auto sm:min-w-[160px]"
                @click="previewItem && downloadFile(previewItem)"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
