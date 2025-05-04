let currentPatchContent = '';
let currentView = 'all';
let currentSelectedFileLink = null; // This is file link used for tracing current selected file.
const fileListElement = document.getElementById('fileList').querySelector('ul');
const patchContentElement = document.getElementById('patchContent').querySelector('code');
const filterButtons = document.querySelectorAll('.filter-button');

function loadFiles(files) {
    fileListElement.innerHTML = ''; // Clear file list
    currentSelectedFileLink = null; // Clear selected file

    if (files.length > 0) {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.name.endsWith('.patch')) {
                const listItem = document.createElement('li');
                const link = document.createElement('a');
                link.textContent = file.name;
                link.href = '#'; // Prevent page jump
                link.onclick = () => {
                    loadFileContent(file);
                    // Remove selected style from previous selected item.
                    if (currentSelectedFileLink) {
                        currentSelectedFileLink.classList.remove('selected');
                    }
                    // Add selected style for current selected item.
                    link.classList.add('selected');
                    currentSelectedFileLink = link;
                };
                listItem.appendChild(link);
                fileListElement.appendChild(listItem);
            }
        }
        // Enable filter buttons
        filterButtons.forEach(button => button.disabled = false);
        updateFilterButtonSelection(); // update style of buttons while init.
    } else {
        // Disable filter buttons
        filterButtons.forEach(button => button.disabled = true);
        patchContentElement.innerHTML = ''; // Clear patch content field
        updateFilterButtonSelection(); // Clear selected filter button
    }
}

function loadFileContent(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
        currentPatchContent = event.target.result;
        processPatch();
    };
    reader.readAsText(file);
}

function processPatch() {
    let outputHTML = '';
    const lines = currentPatchContent.split('\n');
    let inCommitMessage = false;
    let afterMetadata = false;

    lines.forEach((line) => {
        const isDiffControl = line.startsWith('diff --git') || line.startsWith('index ') || line.startsWith('--- ') || line.startsWith('+++ ') || line.startsWith('@');
        const isAdded = line.startsWith('+') && !line.startsWith('+++ ');
        const isRemoved = line.startsWith('-') && !line.startsWith('--- ');
        const isContext = line.startsWith(' ') || line === '---';
        const isFromHashLine = line.startsWith('From ');
        const isAuthorLine = line.startsWith('From: ');
        const isDateLine = line.startsWith('Date: ');
        const isSubjectLine = line.startsWith('Subject: ');
        const isDashLine = line.startsWith('---');

        if (isFromHashLine && line.includes(' ')) {
            const parts = line.split(' ');
            const commitId = parts[1];
            outputHTML += `<div class="commit-header"><span class="commit-id">Commit: </span><span class="commit-id-value">${escapeHtml(commitId)}</span><br>`;
            inCommitMessage = false;
            afterMetadata = true;
        } else if (isAuthorLine) {
            const author = line.substring(6);
            outputHTML += `<span class="commit-author">Author: </span><span class="commit-author-value">${escapeHtml(author)}</span><br>`;
            inCommitMessage = false;
        } else if (isDateLine) {
            const date = line.substring(6);
            outputHTML += `<span class="commit-date">Date: </span><span class="commit-date-value">${escapeHtml(date)}</span><br>`;
            inCommitMessage = false;
        } else if (isSubjectLine) {
            const subject = line.substring(9);
            outputHTML += `<span class="commit-subject">Subject: </span><span class="commit-subject-value">${escapeHtml(subject)}</span></div>\n`;
            inCommitMessage = false;
            afterMetadata = true;
        } else if (isDashLine && afterMetadata && !isDiffControl) {
            // Metadata ends here
            inCommitMessage = true;
        } else if (inCommitMessage && !isDiffControl) {
            outputHTML += `<span class="commit-message">${escapeHtml(line)}</span>\n`;
        } else if (isDiffControl) {
            outputHTML += `<span class="diff-info">${escapeHtml(line)}</span>\n`;
            inCommitMessage = false;
            afterMetadata = true;
        } else if (currentView === 'all') {
            outputHTML += getHighlightedLine(line);
        } else if (currentView === 'added') {
            if (isAdded || isContext || isDiffControl) {
                outputHTML += getHighlightedLine(line);
            }
        } else if (currentView === 'removed') {
            if (isRemoved || isContext || isDiffControl) {
                outputHTML += getHighlightedLine(line);
            }
        }
    });

    patchContentElement.innerHTML = outputHTML;
    hljs.highlightElement(patchContentElement);
    updateFilterButtonSelection();
}

function filterView(view) {
    currentView = view;
    processPatch();
}

function getHighlightedLine(line) {
    if (line.startsWith('+')) {
        return `<span class="added">${escapeHtml(line)}</span>\n`;
    } else if (line.startsWith('-')) {
        return `<span class="removed">${escapeHtml(line)}</span>\n`;
    } else {
        return `<span class="context">${escapeHtml(line)}</span>\n`;
    }
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

function updateFilterButtonSelection() {
    filterButtons.forEach(button => {
        button.classList.remove('selected');
        if (button.classList.contains('view-all') && currentView === 'all') {
            button.classList.add('selected');
        } else if (button.classList.contains('view-added') && currentView === 'added') {
            button.classList.add('selected');
        } else if (button.classList.contains('view-removed') && currentView === 'removed') {
            button.classList.add('selected');
        }
    });
}