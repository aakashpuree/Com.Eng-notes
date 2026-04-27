const API_BASE = "https://api.github.com/repos/aakashpuree/class-11-notes/contents/";
let currentPath = "";
let pathHistory = [];

// DOM Elements
const fileGrid = document.getElementById("file-grid");
const filePathDisplay = document.getElementById("file-path");
const backBtn = document.getElementById("back-btn");
const statusBar = document.getElementById("status-bar");

// Modals
const previewModal = document.getElementById("preview-modal");
const closePreviewBtn = document.getElementById("close-preview");
const previewTitle = document.getElementById("preview-title");
const previewBody = document.getElementById("preview-body");
const btnDownloadPreview = document.getElementById("btn-download-preview");

const confirmModal = document.getElementById("confirm-modal");
const closeConfirmBtn = document.getElementById("close-confirm");
const confirmText = document.getElementById("confirm-text");
const confirmCancelBtn = document.getElementById("confirm-cancel");
const confirmYesBtn = document.getElementById("confirm-yes");

let confirmAction = null; // Store function to execute upon confirmation

// Initialize
document.addEventListener("DOMContentLoaded", () => {
    loadPath("");
});

// Load Path Content
async function loadPath(path) {
    showStatus("Loading...");
    try {
        const response = await fetch(API_BASE + path);
        if (!response.ok) throw new Error("Failed to load contents");
        
        const data = await response.json();
        currentPath = path;
        updateBreadcrumbs();
        renderItems(data);
        hideStatus();
    } catch (error) {
        showStatus("Error loading items. Check API limits or network.");
        console.error(error);
    }
}

// Update Path UI
function updateBreadcrumbs() {
    filePathDisplay.innerText = currentPath === "" ? "/root/" : `/root/${currentPath}`;
    
    if (currentPath === "") {
        backBtn.disabled = true;
    } else {
        backBtn.disabled = false;
    }
}

// Render Files and Folders
function renderItems(items) {
    fileGrid.innerHTML = "";
    
    // Sort: Folders first, then files
    items.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
    });

    if (items.length === 0) {
        fileGrid.innerHTML = "<p>This folder is empty.</p>";
        return;
    }

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "card";
        
        const isDir = item.type === "dir";
        const iconClass = isDir ? "fa-solid fa-folder folder" : getFileIcon(item.name);
        
        card.innerHTML = `
            <i class="${iconClass} card-icon"></i>
            <div class="card-title">${item.name}</div>
            <div class="card-actions"></div>
        `;

        const actionsContainer = card.querySelector(".card-actions");

        if (isDir) {
            const openBtn = document.createElement("button");
            openBtn.className = "btn btn-secondary";
            openBtn.innerHTML = '<i class="fa-solid fa-folder-open"></i> Open';
            openBtn.onclick = () => {
                pathHistory.push(currentPath);
                loadPath(item.path);
            };
            
            const dlBtn = document.createElement("button");
            dlBtn.className = "btn btn-primary";
            dlBtn.innerHTML = '<i class="fa-solid fa-download"></i> DL';
            dlBtn.onclick = () => {
                requestConfirm(`Are you sure you want to download the entire folder "${item.name}"? This will zip all files.`, () => {
                    downloadFolder(item);
                });
            };
            
            actionsContainer.appendChild(openBtn);
            actionsContainer.appendChild(dlBtn);
        } else {
            const previewBtn = document.createElement("button");
            previewBtn.className = "btn btn-secondary";
            previewBtn.innerHTML = '<i class="fa-solid fa-eye"></i> View';
            previewBtn.onclick = () => previewFile(item);
            
            const dlBtn = document.createElement("button");
            dlBtn.className = "btn btn-primary";
            dlBtn.innerHTML = '<i class="fa-solid fa-download"></i> DL';
            dlBtn.onclick = () => {
                requestConfirm(`Are you sure you want to download "${item.name}"?`, () => {
                    downloadFile(item);
                });
            };
            
            actionsContainer.appendChild(previewBtn);
            actionsContainer.appendChild(dlBtn);
        }

        fileGrid.appendChild(card);
    });
}

