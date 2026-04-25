// supabase-client.js
// เก็บค่า Config และประกาศตัวแปร supabase ให้ไฟล์อื่นเรียกใช้

const SUPABASE_URL = 'https://ktnkosmuibcbwfpedhvt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_NR6Fzy3rTEEeNQWDIRA0Yg_RHHcFqsW';

// สร้าง client (ตัวแปร global)
// หมายเหตุ: ต้องมี <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> นำหน้าก่อน
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// เช็ค session ล่าสุด
async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) console.error("Session Error:", error);
    return data.session;
}

// ล็อกเอาท์
async function signOut() {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
}

// เผื่อใช้ตรวจสอบว่า login แล้วหรือยัง (Auth Guard)
async function requireAuth() {
    const session = await getSession();
    if (!session) {
        // ยังไม่ login เตะไปหน้า login
        window.location.href = 'login.html';
    }
    return session;
}
