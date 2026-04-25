-- ==========================================
-- SQL Schema สำหรับสร้างฐานข้อมูลระบบเงินเดือน
-- นำโค้ดทั้งหมดนี้ไปรันใน Supabase -> SQL Editor
-- ==========================================

-- 1. ลบตารางเก่า (ถ้ามี) เพื่อเริ่มใหม่สะอาดๆ
DROP TABLE IF EXISTS errands;
DROP TABLE IF EXISTS advances;
DROP TABLE IF EXISTS manual_edits;
DROP TABLE IF EXISTS time_punches;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS system_settings;

-- 2. สร้างตาราง employees (พนักงาน)
CREATE TABLE employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,          -- 'รายวัน', 'รายเดือน', 'พาร์ทไทม์'
    shift_id TEXT,
    daily_rate NUMERIC DEFAULT 0,
    monthly_rate NUMERIC DEFAULT 0,
    hours_per_day NUMERIC DEFAULT 10,
    ot_type TEXT DEFAULT 'none',
    late_type TEXT DEFAULT 'general',
    dept TEXT DEFAULT 'other',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. สร้างตาราง system_settings (ตั้งค่าระบบส่วนกลาง)
CREATE TABLE system_settings (
    id TEXT PRIMARY KEY DEFAULT 'main',
    shift_templates JSONB,
    ot_rules JSONB,
    global_rules JSONB,
    departments JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. สร้างตาราง time_punches (ข้อมูลสแกนนิ้วเข้า-ออก)
CREATE TABLE time_punches (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    month TEXT NOT NULL,          -- เช่น "2026-04"
    punch_date DATE NOT NULL,
    clock_in TEXT,
    clock_out TEXT,
    late_minutes NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (employee_id, punch_date) -- ป้องกันลงซ้ำวันเดียวกัน
);

-- 5. สร้างตาราง manual_edits (การแก้ไขมือ, วันหยุด, ลา)
CREATE TABLE manual_edits (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    edit_date DATE NOT NULL,
    edit_data JSONB NOT NULL,     -- เก็บ JSON เช่น {base, ot, deduct, adminNote, isOffDay, shopClosedEarly}
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (employee_id, edit_date)
);

-- 6. สร้างตาราง advances (เบิกเงินล่วงหน้า)
CREATE TABLE advances (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    advance_date DATE NOT NULL,
    amount NUMERIC NOT NULL,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. สร้างตาราง errands (ไปทำธุระส่วนตัว)
CREATE TABLE errands (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    month TEXT NOT NULL,
    errand_date DATE NOT NULL,
    start_time TEXT,
    end_time TEXT,
    minutes NUMERIC,
    amount NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 8. การเปิดใช้งานความปลอดภัย (Row Level Security)
-- บังคับให้ต้อง Login ก่อนถึงจะอ่าน/เขียนข้อมูลได้
-- ==========================================

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_punches ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE advances ENABLE ROW LEVEL SECURITY;
ALTER TABLE errands ENABLE ROW LEVEL SECURITY;

-- สร้างนโยบาย (Policy) ให้ "ผู้ที่ Login แล้ว" ทำได้ทุกอย่าง
CREATE POLICY "Allow authenticated users full access" ON employees FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON system_settings FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON time_punches FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON manual_edits FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON advances FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated users full access" ON errands FOR ALL TO authenticated USING (true);

-- (เผื่อการพัฒนาช่วงแรก) ถ้าต้องการให้ยังไม่ต้อง Login ก็อ่านเขียนได้ ให้รัน 6 บรรทัดด้านล่างแทน
-- CREATE POLICY "Allow anon users full access" ON employees FOR ALL TO anon USING (true);
-- CREATE POLICY "Allow anon users full access" ON system_settings FOR ALL TO anon USING (true);
-- CREATE POLICY "Allow anon users full access" ON time_punches FOR ALL TO anon USING (true);
-- CREATE POLICY "Allow anon users full access" ON manual_edits FOR ALL TO anon USING (true);
-- CREATE POLICY "Allow anon users full access" ON advances FOR ALL TO anon USING (true);
-- CREATE POLICY "Allow anon users full access" ON errands FOR ALL TO anon USING (true);
