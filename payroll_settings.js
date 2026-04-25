// ==================== DATA ====================
const TAB_CONFIG = [
  {id:'global', icon:'🌐', label:'ตั้งค่าทั่วไป'},
  {id:'shifts', icon:'⏰', label:'แม่แบบกะ'},
  {id:'rules',  icon:'⚖️', label:'กฎ OT & หักสาย'},
  {id:'dynamic',icon:'🔄', label:'กฎสลับกะ'},
  {id:'employees',icon:'👥',label:'พนักงาน'}
];

// ==================== DEPARTMENTS ====================
let DEPT_LIST = [
  {id:'serve_daily',  label:'🍽️ เสิร์ฟ กะเช้า (รายวัน)'},
  {id:'serve_daily_afternoon',label:'🍽️ เสิร์ฟ กะบ่าย (รายวัน)'},
  {id:'serve_monthly',label:'🍽️ เสิร์ฟ กะเช้า (รายเดือน)'},
  {id:'kitchen',      label:'🍳 ครัว'},
  {id:'football',     label:'⚽ สนามบอล'},
  {id:'clerk',        label:'📋 สเมียน'},
  {id:'parttime',     label:'🕐 พาร์ทไทม์'},
  {id:'other',        label:'📦 อื่นๆ'}
];

let DEPT_FILTER = 'all';

// ==================== MANAGE DEPARTMENTS ====================
function renderDeptManager(){
  const c = document.getElementById('dept-manager-list');
  if(!c) return;
  c.innerHTML = DEPT_LIST.map((d,i)=>`
    <tr>
      <td style="width:36px">
        <input value="${d.id}" onchange="renameDeptId(${i}, this.value)" style="width:110px;font-size:.78rem" placeholder="ID (no space)">
      </td>
      <td>
        <input value="${d.label}" onchange="DEPT_LIST[${i}].label=this.value; refreshDeptUI()" style="width:100%;font-size:.85rem" placeholder="ชื่อแผนก (ใส่ emoji ได้)">
      </td>
      <td style="text-align:right">
        <button class="del-btn" onclick="deleteDept(${i})" ${DEPT_LIST.length<=1?'disabled':''}>✕</button>
      </td>
    </tr>`).join('');
}
function renameDeptId(i, newId){
  const oldId = DEPT_LIST[i].id;
  newId = newId.trim().replace(/\s+/g,'_');
  if(!newId || DEPT_LIST.some((d,j)=>d.id===newId && j!==i)) return;
  EMPLOYEES.forEach(e=>{ if(e.dept===oldId) e.dept=newId; });
  if(DEPT_FILTER===oldId) DEPT_FILTER=newId;
  DEPT_LIST[i].id = newId;
  refreshDeptUI();
}
function addDept(){
  const emoji = ['🏢','🌟','🔧','🎯','💼','🛎️','🚀','🎪'];
  const icon = emoji[DEPT_LIST.length % emoji.length];
  const newId = 'dept_'+Date.now();
  DEPT_LIST.push({id:newId, label:icon+' แผนกใหม่'});
  refreshDeptUI();
  // focus ช่องชื่อแผนกใหม่
  setTimeout(()=>{
    const rows = document.querySelectorAll('#dept-manager-list tr');
    if(rows.length) rows[rows.length-1].querySelector('input:last-of-type')?.focus();
  }, 80);
}
function deleteDept(i){
  if(DEPT_LIST.length<=1){ alert('ต้องมีแผนกอย่างน้อย 1 แผนก'); return; }
  const oldId = DEPT_LIST[i].id;
  // ย้ายพนักงานในแผนกที่ถูกลบ → other หรือแผนกแรกที่เหลือ
  const fallback = DEPT_LIST.find((d,j)=>j!==i)?.id || 'other';
  EMPLOYEES.forEach(e=>{ if(e.dept===oldId) e.dept=fallback; });
  if(DEPT_FILTER===oldId) DEPT_FILTER='all';
  DEPT_LIST.splice(i,1);
  refreshDeptUI();
}
function refreshDeptUI(){
  renderDeptManager();
  renderDeptFilter();
  renderEmployees();
}

