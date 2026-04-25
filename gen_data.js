// gen_data.js — อ่าน CSV และ output JSON
const fs = require('fs'), path = require('path');
const DAYS = 31, OT_RATE = 40;
const NAMES = {'1':'JET','2':'Mild','3':'Mameaw','4':'Bird','5':'Ploysai','6':'Chompoo','7':'Mint','8':'Looknum','9':'Aum','10':'Pluem','11':'Jay','12':'Cream','13':'Jui','14':'Noi','15':'Wave','16':'Amp','17':'Ple','18':'YUNG','19':'TAE','20':'Ple FB','21':'TUKTA','22':'Jeab','23':'ManU'};
const ph=s=>{if(!s||!s.trim()||s.trim()==='-')return null;try{const p=s.trim().split(':');return+p[0]+(+p[1])/60;}catch(e){return null;}};
const rh=r=>{if(r<=0)return 0;const l=Math.floor(r*2)/2,u=l+.5;return Math.round((u-r)*60*1e4)/1e4<=10?u:l;};
const isSun=d=>{try{return new Date(d.trim()).getDay()===0;}catch(e){return false;}};
const kLate=(m,rate,h=12)=>{if(m<=30)return 0;return Math.round(Math.ceil((m-15)/30)*.5*(rate/h)*100)/100;};
const Sr=(t,d,mo,ss,dout,hrs,ot,lt=null)=>({t,d,mo,ss,dout,hrs,ot,lt});
const SHIFT={'1':Sr('รายวัน',380,0,14,24,10,'football','football'),'2':Sr('รายวัน',380,0,10,21,10,'morning'),'3':Sr('รายเดือน',0,11000,10,21,10,'morning'),'4':Sr('รายเดือน',0,11000,10,21,10,'morning'),'5':Sr('รายวัน',380,0,15,2,10,null),'6':Sr('รายเดือน',0,12000,10,20,10,null),'7':Sr('พาร์ทไทม์',240,0,17,24,7,null),'8':Sr('รายเดือน',0,12000,10,20,10,'looknum'),'9':Sr('รายเดือน',0,11000,10,21,10,'morning'),'10':Sr('พาร์ทไทม์',240,0,17,24,7,null),'11':Sr('พาร์ทไทม์',240,0,17,24,7,null),'12':Sr('พาร์ทไทม์',240,0,17,24,7,null),'13':Sr('รายวัน',700,0,10,22,12,'kitchen'),'14':Sr('รายวัน',700,0,10,22,12,'kitchen'),'15':Sr('รายเดือน',0,11000,15,2,10,null),'16':Sr('รายวัน',550,0,10,22,12,'kitchen'),'17':Sr('พาร์ทไทม์',240,0,17,24,7,null),'18':Sr('รายวัน',400,0,14,24,10,'football','football'),'19':Sr('รายวัน',360,0,14,24,10,'football','football'),'20':Sr('รายวัน',240,0,17,24,7,null),'21':Sr('รายวัน',380,0,8,17,9,null),'22':Sr('รายวัน',450,0,10,22,12,'kitchen'),'23':Sr('พาร์ทไทม์',240,0,17,24,7,null)};
function gs(eid,cinH){let sr={...SHIFT[eid]};if(eid==='8'&&cinH!==null&&cinH>=12){sr.ss=15;sr.dout=2;sr.ot=null;}return sr;}
function cOt(eid,cinH,coutH,sr){const ot=sr.ot;if(!ot||cinH===null)return 0;let co=coutH!==null?coutH:sr.dout;if(co<cinH)co+=24;if(ot==='looknum')return co<=21?0:rh(co-20);if(ot==='morning'||ot==='morning_pt')return co<=21?0:rh(co-21);if(ot==='kitchen')return cinH>=9?0:rh(10-cinH);if(ot==='football')return cinH>=13?0:rh(14-cinH);return 0;}
function cLate(lm,sr,cinH){if(sr.ot==='kitchen')return kLate(lm,sr.d,sr.hrs);if(sr.lt==='football'){if(lm<=10||cinH===null)return 0;let p=0,b=15;while(b<=cinH+10/60&&b<=20){if((b-cinH)*60<=10||cinH>=b)p++;b++;}return p*OT_RATE;}if(sr.t==='รายเดือน'){if(lm<=10)return 0;const rph=(sr.mo/DAYS)/sr.hrs;return Math.round((rh(lm/60)||.5)*rph*100)/100;}else{if(lm<=10)return 0;return Math.round((rh(lm/60)||.5)*OT_RATE*100)/100;}}

