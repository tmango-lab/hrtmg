/**
 * update_app.js — Robust HTML patcher using indexOf/substring only
 * 
 * หลักการ: ใช้ indexOf + substring แทน Regex ทั้งหมด
 * เหตุผล: Regex บนบรรทัดยาว 50KB+ เกิด Catastrophic Backtracking
 *         ทำให้ Node.js ค้าง แต่ indexOf เป็น O(n) เสมอ
 */

const fs = require('fs');
const path = 'c:\\Users\\Tmango\\Desktop\\เงินเดือน\\payroll_app.html';

let content = fs.readFileSync(path, 'utf8');
let changed = false;

// ── Helper: แทนที่ข้อความแรกที่พบ ด้วย indexOf ล้วนๆ ──
function replaceFirst(source, target, replacement) {
  const i = source.indexOf(target);
  if (i === -1) return { result: source, found: false };
  return {
    result: source.slice(0, i) + replacement + source.slice(i + target.length),
    found: true
  };
}

// ─────────────────────────────────────────────────────
// PATCH 1: เปลี่ยน "const RAW_PUNCHES = {" → "let RAW_PUNCHES = {};"
//   ข้อมูลทั้งหมดอยู่ในบรรทัดเดียว จึงหา end-of-line แล้วตัดทิ้ง
// ─────────────────────────────────────────────────────
const RAW_MARKER = 'const RAW_PUNCHES = {';
if (content.includes(RAW_MARKER)) {
  const start = content.indexOf(RAW_MARKER);
  const lineEnd = content.indexOf('\n', start);          // หาจุดสิ้นสุดของบรรทัดนั้น
  const oldLine = content.slice(start, lineEnd);         // ตัดทั้งบรรทัด (ยาว ~50KB)
  content = content.slice(0, start) + 'let RAW_PUNCHES = {};' + content.slice(lineEnd);
  console.log(`[OK] Replaced RAW_PUNCHES line (${oldLine.length} chars stripped)`);
  changed = true;
} else if (content.includes('let RAW_PUNCHES = {};')) {
  console.log('[SKIP] RAW_PUNCHES already patched');
} else {
  console.log('[WARN] RAW_PUNCHES not found - check file');
}

// ─────────────────────────────────────────────────────
// PATCH 2: เพิ่มปุ่ม Upload ใน Toolbar
// ─────────────────────────────────────────────────────
const TOOLBAR_TARGET = 'onclick="openSettings()" style="border-color:var(--blue);color:var(--blue)">⚙️ ตั้งค่าเงินเดือน</button>';
const UPLOAD_BTN = [
  TOOLBAR_TARGET,
  '  <input type="file" id="csv-upload" accept=".csv" style="display: none;" onchange="handleCSVUpload(event)">',
  '  <button class="btn btn-primary" onclick="document.getElementById(\'csv-upload\').click()">📁 อัปโหลด CSV</button>',
].join('\n');

if (!content.includes('csv-upload')) {
  const r = replaceFirst(content, TOOLBAR_TARGET, UPLOAD_BTN);
  if (r.found) {
    content = r.result;
    console.log('[OK] Added upload button to toolbar');
    changed = true;
  } else {
    console.log('[WARN] Toolbar target not found');
  }
} else {
  console.log('[SKIP] Upload button already exists');
}