const SHIFT_TEMPLATES = [
  {id:'shift_08', name:'กะ 08:00',         ss:8,  dout:17, hrs:9,  ot:'none',     lt:'general'},
  {id:'shift_10', name:'กะ 10:00',         ss:10, dout:21, hrs:11, ot:'morning',  lt:'general'},
  {id:'shift_10_office', name:'กะ Office 10:00', ss:10, dout:20, hrs:10, ot:'looknum', lt:'general'},
  {id:'shift_10_kitchen',name:'กะครัว 10:00', ss:10,dout:22,hrs:12, ot:'kitchen',  lt:'kitchen'},
  {id:'shift_14', name:'กะสนาม 14:00',     ss:14, dout:24, hrs:10, ot:'football', lt:'football'},
  {id:'shift_15', name:'กะ 15:00',         ss:15, dout:24, hrs:10, ot:'none',     lt:'general'},
  {id:'shift_17', name:'กะ 17:00',         ss:17, dout:24, hrs:7,  ot:'none',     lt:'part'}
];

const EMPLOYEES = [
  {id:'1', name:'JET',     type:'รายวัน',   shiftId:'shift_14',       daily:380, monthly:0,     hrs:10, otType:'football', lateType:'football',  dept:'football'},
  {id:'2', name:'Mild',    type:'รายวัน',   shiftId:'shift_10',       daily:380, monthly:0,     hrs:11, otType:'morning',  lateType:'general',   dept:'serve_daily'},
  {id:'3', name:'Mameaw',  type:'รายเดือน', shiftId:'shift_10',       daily:0,   monthly:11000, hrs:11, otType:'morning',  lateType:'general',   dept:'serve_monthly'},
  {id:'4', name:'Bird',    type:'รายเดือน', shiftId:'shift_10',       daily:0,   monthly:11000, hrs:11, otType:'morning',  lateType:'general',   dept:'serve_monthly'},
  {id:'5', name:'Ploysai', type:'รายวัน',   shiftId:'shift_15',       daily:380, monthly:0,     hrs:10, otType:'none',     lateType:'general',   dept:'serve_daily_afternoon'},
  {id:'6', name:'Chompoo', type:'รายเดือน', shiftId:'shift_10_office',  daily:0,   monthly:12000, hrs:10, otType:'none',     lateType:'office',    dept:'serve_monthly'},
  {id:'7', name:'Mint',    type:'พาร์ทไทม์',shiftId:'shift_17',       daily:240, monthly:0,     hrs:7,  otType:'none',     lateType:'part',      dept:'parttime'},
  {id:'8', name:'Looknum', type:'รายเดือน', shiftId:'shift_10_office',  daily:0,   monthly:12000, hrs:10, otType:'looknum',  lateType:'office',    dept:'serve_monthly'},
  {id:'9', name:'Aum',     type:'รายเดือน', shiftId:'shift_10',       daily:0,   monthly:11000, hrs:11, otType:'morning',  lateType:'general',   dept:'serve_monthly'},
  {id:'10',name:'Pluem',   type:'พาร์ทไทม์',shiftId:'shift_17',       daily:240, monthly:0,     hrs:7,  otType:'none',     lateType:'part',      dept:'parttime'},
  {id:'11',name:'Jay',     type:'พาร์ทไทม์',shiftId:'shift_17',       daily:240, monthly:0,     hrs:7,  otType:'none',     lateType:'part',      dept:'parttime'},
  {id:'12',name:'Cream',   type:'พาร์ทไทม์',shiftId:'shift_17',       daily:240, monthly:0,     hrs:7,  otType:'none',     lateType:'part',      dept:'parttime'},
  {id:'13',name:'Jui',     type:'รายวัน',   shiftId:'shift_10_kitchen',daily:700,monthly:0,     hrs:12, otType:'kitchen',  lateType:'kitchen',   dept:'kitchen'},
  {id:'14',name:'Noi',     type:'รายวัน',   shiftId:'shift_10_kitchen',daily:700,monthly:0,     hrs:12, otType:'kitchen',  lateType:'kitchen',   dept:'kitchen'},
  {id:'15',name:'Wave',    type:'รายเดือน', shiftId:'shift_15',       daily:0,   monthly:11000, hrs:10, otType:'none',     lateType:'general',   dept:'serve_monthly'},
  {id:'16',name:'Amp',     type:'รายวัน',   shiftId:'shift_10_kitchen',daily:550,monthly:0,     hrs:12, otType:'kitchen',  lateType:'kitchen',   dept:'kitchen'},
  {id:'17',name:'Ple',     type:'พาร์ทไทม์',shiftId:'shift_17',       daily:240, monthly:0,     hrs:7,  otType:'none',     lateType:'part',      dept:'parttime'},
  {id:'18',name:'YUNG',    type:'รายวัน',   shiftId:'shift_14',       daily:400, monthly:0,     hrs:10, otType:'football', lateType:'football',  dept:'football'},
  {id:'19',name:'TAE',     type:'รายวัน',   shiftId:'shift_14',       daily:360, monthly:0,     hrs:10, otType:'football', lateType:'football',  dept:'football'},
  {id:'20',name:'Ple FB',  type:'รายวัน',   shiftId:'shift_17',       daily:240, monthly:0,     hrs:7,  otType:'none',     lateType:'general',   dept:'football'},
  {id:'21',name:'TUKTA',   type:'รายวัน',   shiftId:'shift_08',       daily:380, monthly:0,     hrs:9,  otType:'none',     lateType:'general',   dept:'clerk'},
  {id:'22',name:'Jeab',    type:'รายวัน',   shiftId:'shift_10_kitchen',daily:450,monthly:0,     hrs:12, otType:'kitchen',  lateType:'kitchen',   dept:'kitchen'},
  {id:'23',name:'ManU',    type:'พาร์ทไทม์',shiftId:'shift_17',       daily:240, monthly:0,     hrs:7,  otType:'none',     lateType:'part',      dept:'parttime'}
];

