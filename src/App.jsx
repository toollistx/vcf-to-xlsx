import { lazy, Suspense, useMemo, useState } from 'react';
import { Link, Route, Routes, NavLink } from 'react-router-dom';
import * as XLSX from 'xlsx';

function HomePage() {
  return (
    <div className="page">
      <h1>Tools</h1>
      <p>Select a tool from the top bar to open the page.</p>
    </div>
  );
}

function VcfToXlsxPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [status, setStatus] = useState('Choose a VCF file to begin.');
  const [downloadUrl, setDownloadUrl] = useState('');

  const parseVCF = (text) => {
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
  };

  const preview = useMemo(() => contacts.slice(0, 5), [contacts]);

  const handleFile = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setStatus(`Loaded ${file.name}.`);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = parseVCF(event.target.result);
        setContacts(parsed);
        if (!parsed.length) {
          setStatus('The file was read, but no contacts were found.');
        }
      } catch (error) {
        setContacts([]);
        setStatus(`Could not parse the VCF file: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };

  const convertToExcel = () => {
    if (!selectedFile || !contacts.length) {
      setStatus('Please select a valid VCF file first.');
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

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');
    const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    setDownloadUrl(url);
    setStatus(`Converted ${contacts.length} contact${contacts.length > 1 ? 's' : ''} to Excel.`);
  };

  return (
    <div className="page">
      <h1>VCF to XLSX</h1>
      <p>Upload a VCF file and download the contacts as an Excel workbook.</p>

      <label className="dropzone" htmlFor="vcf-file">
        <input
          id="vcf-file"
          type="file"
          accept=".vcf,.vcard"
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <span>Choose a VCF file</span>
      </label>

      <div className="actions">
        <button onClick={convertToExcel}>Convert to Excel</button>
        {downloadUrl ? (
          <a href={downloadUrl} download={`${selectedFile?.name.replace(/\.(vcf|vcard)$/i, '') || 'contacts'}.xlsx`}>
            Download Excel file
          </a>
        ) : null}
      </div>

      <div className="status">{status}</div>

      <div className="preview">
        {contacts.length ? (
          <>
            <strong>{contacts.length} contact{contacts.length > 1 ? 's' : ''} found</strong>
            <ul>
              {preview.map((contact, index) => (
                <li key={`${contact.fullName || 'contact'}-${index}`}>{contact.fullName || 'Unnamed contact'}</li>
              ))}
            </ul>
          </>
        ) : (
          <p>No contacts to preview yet.</p>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <>
      <header className="topbar">
        <div className="brand">Tool Hub</div>
        <nav className="nav-links">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/vcf-to-xlsx">VCF to XLSX</NavLink>
        </nav>
      </header>

      <main className="app-shell">
        <Suspense fallback={<div className="page"><p>جاري التحميل...</p></div>}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/vcf-to-xlsx" element={<VcfToXlsxPage />} />
          </Routes>
        </Suspense>
      </main>
    </>
  );
}
