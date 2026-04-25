const fs = require('fs');
const path = require('path');

const DAYS_IN_MONTH = 31;
const OT_RATE = 40;

const EMP_NAMES = {
  '1':'JET','2':'Mild','3':'Mameaw','4':'Bird','5':'Ploysai',
  '6':'Chompoo','7':'Mint','8':'Looknum','9':'Aum','10':'Pluem',
  '11':'Jay','12':'Cream','13':'Jui','14':'Noi','15':'Wave',
  '16':'Amp','17':'Ple','18':'YUNG','19':'TAE','20':'Ple FB',
  '21':'TUKTA','22':'Jeab','23':'ManU'
};

function parseH(s) {
  if (!s || s.trim() === '' || s.trim() === '-') return null;
  try {
    const parts = s.trim().split(':');
    return parseInt(parts[0]) + parseInt(parts[1]) / 60.0;
  } catch(e) { return null; }
}

function roundHalf(rawH) {
  if (rawH <= 0) return 0.0;
  const lower = Math.floor(rawH * 2) / 2.0;
  const upper = lower + 0.5;
  const minsToUpper = (upper - rawH) * 60;
  return (Math.round(minsToUpper * 10000) / 10000) <= 10 ? upper : lower;
}

function isSunday(dateStr) {
  try { return new Date(dateStr.trim()).getDay() === 0; }
  catch(e) { return false; }
}

function kitchenLateDeduct(lateMin, dailyRate, hrsDay = 12) {
  if (lateMin <= 30) return 0.0;
  const rph = dailyRate / hrsDay;
  const lateH = Math.ceil((lateMin - 15) / 30) * 0.5;
  return Math.round(rph * lateH * 100) / 100;
}

function makeSr(empType, daily, monthly, shiftStart, defaultOut, hrsDay, otType, lateType=null) {
  return { empType, daily, monthly, shiftStart, defaultOut, hrsDay, otType, lateType };
}

const SHIFT = {
  '1':  makeSr('รายวัน',   380,  0,    14.0, 24.0, 10, 'football', 'football'),
  '2':  makeSr('รายวัน',   380,  0,    10.0, 21.0, 10, 'morning'),
  '3':  makeSr('รายเดือน', 0, 11000,   10.0, 21.0, 10, 'morning'),
  '4':  makeSr('รายเดือน', 0, 11000,   10.0, 21.0, 10, 'morning'),
  '5':  makeSr('รายวัน',   380,  0,    15.0,  2.0, 10,  null),
  '6':  makeSr('รายเดือน', 0, 12000,   10.0, 20.0, 10,  null),
  '7':  makeSr('พาร์ทไทม์',240,  0,    17.0, 24.0,  7,  null),
  '8':  makeSr('รายเดือน', 0, 12000,   10.0, 20.0, 10, 'looknum'),
  '9':  makeSr('รายเดือน', 0, 11000,   10.0, 21.0, 10, 'morning'),
  '10': makeSr('พาร์ทไทม์',240,  0,    17.0, 24.0,  7,  null),
  '11': makeSr('พาร์ทไทม์',240,  0,    17.0, 24.0,  7,  null),
  '12': makeSr('พาร์ทไทม์',240,  0,    17.0, 24.0,  7,  null),
  '13': makeSr('รายวัน',   700,  0,    10.0, 22.0, 12, 'kitchen'),
  '14': makeSr('รายวัน',   700,  0,    10.0, 22.0, 12, 'kitchen'),
  '15': makeSr('รายเดือน', 0, 11000,   15.0,  2.0, 10,  null),
  '16': makeSr('รายวัน',   550,  0,    10.0, 22.0, 12, 'kitchen'),
  '17': makeSr('พาร์ทไทม์',240,  0,    17.0, 24.0,  7,  null),
  '18': makeSr('รายวัน',   400,  0,    14.0, 24.0, 10, 'football', 'football'),
  '19': makeSr('รายวัน',   360,  0,    14.0, 24.0, 10, 'football', 'football'),
  '20': makeSr('รายวัน',   240,  0,    17.0, 24.0,  7,  null),
  '21': makeSr('รายวัน',   380,  0,     8.0, 17.0,  9,  null),
  '22': makeSr('รายวัน',   450,  0,    10.0, 22.0, 12, 'kitchen'),
  '23': makeSr('พาร์ทไทม์',240,  0,    17.0, 24.0,  7,  null),
};