// ==================== TAB SYSTEM ====================
function buildTabs(){
  const bar = document.getElementById('tabBar');
  bar.innerHTML = TAB_CONFIG.map((t,i)=>
    `<button class="tab${i===0?' active':''}" onclick="switchTab('${t.id}')">${t.icon} ${t.label}</button>`
  ).join('');
}
function switchTab(id){
  document.querySelectorAll('.tab').forEach((t,i)=> t.classList.toggle('active', TAB_CONFIG[i].id===id));
  document.querySelectorAll('.section').forEach(s=> s.classList.remove('active'));
  document.getElementById('tab-'+id).classList.add('active');
}

// ==================== RENDER SHIFTS ====================
const OT_TYPES = ['none','morning','kitchen','football','looknum'];
const LATE_TYPES = ['general','office','kitchen','football','part','monthly'];

function updateShiftHrs(index, newHrs) {
  SHIFT_TEMPLATES[index].hrs = newHrs;
  const shiftId = SHIFT_TEMPLATES[index].id;
  EMPLOYEES.forEach(e => {
    if (e.shiftId === shiftId) e.hrs = newHrs;
  });
  renderEmployees();
}

function renderShifts(){
  const c = document.getElementById('shift-list');
  c.innerHTML = SHIFT_TEMPLATES.map((s,i)=>`
    <tr>
      <td><input value="${s.id}" onchange="SHIFT_TEMPLATES[${i}].id=this.value" style="width:90px"></td>
      <td><input value="${s.name}" onchange="SHIFT_TEMPLATES[${i}].name=this.value" style="width:130px"></td>
      <td><input type="number" value="${s.ss}" onchange="SHIFT_TEMPLATES[${i}].ss=+this.value" style="width:65px"></td>
      <td><input type="number" value="${s.dout}" onchange="SHIFT_TEMPLATES[${i}].dout=+this.value" style="width:65px"></td>
      <td><input type="number" value="${s.hrs}" onchange="updateShiftHrs(${i}, +this.value)" style="width:65px"></td>
      <td><select onchange="SHIFT_TEMPLATES[${i}].ot=this.value" style="width:100px">${OT_TYPES.map(o=>`<option${s.ot===o?' selected':''}>${o}</option>`).join('')}</select></td>
      <td><select onchange="SHIFT_TEMPLATES[${i}].lt=this.value" style="width:100px">${LATE_TYPES.map(l=>`<option${s.lt===l?' selected':''}>${l}</option>`).join('')}</select></td>
      <td style="text-align:right"><button class="del-btn" onclick="SHIFT_TEMPLATES.splice(${i},1);renderShifts()">✕</button></td>
    </tr>`).join('');
}
function addShift(){
  SHIFT_TEMPLATES.push({id:'shift_new',name:'กะใหม่',ss:10,dout:21,hrs:10,ot:'none',lt:'general'});
  renderShifts();
}

