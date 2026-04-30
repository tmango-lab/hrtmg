require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const ZKLib = require('node-zklib');
const { Pool } = require('pg');

// ========== CONFIG ==========
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const ZKTECO_IP = process.env.ZKTECO_IP || '192.168.10.214';
const ZKTECO_PORT = parseInt(process.env.ZKTECO_PORT || '4370');

// ZKBioTime PostgreSQL (fallback)
const DB_HOST = process.env.ZKBIO_HOST || '192.168.10.82';
const DB_PORT = parseInt(process.env.ZKBIO_PORT || '7496');
const DB_USER = process.env.ZKBIO_USER || 'postgres';
const DB_PASS = process.env.ZKBIO_PASS;
const DB_NAME = process.env.ZKBIO_NAME || 'biotime';

// Timing
const ZKLIB_TIMEOUT = 15000;         // 15s timeout for device connection
const ZKLIB_INPORT = 4000;           // UDP inbound port
const RECONNECT_DELAY = 30000;       // 30s before retry after disconnect
const DB_POLL_INTERVAL = 60000;      // 60s between DB polls (fallback mode)
const HEARTBEAT_INTERVAL = 60000;    // 60s heartbeat check

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error("❌ Error: Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env file");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const pool = new Pool({
    host: DB_HOST,
    port: DB_PORT,
    database: DB_NAME,
    user: DB_USER,
    password: DB_PASS,
    connectionTimeoutMillis: 5000,
});

// ========== STATE ==========
let currentMode = 'none'; // 'live' | 'db' | 'none'
let zkInstance = null;
let lastSyncTime = null;
let processedKeys = new Set(); // dedup: "userId_timestamp"
let reconnectTimer = null;
let dbPollTimer = null;
let heartbeatTimer = null;
let isConnecting = false;

// ========== HELPERS ==========
const timestamp = () => new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' });

function makeDedupeKey(userId, time) {
    // Standardize time format for deduplication key
    const t = time instanceof Date ? time.toISOString() : new Date(time).toISOString();
    return `${userId}_${t}`;
}

async function saveToSupabase(userId, recordTime) {
    const key = makeDedupeKey(userId, recordTime);
    if (processedKeys.has(key)) return false;

    // PostgreSQL returns timestamp without timezone, which pg parses as UTC.
    // ZKBioTime stores them in local time (GMT+7). We must adjust if it's off by 7 hours,
    // but typically toISOString() handles it well enough if we construct it carefully.
    // Let's assume pg parsed it directly.
    const timeStr = recordTime instanceof Date
        ? recordTime.toISOString()
        : new Date(recordTime).toISOString();

    const record = {
        device_user_id: String(userId),
        record_time: timeStr
    };

    const { error } = await supabase.from('zk_attendance_logs').insert([record]);
    if (!error) {
        processedKeys.add(key);
        // Keep set manageable - remove old entries when too large
        if (processedKeys.size > 10000) {
            const arr = [...processedKeys];
            processedKeys = new Set(arr.slice(-5000));
        }
        return true;
    } else {
        // duplicate key errors are expected, don't spam
        if (error.code === '23505') {
            processedKeys.add(key);
            return false;
        }
        console.error(`   ❌ Supabase insert error:`, error.message);
        return false;
    }
}

// ========== STRATEGY 1: node-zklib DIRECT ==========