function getFileIcon(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (['pdf'].includes(ext)) return 'fa-solid fa-file-pdf card-icon';
    if (['doc', 'docx'].includes(ext)) return 'fa-solid fa-file-word card-icon';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return 'fa-solid fa-file-image card-icon';
    if (['html', 'css', 'js', 'json'].includes(ext)) return 'fa-solid fa-file-code card-icon';
    if (['txt', 'md'].includes(ext)) return 'fa-solid fa-file-lines card-icon';
    return 'fa-solid fa-file card-icon';
}

// Navigation Back
backBtn.addEventListener("click", () => {
    if (pathHistory.length > 0) {
        const prevPath = pathHistory.pop();
        loadPath(prevPath);
    }
});

// Confirmation Modal
function requestConfirm(text, onConfirm) {
    confirmText.innerText = text;
    confirmAction = onConfirm;
    confirmModal.classList.add("active");
}

function closeConfirm() {
    confirmModal.classList.remove("active");
    confirmAction = null;
}

closeConfirmBtn.onclick = closeConfirm;
confirmCancelBtn.onclick = closeConfirm;
confirmYesBtn.onclick = () => {
    if (confirmAction) confirmAction();
    closeConfirm();
};

// Preview Logic
async function previewFile(item) {
    const ext = item.name.split('.').pop().toLowerCase();
    previewTitle.innerText = item.name;
    previewBody.innerHTML = "Loading preview...";
    btnDownloadPreview.onclick = () => {
        closePreview();
        requestConfirm(`Are you sure you want to download "${item.name}"?`, () => downloadFile(item));
    };
    
    previewModal.classList.add("active");

    try {
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
            previewBody.innerHTML = `<img src="${item.download_url}" alt="${item.name}" style="max-width:100%; height:auto;">`;
            return;
        }

        if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) {
            const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(item.download_url)}&embedded=true`;
            previewBody.innerHTML = `<iframe src="${viewerUrl}" style="width:100%; height:60vh; border:none;"></iframe>`;
            return;
        }

        const response = await fetch(item.download_url);
        const text = await response.text();

        if (['md', 'markdown'].includes(ext)) {
            previewBody.innerHTML = marked.parse(text);
        } else if (['html', 'htm'].includes(ext)) {
            const blob = new Blob([text], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            previewBody.innerHTML = `<iframe src="${url}" style="width:100%; height:60vh; border:none; background:#fff;"></iframe>`;
        } else {
            const pre = document.createElement("pre");
            pre.textContent = text;
            previewBody.innerHTML = '';
            previewBody.appendChild(pre);
        }
    } catch (e) {
        previewBody.innerHTML = "Error loading preview.";
    }
}

function closePreview() {
    previewModal.classList.remove("active");
}

closePreviewBtn.onclick = closePreview;

// Download File
function downloadFile(item) {
    showStatus(`Downloading ${item.name}...`);
    fetch(item.download_url)
        .then(res => res.blob())
        .then(blob => {
            saveAs(blob, item.name);
            hideStatus();
        })
        .catch(err => {
            showStatus('Error downloading file.');
            console.error(err);
        });
}

// Download Folder via Zip
async function downloadFolder(item) {
    showStatus(`Preparing zip for ${item.name}...`);
    try {
        const zip = new JSZip();
        const rootFolder = zip.folder(item.name);
        
        await fetchFolderRecursive(item.path, rootFolder);
        
        showStatus('Generating Zip...');
        const content = await zip.generateAsync({type: "blob"});
        saveAs(content, `${item.name}.zip`);
        hideStatus();
    } catch (error) {
        showStatus('Error zipping folder. Rate limit exceeded?');
        console.error(error);
    }
}

async function fetchFolderRecursive(path, zipFolder) {
    const response = await fetch(API_BASE + path);
    if (!response.ok) throw new Error("API error");
    const items = await response.json();
    
    for (const item of items) {
        if (item.type === 'file') {
            const res = await fetch(item.download_url);
            const blob = await res.blob();
            zipFolder.file(item.name, blob);
        } else if (item.type === 'dir') {
            const subFolder = zipFolder.folder(item.name);
            await fetchFolderRecursive(item.path, subFolder);
        }
    }
}

// Helpers
function showStatus(msg) {
    statusBar.innerText = msg;
    statusBar.classList.remove("hidden");
}

function hideStatus() {
    statusBar.classList.add("hidden");
}

// Close modals when clicking outside content
window.onclick = function(event) {
    if (event.target === previewModal) {
        closePreview();
    }
    if (event.target === confirmModal) {
        closeConfirm();
    }
}
