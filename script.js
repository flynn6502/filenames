const folderInput     = document.getElementById('folderInput');
const fileTableBody   = document.getElementById('fileTableBody');
const fileCountText   = document.getElementById('fileCount');
const backButton      = document.getElementById('backButton');
const currentPathText = document.getElementById('currentPath'); // optional label

// For sorting (expects <th data-sort-key="name|path|size">)
const sortableHeaders = document.querySelectorAll('th[data-sort-key]');

let allFiles = [];      // all File objects from the input
let currentPath = '';   // '' = root, otherwise like "subfolder" or "subfolder/nested"
let currentSort = {
  key: 'name',          // 'name' | 'path' | 'size'
  direction: 'asc'      // 'asc' | 'desc'
};

// When user selects folder
folderInput.addEventListener('change', function (event) {
  allFiles = Array.from(event.target.files || []);
  currentPath = '';
  renderDirectory();
  updateBackButton();
});

// MAIN: render current folder contents
function renderDirectory() {
  // Get items (files + subfolders) directly in currentPath
  let entries = getEntriesForPath(currentPath);

  // Sort them according to currentSort
  entries.sort(compareEntries);

  // Clear table
  fileTableBody.innerHTML = '';

  // Fill table
  entries.forEach(entry => {
    const row = document.createElement('tr');

    // Checkbox cell
    const checkboxCell = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = false;
    checkboxCell.appendChild(checkbox);
    row.appendChild(checkboxCell);

    // Name cell (with folder icon and click to navigate for folders)
    const nameCell = document.createElement('td');
    if (entry.type === 'folder') {
      const span = document.createElement('span');
      span.textContent = `📁 ${entry.name}`;
      span.style.cursor = 'pointer';
      span.addEventListener('click', () => {
        // Navigate into folder
        currentPath = entry.fullPath;
        renderDirectory();
        updateBackButton();
      });
      nameCell.appendChild(span);
    } else {
      nameCell.textContent = entry.name;
    }
    row.appendChild(nameCell);

    // Path cell (full relative path)
    const pathCell = document.createElement('td');
    pathCell.textContent = entry.fullPath;
    row.appendChild(pathCell);

    // Size cell (blank for folders)
    const sizeCell = document.createElement('td');
    sizeCell.textContent = entry.size != null ? entry.size : '';
    row.appendChild(sizeCell);

    fileTableBody.appendChild(row);
  });

  // Update count and path label
  fileCountText.textContent = `Items in this folder: ${entries.length}`;
  if (currentPathText) {
    currentPathText.textContent = currentPath ? `Current folder: /${currentPath}` : 'Current folder: (root)';
  }
}

// Build list of entries (files/folders) directly in a given path
function getEntriesForPath(pathPrefix) {
  const entriesMap = new Map();
  const normalizedPrefix = pathPrefix
    ? pathPrefix.replace(/\/+$/, '') + '/'
    : '';

  allFiles.forEach(file => {
    const relPath = file.webkitRelativePath || file.name;

    // Only consider files inside this folder
    if (!relPath.startsWith(normalizedPrefix)) return;

    const remaining = relPath.slice(normalizedPrefix.length);
    if (!remaining) return;

    const parts = remaining.split('/');
    const first = parts[0];

    if (parts.length === 1) {
      // This is a file directly in the current folder
      const key = 'file:' + first;
      if (!entriesMap.has(key)) {
        entriesMap.set(key, {
          type: 'file',
          name: first,
          fullPath: relPath,
          size: file.size,
          file
        });
      }
    } else {
      // This file is in a subfolder - we show the folder only once
      const folderName = first;
      const key = 'folder:' + folderName;
      if (!entriesMap.has(key)) {
        entriesMap.set(key, {
          type: 'folder',
          name: folderName,
          fullPath: normalizedPrefix + folderName,
          size: null
        });
      }
    }
  });

  return Array.from(entriesMap.values());
}

// Sorting logic
function compareEntries(a, b) {
  // Folders first, then files
  if (a.type !== b.type) {
    return a.type === 'folder' ? -1 : 1;
  }

  const dir = currentSort.direction === 'asc' ? 1 : -1;

  if (currentSort.key === 'size') {
    const sizeA = a.size != null ? a.size : -1;
    const sizeB = b.size != null ? b.size : -1;
    if (sizeA === sizeB) {
      return a.name.localeCompare(b.name) * dir;
    }
    return (sizeA - sizeB) * dir;
  }

  const valA = currentSort.key === 'path' ? a.fullPath : a.name;
  const valB = currentSort.key === 'path' ? b.fullPath : b.name;

  return valA.localeCompare(valB) * dir;
}

// Click on headers to sort
sortableHeaders.forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sortKey; // <-- use data-sort-key
    if (!key) return;

    if (currentSort.key === key) {
      // Toggle direction
      currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
      currentSort.key = key;
      currentSort.direction = 'asc';
    }

    renderDirectory();
  });
});

// Back button logic
backButton.addEventListener('click', () => {
  if (!currentPath) return;

  const parts = currentPath.replace(/\/+$/, '').split('/');
  parts.pop();
  currentPath = parts.join('/');

  renderDirectory();
  updateBackButton();
});

function updateBackButton() {
  backButton.disabled = !currentPath;
}