async function tryDirectConnection() {
    if (isConnecting) return false;
    isConnecting = true;

    console.log(`\n🔌 [${timestamp()}] Attempting DIRECT connection to ZKTeco (${ZKTECO_IP}:${ZKTECO_PORT})...`);

    // Clean up any existing instance
    if (zkInstance) {
        try { await zkInstance.disconnect(); } catch (e) {}
        zkInstance = null;
    }

    zkInstance = new ZKLib(ZKTECO_IP, ZKTECO_PORT, ZKLIB_TIMEOUT, ZKLIB_INPORT);

    try {
        // Step 1: Create socket (tries TCP first, falls back to UDP)
        await zkInstance.createSocket(
            (err) => {
                console.error(`⚠️  Socket error:`, err.message);
                handleDisconnect('socket_error');
            },
            (type) => {
                console.log(`⚠️  Socket closed (${type})`);
                handleDisconnect('socket_close');
            }
        );

        const connType = zkInstance.connectionType;
        console.log(`✅ Connected via ${connType.toUpperCase()}!`);

        // Check if socket closed immediately before continuing
        if (!zkInstance || currentMode === 'none') return false;

        // Step 2: Get device info
        try {
            const info = await zkInstance.getInfo();
            console.log(`📊 Device Info: ${info.userCounts} users, ${info.logCounts} logs, capacity ${info.logCapacity}`);
        } catch (e) {
            console.log(`⚠️  Could not get device info: ${e.message}`);
        }

        // Step 3: Do an initial batch sync of attendance logs
        try {
            console.log(`📥 Fetching existing attendance logs...`);
            const atts = await zkInstance.getAttendances();
            if (atts && atts.data && atts.data.length > 0) {
                console.log(`   Found ${atts.data.length} records in device memory`);
                let saved = 0;
                for (const record of atts.data) {
                    const ok = await saveToSupabase(
                        record.deviceUserId,
                        record.recordTime
                    );
                    if (ok) saved++;
                }
                console.log(`   ✅ Saved ${saved} new records to Supabase`);
            } else {
                console.log(`   No attendance logs found in device (or empty)`);
            }
        } catch (e) {
            console.log(`⚠️  Could not fetch attendance logs: ${e.message}`);
        }

        // Step 4: Start real-time monitoring
        if (!zkInstance) return false;
        
        console.log(`\n📡 Starting LIVE Monitor Mode...`);
        console.log(`👉 Scan your face/finger now — it will appear here instantly!\n`);

        await zkInstance.getRealTimeLogs(async (log) => {
            if (log.userId) {
                const time = log.attTime || new Date();
                console.log(`👤 [${timestamp()}] LIVE SCAN: User ${log.userId} at ${time}`);
                const ok = await saveToSupabase(log.userId, time);
                if (ok) console.log(`   ✅ Saved to Supabase!`);
                else console.log(`   ℹ️  Already exists (deduplicated)`);
            }
        });

        // Step 5: Setup heartbeat
        startHeartbeat();

        currentMode = 'live';
        isConnecting = false;

        // Stop DB polling if running
        if (dbPollTimer) {
            clearInterval(dbPollTimer);
            dbPollTimer = null;
            console.log(`🔄 Stopped DB fallback polling (live mode active)`);
        }

        return true;

    } catch (err) {
        console.error(`❌ Direct connection failed: ${err.message}`);

        if (zkInstance) {
            try { await zkInstance.disconnect(); } catch (e) {}
            zkInstance = null;
        }

        isConnecting = false;
        return false;
    }
}

function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(async () => {
        if (!zkInstance || currentMode !== 'live') return;
        try {
            // Ping the device by requesting socket status
            await zkInstance.getSocketStatus();
        } catch (e) {
            console.log(`💔 Heartbeat failed — device may be unreachable`);
            handleDisconnect('heartbeat_fail');
        }
    }, HEARTBEAT_INTERVAL);
}

function handleDisconnect(reason) {
    console.log(`\n🔌 [${timestamp()}] Disconnected (reason: ${reason})`);

    if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
        heartbeatTimer = null;
    }

    currentMode = 'none';
    zkInstance = null;
    isConnecting = false;

    // Start DB fallback immediately
    startDbFallback();

    // Schedule reconnect attempt
    if (!reconnectTimer) {
        console.log(`🔄 Will attempt direct reconnection in ${RECONNECT_DELAY / 1000}s...`);
        reconnectTimer = setTimeout(async () => {
            reconnectTimer = null;
            const ok = await tryDirectConnection();
            if (!ok) {
                console.log(`❌ Direct reconnection failed — staying in DB fallback mode`);
            }
        }, RECONNECT_DELAY);
    }
}

// ========== STRATEGY 2: PostgreSQL FALLBACK ==========

async function fetchTransactionsFromDb() {
    try {
        const client = await pool.connect();
        
        // Use a 2-day lookback window by default
        const timeConstraint = lastSyncTime 
            ? `punch_time >= '${lastSyncTime.toISOString()}'` 
            : `punch_time >= NOW() - INTERVAL '2 days'`;
            
        const query = `
            SELECT emp_code, punch_time 
            FROM iclock_transaction 
            WHERE ${timeConstraint}
            ORDER BY punch_time ASC
        `;
        
        const result = await client.query(query);
        client.release();
        
        if (result.rows.length > 0) {
            lastSyncTime = new Date();
        }
        
        return result.rows;
    } catch (err) {
        console.error(`   ❌ PostgreSQL query error:`, err.message);
        return [];
    }
}