let raw=fs.readFileSync(path.join(__dirname,'D456FA4577B86C439ED8E8F42B1F3F1104FD4AD8_บัตรเวลาทั้งหมด_20260322105014_export.csv'),'utf8');
if(raw.charCodeAt(0)===0xFEFF)raw=raw.slice(1);
const lines=raw.split(/\r?\n/).filter(l=>l.trim());
const hdrs=lines[0].split(',').map(h=>h.trim().replace(/^"|"$/g,''));
const rows=lines.slice(1).map(l=>{const v=l.split(',').map(x=>x.trim().replace(/^"|"$/g,''));const r={};hdrs.forEach((h,i)=>r[h]=v[i]||'');return r;});
const kEid=hdrs.find(h=>h.includes('หมายเลข')),kDate=hdrs.find(h=>h.includes('วันที่')),kLateCol=hdrs.find(h=>h.includes('Late')),kCin=hdrs.find(h=>h.includes('นาฬิกาเข้า')),kCout=hdrs.find(h=>h.includes('นาฬิกาออก'));
const empMap={};
rows.forEach(r=>{const eid=(r[kEid]||'').trim();if(eid&&SHIFT[eid]){if(!empMap[eid])empMap[eid]=[];empMap[eid].push(r);}});

const allData=Object.keys(empMap).sort((a,b)=>+a-+b).map(eid=>{
  const sb=SHIFT[eid];
  const empRows=[];
  empMap[eid].forEach(d=>{
    const lm=parseFloat(d[kLateCol]||'0')||0;
    const cin=(d[kCin]||'').trim(),cout=(d[kCout]||'').trim(),date=(d[kDate]||'').trim();
    const cinH=ph(cin),coutH=ph(cout);
    if(cinH===null&&coutH===null)return;
    const sr=gs(eid,cinH);
    let dr=sb.t==='รายเดือน'?Math.round(sb.mo/DAYS*100)/100:sb.d;
    let note='';
    if(eid==='21'&&isSun(date)){empRows.push({date,cin,cout,late:0,base:190,ot:0,deduct:0,note:'วันอาทิตย์',locked:true});return;}
    if(eid==='21'&&coutH!==null&&coutH<17){const h=coutH-(cinH!==null?cinH:8);const pay=Math.round(Math.max(0,h)*(380/9)*100)/100;empRows.push({date,cin,cout,late:0,base:pay,ot:0,deduct:0,note:'ออกก่อน 17:00',locked:true});return;}
    if(['7','10','11','12','17','23'].includes(eid)&&cinH!==null&&cinH<12){dr=350;sr.ot='morning_pt';note='มาแทนกะเช้า';}
    const deduct=cLate(lm,sr,cinH);
    const ec=coutH!==null?coutH:sr.dout;
    const otH=cOt(eid,cinH,ec,sr);
    const otMoney=Math.round(otH*OT_RATE*100)/100;
    if(otH>0)note=(note?note+' ':'')+'OT '+otH+'ชม.';
    empRows.push({date,cin,cout,late:Math.round(lm),base:dr,ot:otMoney,deduct,note,locked:false});
  });
  return {id:eid,name:NAMES[eid]||'?',type:sb.t,rate:sb.t==='รายเดือน'?sb.mo+' บ./เดือน':sb.d+' บ./วัน',rows:empRows};
});

fs.writeFileSync(path.join(__dirname,'payroll_data.json'),JSON.stringify(allData,null,2),'utf8');
console.log('payroll_data.json เขียนสำเร็จ',allData.length,'คน');
