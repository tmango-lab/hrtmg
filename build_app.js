const fs = require('fs');
const path = require('path');

const EMP_NAMES = {
  '1':'JET','2':'Mild','3':'Mameaw','4':'Bird','5':'Ploysai',
  '6':'Chompoo','7':'Mint','8':'Looknum','9':'Aum','10':'Pluem',
  '11':'Jay','12':'Cream','13':'Jui','14':'Noi','15':'Wave',
  '16':'Amp','17':'Ple','18':'YUNG','19':'TAE','20':'Ple FB',
  '21':'TUKTA','22':'Jeab','23':'ManU'
};

function makeSr(t,d,mo,ss,dout,hrs,ot,lt=null){return{t,d,mo,ss,dout,hrs,ot,lt};}
const SHIFT = {
  '1': makeSr('รายวัน',380,0,14,24,10,'football','football'),
  '2': makeSr('รายวัน',380,0,10,21,10,'morning'),
  '3': makeSr('รายเดือน',0,11000,10,21,10,'morning'),
  '4': makeSr('รายเดือน',0,11000,10,21,10,'morning'),
  '5': makeSr('รายวัน',380,0,15,2,10,null),
  '6': makeSr('รายเดือน',0,12000,10,20,10,null),
  '7': makeSr('พาร์ทไทม์',240,0,17,24,7,null),
  '8': makeSr('รายเดือน',0,12000,10,20,10,'looknum'),
  '9': makeSr('รายเดือน',0,11000,10,21,10,'morning'),
  '10': makeSr('พาร์ทไทม์',240,0,17,24,7,null),
  '11': makeSr('พาร์ทไทม์',240,0,17,24,7,null),
  '12': makeSr('พาร์ทไทม์',240,0,17,24,7,null),
  '13': makeSr('รายวัน',700,0,10,22,12,'kitchen'),
  '14': makeSr('รายวัน',700,0,10,22,12,'kitchen'),
  '15': makeSr('รายเดือน',0,11000,15,2,10,null),
  '16': makeSr('รายวัน',550,0,10,22,12,'kitchen'),
  '17': makeSr('พาร์ทไทม์',240,0,17,24,7,null),
  '18': makeSr('รายวัน',400,0,14,24,10,'football','football'),
  '19': makeSr('รายวัน',360,0,14,24,10,'football','football'),
  '20': makeSr('รายวัน',240,0,17,24,7,null),
  '21': makeSr('รายวัน',380,0,8,17,9,null),
  '22': makeSr('รายวัน',450,0,10,22,12,'kitchen'),
  '23': makeSr('พาร์ทไทม์',240,0,17,24,7,null),
};

const csvPath = path.join(__dirname, 'บัตรเวลาทั้งหมด_20260327154545_export.csv');
let raw = fs.readFileSync(csvPath, 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l=>l.trim());
  const hdrs = lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
  return { headers: hdrs, rows: lines.slice(1).map(l=>{
    const v=l.split(',').map(x=>x.trim().replace(/^"|"$/g,''));
    const r={}; hdrs.forEach((h,i)=>r[h]=v[i]||''); return r;
  })};
}
const { headers, rows } = parseCSV(raw);
const kEid  = headers.find(h=>h.includes('หมายเลข'));
const kDate = headers.find(h=>h.includes('วันที่'));
const kLate = headers.find(h=>h.includes('Late'));
const kCin  = headers.find(h=>h.includes('นาฬิกาเข้า'));
const kCout = headers.find(h=>h.includes('นาฬิกาออก'));

const RAW_PUNCHES = {};
for (const r of rows) {
  const eid = (r[kEid]||'').trim();
  if (eid && SHIFT[eid]) { 
    if (!RAW_PUNCHES[eid]) RAW_PUNCHES[eid]=[]; 
    RAW_PUNCHES[eid].push({
      date: (r[kDate]||'').trim(),
      cin: (r[kCin]||'').trim(),
      cout: (r[kCout]||'').trim(),
      lateM: parseFloat(r[kLate]||'0')||0
    });
  }
}

const DEPT_RULES = {
  'looknum': { type: 'after', time: 20, cutoff: 21.1666, rate: 40, reqApprove: true },
  'morning': { type: 'after', time: 21, cutoff: 21.1666, rate: 40, reqApprove: true },
  'morning_pt': { type: 'after', time: 21, cutoff: 21.1666, rate: 40, reqApprove: true },
  'kitchen': { type: 'before', time: 10, cutoff: null, rate: 50, reqApprove: true },
  'football': { type: 'before', time: 14, cutoff: null, rate: 40, reqApprove: true }
};

// Read the template and inject the variables
const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const finalHtml = template.replace('// INJECT_DATA_HERE', `
const EMP_NAMES = ${JSON.stringify(EMP_NAMES)};
let SHIFT = ${JSON.stringify(SHIFT)};
let DEPT_RULES = ${JSON.stringify(DEPT_RULES)};
const RAW_PUNCHES = ${JSON.stringify(RAW_PUNCHES)};
`);

const outPath = path.join(__dirname, 'payroll_app.html');
fs.writeFileSync(outPath, finalHtml, 'utf8');
console.log('สร้างไฟล์สำเร็จ: ' + outPath);
