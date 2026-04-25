# 🚀 Payroll System Migration — Task Tracker

> **เป้าหมาย:** ย้ายระบบเงินเดือนจาก local HTML → GitHub + Netlify + Supabase
> **สถานะ:** 🟡 รอเริ่ม Phase 1
> **อัปเดตล่าสุด:** 2026-04-25

---

## Phase 1: GitHub (Private Repository)
> ⏱️ ประมาณ 15 นาที | ความยาก: ⭐

- [ ] 1.1 สร้างไฟล์ `.gitignore` กันข้อมูลส่วนตัว
  - [ ] กัน CSV เงินเดือน (`*salary*.csv`, `pluem.csv`)
  - [ ] กัน Excel บัตรเวลา (`*.xlsx`)
  - [ ] กัน `payroll_data.json`, `payroll_final.html`
  - [ ] กัน temp/test files (`temp_*`, `test_*`, `nul`)
- [ ] 1.2 ตรวจสอบว่าไม่มีข้อมูลลับหลุดใน git history
- [ ] 1.3 สร้าง Private Repository บน GitHub
- [ ] 1.4 Push โค้ดขึ้น GitHub
- [ ] 1.5 ✅ ยืนยัน — เปิด GitHub แล้วเห็นไฟล์ครบ ไม่มี CSV รั่ว

---

## Phase 2: Netlify (Static Hosting)
> ⏱️ ประมาณ 30 นาที | ความยาก: ⭐

- [ ] 2.1 สมัครบัญชี Netlify (ใช้ GitHub login ได้)
- [ ] 2.2 เชื่อม GitHub repo กับ Netlify
  - [ ] เลือก branch `main`
  - [ ] ไม่ต้องตั้ง build command (static site)
  - [ ] Publish directory = `/` (root)
- [ ] 2.3 ทดสอบเปิดเว็บจาก URL ที่ Netlify ให้มา
  - [ ] `payroll_app.html` เปิดได้ปกติ
  - [ ] `payroll_settings.html` เปิดได้ปกติ
  - [ ] ลิงก์ ⚙️ ตั้งค่า ↔ กลับหน้าหลัก ทำงานถูกต้อง
  - [ ] ฟอนต์ Sarabun โหลดได้ (Google Fonts)
- [ ] 2.4 (Optional) ตั้ง custom domain ถ้ามี
- [ ] 2.5 ✅ ยืนยัน — ระบบทำงานบน Netlify เหมือน local ทุกประการ

---

## Phase 3: Supabase (Database + Auth)
> ⏱️ ประมาณ 10-15 ชม. | ความยาก: ⭐⭐⭐

### 3A — สร้าง Supabase Project + Database Schema
> ⏱️ 1-2 ชม.

- [ ] 3A.1 สมัคร Supabase + สร้าง Project ใหม่
- [ ] 3A.2 สร้างตาราง `employees` (ข้อมูลพนักงาน)
  ```sql
  CREATE TABLE employees (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      shift_id TEXT,
      daily_rate NUMERIC DEFAULT 0,
      monthly_rate NUMERIC DEFAULT 0,
      hours_per_day NUMERIC DEFAULT 10,
      ot_type TEXT DEFAULT 'none',
      late_type TEXT DEFAULT 'general',
      dept TEXT DEFAULT 'other'
  );
  ```
- [ ] 3A.3 สร้างตาราง `system_settings` (กฎ/กะ/แผนก)
  ```sql
  CREATE TABLE system_settings (
      id TEXT PRIMARY KEY DEFAULT 'main',
      shift_templates JSONB,
      ot_rules JSONB,
      global_rules JSONB,
      departments JSONB,
      updated_at TIMESTAMPTZ DEFAULT now()
  );
  ```
- [ ] 3A.4 สร้างตาราง `time_punches` (ข้อมูลสแกนนิ้ว)
  ```sql
  CREATE TABLE time_punches (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      employee_id TEXT REFERENCES employees(id),
      month TEXT NOT NULL,
      punch_date DATE NOT NULL,
      clock_in TEXT,
      clock_out TEXT,
      late_minutes NUMERIC DEFAULT 0,
      UNIQUE (employee_id, punch_date)
  );
  ```
