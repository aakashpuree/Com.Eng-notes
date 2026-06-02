<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { saveAs } from 'file-saver';

const navOpen = ref(false);
const search = ref('');
const activeCategory = ref('All');
const previewNote = ref(null);
const newsletterEmail = ref('');
const newsletterError = ref('');
const resultsRef = ref(null);

const toasts = ref([]);
let toastId = 0;
let revealObserver = null;

const categories = [
  'All',
  'Computer Science',
  'Physics',
  'Mathematics',
  'Chemistry',
  'Biology',
  'English',
  'Electronics',
  'Java Programming',
  'Operating Systems',
  'Web Development',
];

const notes = [
  {
    id: 'computer-science-foundations',
    title: 'Computer Science Foundations',
    subject: 'Computer Science',
    description: 'An elegant starter note on systems thinking, hardware basics, and the language of modern computing.',
    pages: 28,
    downloads: 2140,
    rating: 4.9,
    size: '3.2 MB',
    featured: true,
    filename: 'computer-science-foundations.md',
    keywords: ['hardware', 'software', 'fundamentals', 'systems'],
    chapters: [
      { title: 'What is a computer system?', pages: 6 },
      { title: 'Hardware vs software', pages: 5 },
      { title: 'Input, processing, output', pages: 7 },
      { title: 'Data representation basics', pages: 10 },
    ],
  },
  {
    id: 'physics-motion-and-forces',
    title: 'Motion and Forces',
    subject: 'Physics',
    description: 'Clear, classroom-friendly motion notes with formulas, examples, and quick revision points.',
    pages: 24,
    downloads: 1320,
    rating: 4.8,
    size: '2.8 MB',
    featured: false,
    filename: 'motion-and-forces.md',
    keywords: ['motion', 'force', 'physics', 'velocity'],
    chapters: [
      { title: 'Scalars and vectors', pages: 5 },
      { title: 'Newton’s laws', pages: 8 },
      { title: 'Speed and velocity', pages: 5 },
      { title: 'Motion graphs', pages: 6 },
    ],
  },
  {
    id: 'mathematics-functions',
    title: 'Functions and Graphs',
    subject: 'Mathematics',
    description: 'A tidy set of notes for functions, relations, and visual graph interpretation.',
    pages: 26,
    downloads: 1180,
    rating: 4.9,
    size: '3.0 MB',
    featured: false,
    filename: 'functions-and-graphs.md',
    keywords: ['functions', 'graphs', 'algebra', 'math'],
    chapters: [
      { title: 'Relations and mappings', pages: 7 },
      { title: 'Types of functions', pages: 6 },
      { title: 'Graph transformations', pages: 5 },
      { title: 'Practice problems', pages: 8 },
    ],
  },
  {
    id: 'chemistry-bonding',
    title: 'Chemical Bonding Basics',
    subject: 'Chemistry',
    description: 'Bonding theory, structures, and easy-to-scan comparisons for exam revision.',
    pages: 22,
    downloads: 980,
    rating: 4.8,
    size: '2.4 MB',
    featured: false,
    filename: 'chemical-bonding-basics.md',
    keywords: ['chemistry', 'bonding', 'atoms', 'molecules'],
    chapters: [
      { title: 'Ionic bonds', pages: 6 },
      { title: 'Covalent bonds', pages: 6 },
      { title: 'Metallic bonding', pages: 4 },
      { title: 'Polarity and shape', pages: 6 },
    ],
  },
  {
    id: 'biology-cell-structure',
    title: 'Cell Structure and Function',
    subject: 'Biology',
    description: 'A clean visual note covering organelles, membranes, and the parts of a living cell.',
    pages: 30,
    downloads: 1245,
    rating: 4.9,
    size: '3.6 MB',
    featured: false,
    filename: 'cell-structure-and-function.md',
    keywords: ['cells', 'biology', 'organelles', 'life science'],
    chapters: [
      { title: 'Cell theory', pages: 5 },
      { title: 'Cell membrane', pages: 7 },
      { title: 'Nucleus and cytoplasm', pages: 8 },
      { title: 'Organelles overview', pages: 10 },
    ],
  },
  {
    id: 'english-grammar-essentials',
    title: 'English Grammar Essentials',
    subject: 'English',
    description: 'Simple rules, examples, and practice prompts for quick language revision.',
    pages: 20,
    downloads: 860,
    rating: 4.8,
    size: '2.2 MB',
    featured: false,
    filename: 'english-grammar-essentials.md',
    keywords: ['grammar', 'english', 'language', 'writing'],
    chapters: [
      { title: 'Parts of speech', pages: 6 },
      { title: 'Sentence structure', pages: 5 },
      { title: 'Tenses and usage', pages: 5 },
      { title: 'Common mistakes', pages: 4 },
    ],
  },
  {
    id: 'electronics-digital-logic',
    title: 'Digital Logic Systems',
    subject: 'Electronics',
    description: 'Boolean logic, gates, and conversion tables in a compact, exam-ready format.',
    pages: 27,
    downloads: 1120,
    rating: 4.9,
    size: '3.1 MB',
    featured: false,
    filename: 'digital-logic-systems.md',
    keywords: ['logic', 'gates', 'electronics', 'binary'],
    chapters: [
      { title: 'Number systems', pages: 7 },
      { title: 'Logic gates', pages: 8 },
      { title: 'Truth tables', pages: 5 },
      { title: 'Combinational circuits', pages: 7 },
    ],
  },
  {
    id: 'java-oop-notes',
    title: 'Java OOP Notes',
    subject: 'Java Programming',
    description: 'Classes, objects, inheritance, and methods explained with a developer-friendly flow.',
    pages: 34,
    downloads: 1490,
    rating: 5.0,
    size: '3.8 MB',
    featured: false,
    filename: 'java-oop-notes.md',
    keywords: ['java', 'oop', 'programming', 'inheritance'],
    chapters: [
      { title: 'Classes and objects', pages: 8 },
      { title: 'Constructors and methods', pages: 8 },
      { title: 'Inheritance and polymorphism', pages: 10 },
      { title: 'Exception handling', pages: 8 },
    ],
  },
  {
    id: 'operating-systems-principles',
    title: 'Operating Systems Principles',
    subject: 'Operating Systems',
    description: 'Processes, memory, files, and scheduling explained for quick review and class discussion.',
    pages: 32,
    downloads: 1640,
    rating: 4.9,
    size: '3.5 MB',
    featured: false,
    filename: 'operating-systems-principles.md',
    keywords: ['os', 'process', 'memory', 'files'],
    chapters: [
      { title: 'OS overview', pages: 6 },
      { title: 'Process scheduling', pages: 10 },
      { title: 'Memory management', pages: 8 },
      { title: 'File systems', pages: 8 },
    ],
  },
  {
    id: 'web-development-foundations',
    title: 'Web Development Foundations',
    subject: 'Web Development',
    description: 'A gentle introduction to HTML, CSS, JavaScript, and how the web works.',
    pages: 29,
    downloads: 1380,
    rating: 4.9,
    size: '3.3 MB',
    featured: false,
    filename: 'web-development-foundations.md',
    keywords: ['html', 'css', 'javascript', 'web'],
    chapters: [
      { title: 'HTML structure', pages: 7 },
      { title: 'CSS styling', pages: 8 },
      { title: 'JavaScript basics', pages: 7 },
      { title: 'Responsive layouts', pages: 7 },
    ],
  },
  {
    id: 'physics-electricity',
    title: 'Electricity and Circuits',
    subject: 'Physics',
    description: 'Current, voltage, resistance, and circuit diagrams organized for fast revision.',
    pages: 23,
    downloads: 990,
    rating: 4.8,
    size: '2.6 MB',
    featured: false,
    filename: 'electricity-and-circuits.md',
    keywords: ['electricity', 'current', 'voltage', 'circuits'],
    chapters: [
      { title: 'Current and charge', pages: 5 },
      { title: 'Ohm’s law', pages: 6 },
      { title: 'Series and parallel circuits', pages: 6 },
      { title: 'Circuit symbols', pages: 6 },
    ],
  },
  {
    id: 'mathematics-statistics',
    title: 'Statistics and Probability',
    subject: 'Mathematics',
    description: 'Mean, median, probability, and data interpretation in a visual study note.',
    pages: 25,
    downloads: 1050,
    rating: 4.8,
    size: '2.9 MB',
    featured: false,
    filename: 'statistics-and-probability.md',
    keywords: ['statistics', 'probability', 'data', 'math'],
    chapters: [
      { title: 'Data collection', pages: 6 },
      { title: 'Averages', pages: 6 },
      { title: 'Probability basics', pages: 7 },
      { title: 'Charts and interpretation', pages: 6 },
    ],
  },
];