// ==================== RENDER EMPLOYEES ====================
function shiftIdOptions(sel){
  return SHIFT_TEMPLATES.map(s=>`<option value="${s.id}"${sel===s.id?' selected':''}>${s.id}</option>`).join('');
}
function deptOptions(sel){
  return DEPT_LIST.map(d=>`<option value="${d.id}"${sel===d.id?' selected':''}>${d.label}</option>`).join('');
}
function deptLabel(id){
  const d = DEPT_LIST.find(x=>x.id===id);
  return d ? d.label : id || '—';
}
function renderDeptFilter(){
  const wrap = document.getElementById('dept-filter-bar');
  if(!wrap) return;
  const counts = {};
  EMPLOYEES.forEach(e=>{ counts[e.dept||'other']=(counts[e.dept||'other']||0)+1; });
  wrap.innerHTML =
    `<button class="dept-filter-btn${DEPT_FILTER==='all'?' active':''}" onclick="setDeptFilter('all')">ทั้งหมด (${EMPLOYEES.length})</button>` +
    DEPT_LIST.filter(d=>counts[d.id]).map(d=>
      `<button class="dept-filter-btn${DEPT_FILTER===d.id?' active':''}" onclick="setDeptFilter('${d.id}')">${d.label} (${counts[d.id]||0})</button>`
    ).join('');
}
function setDeptFilter(id){
  DEPT_FILTER = id;
  renderDeptFilter();
  renderEmployees();
}

function changeEmpShift(index, newShiftId) {
  EMPLOYEES[index].shiftId = newShiftId;
  const t = SHIFT_TEMPLATES.find(s => s.id === newShiftId);
  if (t) EMPLOYEES[index].hrs = t.hrs;
  renderEmployees();
}

function renderEmployees(){
  const c = document.getElementById('emp-list');
  const list = DEPT_FILTER==='all' ? EMPLOYEES : EMPLOYEES.filter(e=>(e.dept||'other')===DEPT_FILTER);
  if(list.length===0){
    c.innerHTML=`<tr><td colspan="11" style="text-align:center;color:var(--muted);padding:20px">ไม่มีพนักงานในแผนกนี้</td></tr>`;
    return;
  }
  c.innerHTML = list.map((e)=>{
    const i = EMPLOYEES.indexOf(e);
    return `
    <tr>
      <td><input value="${e.id}" onchange="EMPLOYEES[${i}].id=this.value" style="width:45px"></td>
      <td><input value="${e.name}" onchange="EMPLOYEES[${i}].name=this.value" style="width:100px"></td>
      <td><select onchange="EMPLOYEES[${i}].type=this.value" style="width:95px">
        <option${e.type==='รายวัน'?' selected':''}>รายวัน</option>
        <option${e.type==='รายเดือน'?' selected':''}>รายเดือน</option>
        <option${e.type==='พาร์ทไทม์'?' selected':''}>พาร์ทไทม์</option>
      </select></td>
      <td><select onchange="EMPLOYEES[${i}].dept=this.value;renderDeptFilter();" style="width:190px">${deptOptions(e.dept||'other')}</select></td>
      <td><select onchange="changeEmpShift(${i}, this.value)" style="width:140px">${shiftIdOptions(e.shiftId)}</select></td>
      <td><input type="number" value="${e.daily}" onchange="EMPLOYEES[${i}].daily=+this.value" style="width:68px"></td>
      <td><input type="number" value="${e.monthly}" onchange="EMPLOYEES[${i}].monthly=+this.value" style="width:85px"></td>
      <td><input type="number" value="${e.hrs}" onchange="EMPLOYEES[${i}].hrs=+this.value" style="width:55px"></td>
      <td><select onchange="EMPLOYEES[${i}].otType=this.value" style="width:100px">${OT_TYPES.map(o=>`<option${e.otType===o?' selected':''}>${o}</option>`).join('')}</select></td>
      <td><select onchange="EMPLOYEES[${i}].lateType=this.value" style="width:90px">${LATE_TYPES.map(l=>`<option${e.lateType===l?' selected':''}>${l}</option>`).join('')}</select></td>
      <td style="text-align:right"><button class="del-btn" onclick="EMPLOYEES.splice(${i},1);renderDeptFilter();renderEmployees()">✕</button></td>
    </tr>`;
  }).join('');
}
function addEmployee(){
  EMPLOYEES.push({id:String(EMPLOYEES.length+1),name:'ใหม่',type:'รายวัน',shiftId:'shift_10',daily:380,monthly:0,hrs:10,otType:'morning',lateType:'general',dept:'other'});
  renderDeptFilter();
  renderEmployees();
}

