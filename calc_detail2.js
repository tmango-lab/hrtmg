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
  return (Math.round((upper - rawH) * 60 * 10000) / 10000) <= 10 ? upper : lower;
}
function isSunday(dateStr) {
  try { return new Date(dateStr.trim()).getDay() === 0; } catch(e) { return false; }
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
  '1': makeSr('รายวัน',380,0,14.0,24.0,10,'football','football'),
  '2': makeSr('รายวัน',380,0,10.0,21.0,10,'morning'),
  '3': makeSr('รายเดือน',0,11000,10.0,21.0,10,'morning'),
  '4': makeSr('รายเดือน',0,11000,10.0,21.0,10,'morning'),
  '5': makeSr('รายวัน',380,0,15.0,2.0,10,null),
  '6': makeSr('รายเดือน',0,12000,10.0,20.0,10,null),
  '7': makeSr('พาร์ทไทม์',240,0,17.0,24.0,7,null),
  '8': makeSr('รายเดือน',0,12000,10.0,20.0,10,'looknum'),
  '9': makeSr('รายเดือน',0,11000,10.0,21.0,10,'morning'),
  '10': makeSr('พาร์ทไทม์',240,0,17.0,24.0,7,null),
  '11': makeSr('พาร์ทไทม์',240,0,17.0,24.0,7,null),
  '12': makeSr('พาร์ทไทม์',240,0,17.0,24.0,7,null),
  '13': makeSr('รายวัน',700,0,10.0,22.0,12,'kitchen'),
  '14': makeSr('รายวัน',700,0,10.0,22.0,12,'kitchen'),
  '15': makeSr('รายเดือน',0,11000,15.0,2.0,10,null),
  '16': makeSr('รายวัน',550,0,10.0,22.0,12,'kitchen'),
  '17': makeSr('พาร์ทไทม์',240,0,17.0,24.0,7,null),
  '18': makeSr('รายวัน',400,0,14.0,24.0,10,'football','football'),
  '19': makeSr('รายวัน',360,0,14.0,24.0,10,'football','football'),
  '20': makeSr('รายวัน',240,0,17.0,24.0,7,null),
  '21': makeSr('รายวัน',380,0,8.0,17.0,9,null),
  '22': makeSr('รายวัน',450,0,10.0,22.0,12,'kitchen'),
  '23': makeSr('พาร์ทไทม์',240,0,17.0,24.0,7,null),
};
function getShift(eid, cinH) {
  let sr = Object.assign({}, SHIFT[eid]);
  if (eid === '8' && cinH !== null && cinH >= 12.0) {
    sr.shiftStart = 15.0; sr.defaultOut = 2.0; sr.otType = null;
  }
  return sr;
}
function calcOt(eid, cinH, coutH, sr) {
  const ot = sr.otType;
  if (!ot || cinH === null) return 0.0;
  let cout = (coutH !== null) ? coutH : sr.defaultOut;
  if (cout < cinH) cout += 24;
  if (ot === 'looknum')    return cout <= 21.0 ? 0.0 : roundHalf(cout - 20.0);
  if (ot === 'morning' || ot === 'morning_pt') return cout <= 21.0 ? 0.0 : roundHalf(cout - 21.0);
  if (ot === 'kitchen')   return cinH >= 9.0 ? 0.0 : roundHalf(10.0 - cinH);
  if (ot === 'football')  return cinH >= 13.0 ? 0.0 : roundHalf(14.0 - cinH);
  return 0.0;
}
function calcLate(lateMin, sr, cinH=null) {
  if (sr.otType === 'kitchen') return kitchenLateDeduct(lateMin, sr.daily, sr.hrsDay);
  if (sr.lateType === 'football') {
    if (lateMin <= 10 || cinH === null) return 0.0;
    let periods = 0, b = 15.0;
    while (b <= cinH + 10/60 && b <= 20) {
      if ((b - cinH)*60 <= 10 || cinH >= b) periods++;
      b += 1.0;
    }
    return periods * OT_RATE;
  }
  if (sr.empType === 'พาร์ทไทม์' || sr.empType === 'พาร์ทไทม์_override') {
    if (lateMin <= 10) return 0.0;
    return Math.ceil(lateMin / 60) * 40.0;
  }
  if (sr.empType === 'รายเดือน') {
    if (lateMin <= 10) return 0.0;
    const rph = (sr.monthly / DAYS_IN_MONTH) / sr.hrsDay;
    return Math.round((roundHalf(lateMin/60)||0.5) * rph * 100) / 100;
  } else {
    if (lateMin <= 10) return 0.0;
    return Math.round((roundHalf(lateMin/60)||0.5) * OT_RATE * 100) / 100;
  }
}

