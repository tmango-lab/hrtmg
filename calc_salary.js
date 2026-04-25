const fs = require('fs');
const path = require('path');

const DAYS_IN_MONTH = 31; // มีนาคม 2026
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
  try {
    return new Date(dateStr.trim()).getDay() === 0;
  } catch(e) { return false; }
}

function kitchenLateDeduct(lateMin, dailyRate, hrsDay = 12) {
  if (lateMin <= 30) return 0.0;
  lateMin = Math.round(lateMin);
  let rph = dailyRate / hrsDay;
  let lateH = Math.floor(lateMin / 60);
  let mm = Math.floor(lateMin % 60);
  let blocks = 0;
  if (lateH === 0) {
      if (mm <= 30) blocks = 0;
      else if (mm <= 50) blocks = 1;
      else blocks = 2;
  } else {
      if (mm <= 19) blocks = lateH * 2;
      else if (mm <= 49) blocks = (lateH * 2) + 1;
      else blocks = (lateH * 2) + 2;
  }
  return Math.round(blocks * 0.5 * rph * 100) / 100;
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
    sr.shiftStart = 15.0;
    sr.defaultOut = 2.0;
    sr.otType = null;
  }
  return sr;
}

function calcOt(eid, cinH, coutH, sr) {
  const otType = sr.otType;
  if (!otType || cinH === null) return 0.0;
  let cout = (coutH !== null) ? coutH : sr.defaultOut;
  if (cout < cinH) cout += 24;
  if (otType === 'looknum') {
    if (cout <= 21.1666) return 0.0;
    return roundHalf(cout - 20.0);
  } else if (otType === 'morning' || otType === 'morning_pt') {
    if (cout <= 21.1666) return 0.0;
    return roundHalf(cout - 21.0);
  } else if (otType === 'kitchen') {
    if (cinH >= 9.0) return 0.0;
    return roundHalf(10.0 - cinH);
  } else if (otType === 'football') {
    if (cinH >= 13.0) return 0.0;
    return roundHalf(14.0 - cinH);
  }
  return 0.0;
}