// ==================== HELPER ====================
function g(id){ return document.getElementById(id)?.value || ''; }
function gn(id){ return +(document.getElementById(id)?.value||0); }
function parseTime(s){ const p=s.split(':'); return +p[0]+(+p[1]||0)/60; }

// ==================== EXPORT JSON ====================
function getSettingsData(){
  const shifts = {};
  SHIFT_TEMPLATES.forEach(s=> shifts[s.id] = {name:s.name,ss:s.ss,dout:s.dout,hrs:s.hrs,ot:s.ot,lt:s.lt});

  const profiles = {};
  EMPLOYEES.forEach(e=> profiles[e.id] = {
    name:e.name, shiftId:e.shiftId, t:e.type,
    d:e.daily, mo:e.monthly, hrs:e.hrs,
    otRate:gn('g_ot_rate'), otType:e.otType, lateType:e.lateType,
    dept:e.dept||'other'
  });

  return {
    version: g('g_month_label'),
    source: 'payroll_settings_export',
    exportedAt: new Date().toISOString(),
    departments: DEPT_LIST.map(d=>({id:d.id, label:d.label})),
    shiftTemplates: shifts,
    shiftProfiles: profiles,
    otDepartmentRules: {
      morning: {type:'after', time:parseTime(g('ot_morning_start')), cutoff:gn('ot_morning_grace'), rate:gn('g_ot_rate'), rounding:gn('ot_morning_round'), roundDir:g('ot_morning_round_dir'), reqApprove:true},
      kitchen: {type:'before', time:parseTime(g('ot_kitchen_shift')), cutoff:parseTime(g('ot_kitchen_cutoff')), rate:gn('ot_kitchen_rate') || gn('g_ot_rate'), rounding:gn('ot_kitchen_round'), roundDir:g('ot_kitchen_round_dir'), reqApprove:true},
      football:{type:'before', time:parseTime(g('ot_football_shift')),cutoff:parseTime(g('ot_football_cutoff')),rate:gn('g_ot_rate'), rounding:gn('ot_football_round'),roundDir:g('ot_football_round_dir'),reqApprove:true},
      looknum: {type:'after', time:parseTime(g('ot_looknum_start')), cutoff:parseTime(g('ot_looknum_grace')), rate:gn('g_ot_rate'), reqApprove:true}
    },
    globalRules: {
      monthLabel: g('g_month_label'),
      daysInMonth: gn('g_days'),
      defaultOtRate: gn('g_ot_rate'),
      overnightAdd24: true,
      missingPunch: { cin: g('g_miss_in'), cout: g('g_miss_out') },
      rounding: {
        parttimeLate: g('late_pt_round'),
        salaryLate: g('late_monthly_round'),
        dailyLate: g('late_gen_round')
      },
      lateRules: {
        graceMinutesGeneral: gn('late_gen_grace'),
        kitchen: { graceMinutes: gn('late_kitchen_grace'), baseHrs: gn('late_kitchen_base_hrs'), perMinuteMode: true },
        office: { graceMinutes: gn('late_office_grace'), baseHrs: gn('late_office_base_hrs'), perMinuteMode: true },
        football:{ startHour:parseTime(g('late_fb_shift')), graceMinutes:gn('late_fb_grace'), perBlock:gn('late_fb_per_block'), blockMinutes:gn('late_fb_block_min'),
                   allowUntilHour:parseTime(g('late_fb_allow_until')), deductAnchorHour:parseTime(g('late_fb_anchor')) },
        parttime:{ graceMinutes:gn('late_pt_grace'), rounding:g('late_pt_round') },
        monthly: { graceMinutes:gn('late_monthly_grace'), rounding:g('late_monthly_round') },
        daily:   { graceMinutes:gn('late_gen_grace'), rounding:g('late_gen_round'), ratePerBlock:gn('late_gen_rate') }
      },
      dynamicShift: {
        candidateShifts: g('ds_candidates').split(',').map(s=>+s.trim()),
        lockedOtGroups: g('ds_locked').split(',').map(s=>s.trim()),
        parttimeOverride: { lateInCutoff:parseTime(g('ds_late_in')), earlyOutCutoff:parseTime(g('ds_early_out')), rate:gn('ds_pt_rate'), stripOt:g('ds_strip_ot')==='yes' },
        earlyCheckout: { toleranceMin:gn('ec_fulltime_tol'), ptToleranceMin:gn('ec_pt_tol'), swap17Rate:gn('ec_swap17_rate') },
        shopClosedAi: { minWorkers:gn('shop_ai_min_workers'), timeSpreadHrs:gn('shop_ai_time_spread'), earlyHrs:gn('shop_ai_early_hrs') },
        partTimeMorningReplacement: { cutoff:parseTime(g('ds_pt_morning_cutoff')), rate:gn('ds_pt_morning_rate'), baseHrs:gn('ds_pt_morning_hrs'), shiftEndCutoff:parseTime(g('ds_pt_morning_end')), eligibleIds:g('ds_pt_morning_ids').split(',').map(s=>s.trim()) },
        cleanerSpecial: { ids:g('cl_ids').split(',').map(s=>s.trim()).filter(Boolean), sundayRate:gn('cl_sunday_rate'), earlyOutCutoff:parseTime(g('cl_early_out')), baseHrs:gn('cl_base_hrs') }
      },
      csv: { eid:g('g_col_eid'), date:g('g_col_date'), cin:g('g_col_cin'), cout:g('g_col_cout') }
    }
  };
}



