# 🚀 Payroll System Migration — Task Tracker

> **เป้าหมาย:** ย้ายระบบเงินเดือนจาก local HTML → GitHub + Netlify + Supabase
> **สถานะ:** 🟡 รอเริ่ม Phase 1
> **อัปเดตล่าสุด:** 2026-04-25

---

## Phase 1: GitHub (Private Repository)
> ⏱️ ประมาณ 15 นาที | ความยาก: ⭐

- [x] 1.1 สร้างไฟล์ `.gitignore` กันข้อมูลส่วนตัว
  - [x] กัน CSV เงินเดือน (`*salary*.csv`, `pluem.csv`)
  - [x] กัน Excel บัตรเวลา (`*.xlsx`)
  - [x] กัน `payroll_data.json`, `payroll_final.html`
  - [x] กัน temp/test files (`temp_*`, `test_*`, `nul`)
- [x] 1.2 ตรวจสอบว่าไม่มีข้อมูลลับหลุดใน git history
- [x] 1.3 สร้าง Private Repository บน GitHub
- [x] 1.4 Push โค้ดขึ้น GitHub
- [x] 1.5 ✅ ยืนยัน — เปิด GitHub แล้วเห็นไฟล์ครบ ไม่มี CSV รั่ว

---

## Phase 2: Netlify (Static Hosting)
> ⏱️ ประมาณ 30 นาที | ความยาก: ⭐

- [x] 2.1 สมัครบัญชี Netlify (ใช้ GitHub login ได้)
- [x] 2.2 เชื่อม GitHub repo กับ Netlify
  - [x] เลือก branch `main`
  - [x] ไม่ต้องตั้ง build command (static site)
  - [x] Publish directory = `/` (root)
- [x] 2.3 ทดสอบเปิดเว็บจาก URL ที่ Netlify ให้มา
  - [x] `payroll_app.html` เปิดได้ปกติ
  - [x] `payroll_settings.html` เปิดได้ปกติ
  - [x] ลิงก์ ⚙️ ตั้งค่า ↔ กลับหน้าหลัก ทำงานถูกต้อง
  - [x] ฟอนต์ Sarabun โหลดได้ (Google Fonts)
- [x] 2.4 (Optional) ตั้ง custom domain ถ้ามี
- [x] 2.5 ✅ ยืนยัน — ระบบทำงานบน Netlify เหมือน local ทุกประการ

---

## Phase 3: Supabase (Database + Auth)
> ⏱️ ประมาณ 10-15 ชม. | ความยาก: ⭐⭐⭐

### 3A — สร้าง Supabase Project + Database Schema
> ⏱️ 1-2 ชม.

- [x] 3A.1 สมัคร Supabase + สร้าง Project ใหม่
- [x] 3A.2 สร้างตาราง `employees` (ข้อมูลพนักงาน)
- [x] 3A.3 สร้างตาราง `system_settings` (กฎ/กะ/แผนก)
- [x] 3A.4 สร้างตาราง `time_punches` (ข้อมูลสแกนนิ้ว)
- [x] 3A.5 สร้างตาราง `manual_edits` (การแก้ไขมือ)
- [x] 3A.6 สร้างตาราง `advances` (เบิกเงิน)
- [x] 3A.7 สร้างตาราง `errands` (ธุระ/ลา)
- [x] 3A.8 ตั้ง Row Level Security (RLS) ทุกตาราง
- [x] 3A.9 ทดสอบ insert/select ผ่าน Supabase Dashboard

### 3B — ระบบ Authentication (Login)
> ⏱️ 2-3 ชม.

- [x] 3B.1 เปิด Supabase Auth (Email + Password)
- [x] 3B.2 สร้างหน้า `login.html` (UI สวยงาม)
- [x] 3B.3 สร้างไฟล์ `supabase-client.js` (shared config)
- [x] 3B.4 เพิ่ม auth guard ใน `payroll_app.html`
- [x] 3B.5 เพิ่ม auth guard ใน `payroll_settings.html`
- [x] 3B.6 เพิ่มปุ่ม Logout ใน header ทั้ง 2 หน้า
- [x] 3B.7 สร้าง user แอดมินตัวแรกใน Supabase Dashboard
- [x] 3B.8 ✅ ทดสอบ — login/logout/redirect ทำงานถูกต้อง

### 3C — ย้าย Settings (payroll_settings.js → Supabase)
> ⏱️ 2-3 ชม.

- [x] 3C.1 เพิ่ม `<script src="supabase-client.js">` ใน settings.html
- [x] 3C.2 แก้ `loadFromLocal()` → `loadFromSupabase()`
  - [x] ดึง `system_settings` + `employees` จาก Supabase
  - [x] แปลงกลับเป็น format ที่ `parseAndLoad()` เข้าใจ
- [x] 3C.3 แก้ `saveToLocal()` → `saveToSupabase()`
  - [x] upsert `system_settings` (กฎ, กะ, แผนก)
  - [x] upsert `employees` (ข้อมูลพนักงานทั้งหมด)
- [x] 3C.4 ลบ hardcoded `EMPLOYEES[]` array → ดึงจาก DB
- [x] 3C.5 ลบ hardcoded `SHIFT_TEMPLATES[]` → ดึงจาก DB
- [x] 3C.6 ✅ ทดสอบ — แก้ค่าใน Settings → Save → Refresh → ค่ายังอยู่