const subjectCards = [
  { name: 'Computer Science', search: 'computer science', category: 'Computer Science' },
  { name: 'Physics', search: 'physics', category: 'Physics' },
  { name: 'Mathematics', search: 'mathematics', category: 'Mathematics' },
  { name: 'Chemistry', search: 'chemistry', category: 'Chemistry' },
  { name: 'Biology', search: 'biology', category: 'Biology' },
  { name: 'English', search: 'english', category: 'English' },
  { name: 'Electronics', search: 'electronics', category: 'Electronics' },
  { name: 'Java Programming', search: 'java', category: 'Java Programming' },
  { name: 'Operating Systems', search: 'operating systems', category: 'Operating Systems' },
  { name: 'Web Development', search: 'web development', category: 'Web Development' },
];

const featuredNote = computed(() => notes.find((note) => note.featured) ?? notes[0]);

const totalDownloads = computed(() => notes.reduce((sum, note) => sum + note.downloads, 0));

const averageRating = computed(() => {
  const value = notes.reduce((sum, note) => sum + note.rating, 0) / notes.length;
  return value.toFixed(1);
});

const stats = computed(() => [
  { value: `${notes.length}`, label: 'Notes' },
  { value: `${categories.length - 1}`, label: 'Subjects' },
  { value: formatCompactDownloads(totalDownloads.value), label: 'Downloads' },
  { value: averageRating.value, label: 'Rating' },
]);