// ==================== IMPORT JSON ====================
function parseAndLoad(data){
  if(!data.shiftTemplates || !data.shiftProfiles) throw new Error("โครงสร้างไฟล์ไม่ถูกต้อง");

  // Load Departments
  if(Array.isArray(data.departments) && data.departments.length){
    DEPT_LIST.length=0;
    data.departments.forEach(d=>DEPT_LIST.push({id:d.id,label:d.label}));
    renderDeptManager();
  }

  // Load Templates
  SHIFT_TEMPLATES.length=0;
  Object.keys(data.shiftTemplates).forEach(id=>{
    const s = data.shiftTemplates[id];
    SHIFT_TEMPLATES.push({id, name:s.name, ss:s.ss, dout:s.dout, hrs:s.hrs, ot:s.ot, lt:s.lt});
  });

  // Load Profiles
  EMPLOYEES.length=0;
  Object.keys(data.shiftProfiles).forEach(id=>{
    const p = data.shiftProfiles[id];
    EMPLOYEES.push({id, name:p.name, type:p.t, shiftId:p.shiftId, daily:p.d, monthly:p.mo, hrs:p.hrs, otType:p.otType, lateType:p.lateType, dept:p.dept||'other'});
  });

  const sv = (id, val) => { const el=document.getElementById(id); if(el && val!==undefined) el.value=val; };
  const fmtH = (num) => {
    if(num===null || num===undefined) return '';
    const h=Math.floor(num), m=Math.round((num-h)*60);
    return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');
  };

  const gr = data.globalRules||{}, ot = data.otDepartmentRules||{}, ds = gr.dynamicShift||{}, lr = gr.lateRules||{};
  sv('g_month_label', gr.monthLabel); sv('g_days', gr.daysInMonth); sv('g_ot_rate', gr.defaultOtRate);
  if(gr.missingPunch){ sv('g_miss_in', gr.missingPunch.cin); sv('g_miss_out', gr.missingPunch.cout); }
  if(gr.csv){ sv('g_col_eid', gr.csv.eid); sv('g_col_date', gr.csv.date); sv('g_col_cin', gr.csv.cin); sv('g_col_cout', gr.csv.cout); }

  if(ot.morning){ sv('ot_morning_start', fmtH(ot.morning.time)); sv('ot_morning_grace', ot.morning.cutoff); sv('ot_morning_round', ot.morning.rounding); }
  if(ot.kitchen){ sv('ot_kitchen_shift', fmtH(ot.kitchen.time)); sv('ot_kitchen_cutoff', fmtH(ot.kitchen.cutoff)); sv('ot_kitchen_round', ot.kitchen.rounding); sv('ot_kitchen_rate', ot.kitchen.rate || gr.defaultOtRate); }
  if(ot.football){ sv('ot_football_shift', fmtH(ot.football.time)); sv('ot_football_cutoff', fmtH(ot.football.cutoff)); sv('ot_football_round', ot.football.rounding); }
  if(ot.looknum){ sv('ot_looknum_start', fmtH(ot.looknum.time)); sv('ot_looknum_grace', fmtH(ot.looknum.cutoff)); }

  if(lr.kitchen){ sv('late_kitchen_grace', lr.kitchen.graceMinutes ?? lr.kitchen.freeMinutes ?? 10); sv('late_kitchen_base_hrs', lr.kitchen.baseHrs ?? 12); }
  if(lr.office){ sv('late_office_grace', lr.office.graceMinutes ?? 10); sv('late_office_base_hrs', lr.office.baseHrs ?? 10); }
  if(lr.football){ sv('late_fb_shift', fmtH(lr.football.startHour)); sv('late_fb_grace', lr.football.graceMinutes); sv('late_fb_per_block', lr.football.perBlock); sv('late_fb_block_min', lr.football.blockMinutes);
    sv('late_fb_allow_until', fmtH(lr.football.allowUntilHour)); sv('late_fb_anchor', fmtH(lr.football.deductAnchorHour)); }
  if(lr.parttime){ sv('late_pt_grace', lr.parttime.graceMinutes); }
  if(lr.monthly){ sv('late_monthly_grace', lr.monthly.graceMinutes); }
  if(lr.daily){ sv('late_gen_grace', lr.daily.graceMinutes); sv('late_gen_rate', lr.daily.ratePerBlock); }
  if(gr.rounding){ sv('late_pt_round', gr.rounding.parttimeLate); sv('late_monthly_round', gr.rounding.salaryLate); sv('late_gen_round', gr.rounding.dailyLate); }

  if(ds.candidateShifts) sv('ds_candidates', ds.candidateShifts.join(', '));
  if(ds.lockedOtGroups) sv('ds_locked', ds.lockedOtGroups.join(', '));
  if(ds.parttimeOverride){ sv('ds_late_in', fmtH(ds.parttimeOverride.lateInCutoff)); sv('ds_early_out', fmtH(ds.parttimeOverride.earlyOutCutoff)); sv('ds_pt_rate', ds.parttimeOverride.rate); sv('ds_strip_ot', ds.parttimeOverride.stripOt?'yes':'no'); }
  if(ds.earlyCheckout){ sv('ec_fulltime_tol', ds.earlyCheckout.toleranceMin); sv('ec_pt_tol', ds.earlyCheckout.ptToleranceMin); sv('ec_swap17_rate', ds.earlyCheckout.swap17Rate); }
  if(ds.shopClosedAi) { sv('shop_ai_min_workers', ds.shopClosedAi.minWorkers); sv('shop_ai_time_spread', ds.shopClosedAi.timeSpreadHrs); sv('shop_ai_early_hrs', ds.shopClosedAi.earlyHrs); }
  if(ds.partTimeMorningReplacement){ sv('ds_pt_morning_cutoff', fmtH(ds.partTimeMorningReplacement.cutoff)); sv('ds_pt_morning_rate', ds.partTimeMorningReplacement.rate); sv('ds_pt_morning_hrs', ds.partTimeMorningReplacement.baseHrs); sv('ds_pt_morning_end', fmtH(ds.partTimeMorningReplacement.shiftEndCutoff)); sv('ds_pt_morning_ids', (ds.partTimeMorningReplacement.eligibleIds||[]).join(',')); }
  if(ds.cleanerSpecial){ sv('cl_ids', (ds.cleanerSpecial.ids||[]).join(',')); sv('cl_sunday_rate', ds.cleanerSpecial.sundayRate); sv('cl_early_out', fmtH(ds.cleanerSpecial.earlyOutCutoff)); sv('cl_base_hrs', ds.cleanerSpecial.baseHrs); }

  renderShifts();
  renderDeptFilter();
  renderEmployees();
}