// ─────────────────────────────────────────────────────
// PATCH 3: Inject parseCSV + handleCSVUpload ก่อน </script>
// ─────────────────────────────────────────────────────
const CSV_FUNCTIONS = `
// ── CSV Upload Feature ──────────────────────────────
function parseCSV(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // strip BOM
  const lines = text.split(/\\r?\\n/);
  if (lines.length < 2) return null;
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const idx = {
    empId: header.findIndex(h => h.includes('\\u0e2b\\u0e21\\u0e32\\u0e22\\u0e40\\u0e25\\u0e02\\u0e1e\\u0e19\\u0e31\\u0e01\\u0e07\\u0e32\\u0e19') || h === 'No.'),
    date:  header.findIndex(h => h.includes('\\u0e27\\u0e31\\u0e19\\u0e17\\u0e35\\u0e48') || h === 'Date'),
    cin:   header.findIndex(h => h.includes('\\u0e19\\u0e32\\u0e2c\\u0e34\\u0e01\\u0e32\\u0e40\\u0e02\\u0e49\\u0e32') || h.includes('Clock In')),
    cout:  header.findIndex(h => h.includes('\\u0e19\\u0e32\\u0e2c\\u0e34\\u0e01\\u0e32\\u0e2d\\u0e2d\\u0e01') || h.includes('Clock Out')),
    late:  header.findIndex(h => h.includes('Late In(M)')),
  };
  if (idx.empId === -1 || idx.date === -1) {
    alert('\\u0e44\\u0e21\\u0e48\\u0e1e\\u0e1a\\u0e04\\u0e2d\\u0e25\\u0e31\\u0e21\\u0e19\\u0e4c \\u0e2b\\u0e21\\u0e32\\u0e22\\u0e40\\u0e25\\u0e02\\u0e1e\\u0e19\\u0e31\\u0e01\\u0e07\\u0e32\\u0e19 \\u0e2b\\u0e23\\u0e37\\u0e2d \\u0e27\\u0e31\\u0e19\\u0e17\\u0e35\\u0e48\\nHeader: ' + header.join(' | '));
    return null;
  }
  const np = {};
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].trim();
    if (!row) continue;
    const cols = row.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const eid = cols[idx.empId];
    if (!eid) continue;
    const dStr = cols[idx.date];
    if (!dStr || !dStr.includes('-')) continue;
    const cin  = idx.cin  !== -1 ? (cols[idx.cin]  || '') : '';
    const cout = idx.cout !== -1 ? (cols[idx.cout] || '') : '';
    const lateM = idx.late !== -1 ? (parseFloat(cols[idx.late]) || 0) : 0;
    if (!np[eid]) np[eid] = [];
    np[eid].push({ date: dStr, cin, cout, lateM });
  }
  return Object.keys(np).length > 0 ? np : null;
}

function handleCSVUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (Object.keys(EDITS).length > 0) {
    if (confirm('\\u0e1e\\u0e1a\\u0e1b\\u0e23\\u0e30\\u0e27\\u0e31\\u0e15\\u0e34\\u0e01\\u0e32\\u0e23\\u0e41\\u0e01\\u0e49\\u0e44\\u0e02\\u0e02\\u0e49\\u0e2d\\u0e21\\u0e39\\u0e25\\u0e40\\u0e01\\u0e48\\u0e32\\u0e2d\\u0e22\\u0e39\\u0e48\\n\\u0e15\\u0e49\\u0e2d\\u0e07\\u0e01\\u0e32\\u0e23\\u0e25\\u0e49\\u0e32\\u0e07\\u0e44\\u0e2b\\u0e21? \\u0e01\\u0e14 OK \\u0e40\\u0e1e\\u0e37\\u0e48\\u0e2d\\u0e25\\u0e49\\u0e32\\u0e07')) {
      EDITS = {}; saveEdits();
    }
  }
  const tryLoad = (encoding) => {
    const r = new FileReader();
    r.onload = (e) => {
      const p = parseCSV(e.target.result);
      if (p) {
        RAW_PUNCHES = p;
        const n = Object.keys(p).length;
        calculateAllData();
        showToast('\\u0e2d\\u0e31\\u0e1b\\u0e42\\u0e2b\\u0e25\\u0e14 CSV \\u0e2a\\u0e33\\u0e40\\u0e23\\u0e47\\u0e08 · \\u0e1e\\u0e1a ' + n + ' \\u0e04\\u0e19');
      } else if (encoding === 'UTF-8') {
        tryLoad('windows-874');
      } else {
        alert('\\u0e44\\u0e21\\u0e48\\u0e2a\\u0e32\\u0e21\\u0e32\\u0e23\\u0e16\\u0e2d\\u0e48\\u0e32\\u0e19\\u0e44\\u0e1f\\u0e25\\u0e4c CSV \\u0e01\\u0e23\\u0e38\\u0e13\\u0e32\\u0e15\\u0e23\\u0e27\\u0e08\\u0e2a\\u0e2d\\u0e1a\\u0e23\\u0e39\\u0e1b\\u0e41\\u0e1a\\u0e1a\\u0e44\\u0e1f\\u0e25\\u0e4c');
      }
    };
    r.readAsText(file, encoding);
  };
  tryLoad('UTF-8');
  event.target.value = '';
}
`;

const SCRIPT_END = '</script>';
if (!content.includes('parseCSV')) {
  const r = replaceFirst(content, SCRIPT_END, CSV_FUNCTIONS + '\n' + SCRIPT_END);
  if (r.found) {
    content = r.result;
    console.log('[OK] Injected parseCSV + handleCSVUpload functions');
    changed = true;
  }
} else {
  console.log('[SKIP] parseCSV already exists');
}

// ─────────────────────────────────────────────────────
// WRITE
// ─────────────────────────────────────────────────────
if (changed) {
  fs.writeFileSync(path, content, 'utf8');
  const kb = Math.round(fs.statSync(path).size / 1024);
  console.log(`[DONE] File written — ${kb}KB`);
} else {
  console.log('[DONE] No changes needed — file already up to date');
}