// อ่าน CSV
const csvPath = path.join(__dirname, 'D456FA4577B86C439ED8E8F42B1F3F1104FD4AD8_บัตรเวลาทั้งหมด_20260322105014_export.csv');
let raw = fs.readFileSync(csvPath, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const hdrs = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''));
  return { headers: hdrs, rows: lines.slice(1).map(l => {
    const v = l.split(',').map(x => x.trim().replace(/^"|"$/g,''));
    const r = {}; hdrs.forEach((h,i) => r[h] = v[i]||''); return r;
  })};
}
const { headers, rows } = parseCSV(raw);
const kEid  = headers.find(h => h.includes('หมายเลข'));
const kDate = headers.find(h => h.includes('วันที่'));
const kLate = headers.find(h => h.includes('Late'));
const kCin  = headers.find(h => h.includes('นาฬิกาเข้า'));
const kCout = headers.find(h => h.includes('นาฬิกาออก'));

const empMap = {};
for (const r of rows) {
  const eid = (r[kEid]||'').trim();
  if (eid && SHIFT[eid]) { if (!empMap[eid]) empMap[eid] = []; empMap[eid].push(r); }
}

const f2 = n => n.toFixed(2);
const lines_out = [];
let grandTotal = 0;

for (const eid of Object.keys(empMap).sort((a,b)=>+a-+b)) {
  const srBase = SHIFT[eid];
  const name   = EMP_NAMES[eid]||'?';
  const rateStr = srBase.empType==='รายเดือน' ? `${srBase.monthly} บ./เดือน (${f2(srBase.monthly/DAYS_IN_MONTH)} บ./วัน)` : `${srBase.daily} บ./วัน`;

  lines_out.push('');
  lines_out.push('━'.repeat(72));
  lines_out.push(`#${eid}  ${name}  [${srBase.empType}]  อัตรา: ${rateStr}`);
  lines_out.push('━'.repeat(72));
  lines_out.push(`${'วันที่'.padEnd(12)}${'เข้า'.padEnd(7)}${'ออก'.padEnd(7)}${'สาย(นาที)'.padEnd(11)}${'ฐาน'.padStart(9)}${'OT'.padStart(8)}${'หัก'.padStart(8)}${'รวม/วัน'.padStart(10)}  หมายเหตุ`);
  lines_out.push('─'.repeat(72));

  let totBase=0, totOt=0, totDeduct=0;

  for (const d of empMap[eid]) {
    const lateM   = parseFloat(d[kLate]||'0')||0;
    const checkin  = (d[kCin]||'').trim();
    const checkout = (d[kCout]||'').trim();
    const dateStr  = (d[kDate]||'').trim();
    const cinH  = parseH(checkin);
    const coutH = parseH(checkout);
    if (cinH===null && coutH===null) continue;

    const sr = getShift(eid, cinH);
    let dayRate = srBase.empType==='รายเดือน' ? Math.round(srBase.monthly/DAYS_IN_MONTH*100)/100 : srBase.daily;
    let note = '';

    // TUKTA วันอาทิตย์
    if (eid==='21' && isSunday(dateStr)) {
      totBase += 190;
      lines_out.push(`${dateStr.padEnd(12)}${(checkin||'-').padEnd(7)}${(checkout||'-').padEnd(7)}${''.padEnd(11)}${'190.00'.padStart(9)}${'0.00'.padStart(8)}${'0.00'.padStart(8)}${'190.00'.padStart(10)}  วันอาทิตย์`);
      continue;
    }
    // TUKTA ออกก่อน 17:00
    if (eid==='21' && coutH!==null && coutH<17.0) {
      const hrsW = coutH - (cinH!==null?cinH:8.0);
      const pay  = Math.round(Math.max(0,hrsW)*(380/9)*100)/100;
      totBase += pay;
      lines_out.push(`${dateStr.padEnd(12)}${(checkin||'-').padEnd(7)}${(checkout||'-').padEnd(7)}${''.padEnd(11)}${f2(pay).padStart(9)}${'0.00'.padStart(8)}${'0.00'.padStart(8)}${f2(pay).padStart(10)}  ออกก่อน 17:00`);
      continue;
    }
    // พาร์ทไทม์กะเช้า
    if (['7','10','11','12','17','23'].includes(eid) && cinH!==null && cinH<12.0) {
      dayRate = 350; sr.otType = 'morning_pt'; note = 'มาแทนกะเช้า';
    }
    // กฎสลับกะ (ออกก่อนกำหนด หรือเข้า 17:00 แปลงเป็น Part-Time Base 240)
    // ข้อยกเว้น: Kitchen (13,14,16,22), Football (1,18,19), แม่บ้าน (21)
    let isExempt = ['1','13','14','16','18','19','21','7','10','11','12','17','23'].includes(eid);
    let actualCout = coutH;
    if (actualCout !== null && cinH !== null && actualCout < cinH) actualCout += 24;

    if (!isExempt) {
      if (actualCout !== null && actualCout <= 18.0) {
        dayRate = 240;
        sr.empType = 'พาร์ทไทม์_override';
        note = 'ออกก่อน 18:00 (เรท PT)';
      } else if (cinH !== null && cinH >= 16.5) {
        dayRate = 240;
        sr.empType = 'พาร์ทไทม์_override';
        sr.otType = null;
        note = 'สลับเข้า 17:00 (เรท PT)';
      }
    }

    const deduct  = calcLate(lateM, sr, cinH);
    const effCout = coutH!==null ? coutH : sr.defaultOut;
    const otH     = calcOt(eid, cinH, effCout, sr);
    const otMoney = Math.round(otH*OT_RATE*100)/100;
    const dayNet  = Math.round((dayRate-deduct+otMoney)*100)/100;
    totBase   += dayRate; totOt += otMoney; totDeduct += deduct;

    const lateStr = lateM > 10 ? String(Math.round(lateM)) : '';
    if (otH > 0) note = (note?note+' ':'')+`OT ${otH}ชม.`;

    lines_out.push(
      `${dateStr.padEnd(12)}${(checkin||'-').padEnd(7)}${(checkout||'-').padEnd(7)}${lateStr.padEnd(11)}` +
      `${f2(dayRate).padStart(9)}${f2(otMoney).padStart(8)}${f2(deduct).padStart(8)}${f2(dayNet).padStart(10)}  ${note}`
    );
  }

  const net = Math.round((totBase-totDeduct+totOt)*100)/100;
  grandTotal += net;
  lines_out.push('─'.repeat(72));
  lines_out.push(`${'รวม'.padEnd(44)}${f2(totBase).padStart(9)}${f2(totOt).padStart(8)}${f2(totDeduct).padStart(8)}${f2(net).padStart(10)} บาท`);
}

lines_out.push('');
lines_out.push('═'.repeat(72));
lines_out.push(`รวมเงินเดือนทั้งหมด: ${grandTotal.toFixed(2)} บาท`);
lines_out.push('═'.repeat(72));

const outPath = path.join(__dirname, 'salary_detail.txt');
fs.writeFileSync(outPath, lines_out.join('\n'), 'utf8');
console.log('เขียนไฟล์สำเร็จ: ' + outPath);
console.log(lines_out.join('\n'));