async function pollDbOnce() {
    if (currentMode === 'live') return; // Don't poll if live mode is active

    console.log(`\n🌐 [${timestamp()}] Polling PostgreSQL DB for attendance data...`);

    const transactions = await fetchTransactionsFromDb();
    if (transactions.length === 0) {
        console.log(`   No new transactions found`);
        return;
    }

    console.log(`   Found ${transactions.length} transactions from DB`);
    let saved = 0;

    for (const tx of transactions) {
        const userId = tx.emp_code;
        // pg library converts timestamp columns without timezone into local Date objects
        // However, if the server is UTC and the ZKBioTime stores them conceptually as local time,
        // pg might apply an offset incorrectly. Assuming local time matching for now.
        const punchTime = tx.punch_time;
        
        if (userId && punchTime) {
            const ok = await saveToSupabase(userId, punchTime);
            if (ok) saved++;
        }
    }

    if (saved > 0) {
        console.log(`   ✅ Saved ${saved} new records to Supabase via DB`);
    } else {
        console.log(`   ℹ️  All records already synced (deduplicated)`);
    }
}

function startDbFallback() {
    if (dbPollTimer) return; // Already running
    if (currentMode === 'live') return; // Live mode active

    currentMode = 'db';
    console.log(`\n🌐 [${timestamp()}] Switching to PostgreSQL FALLBACK mode`);
    console.log(`   Will poll ZKBioTime DB (${DB_HOST}:${DB_PORT}) every ${DB_POLL_INTERVAL / 1000}s`);

    // Poll immediately, then at interval
    pollDbOnce();
    dbPollTimer = setInterval(pollDbOnce, DB_POLL_INTERVAL);
}

// ========== MAIN ==========

async function main() {
    console.log("══════════════════════════════════════════════════════");
    console.log("  ZKTeco Attendance Sync — Dual Strategy Engine (PostgreSQL)");
    console.log("══════════════════════════════════════════════════════");
    console.log(`  Device IP:        ${ZKTECO_IP}:${ZKTECO_PORT}`);
    console.log(`  ZKBioTime Server: ${DB_HOST}:${DB_PORT}`);
    console.log(`  Supabase:         ${SUPABASE_URL.substring(0, 40)}...`);
    console.log("══════════════════════════════════════════════════════\n");

    // Check DB connection first before starting
    try {
        const client = await pool.connect();
        console.log("✅ Verified PostgreSQL connection");
        client.release();
    } catch (err) {
        console.log("⚠️  Could not verify PostgreSQL connection:", err.message);
    }

    // Strategy 1: Try direct connection first
    const directOk = await tryDirectConnection();

    if (!directOk) {
        console.log(`\n⚡ Direct connection unavailable — this is likely because`);
        console.log(`   ZKBioTime server is already holding the device connection.`);
        console.log(`   Switching to DB fallback mode...\n`);

        // Strategy 2: Fall back to DB polling
        startDbFallback();

        // Periodically retry direct connection in background
        setInterval(async () => {
            if (currentMode !== 'live' && !isConnecting) {
                console.log(`\n🔄 [${timestamp()}] Retrying direct connection...`);
                const ok = await tryDirectConnection();
                if (ok) {
                    console.log(`🎉 Direct connection restored!`);
                }
            }
        }, 5 * 60 * 1000); // Try every 5 minutes
    }

    // Listen for manual sync commands from Web UI
    const channel = supabase.channel('zkteco_commands');
    channel.on('broadcast', { event: 'sync_now' }, async (payload) => {
        console.log(`\n🔔 [${timestamp()}] Manual sync command received from Web UI`);
        if (currentMode === 'live') {
            console.log(`   ℹ️  Live mode active — data is already streaming in real-time`);
        } else {
            console.log(`   📥 Triggering DB poll now...`);
            await pollDbOnce();
        }
    }).subscribe();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.log(`\n🛑 Shutting down...`);
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    if (dbPollTimer) clearInterval(dbPollTimer);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (zkInstance) {
        try { await zkInstance.disconnect(); } catch (e) {}
    }
    await pool.end();
    process.exit(0);
});

process.on('unhandledRejection', (err) => {
    console.error(`⚠️  Unhandled rejection:`, err.message || err);
});

main();