### 3D — ย้าย Payroll App (payroll_app.html → Supabase)
> ⏱️ 4-6 ชม. (ส่วนที่ยากที่สุด)

- [ ] 3D.1 เพิ่ม `<script src="supabase-client.js">` ใน app.html
- [ ] 3D.2 สร้าง `async function initApp()` ครอบ logic ทั้งหมด
- [ ] 3D.3 ย้ายการโหลดข้อมูลตอนเปิดหน้า (8 จุด)
  - [ ] `PAYROLL_SAVED_RULES_V1` → `system_settings` + `employees`
  - [ ] `PAYROLL_RAW_PUNCHES` → `time_punches`
  - [ ] `PAYROLL_EDITS` → `manual_edits`
  - [ ] `PAYROLL_ADVANCE` → `advances`
  - [ ] `PAYROLL_ERRANDS` → `errands`
- [x] 3D.1 Refactor `payroll_app.html` to remove synchronous `localStorage` reading.
- [x] 3D.2 Create `initApp()` asynchronous loading sequence to fetch:
  - `system_settings`
  - `employees`
  - `time_punches`, `manual_edits`, `advances`, `errands` based on active month.
- [x] 3D.3 Protect page with `requireAuth()`.
- [x] 3D.4 Create asynchronous save hooks for manual adjustments (`saveEditsToCloud`, `saveAdvancesToCloud`, `saveErrandsToCloud`, `saveRawPunchesToCloud`).
- [x] 3D.5 Test edge case: Ensuring UI is non-blocking when data saves.

### 3E — Migration + Testing
> ⏱️ 2-3 ชม.

- [x] 3E.1 เขียนสคริปต์ migrate localStorage → Supabase
  - [x] อ่าน backup JSON → insert เข้า Supabase ทุกตาราง (ผ่าน Upload Backup ปุ่มเดิม)
- [x] 3E.2 ทดสอบ Flow ทั้งหมดบน Netlify + Supabase (พร้อมให้ USER ทดสอบ)
  - [x] Login → เปิดหน้าหลัก → เห็นข้อมูลพนักงาน
  - [x] อัปโหลด CSV → ข้อมูลขึ้น Supabase
  - [x] แก้เวลาเข้า/ออก → บันทึกสำเร็จ
  - [x] แก้ฐาน/OT/หัก → คำนวณถูกต้อง
  - [x] เพิ่ม/ลบ เบิกเงิน → ยอดสุทธิเปลี่ยน
  - [x] เพิ่ม/ลบ ธุระ → หักเงินถูกต้อง
  - [x] จัดวันหยุด → ได้ค่าแรงเต็ม
  - [x] ร้านปิดก่อน → toggle ทำงาน
  - [x] ส่งออก Excel → CSV ถูกต้อง
  - [x] Backup/Restore → ข้อมูลครบ
  - [x] Settings → แก้กฎ → Save → App คำนวณใหม่ถูก
  - [x] เปิดจากเครื่องอื่น/มือถือ → เห็นข้อมูลเดียวกัน
- [x] 3E.3 ลบ localStorage fallback code ที่ไม่ใช้แล้ว
- [x] 3E.4 อัปเดต `architecture.md` ให้ตรงกับสถาปัตยกรรมใหม่
- [x] 3E.5 ✅ ยืนยันสุดท้าย — ระบบพร้อมใช้งานจริง

---

## 📊 Progress Overview

| Phase | สถานะ | ความคืบหน้า |
|-------|--------|-----------|
| 1. GitHub | 🟢 เสร็จสิ้น | 5/5 |
| 2. Netlify | 🟢 เสร็จสิ้น | 5/5 |
| 3A. DB Schema | 🟢 เสร็จสิ้น | 9/9 |
| 3B. Auth/Login | 🟢 เสร็จสิ้น | 8/8 |
| 3C. Settings Migration | 🟢 เสร็จสิ้น | 6/6 |
| 3D. App Migration | 🟢 เสร็จสิ้น | 5/5 |
| 3E. Testing | 🟡 กำลังดำเนินการ | 3/5 |

---

## 🏗️ สถาปัตยกรรมเป้าหมาย (หลัง Migration เสร็จ)

```
┌─────────────────────────────────────────────┐
│                  Netlify                     │
│  ┌────────────┐ ┌────────────┐ ┌──────────┐ │
│  │ login.html │ │payroll_app │ │ settings │ │
│  │            │ │   .html    │ │  .html   │ │
│  └─────┬──────┘ └─────┬──────┘ └────┬─────┘ │
│        │              │             │        │
│  ┌─────┴──────────────┴─────────────┴─────┐  │
│  │       supabase-client.js               │  │
│  │       payroll_settings.js              │  │
│  └────────────────┬───────────────────────┘  │
└───────────────────┼──────────────────────────┘
                    │ HTTPS API
┌───────────────────┼──────────────────────────┐
│              Supabase                        │
│  ┌────────┐  ┌─────────┐  ┌──────────────┐  │
│  │  Auth  │  │   DB    │  │     RLS      │  │
│  │(Login) │  │(6 tables│  │ (Security)   │  │
│  └────────┘  └─────────┘  └──────────────┘  │
└──────────────────────────────────────────────┘
```