// ==================== EXPORT SKILL.MD ====================
function exportSkillMD(){
  const days=g('g_days'), ml=g('g_month_label'), rate=g('g_ot_rate');
  const empList = EMPLOYEES.map(e=>{
    const pay = e.type==='รายเดือน' ? `${e.monthly.toLocaleString()} บ./เดือน` : `${e.daily} บ./วัน`;
    const deptName = DEPT_LIST.find(d=>d.id===e.dept)?.label || e.dept || 'อื่นๆ';
    return `- #${e.id} ${e.name}: ${e.type} ${pay} | แผนก:${deptName} | กะ ${e.shiftId} | ${e.hrs} ชม. | OT:${e.otType} | สาย:${e.lateType}`;
  }).join('\n');

  const shiftList = SHIFT_TEMPLATES.map(s=>
    `- \`${s.id}\`: ${s.name} | เข้า ${s.ss}:00 ออก ${s.dout}:00 | ${s.hrs} ชม. | OT:${s.ot} สาย:${s.lt}`
  ).join('\n');

  const md = `---
description: Payroll Calculation Engine & Formulas (${ml})
---

# Payroll Logic Skill

## 1. Global Settings
- วันในเดือน: ${days} | ${ml}
- OT พื้นฐาน: ${rate} บาท/ชม.
- ลืมสแกนเข้า → ${g('g_miss_in')==='0'?'0 บาท':'หักครึ่งวัน'}
- ลืมสแกนออก → ${g('g_miss_out')==='0'?'0 บาท':'หักครึ่งวัน'}
- Overnight: cout < cin → cout+24

## 2. Shift Templates
${shiftList}

## 3. OT Rules
### Morning: หลัง ${g('ot_morning_start')} | grace ${g('ot_morning_grace')} นาที | ปัด ${g('ot_morning_round')} นาที ${g('ot_morning_round_dir')}
### Kitchen: เรท ${g('ot_kitchen_rate')||g('g_ot_rate')} บาท/ชม. | ก่อนกะ ${g('ot_kitchen_shift')} | cutoff ${g('ot_kitchen_cutoff')} | ปัด ${g('ot_kitchen_round')} นาที
### Football: ก่อนกะ ${g('ot_football_shift')} | cutoff ${g('ot_football_cutoff')} | ปัด ${g('ot_football_round')} นาที
### Looknum: หลัง ${g('ot_looknum_start')} | ต้องออกหลัง ${g('ot_looknum_grace')}

## 4. Late Rules
### Kitchen (Block): grace ${g('late_kitchen_grace')} นาที | บล็อก ${g('late_kitchen_block_min')} นาที
### Football (Special): เข้า ${g('late_fb_shift')} | grace ${g('late_fb_grace')} นาที | อนุโลมถึง ${g('late_fb_allow_until')} | หัก ${g('late_fb_per_block')} บาท/รอบ
### General: grace ${g('late_gen_grace')} นาที | ปัด ${g('late_gen_round')==='half'?'30 นาที':'1 ชม.'} | ${g('late_gen_rate')} บาท/รอบ
### Monthly: grace ${g('late_monthly_grace')} นาที | ปัด ${g('late_monthly_round')==='half'?'30 นาที':'1 ชม.'}

## 5. Dynamic Shift
- Candidates: ${g('ds_candidates')}
- Locked: ${g('ds_locked')}
- PT Override: เข้า>=${g('ds_late_in')} หรือ ออก<${g('ds_early_out')} → ${g('ds_pt_rate')} บาท
- PT Morning: เข้าก่อน ${g('ds_pt_morning_cutoff')} → ${g('ds_pt_morning_rate')} บาท (IDs: ${g('ds_pt_morning_ids')})
- Cleaner Special: วันอาทิตย์ ${g('cl_sunday_rate')} บาท | ออกก่อน ${g('cl_early_out')} หารเฉลี่ย ${g('cl_base_hrs')} ชม. (IDs: ${g('cl_ids')})
- Shop Closed AI: ทำงาน $\\geq$ ${parseInt(g('shop_ai_min_workers'))||2} คน เลิกพร้อมกัน (ระยะเวลา $\\leq$ ${parseFloat(g('shop_ai_time_spread'))||1.5} ชม.) ก่อนเวลาออกปกติ $\\geq$ ${parseFloat(g('shop_ai_early_hrs'))||1.0} ชม.

## 6. Employees
${empList}
`;

  const blob = new Blob([md], {type:'text/markdown'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download='skill.md'; a.click();
  URL.revokeObjectURL(url);
  alert('✅ Export skill.md สำเร็จ!');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  if(!t) return;
  t.innerText = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function saveToLocal() {
  const data = getSettingsData();
  localStorage.setItem('PAYROLL_SAVED_RULES_V1', JSON.stringify(data));
  showToast('💾 บันทึกการตั้งค่าลงเครื่อง (Local) เรียบร้อยแล้ว!');
}

function loadFromLocal() {
  const saved = localStorage.getItem('PAYROLL_SAVED_RULES_V1');
  if(saved) {
    try {
      parseAndLoad(JSON.parse(saved));
      console.log('✅ Loaded saved configuration from localStorage');
    } catch(err) {
      console.warn('⚠️ Failed to load saved config, using defaults', err);
    }
  }
}

// ==================== INIT ====================
buildTabs();
loadFromLocal(); // โหลดค่าที่เคยเซฟไว้
renderShifts();
renderDeptManager();
renderDeptFilter();
renderEmployees();