const filteredNotes = computed(() => {
  const query = search.value.trim().toLowerCase();

  return notes.filter((note) => {
    const matchesCategory = activeCategory.value === 'All' || note.subject === activeCategory.value;
    if (!matchesCategory) return false;

    if (!query) return true;

    const haystack = [
      note.title,
      note.subject,
      note.description,
      note.size,
      ...note.keywords,
      ...note.chapters.map((chapter) => chapter.title),
    ]
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
});

function formatCompactDownloads(value) {
  if (value >= 1000) {
    return `${Math.floor(value / 1000)}K+`;
  }
  return `${value}`;
}

function openSection(id) {
  navOpen.value = false;
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setCategory(category) {
  activeCategory.value = category;
  scrollToResults();
}

function selectSubjectCard(card) {
  activeCategory.value = card.category;
  search.value = card.search;
  scrollToResults();
}

function scrollToResults() {
  nextTick(() => {
    resultsRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

function openPreview(note) {
  previewNote.value = note;
  document.body.style.overflow = 'hidden';
}

function closePreview() {
  previewNote.value = null;
  document.body.style.overflow = '';
}

function pushToast(message, type = 'info') {
  const id = ++toastId;
  toasts.value.push({ id, message, type });

  window.setTimeout(() => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  }, 2800);
}

function downloadNote(note) {
  pushToast(`Preparing "${note.title}"...`, 'info');

  window.setTimeout(() => {
    const content = buildDownloadContent(note);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    saveAs(blob, note.filename);
    pushToast(`Download complete: "${note.title}"`, 'success');
  }, 900);
}

function buildDownloadContent(note) {
  const chapterLines = note.chapters
    .map((chapter, index) => `${index + 1}. ${chapter.title} (${chapter.pages} pages)`)
    .join('\n');

  return `# ${note.title}\n\n` +
    `Subject: ${note.subject}\n` +
    `Pages: ${note.pages}\n` +
    `Rating: ${note.rating}\n` +
    `File size: ${note.size}\n` +
    `Downloads: ${note.downloads}\n\n` +
    `## Description\n${note.description}\n\n` +
    `## Chapters\n${chapterLines}\n`;
}

function submitNewsletter() {
  const email = newsletterEmail.value.trim();
  const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (!isValid) {
    newsletterError.value = 'Please enter a valid email address.';
    return;
  }

  newsletterError.value = '';
  newsletterEmail.value = '';
  pushToast('Thanks for subscribing. You are on the list.', 'success');
}

function subjectCount(subject) {
  return notes.filter((note) => note.subject === subject).length;
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

onMounted(() => {
  revealSections();
});

onBeforeUnmount(() => {
  revealObserver?.disconnect();
  document.body.style.overflow = '';
});

const sectionFeatures = [
  'Live search by title, subject, or keyword',
  'Category filters and clickable subject cards',
  'Preview modal with metadata and chapter list',
  'Two-step download toasts for a polished flow',
];
</script>

<template>
  <div class="min-h-screen bg-[#F8F0DD] text-[#2F261C]">
    <header class="sticky top-0 z-40 border-b border-[#E8D5A3] bg-[#F8F0DD]/95 backdrop-blur-md">
      <div class="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <button class="flex items-center gap-3" @click="openSection('home')">
          <span class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2E9E96] text-white shadow-lg shadow-[#2E9E96]/25">
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="currentColor" aria-hidden="true">
              <path d="M12 2c-4.4 0-8 3.3-8 7.4 0 3.6 2.7 6.6 6.3 7.2V21h3.4v-4.4C17.3 16 20 13 20 9.4 20 5.3 16.4 2 12 2zm-1 11.4c-2.8-.5-4.9-2.5-4.9-5 0-2.8 2.5-5.1 5.9-5.1 3.3 0 5.9 2.3 5.9 5.1 0 2.5-2.1 4.5-4.9 5 .1-1.4-.2-2.6-1-3.5-.8.9-1.1 2.1-1 3.5z" />
            </svg>
          </span>
          <div class="text-left">
            <p class="font-display text-2xl font-semibold tracking-tight text-[#2F261C]">CEN</p>
            <p class="text-xs font-medium uppercase tracking-[0.28em] text-[#7B6C59]">Free study resources</p>
          </div>
        </button>

        <nav class="hidden items-center gap-2 md:flex">
          <button class="rounded-full px-4 py-2 text-[#2E9E96] transition hover:bg-[#F2E4C8]" @click="openSection('home')">
            Home
          </button>
          <button class="rounded-full px-4 py-2 text-[#7B6C59] transition hover:bg-[#F2E4C8]" @click="openSection('subjects')">
            Subjects
          </button>
          <button class="rounded-full px-4 py-2 text-[#7B6C59] transition hover:bg-[#F2E4C8]" @click="openSection('browse')">
            Browse Notes
          </button>
          <button class="rounded-full px-4 py-2 text-[#7B6C59] transition hover:bg-[#F2E4C8]" @click="openSection('subscribe')">
            Subscribe
          </button>
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
            <button class="rounded-2xl px-4 py-3 text-left font-medium text-[#7B6C59] hover:bg-[#F2E4C8]" @click="openSection('subjects')">Subjects</button>
            <button class="rounded-2xl px-4 py-3 text-left font-medium text-[#7B6C59] hover:bg-[#F2E4C8]" @click="openSection('browse')">Browse Notes</button>
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

          <h1 class="font-display mt-8 text-5xl font-semibold leading-[0.95] tracking-tight text-[#2F261C] sm:text-6xl lg:text-7xl">
            Study Smarter with
            <span class="block bg-gradient-to-r from-[#2E9E96] via-[#3BB5AB] to-[#4A7EB5] bg-clip-text text-transparent">
              Curated Notes
            </span>
          </h1>

          <p class="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#7B6C59] sm:text-xl">
            Browse, preview, and download high-quality notes across subjects. Built for students who want clarity,
            speed, and a beautiful study space.
          </p>

          <div class="mx-auto mt-10 max-w-3xl rounded-[1.6rem] border border-white/70 bg-white px-4 py-3 shadow-[0_14px_40px_rgba(46,94,138,0.10)]">
            <label class="flex items-center gap-3">
              <svg viewBox="0 0 24 24" class="h-6 w-6 shrink-0 text-[#A48E70]" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                v-model="search"
                type="search"
                placeholder="Search notes by title, subject, or keyword..."
                class="w-full bg-transparent py-3 text-base text-[#2F261C] outline-none placeholder:text-[#A48E70]"
              />
            </label>
          </div>

          <div class="mt-6 flex flex-wrap justify-center gap-2">
            <button
              v-for="category in categories"
              :key="category"
              class="rounded-full border px-4 py-2 text-sm font-medium transition"
              :class="activeCategory === category
                ? 'border-[#2E9E96] bg-[#2E9E96] text-white shadow-lg shadow-[#2E9E96]/20'
                : 'border-[#E8D5A3] bg-white/70 text-[#7B6C59] hover:bg-[#F2E4C8]'"
              @click="setCategory(category)"
            >
              {{ category }}
            </button>
          </div>

          <div class="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div
              v-for="item in stats"
              :key="item.label"
              class="rounded-[1.4rem] border border-white/70 bg-white/65 px-4 py-5 text-center shadow-[0_10px_30px_rgba(46,94,138,0.08)]"
            >
              <p class="font-display text-4xl font-semibold text-[#2E9E96] sm:text-5xl">{{ item.value }}</p>
              <p class="mt-1 text-xs font-semibold uppercase tracking-[0.25em] text-[#7B6C59]">{{ item.label }}</p>
            </div>
          </div>
        </div>
      </section>

      <section
        data-reveal
        class="reveal mt-10 rounded-[2rem] bg-[linear-gradient(135deg,#1A7A72_0%,#2E5F8A_100%)] px-6 py-6 text-white shadow-[0_24px_70px_rgba(26,122,114,0.22)] sm:px-8 sm:py-8"
      >
        <div class="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-center">
          <div>
            <div class="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#F2E4C8]">
              Featured section
            </div>
            <h2 class="font-display mt-4 text-3xl font-semibold sm:text-4xl">
              Featured note: {{ featuredNote.title }}
            </h2>
            <p class="mt-3 max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
              {{ featuredNote.description }}
            </p>

            <div class="mt-6 flex flex-wrap gap-3 text-sm">
              <span class="rounded-full bg-white/12 px-4 py-2">Pages: {{ featuredNote.pages }}</span>
              <span class="rounded-full bg-white/12 px-4 py-2">Downloads: {{ featuredNote.downloads.toLocaleString() }}</span>
              <span class="rounded-full bg-white/12 px-4 py-2">Rating: {{ featuredNote.rating }}</span>
              <span class="rounded-full bg-white/12 px-4 py-2">Size: {{ featuredNote.size }}</span>
            </div>

            <div class="mt-6 flex flex-wrap gap-3">
              <button
                class="rounded-full bg-[#2E9E96] px-5 py-3 font-semibold text-white transition hover:bg-[#3BB5AB]"
                @click="openPreview(featuredNote)"
              >
                Preview top note
              </button>
              <button
                class="rounded-full border border-white/20 bg-white/10 px-5 py-3 font-semibold text-white transition hover:bg-white/15"
                @click="downloadNote(featuredNote)"
              >
                Download now
              </button>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div
              v-for="stat in [
                { label: 'Top chapter', value: featuredNote.chapters[0].title },
                { label: 'Total chapters', value: `${featuredNote.chapters.length}` },
                { label: 'Curated for', value: featuredNote.subject },
                { label: 'Warm palette', value: 'teal, blue, gold' },
              ]"
              :key="stat.label"
              class="rounded-[1.4rem] border border-white/12 bg-white/10 p-4 backdrop-blur-sm"
            >
              <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#F2E4C8]">{{ stat.label }}</p>
              <p class="mt-2 text-sm font-medium text-white">{{ stat.value }}</p>
            </div>
          </div>
        </div>
      </section>

      <section id="subjects" data-reveal class="reveal mt-10">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.26em] text-[#2E9E96]">Subjects</p>
            <h2 class="font-display mt-2 text-3xl font-semibold text-[#2F261C] sm:text-4xl">Click a subject to search instantly</h2>
          </div>
          <button class="hidden rounded-full border border-[#E8D5A3] bg-white/70 px-4 py-2 text-sm font-medium text-[#7B6C59] sm:inline-flex" @click="setCategory('All')">
            Clear filters
          </button>
        </div>

        <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <button
            v-for="(card, index) in subjectCards"
            :key="card.name"
            class="group rounded-[1.6rem] border border-[#E8D5A3] bg-white/75 p-5 text-left shadow-[0_12px_30px_rgba(46,94,138,0.08)] transition hover:-translate-y-1 hover:border-[#2E9E96]/40 hover:bg-white"
            @click="selectSubjectCard(card)"
          >
            <div class="flex items-center justify-between">
              <div
                class="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-lg"
                :class="index % 4 === 0 ? 'bg-[#2E9E96]' : index % 4 === 1 ? 'bg-[#4A7EB5]' : index % 4 === 2 ? 'bg-[#C9A84C]' : 'bg-[#3BB5AB]'"
              >
                {{ card.name.charAt(0) }}
              </div>
              <span class="text-xs font-semibold uppercase tracking-[0.2em] text-[#A48E70]">{{ subjectCount(card.category) }} notes</span>
            </div>
            <p class="mt-4 font-display text-xl font-semibold text-[#2F261C]">{{ card.name }}</p>
            <p class="mt-2 text-sm leading-6 text-[#7B6C59]">Tap to filter the library and jump to the note grid.</p>
          </button>
        </div>
      </section>

      <section id="browse" ref="resultsRef" data-reveal class="reveal mt-10">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.26em] text-[#2E9E96]">Browse notes</p>
            <h2 class="font-display mt-2 text-3xl font-semibold text-[#2F261C] sm:text-4xl">12 curated notes with rich previews</h2>
          </div>
          <p class="text-sm text-[#7B6C59]">
            Showing <span class="font-semibold text-[#2E9E96]">{{ filteredNotes.length }}</span> results in
            <span class="font-semibold">{{ activeCategory }}</span>
          </p>
        </div>

        <div class="mt-6 flex flex-wrap gap-2">
          <button
            v-for="category in categories"
            :key="`browse-${category}`"
            class="rounded-full border px-4 py-2 text-sm font-medium transition"
            :class="activeCategory === category
              ? 'border-[#2E9E96] bg-[#2E9E96] text-white'
              : 'border-[#E8D5A3] bg-white/70 text-[#7B6C59] hover:bg-[#F2E4C8]'"
            @click="setCategory(category)"
          >
            {{ category }}
          </button>
        </div>

        <div v-if="filteredNotes.length" class="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="note in filteredNotes"
            :key="note.id"
            tabindex="0"
            role="button"
            class="group rounded-[1.8rem] border border-[#E8D5A3] bg-white/85 p-5 shadow-[0_16px_35px_rgba(46,94,138,0.08)] transition hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(46,94,138,0.16)] focus:outline-none focus:ring-4 focus:ring-[#2E9E96]/15"
            @click="openPreview(note)"
            @keydown.enter.prevent="openPreview(note)"
            @keydown.space.prevent="openPreview(note)"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="min-w-0">
                <div class="inline-flex rounded-full bg-[#F2E4C8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#2E9E96]">
                  {{ note.subject }}
                </div>
                <h3 class="font-display mt-4 text-2xl font-semibold leading-tight text-[#2F261C]">
                  {{ note.title }}
                </h3>
              </div>
              <div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#2E9E96]/12 text-[#2E9E96]">
                <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 3h9l3 3v15H6z" />
                  <path d="M15 3v5h5" />
                </svg>
              </div>
            </div>

            <p class="mt-4 text-sm leading-7 text-[#7B6C59]">
              {{ note.description }}
            </p>

            <div class="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div class="rounded-2xl bg-[#F8F0DD] px-3 py-3">
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#A48E70]">Pages</p>
                <p class="mt-1 font-semibold text-[#2F261C]">{{ note.pages }}</p>
              </div>
              <div class="rounded-2xl bg-[#F8F0DD] px-3 py-3">
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#A48E70]">Size</p>
                <p class="mt-1 font-semibold text-[#2F261C]">{{ note.size }}</p>
              </div>
              <div class="rounded-2xl bg-[#F8F0DD] px-3 py-3">
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#A48E70]">Downloads</p>
                <p class="mt-1 font-semibold text-[#2F261C]">{{ note.downloads.toLocaleString() }}</p>
              </div>
              <div class="rounded-2xl bg-[#F8F0DD] px-3 py-3">
                <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#A48E70]">Rating</p>
                <p class="mt-1 flex items-center gap-1 font-semibold text-[#2F261C]">
                  <span class="text-[#C9A84C]">★</span>
                  {{ note.rating }}
                </p>
              </div>
            </div>

            <div class="mt-5 flex flex-wrap gap-2">
              <span
                v-for="chapter in note.chapters.slice(0, 2)"
                :key="chapter.title"
                class="rounded-full border border-[#E8D5A3] bg-white px-3 py-1 text-xs text-[#7B6C59]"
              >
                {{ chapter.title }}
              </span>
            </div>

            <div class="mt-6 flex gap-3">
              <button
                class="flex-1 rounded-full bg-[#2E9E96] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#3BB5AB]"
                @click.stop="openPreview(note)"
              >
                Preview
              </button>
              <button
                class="flex-1 rounded-full border border-[#E8D5A3] bg-white px-4 py-3 text-sm font-semibold text-[#2F261C] transition hover:bg-[#F2E4C8]"
                @click.stop="downloadNote(note)"
              >
                Download
              </button>
            </div>
          </article>
        </div>

        <div v-else class="mt-6 rounded-[1.8rem] border border-dashed border-[#E8D5A3] bg-white/70 px-6 py-12 text-center">
          <p class="font-display text-3xl font-semibold text-[#2F261C]">No matching notes</p>
          <p class="mt-2 text-[#7B6C59]">Try a different keyword or clear the category filter.</p>
        </div>
      </section>

      <section data-reveal class="reveal mt-10 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="rounded-[2rem] border border-[#E8D5A3] bg-white/80 p-6 shadow-[0_16px_35px_rgba(46,94,138,0.08)] sm:p-8">
          <p class="text-sm font-semibold uppercase tracking-[0.26em] text-[#2E9E96]">Why it works</p>
          <h2 class="font-display mt-2 text-3xl font-semibold text-[#2F261C] sm:text-4xl">A warm learning space with modern utility</h2>
          <p class="mt-4 max-w-2xl text-sm leading-7 text-[#7B6C59]">
            This layout follows the palette mapping you shared: light yellow surfaces, teal brand actions, blue
            secondary accents, gold highlights, and deep shaded sections for featured content.
          </p>
          <div class="mt-6 grid gap-3 sm:grid-cols-2">
            <div
              v-for="feature in sectionFeatures"
              :key="feature"
              class="rounded-[1.4rem] border border-[#F0E0BA] bg-[#F8F0DD] px-4 py-4 text-sm leading-7 text-[#2F261C]"
            >
              <span class="mr-2 text-[#C9A84C]">●</span>{{ feature }}
            </div>
          </div>
        </div>

        <div id="subscribe" class="rounded-[2rem] border border-[#E8D5A3] bg-[linear-gradient(180deg,#FFFDF8_0%,#F2E4C8_100%)] p-6 shadow-[0_16px_35px_rgba(46,94,138,0.08)] sm:p-8">
          <p class="text-sm font-semibold uppercase tracking-[0.26em] text-[#2E9E96]">Newsletter</p>
          <h2 class="font-display mt-2 text-3xl font-semibold text-[#2F261C]">Subscribe for new notes</h2>
          <p class="mt-3 text-sm leading-7 text-[#7B6C59]">
            Get updates when fresh study notes, chapters, and revision packs are added.
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
      <div class="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-[#7B6C59] sm:px-6 lg:px-8 md:flex-row md:items-center md:justify-between">
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
        v-if="previewNote"
        class="fixed inset-0 z-50 flex items-center justify-center bg-[#1A7A72]/45 px-4 py-6 backdrop-blur-sm"
        @click.self="closePreview"
      >
        <div class="max-h-[92vh] w-full max-w-4xl overflow-hidden rounded-[2rem] border border-white/60 bg-[#FFFDF8] shadow-[0_24px_70px_rgba(26,122,114,0.25)]">
          <div class="flex items-start justify-between gap-4 border-b border-[#E8D5A3] px-5 py-4 sm:px-6">
            <div>
              <div class="inline-flex rounded-full bg-[#F2E4C8] px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#2E9E96]">
                Preview modal
              </div>
              <h3 class="font-display mt-3 text-3xl font-semibold text-[#2F261C]">
                {{ previewNote.title }}
              </h3>
            </div>
            <button
              class="rounded-full border border-[#E8D5A3] bg-white p-2 text-[#7B6C59] transition hover:bg-[#F2E4C8]"
              @click="closePreview"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <div class="grid gap-0 lg:grid-cols-[1.2fr_0.8fr]">
            <div class="border-b border-[#E8D5A3] bg-[#F8F0DD]/70 p-5 sm:p-6 lg:border-b-0 lg:border-r">
              <div class="grid gap-3 sm:grid-cols-4">
                <div class="rounded-[1.2rem] bg-white p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#A48E70]">Subject</p>
                  <p class="mt-2 font-semibold text-[#2F261C]">{{ previewNote.subject }}</p>
                </div>
                <div class="rounded-[1.2rem] bg-white p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#A48E70]">Pages</p>
                  <p class="mt-2 font-semibold text-[#2F261C]">{{ previewNote.pages }}</p>
                </div>
                <div class="rounded-[1.2rem] bg-white p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#A48E70]">Downloads</p>
                  <p class="mt-2 font-semibold text-[#2F261C]">{{ previewNote.downloads.toLocaleString() }}</p>
                </div>
                <div class="rounded-[1.2rem] bg-white p-4">
                  <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#A48E70]">Rating</p>
                  <p class="mt-2 flex items-center gap-1 font-semibold text-[#2F261C]">
                    <span class="text-[#C9A84C]">★</span>
                    {{ previewNote.rating }}
                  </p>
                </div>
              </div>

              <div class="mt-5 rounded-[1.4rem] border border-[#E8D5A3] bg-white p-5">
                <p class="text-sm font-semibold uppercase tracking-[0.22em] text-[#2E9E96]">Description</p>
                <p class="mt-3 text-sm leading-7 text-[#7B6C59]">{{ previewNote.description }}</p>
              </div>

              <div class="mt-5">
                <p class="text-sm font-semibold uppercase tracking-[0.22em] text-[#2E9E96]">Chapter list</p>
                <div class="mt-3 space-y-3">
                  <div
                    v-for="(chapter, index) in previewNote.chapters"
                    :key="chapter.title"
                    class="flex items-center justify-between gap-4 rounded-[1.2rem] border border-[#E8D5A3] bg-white px-4 py-3"
                  >
                    <div>
                      <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[#A48E70]">Chapter {{ index + 1 }}</p>
                      <p class="mt-1 font-medium text-[#2F261C]">{{ chapter.title }}</p>
                    </div>
                    <div class="rounded-full bg-[#F2E4C8] px-3 py-1 text-sm font-semibold text-[#2E9E96]">
                      {{ chapter.pages }} pages
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="flex flex-col justify-between bg-[linear-gradient(180deg,#FFFDF8_0%,#F2E4C8_100%)] p-5 sm:p-6">
              <div>
                <p class="text-sm font-semibold uppercase tracking-[0.22em] text-[#2E9E96]">Quick actions</p>
                <h4 class="font-display mt-2 text-2xl font-semibold text-[#2F261C]">Ready to save for offline study?</h4>
                <p class="mt-3 text-sm leading-7 text-[#7B6C59]">
                  Use the buttons below to return to the library or download this note immediately.
                </p>
              </div>

              <div class="mt-8 space-y-3">
                <button
                  class="w-full rounded-full border border-[#E8D5A3] bg-white px-5 py-3.5 font-semibold text-[#2F261C] transition hover:bg-[#F2E4C8]"
                  @click="closePreview"
                >
                  Back
                </button>
                <button
                  class="w-full rounded-full bg-[#2E9E96] px-5 py-3.5 font-semibold text-white shadow-lg shadow-[#2E9E96]/20 transition hover:bg-[#3BB5AB]"
                  @click="downloadNote(previewNote)"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
