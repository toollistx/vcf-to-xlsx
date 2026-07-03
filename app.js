const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const convertBtn = document.getElementById('convertBtn');
const statusEl = document.getElementById('status');
const previewEl = document.getElementById('preview');
const downloadLink = document.getElementById('downloadLink');

let selectedFile = null;
let contacts = [];

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#dc2626' : '#334155';
}

function parseVCF(text) {
  const normalizedLines = [];
  const lines = text.replace(/\r\n/g, '\n').split('\n');

  for (const line of lines) {
    if (/^[ \t]/.test(line)) {
      if (normalizedLines.length > 0) {
        normalizedLines[normalizedLines.length - 1] += line.trimStart();
      }
    } else {
      normalizedLines.push(line);
    }
  }

  const cards = [];
  let currentCard = null;

  for (const line of normalizedLines) {
    if (!line.trim()) continue;

    if (line === 'BEGIN:VCARD') {
      currentCard = {
        fullName: '',
        firstName: '',
        lastName: '',
        organization: '',
        phone: [],
        email: [],
        address: [],
        note: [],
        title: '',
        url: [],
      };
      continue;
    }

    if (line === 'END:VCARD') {
      if (currentCard) {
        if (!currentCard.fullName) {
          const nameParts = [currentCard.firstName, currentCard.lastName].filter(Boolean);
          currentCard.fullName = nameParts.join(' ').trim();
        }
        cards.push(currentCard);
      }
      currentCard = null;
      continue;
    }

    if (!currentCard) continue;

    const separatorIndex = line.indexOf(':');
    if (separatorIndex < 0) continue;

    const rawKey = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    const key = rawKey.split(';')[0].toUpperCase();

    switch (key) {
      case 'FN':
        currentCard.fullName = value;
        break;
      case 'N': {
        const parts = value.split(';');
        currentCard.lastName = parts[0] || '';
        currentCard.firstName = parts[1] || '';
        break;
      }
      case 'ORG':
        currentCard.organization = value.replace(/;/g, ' ');
        break;
      case 'TITLE':
        currentCard.title = value;
        break;
      case 'TEL':
        currentCard.phone.push(value);
        break;
      case 'EMAIL':
        currentCard.email.push(value);
        break;
      case 'ADR':
        currentCard.address.push(value.replace(/;/g, ', '));
        break;
      case 'NOTE':
        currentCard.note.push(value);
        break;
      case 'URL':
        currentCard.url.push(value);
        break;
      default:
        break;
    }
  }

  return cards.map((card) => ({
    fullName: card.fullName || `${card.firstName} ${card.lastName}`.trim(),
    firstName: card.firstName,
    lastName: card.lastName,
    organization: card.organization,
    phone: card.phone.join('; '),
    email: card.email.join('; '),
    address: card.address.join('; '),
    note: card.note.join('; '),
    title: card.title,
    url: card.url.join('; '),
  }));
}

function renderPreview() {
  if (!contacts.length) {
    previewEl.innerHTML = '<p>No contacts to preview yet.</p>';
    return;
  }

  const previewList = contacts.slice(0, 5).map((contact) => {
    const name = contact.fullName || `${contact.firstName} ${contact.lastName}`.trim();
    return `<li>${name || 'Unnamed contact'}</li>`;
  });

  previewEl.innerHTML = `
    <strong>${contacts.length} contact${contacts.length > 1 ? 's' : ''} found</strong>
    <ul>${previewList.join('')}</ul>
  `;
}

function buildWorkbook(rows) {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
  return workbook;
}

function convertToExcel() {
  if (!selectedFile || !contacts.length) {
    setStatus('Please select a valid VCF file first.', true);
    return;
  }

  const baseName = selectedFile.name.replace(/\.(vcf|vcard)$/i, '');
  const rows = [
    ['Full Name', 'First Name', 'Last Name', 'Organization', 'Phone', 'Email', 'Address', 'Note', 'Title', 'URL'],
    ...contacts.map((contact) => [
      contact.fullName,
      contact.firstName,
      contact.lastName,
      contact.organization,
      contact.phone,
      contact.email,
      contact.address,
      contact.note,
      contact.title,
      contact.url,
    ]),
  ];

  const workbook = buildWorkbook(rows);
  const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);

  downloadLink.href = url;
  downloadLink.download = `${baseName}.xlsx`;
  downloadLink.classList.remove('hidden');
  setStatus(`Converted ${contacts.length} contact${contacts.length > 1 ? 's' : ''} to Excel.`);
}

function handleFileSelection(file) {
  if (!file) return;
  selectedFile = file;
  convertBtn.disabled = false;
  setStatus(`Loaded ${file.name}.`);

  try {
    const reader = new FileReader();
    reader.onload = (event) => {
      contacts = parseVCF(event.target.result);
      renderPreview();
      if (!contacts.length) {
        setStatus('The file was read, but no contacts were found.', true);
      }
    };
    reader.onerror = () => {
      setStatus(`Error reading file: ${reader.error.message}`, true);
    };
    reader.readAsText(file);
  } catch (error) {
    setStatus(`Could not process the file: ${error.message}`, true);
    contacts = [];
    renderPreview();
  }
}

fileInput.addEventListener('change', (event) => {
  handleFileSelection(event.target.files[0]);
});

convertBtn.addEventListener('click', convertToExcel);

dropzone.addEventListener('dragover', (event) => {
  event.preventDefault();
  dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', (event) => {
  event.preventDefault();
  dropzone.classList.remove('dragover');
  if (event.dataTransfer.files?.length) {
    handleFileSelection(event.dataTransfer.files[0]);
  }
});

renderPreview();