function calcLate(lateMin, sr, cinH=null) {
  const { empType, otType, lateType, daily, monthly, hrsDay } = sr;
  if (otType === 'kitchen') return kitchenLateDeduct(lateMin, daily, hrsDay);
  if (lateType === 'football') {
    if (cinH === null || cinH <= 14 + 10/60) return 0.0;
    let periods = 1;
    let cur = 15.0;
    while (cur <= 20.0) {
      if (cinH > cur) {
        periods++;
        cur += 1.0;
      } else {
        break;
      }
    }
    return periods * OT_RATE;
  }
  if (empType === 'พาร์ทไทม์' || empType === 'พาร์ทไทม์_override') {
    if (lateMin <= 10) return 0;
    return Math.ceil(lateMin / 60) * 40;
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
const csvPath = path.join(__dirname, 'บัตรเวลาทั้งหมด_20260327154545_export.csv');

// ลอง encoding ต่างๆ
let rawContent = null;
for (const enc of ['utf8', 'binary']) {
  try {
    rawContent = fs.readFileSync(csvPath, enc);
    break;
  } catch(e) {}
}

// Remove BOM
if (rawContent.charCodeAt(0) === 0xFEFF || rawContent.startsWith('\uFEFF')) {
  rawContent = rawContent.slice(1);
}

// Parse CSV อย่างง่าย (handle quoted fields)
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
console.log('คอลัมน์:', headers.join(', '));
console.log('จำนวนแถว:', rows.length);

// หาชื่อคอลัมน์
const keyEid = headers.find(h => h.includes('หมายเลข') || h === 'No.' || h.toUpperCase().includes('EMP'));
const keyDate = headers.find(h => h.includes('วันที่') || h === 'Date');
const keyWF = headers.find(h => h.includes('วันทำงาน') || h === 'Work Day');
const keyLate = headers.find(h => h.includes('Late'));
const keyCin = headers.find(h => h.includes('เข้า') || h === 'Clock In' || h.includes('Check In'));
const keyCout = headers.find(h => h.includes('ออก') || h === 'Clock Out' || h.includes('Check Out'));

console.log('\nKey columns:', {keyEid, keyDate, keyWF, keyLate, keyCin, keyCout});

// จัดกลุ่มตาม employee
const empMap = {};
for (const r of rows) {
  const eid = (r[keyEid] || '').trim();
  if (eid && SHIFT[eid]) {
    if (!empMap[eid]) empMap[eid] = [];
    empMap[eid].push(r);
  }
}

console.log(`\nพบพนักงาน ${Object.keys(empMap).length} คน: ${Object.keys(empMap).sort((a,b)=>+a-+b).join(', ')}`);

// คำนวณ
console.log('\n' + '='.repeat(90));
console.log(`${'#'.padEnd(4)} ${'ชื่อ'.padEnd(12)} ${'ประเภท'.padEnd(12)} ${'วันทำงาน'.padStart(8)} ${'เงินฐาน'.padStart(12)} ${'OT'.padStart(9)} ${'หักสาย'.padStart(9)} ${'รวม'.padStart(12)}`);
console.log('='.repeat(90));

let grandTotal = 0;
const summaryRows = [];

for (const eid of Object.keys(empMap).sort((a,b)=>+a-+b)) {
  const srBase = SHIFT[eid];
  let totalBase = 0, totalOt = 0, totalDeduct = 0, workDays = 0;

  for (const d of empMap[eid]) {
    const wfVal = d[keyWF] || '0';
    const wf = parseFloat(wfVal) || 0;
    const lateM = parseFloat(d[keyLate] || '0') || 0;
    const checkin  = (d[keyCin]  || '').trim();
    const checkout = (d[keyCout] || '').trim();
    const dateStr = (d[keyDate] || '').trim();

    const cinH  = parseH(checkin);
    const coutH = parseH(checkout);

    if (cinH === null && coutH === null && wf === 0) continue;

    const sr = getShift(eid, cinH);
    let dailyRate = sr.empType === 'รายเดือน'
      ? Math.round((sr.monthly / DAYS_IN_MONTH) * 100) / 100
      : sr.daily;

    // TUKTA วันอาทิตย์
    if (eid === '21' && isSunday(dateStr)) {
      totalBase += 190;
      workDays++;
      continue;
    }

    // TUKTA ออกก่อน 17:00
    if (eid === '21' && coutH !== null && coutH < 17.0) {
      const hrsWorked = coutH - (cinH !== null ? cinH : 8.0);
      totalBase += Math.round(Math.max(0, hrsWorked) * (380/9) * 100) / 100;
      workDays++;
      continue;
    }

    // พาร์ทไทม์มาแทนกะเช้า
    if (['7','10','11','12','17','23'].includes(eid) && cinH !== null && cinH < 12.0) {
      dailyRate = 350;
      sr.otType = 'morning_pt';
    }
    
    // กฎสลับกะ (ออกก่อนกำหนด หรือเข้า 17:00 แปลงเป็น Part-Time Base 240)
    // ข้อยกเว้น: Kitchen (13,14,16,22), Football (1,18,19), แม่บ้าน (21)
    let isExempt = ['1','13','14','16','18','19','21','7','10','11','12','17','23'].includes(eid);
    let actualCout = coutH;
    if (actualCout !== null && cinH !== null && actualCout < cinH) actualCout += 24;

    if (!isExempt) {
      if (actualCout !== null && actualCout <= 18.0) {
        dailyRate = 240;
        sr.empType = 'พาร์ทไทม์_override';
      } else if (cinH !== null && cinH >= 16.5) {
        dailyRate = 240;
        sr.empType = 'พาร์ทไทม์_override';
        sr.otType = null;
      }
    }

    if (cinH === null) {
      dailyRate = 0;
    } else if (coutH === null) {
      // Nothing needed here for JS CLI since note wasn't saved, but zeroing out isn't needed right now
    }
    
    workDays++;
    totalBase += dailyRate;

    // หักสาย
    const deduct = calcLate(lateM, sr, cinH);
    totalDeduct += deduct;

    // OT
    const effCout = coutH !== null ? coutH : sr.defaultOut;
    const otH = calcOt(eid, cinH, effCout, sr);
    const otMoney = Math.round(otH * OT_RATE * 100) / 100;
    totalOt += otMoney;
  }

  const net = Math.round((totalBase - totalDeduct + totalOt) * 100) / 100;
  grandTotal += net;

  const name = EMP_NAMES[eid] || '?';
  const type = srBase.empType;
  console.log(
    `#${eid.padEnd(3)} ${name.padEnd(12)} ${type.padEnd(12)} ${String(workDays).padStart(8)} ` +
    `${totalBase.toFixed(2).padStart(12)} ${totalOt.toFixed(2).padStart(9)} ${totalDeduct.toFixed(2).padStart(9)} ${net.toFixed(2).padStart(12)}`
  );
  summaryRows.push({eid, name, type, workDays, base: totalBase, ot: totalOt, deduct: totalDeduct, net});
}

console.log('='.repeat(90));
console.log(`${'รวมทั้งหมด'.padEnd(60)} ${grandTotal.toFixed(2).padStart(12)} บาท`);

// สรุปแยกตามประเภท
const byType = {};
for (const s of summaryRows) {
  if (!byType[s.type]) byType[s.type] = 0;
  byType[s.type] += s.net;
}
console.log('\n--- สรุปตามประเภท ---');
for (const [t, total] of Object.entries(byType)) {
  console.log(`${t}: ${total.toFixed(2)} บาท`);
}