function getShift(eid, cinH) {
  let sr = Object.assign({}, SHIFT[eid]);
  if (eid === '8' && cinH !== null && cinH >= 12.0) {
    sr.shiftStart = 15.0; sr.defaultOut = 2.0; sr.otType = null;
  }
  return sr;
}

function calcOt(eid, cinH, coutH, sr) {
  const otType = sr.otType;
  if (!otType || cinH === null) return 0.0;
  let cout = (coutH !== null) ? coutH : sr.defaultOut;
  if (cout < cinH) cout += 24;
  if (otType === 'looknum')       { return cout <= 21.0 ? 0.0 : roundHalf(cout - 20.0); }
  if (otType === 'morning' || otType === 'morning_pt') { return cout <= 21.0 ? 0.0 : roundHalf(cout - 21.0); }
  if (otType === 'kitchen')       { return cinH >= 9.0 ? 0.0 : roundHalf(10.0 - cinH); }
  if (otType === 'football')      { return cinH >= 13.0 ? 0.0 : roundHalf(14.0 - cinH); }
  return 0.0;
}

function calcLate(lateMin, sr, cinH=null) {
  const { empType, otType, lateType, daily, monthly, hrsDay } = sr;
  if (otType === 'kitchen') return kitchenLateDeduct(lateMin, daily, hrsDay);
  if (lateType === 'football') {
    if (lateMin <= 10 || cinH === null) return 0.0;
    let periods = 0, b = 15.0;
    while (b <= cinH + 10/60 && b <= 20) {
      const minsRemain = (b - cinH) * 60;
      if (minsRemain <= 10 || cinH >= b) periods++;
      b += 1.0;
    }
    return periods * OT_RATE;
  }
  if (empType === 'รายเดือน') {
    if (lateMin <= 10) return 0.0;
    const rph = (monthly / DAYS_IN_MONTH) / hrsDay;
    const lateH = roundHalf(lateMin / 60.0) || 0.5;
    return Math.round(rph * lateH * 100) / 100;
  } else {
    if (lateMin <= 10) return 0.0;
    const lateH = roundHalf(lateMin / 60.0) || 0.5;
    return Math.round(OT_RATE * lateH * 100) / 100;
  }
}

// อ่าน CSV
const csvPath = path.join(__dirname, 'D456FA4577B86C439ED8E8F42B1F3F1104FD4AD8_บัตรเวลาทั้งหมด_20260322105014_export.csv');
let rawContent = fs.readFileSync(csvPath, 'utf8');
if (rawContent.charCodeAt(0) === 0xFEFF || rawContent.startsWith('\uFEFF')) rawContent = rawContent.slice(1);

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, j) => row[h] = vals[j] || '');
    rows.push(row);
  }
  return { headers, rows };
}

const { headers, rows } = parseCSV(rawContent);
const keyEid  = headers.find(h => h.includes('หมายเลข'));
const keyDate = headers.find(h => h.includes('วันที่'));
const keyLate = headers.find(h => h.includes('Late'));
const keyCin  = headers.find(h => h.includes('นาฬิกาเข้า'));
const keyCout = headers.find(h => h.includes('นาฬิกาออก'));

const empMap = {};
for (const r of rows) {
  const eid = (r[keyEid] || '').trim();
  if (eid && SHIFT[eid]) {
    if (!empMap[eid]) empMap[eid] = [];
    empMap[eid].push(r);
  }
}

// format float 2 decimal
const f2 = n => n.toFixed(2);

// ────────────────────────────────────────────────────────────
// แจกแจงทีละคน
// ────────────────────────────────────────────────────────────
let grandTotal = 0;