- [ ] 3A.5 สร้างตาราง `manual_edits` (การแก้ไขมือ)
  ```sql
  CREATE TABLE manual_edits (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      employee_id TEXT REFERENCES employees(id),
      month TEXT NOT NULL,
      edit_date DATE NOT NULL,
      edit_data JSONB NOT NULL,
      UNIQUE (employee_id, edit_date)
  );
  ```
- [ ] 3A.6 สร้างตาราง `advances` (เบิกเงิน)
  ```sql
  CREATE TABLE advances (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      employee_id TEXT REFERENCES employees(id),
      month TEXT NOT NULL,
      advance_date DATE NOT NULL,
      amount NUMERIC NOT NULL,
      note TEXT
  );
  ```
- [ ] 3A.7 สร้างตาราง `errands` (ธุระ/ลา)
  ```sql
  CREATE TABLE errands (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      employee_id TEXT REFERENCES employees(id),
      month TEXT NOT NULL,
      errand_date DATE NOT NULL,
      start_time TEXT,
      end_time TEXT,
      minutes NUMERIC,
      amount NUMERIC
  );
  ```
- [ ] 3A.8 ตั้ง Row Level Security (RLS) ทุกตาราง
- [ ] 3A.9 ทดสอบ insert/select ผ่าน Supabase Dashboard

### 3B — ระบบ Authentication (Login)
> ⏱️ 2-3 ชม.

- [ ] 3B.1 เปิด Supabase Auth (Email + Password)
- [ ] 3B.2 สร้างหน้า `login.html` (UI สวยงาม)
  - [ ] ช่อง email + password
  - [ ] ปุ่ม Login
  - [ ] แสดง error ถ้า login ผิด
- [ ] 3B.3 สร้างไฟล์ `supabase-client.js` (shared config)
  - [ ] ใส่ Supabase URL + anon key
  - [ ] ฟังก์ชัน `getSession()`, `signOut()`
- [ ] 3B.4 เพิ่ม auth guard ใน `payroll_app.html`
  - [ ] ตรวจ session → ถ้าไม่มี redirect ไป `login.html`
- [ ] 3B.5 เพิ่ม auth guard ใน `payroll_settings.html`
- [ ] 3B.6 เพิ่มปุ่ม Logout ใน header ทั้ง 2 หน้า
- [ ] 3B.7 สร้าง user แอดมินตัวแรกใน Supabase Dashboard
- [ ] 3B.8 ✅ ทดสอบ — login/logout/redirect ทำงานถูกต้อง

### 3C — ย้าย Settings (payroll_settings.js → Supabase)
> ⏱️ 2-3 ชม.

- [ ] 3C.1 เพิ่ม `<script src="supabase-client.js">` ใน settings.html
- [ ] 3C.2 แก้ `loadFromLocal()` → `loadFromSupabase()`
  - [ ] ดึง `system_settings` + `employees` จาก Supabase
  - [ ] แปลงกลับเป็น format ที่ `parseAndLoad()` เข้าใจ
- [ ] 3C.3 แก้ `saveToLocal()` → `saveToSupabase()`
  - [ ] upsert `system_settings` (กฎ, กะ, แผนก)
  - [ ] upsert `employees` (ข้อมูลพนักงานทั้งหมด)
- [ ] 3C.4 ลบ hardcoded `EMPLOYEES[]` array → ดึงจาก DB
- [ ] 3C.5 ลบ hardcoded `SHIFT_TEMPLATES[]` → ดึงจาก DB
- [ ] 3C.6 ✅ ทดสอบ — แก้ค่าใน Settings → Save → Refresh → ค่ายังอยู่

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
  - [ ] `PAYROLL_ACTIVE_MONTH` → URL param หรือ DB
  - [ ] ลบ legacy keys (SHIFT, DEPT_RULES)
