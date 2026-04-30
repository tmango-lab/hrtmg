-- ==========================================
-- Attendance Logs Schema (ZKTeco Sync)
-- ==========================================

-- 1. Create the attendance_logs table
CREATE TABLE IF NOT EXISTS public.zk_attendance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_user_id VARCHAR(50) NOT NULL, -- รหัสพนักงานที่ตั้งไว้ในเครื่องสแกน ZKTeco (ที่คุณบอกว่าตอนเพิ่มใส่แค่ IP)
    record_time TIMESTAMP WITH TIME ZONE NOT NULL, -- เวลาที่สแกน
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- ป้องกันข้อมูลซ้ำซ้อน ถ้ารหัสพนักงานและเวลาสแกนตรงกันเป๊ะ จะไม่ให้บันทึกซ้ำ
    CONSTRAINT unique_attendance_record UNIQUE (device_user_id, record_time)
);

-- 2. Add comments for clarity
COMMENT ON TABLE public.zk_attendance_logs IS 'เก็บข้อมูลดิบเวลาเข้าออกพนักงานจากเครื่อง ZKTeco';
COMMENT ON COLUMN public.zk_attendance_logs.device_user_id IS 'รหัสพนักงานในเครื่องสแกน';
COMMENT ON COLUMN public.zk_attendance_logs.record_time IS 'เวลาสแกนจริงจากเครื่อง';

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.zk_attendance_logs ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Allow everything for authenticated users for now)
CREATE POLICY "Allow all read access for authenticated users" 
ON public.zk_attendance_logs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Allow all insert access for authenticated users" 
ON public.zk_attendance_logs FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- ==========================================
-- REAL-TIME SETUP (FOR BROADCASTING)
-- ==========================================
-- การรับส่งสัญญาณเพื่อสั่งเครื่องสแกนให้ดึงข้อมูล จะใช้ฟีเจอร์ Broadcast ของ Supabase Realtime
-- ซึ่งไม่ต้องสร้าง Table เพิ่ม แต่ต้องไปเปิดใช้งานที่หน้าต่าง Supabase Dashboard แทน
-- 1. ไปที่ Supabase Dashboard -> Database -> Publications
-- 2. ต้องแน่ใจว่า Realtime เปิดใช้งานอยู่ (โดยปกติ Broadcast จะใช้ได้เลยถ้าเปิด Realtime)