for (const eid of Object.keys(empMap).sort((a,b) => +a - +b)) {
  const srBase = SHIFT[eid];
  const name = EMP_NAMES[eid] || '?';
  const dailyBase = srBase.empType === 'รายเดือน'
    ? Math.round((srBase.monthly / DAYS_IN_MONTH) * 100) / 100
    : srBase.daily;

  let totalBase = 0, totalOt = 0, totalDeduct = 0;
  const dayLines = [];

  for (const d of empMap[eid]) {
    const lateM   = parseFloat(d[keyLate] || '0') || 0;
    const checkin  = (d[keyCin]  || '').trim();
    const checkout = (d[keyCout] || '').trim();
    const dateStr  = (d[keyDate] || '').trim();

    const cinH  = parseH(checkin);
    const coutH = parseH(checkout);

    if (cinH === null && coutH === null) continue;

    const sr = getShift(eid, cinH);
    let dayRate = srBase.empType === 'รายเดือน'
      ? Math.round((srBase.monthly / DAYS_IN_MONTH) * 100) / 100
      : srBase.daily;

    let note = '';

    // TUKTA วันอาทิตย์
    if (eid === '21' && isSunday(dateStr)) {
      dayLines.push(`  ${dateStr}  เข้า ${checkin || '-'}  ออก ${checkout || '-'}  วันอาทิตย์ 190 บาท`);
      totalBase += 190;
      continue;
    }
    // TUKTA ออกก่อน 17:00
    if (eid === '21' && coutH !== null && coutH < 17.0) {
      const hrsW = coutH - (cinH !== null ? cinH : 8.0);
      const pay = Math.round(Math.max(0, hrsW) * (380/9) * 100) / 100;
      dayLines.push(`  ${dateStr}  เข้า ${checkin || '-'}  ออก ${checkout || '-'}  ออกก่อน 17:00 → ${f2(pay)} บาท`);
      totalBase += pay;
      continue;
    }

    // พาร์ทไทม์มาแทนกะเช้า
    if (['7','10','11','12','17','23'].includes(eid) && cinH !== null && cinH < 12.0) {
      dayRate = 350;
      sr.otType = 'morning_pt';
      note += ' [กะเช้า 350]';
    }

    const deduct  = calcLate(lateM, sr, cinH);
    const effCout = coutH !== null ? coutH : sr.defaultOut;
    const otH     = calcOt(eid, cinH, effCout, sr);
    const otMoney = Math.round(otH * OT_RATE * 100) / 100;
    const dayNet  = Math.round((dayRate - deduct + otMoney) * 100) / 100;

    totalBase   += dayRate;
    totalDeduct += deduct;
    totalOt     += otMoney;

    let parts = [`ฐาน ${f2(dayRate)}`];
    if (lateM > 10) parts.push(`สาย ${Math.round(lateM)}นาที -${f2(deduct)}`);
    if (otH > 0)    parts.push(`OT ${otH}ชม. +${f2(otMoney)}`);
    parts.push(`= ${f2(dayNet)} บาท`);
    if (note) parts.push(note);

    dayLines.push(`  ${dateStr}  เข้า ${checkin || '-'}  ออก ${checkout || '-'}   ${parts.join('  ')}`);
  }

  const net = Math.round((totalBase - totalDeduct + totalOt) * 100) / 100;
  grandTotal += net;

  console.log(`\n${'─'.repeat(80)}`);
  console.log(`#${eid}  ${name}  [${srBase.empType}]  อัตรา ${srBase.empType==='รายเดือน' ? srBase.monthly+' บ./เดือน' : dailyBase+' บ./วัน'}`);
  console.log(`${'─'.repeat(80)}`);
  for (const line of dayLines) console.log(line);
  console.log(`  ──────────────────────────────────────────────────────────`);
  console.log(`  ฐานรวม ${f2(totalBase)}  OT ${f2(totalOt)}  หักสาย ${f2(totalDeduct)}  → รวม ${f2(net)} บาท`);
}

console.log(`\n${'═'.repeat(80)}`);
console.log(`รวมเงินเดือนทั้งหมด: ${grandTotal.toFixed(2)} บาท`);
