# 🏗️ ZKTeco Attendance Synchronization Architecture

เอกสารนี้อธิบายสถาปัตยกรรมการทำงานของระบบเชื่อมต่อเครื่องสแกนใบหน้า/ลายนิ้วมือ ZKTeco เข้ากับฐานข้อมูล Supabase (บน Cloud) โดยใช้แนวคิด **Dual Strategy Engine** เพื่อแก้ไขปัญหาข้อจำกัดด้านเครือข่ายและข้อจำกัดของซอฟต์แวร์ ZKBioTime

---

## 🎯 ปัญหาที่พบ (The Bottleneck)

ในการดึงข้อมูลจากเครื่องสแกน ZKTeco (`192.168.10.214`) โดยตรง มักพบปัญหา 2 ประการ:
1. **TCP Port Locked:** ซอฟต์แวร์ ZKBioTime ที่รันอยู่บน Server (`192.168.10.82`) มักจะทำการเชื่อมต่อ (Active Connection) ค้างไว้กับเครื่องสแกนที่พอร์ต `4370` ทำให้แอปพลิเคชันของเราไม่สามารถแทรกเข้าไปเชื่อมต่อได้ (เกิด Error `ETIMEDOUT` หรือ Socket ปิดทันที)
2. **API Permission Blocked:** การใช้ REST API ของ ZKBioTime (พอร์ต `8081`) มักจะถูกล็อคสิทธิ์การเข้าถึง `iclock/api/transactions/` ไว้ที่ระดับ License ทำให้เจอปัญหา `HTTP 403 Forbidden` แม้จะใช้ Admin Token ก็ตาม

---

## 🧠 สถาปัตยกรรมที่แก้ไขแล้ว (Dual Strategy Engine)

เพื่อแก้ไขปัญหาดังกล่าว ระบบจึงถูกออกแบบให้มีกลไก 2 เส้นทาง (Dual Strategy) ที่สลับการทำงานอัตโนมัติ (Failover) เพื่อให้ได้ข้อมูลเสมอ:

```mermaid
graph TD
    subgraph "Local Network (LAN)"
        Z[ZKTeco Scanner<br/>IP: .214 | Port: 4370]
        
        subgraph "ZKBioTime Server (IP: .82)"
            B[ZKBioTime Service<br/>Port: 8081]
            DB[(PostgreSQL DB<br/>Port: 7496)]
            B -- "Syncs data" --> DB
            B -- "Locks Port 4370" --> Z
        end
        
        N((Node.js Sync Engine<br/>index.js))
    end
    
    subgraph "Cloud"
        S[(Supabase<br/>zk_attendance_logs)]
    end

    %% Strategy 1: Direct Connection
    N -- "Strategy 1: Try Direct (Often Blocked)" -.-> Z
    
    %% Strategy 2: DB Fallback
    N -- "Strategy 2: DB Polling (Fallback)" ==> DB
    
    %% Output
    N -- "Push Data (Real-time or 60s)" ==> S
```

### ⚡ Strategy 1: Direct Device Connection (Real-time)
- **เครื่องมือ:** `node-zklib`
- **การทำงาน:** พยายามเชื่อมต่อตรงไปยังเครื่องสแกนผ่าน TCP Port `4370`
- **ข้อดี:** ถ้าเชื่อมต่อได้ จะทำงานในโหมด "Real-time" เมื่อพนักงานสแกนหน้า ข้อมูลจะเด้งเข้า Supabase ทันทีโดยไม่ต้องรอ
- **สถานะ:** มักจะทำไม่สำเร็จหาก ZKBioTime ทำงานอยู่ แต่ระบบจะคอยเช็คและพยายามเชื่อมต่อใหม่ (Retry) ทุกๆ 5 นาที เผื่อในกรณีที่ ZKBioTime Server ดับ

### 🛡️ Strategy 2: PostgreSQL DB Polling (Fallback)
- **เครื่องมือ:** `pg` (PostgreSQL Client)
- **การทำงาน:** เมื่อเชื่อมต่อตรงไม่สำเร็จ ระบบจะสลับมาเข้าฐานข้อมูลที่อยู่หลังบ้านของ ZKBioTime แทน (เจาะเข้า `biotime` database โดยตรงผ่าน TCP Port `7496`)
- **ข้อดี:** 
  - ข้ามปัญหา Port `4370` โดนแย่ง
  - ข้ามปัญหา API Permission `403 Forbidden`
  - มีความเสถียร 100% เพราะตาราง `iclock_transaction` จะมีข้อมูลล่าสุดที่ ZKBioTime ดูดมาเสมอ
- **ความถี่:** โค้ดจะเข้าไป Query ดูข้อมูลใหม่ทุกๆ 60 วินาที (`DB_POLL_INTERVAL`)

---

## 💾 ระบบป้องกันข้อมูลซ้ำ (Deduplication & RLS)

เมื่อ Node.js ได้ข้อมูล (ไม่ว่าจะจากเครื่องสแกนหรือจาก Database) จะทำการส่งขึ้น Supabase ผ่าน SDK (`@supabase/supabase-js`)
1. **In-Memory Deduplication:** มีตัวแปร `processedKeys` (รูปแบบ `userId_timestamp`) เก็บในหน่วยความจำ เพื่อเช็คว่าข้อมูลนี้เพิ่งส่งไปหรือไม่ จะได้ไม่ต้องยิง Request เปลือง
2. **Database Constraint:** ตาราง `zk_attendance_logs` ใน Supabase อาศัย Row-Level Security (RLS) ที่เปิดสิทธิ์ `Allow anonymous inserts` เพื่อรับข้อมูล และใช้ Primary Key ในการป้องกันข้อมูลซ้ำ (ถ้ามี Error `23505 Duplicate Key` ระบบจะข้ามไปเงียบๆ ถือว่าปลอดภัย)

---

## 🛠️ การตั้งค่า Environment (`.env`)

```ini
# Supabase Cloud
SUPABASE_URL=https://ktnkosmuibcbwfpedhvt.supabase.co
SUPABASE_ANON_KEY=sb_publishable_...

# ZKTeco Device (Strategy 1)
ZKTECO_IP=192.168.10.214
ZKTECO_PORT=4370

# ZKBioTime PostgreSQL (Strategy 2)
ZKBIO_HOST=192.168.10.82
# Port: 7496 (Hardcoded in index.js)
# User: postgres (Hardcoded in index.js)
# Pass: zkpass2026 (Hardcoded in index.js)
```

---

## 🚀 แนะนำการนำไปใช้งาน (Deployment)

เพื่อให้ระบบทำงานได้อย่างเสถียรที่สุดและเชื่อมต่อเข้า Database ภายในวง LAN ได้ง่าย ควรนำไฟล์ `index.js` และ `.env` ไปตั้งรันไว้บน **เครื่อง Server (`192.168.10.82`)** หรือเครื่อง PC ในออฟฟิศที่เสียบสาย LAN:

1. ติดตั้ง `Node.js` บนเครื่อง Server
2. ติดตั้ง `pm2` (`npm install -g pm2`) 
3. สั่งรันเป็น Background Service ด้วยคำสั่ง:
   ```bash
   pm2 start index.js --name "zk-sync"
   pm2 save
   pm2 startup
   ```
   (วิธีนี้จะทำให้โปรแกรมรันขึ้นมาอัตโนมัติแม้จะรีสตาร์ทเครื่อง)