- [ ] 3D.4 ย้ายการบันทึก — Cell Edit / Time Edit / Note Edit
  - [ ] `saveEdits()` → upsert `manual_edits`
  - [ ] เพิ่ม debounce (ไม่ยิง API ทุก keystroke)
- [ ] 3D.5 ย้ายการบันทึก — Advances (เบิกเงิน)
  - [ ] `addAdvance()` → insert `advances`
  - [ ] `deleteAdvance()` → delete `advances`
- [ ] 3D.6 ย้ายการบันทึก — Errands (ธุระ)
  - [ ] `addErrand()` → insert `errands`
  - [ ] `deleteErrand()` → delete `errands`
- [ ] 3D.7 ย้ายการบันทึก — Calendar (วันหยุด)
  - [ ] `saveCalendarModal()` → upsert `manual_edits`
- [ ] 3D.8 ย้าย CSV Upload
  - [ ] `saveRawPunches()` → upsert `time_punches`
- [ ] 3D.9 ย้าย Shop Closed Toggle
  - [ ] `toggleShopClosed()` → upsert `manual_edits`
- [ ] 3D.10 ย้าย Reset All
  - [ ] `resetAll()` → delete all `manual_edits` for month
- [ ] 3D.11 ปรับ Backup/Restore ให้ดึงจาก Supabase
- [ ] 3D.12 ลบ hardcoded `EMP_NAMES`, `SHIFT`, `DEPT_RULES` จาก HTML
- [ ] 3D.13 แสดง loading spinner ขณะโหลดข้อมูลจาก Supabase

### 3E — Migration + Testing
> ⏱️ 2-3 ชม.

- [ ] 3E.1 เขียนสคริปต์ migrate localStorage → Supabase
  - [ ] อ่าน backup JSON → insert เข้า Supabase ทุกตาราง
- [ ] 3E.2 ทดสอบ Flow ทั้งหมดบน Netlify + Supabase
  - [ ] Login → เปิดหน้าหลัก → เห็นข้อมูลพนักงาน
  - [ ] อัปโหลด CSV → ข้อมูลขึ้น Supabase
  - [ ] แก้เวลาเข้า/ออก → บันทึกสำเร็จ
  - [ ] แก้ฐาน/OT/หัก → คำนวณถูกต้อง
  - [ ] เพิ่ม/ลบ เบิกเงิน → ยอดสุทธิเปลี่ยน
  - [ ] เพิ่ม/ลบ ธุระ → หักเงินถูกต้อง
  - [ ] จัดวันหยุด → ได้ค่าแรงเต็ม
  - [ ] ร้านปิดก่อน → toggle ทำงาน
  - [ ] ส่งออก Excel → CSV ถูกต้อง
  - [ ] Backup/Restore → ข้อมูลครบ
  - [ ] Settings → แก้กฎ → Save → App คำนวณใหม่ถูก
  - [ ] เปิดจากเครื่องอื่น/มือถือ → เห็นข้อมูลเดียวกัน
- [ ] 3E.3 ลบ localStorage fallback code ที่ไม่ใช้แล้ว
- [ ] 3E.4 อัปเดต `architecture.md` ให้ตรงกับสถาปัตยกรรมใหม่
- [ ] 3E.5 ✅ ยืนยันสุดท้าย — ระบบพร้อมใช้งานจริง

---

## 📊 Progress Overview

| Phase | สถานะ | ความคืบหน้า |
|-------|--------|-----------|
| 1. GitHub | 🟡 รอเริ่ม | 0/5 |
| 2. Netlify | ⚪ ยังไม่เริ่ม | 0/5 |
| 3A. DB Schema | ⚪ ยังไม่เริ่ม | 0/9 |
| 3B. Auth/Login | ⚪ ยังไม่เริ่ม | 0/8 |
| 3C. Settings Migration | ⚪ ยังไม่เริ่ม | 0/6 |
| 3D. App Migration | ⚪ ยังไม่เริ่ม | 0/13 |
| 3E. Testing | ⚪ ยังไม่เริ่ม | 0/5 |

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
