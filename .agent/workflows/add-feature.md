---
description: วิธีเพิ่มฟีเจอร์ใหม่ให้ระบบเงินเดือน (payroll_app.html) อย่างปลอดภัย โดยไม่ทับ logic เดิม
---

# วิธีเพิ่มฟีเจอร์ใหม่อย่างปลอดภัย

## ⚠️ กฎสำคัญ — ห้ามทำ
1. **ห้าม** สร้างไฟล์ใหม่ทับ `payroll_app.html` ทั้งไฟล์
2. **ห้าม** เขียน script inject/patch ที่ replace เนื้อหาทั้งหมด
3. **ห้าม** อ้างอิง `payroll_final.html` หรือ `template.html` เป็นแหล่งโค้ด — ไฟล์เหล่านี้เป็นเวอร์ชั่นเก่า

## ✅ ขั้นตอนที่ถูกต้อง

### ขั้นที่ 1: อ่าน skill.md และ architecture.md ก่อนเสมอ
// turbo
```
ก่อนทำอะไร ให้อ่านไฟล์ skill.md ทั้งหมดก่อน เพื่อเข้าใจ business rules ปัจจุบัน
```

### ขั้นที่ 2: อ่านส่วนที่เกี่ยวข้องใน payroll_app.html เท่านั้น
- ใช้ `view_file` กับ `grep_search` เพื่อหาตำแหน่งที่ต้องแก้
- **อ่านเฉพาะส่วนที่ต้องแก้** อย่าอ่านทั้งไฟล์แล้วเขียนใหม่

### ขั้นที่ 3: ใช้ replace_file_content หรือ multi_replace_file_content เท่านั้น
- แก้เฉพาะบรรทัดที่เกี่ยวข้อง
- ห้ามใช้ write_to_file กับ payroll_app.html เด็ดขาด

### ขั้นที่ 4: อัปเดต skill.md ถ้ามีการเปลี่ยน logic
- ตาม SKILL SYNC RULE ใน skill.md

## 📁 ไฟล์สำคัญในโปรเจค
| ไฟล์ | หน้าที่ | หมายเหตุ |
|---|---|---|
| `payroll_app.html` | แอปหลักคำนวณเงินเดือน | **ไฟล์นี้คือเวอร์ชั่นล่าสุด ห้ามทับ** |
| `payroll_settings.html` | หน้าตั้งค่าระบบ (ฉบับเต็ม) | เชื่อมผ่าน localStorage |
| `skill.md` | เอกสารกฎการคำนวณ | Single Source of Truth สำหรับ AI |
| `payroll_final.html` | ⚠️ เวอร์ชั่นเก่า (INLINE_DATA) | ห้ามใช้เป็น reference |
| `template.html` | ⚠️ เวอร์ชั่นเก่า (ไม่มี sync) | ห้ามใช้เป็น reference |

## 🏗️ สถาปัตยกรรมปัจจุบัน
- **Zero-dependency SPA** (HTML/CSS/JS ล้วน)
- **Dynamic month** via `CURRENT_MONTH` + `localStorage.PAYROLL_ACTIVE_MONTH`
- **Configuration-driven** via `syncNewSettingsAndCalculate()` อ่านจาก `PAYROLL_SAVED_RULES_V1`
- **CSV Upload** สำหรับนำเข้าข้อมูลบัตรสแกนเวลา
- **Late types**: kitchen (per-min), football (special), office (per-min), general (block), part-time (configurable)