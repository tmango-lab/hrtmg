const fs = require('fs');
let file = 'payroll_app.html';
let text = fs.readFileSync(file, 'utf8');

// Title & Headers
text = text.replace(/<title>💰 ระบบคำนวณเงินเดือน<\/title>/g, '<title>ระบบคำนวณเงินเดือน</title>');
text = text.replace(/<h1>💰 ระบบคำนวณเงินเดือน<\/h1>/g, '<h1>ระบบคำนวณเงินเดือน</h1>');

// Toolbar buttons
text = text.replace(/🟢 อัปโหลด CSV \(สแกนนิ้ว\)/g, 'อัปโหลด CSV');
text = text.replace(/📊 ส่งออก Excel/g, 'ส่งออก Excel');
text = text.replace(/🖨️ พิมพ์/g, 'พิมพ์');
text = text.replace(/⚙️ ตั้งค่าระบบ/g, 'ตั้งค่าระบบ');

// Search Icon
const searchIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
text = text.replace(/<span style="position:absolute; left:12px; top:50%; transform:translateY\(-50%\); color:var\(--muted\); pointer-events:none;">🔍<\/span>/g, '<span style="position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--muted); pointer-events:none; display:flex;">' + searchIcon + '</span>');

// Modals
text = text.replace(/🗓️ จัดการวันหยุด/g, 'จัดการวันหยุด');
text = text.replace(/💸 บันทึกเบิกเงิน/g, 'บันทึกเบิกเงิน');
text = text.replace(/🏃 บันทึกธุระ/g, 'บันทึกธุระ');
text = text.replace(/➕ เพิ่ม/g, '+ เพิ่ม');
text = text.replace(/➕ บันทึก/g, '+ บันทึก');

// Actions
text = text.replace(/🗓️ วันหยุด/g, 'วันหยุด');
text = text.replace(/💸 เบิกเงิน/g, 'เบิกเงิน');
text = text.replace(/🏃 ธุระ/g, 'ธุระ');
text = text.replace(/🌙 ร้านปิดก่อน/g, 'ร้านปิดก่อน');
text = text.replace(/🌙 ยกเลิกร้านปิด/g, 'ยกเลิกร้านปิด');

// System
text = text.replace(/🔄 กำลังโหลดข้อมูลจาก Cloud Database.../g, 'กำลังโหลดข้อมูลจาก Cloud Database...');
text = text.replace(/⏳ กำลังนำเข้าข้อมูลขึ้น Supabase... กรุณารอสักครู่/g, 'กำลังนำเข้าข้อมูลขึ้น Supabase... กรุณารอสักครู่');
text = text.replace(/🤖/g, '(AI)');
text = text.replace(/t\.textContent='✅ '\\+msg;/g, 't.textContent=msg;');

fs.writeFileSync(file, text, 'utf8');
console.log('Updated payroll_app.html');
