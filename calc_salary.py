import csv, math
from datetime import datetime
from collections import defaultdict

DAYS_IN_MONTH = 31  # มีนาคม 2026
OT_RATE = 40

# กำหนดวันที่ต้องการอนุมัติ OT (เสมือนการกดปุ่มเลือกวัน)
# ตัวอย่าง: ให้พนักงานเบอร์ 8 (Looknum) คิด OT ได้เฉพาะวันที่ '2026-03-09' เป็นต้น
# ถ้าระบุ 'ALL' จะคิด OT ให้ทุกวันที่มีสิทธิ์
APPROVED_OT_DATES = {
    # '8': ['2026-03-09', '2026-03-16'],
    # '3': ['2026-03-13'],
}

# กำหนดวันที่อนุมัติให้พนักงานรายเดือนหยุดพักผ่อน (มีสิทธิ์ได้รับค่าแรง)
# เช่น วันที่ 2 และ 3 ของพนักงานเบอร์ 8
APPROVED_OFF_DATES = {
    '8': ['2026-03-02', '2026-03-03'],
}

# ชื่อพนักงาน
EMP_NAMES = {
    '1':'JET','2':'Mild','3':'Mameaw','4':'Bird','5':'Ploysai',
    '6':'Chompoo','7':'Mint','8':'Looknum','9':'Aum','10':'Pluem',
    '11':'Jay','12':'Cream','13':'Jui','14':'Noi','15':'Wave',
    '16':'Amp','17':'Ple','18':'YUNG','19':'TAE','20':'Ple FB',
    '21':'TUKTA','22':'Jeab','23':'ManU'
}

def parse_h(s):
    if not s or s.strip() in ('', '-'): return None
    try:
        parts = s.strip().split(':')
        h, m = int(parts[0]), int(parts[1])
        return h + m/60.0
    except: return None

def round_half(raw_h):
    if raw_h <= 0: return 0.0
    lower = int(raw_h * 2) / 2.0
    upper = lower + 0.5
    mins_to_upper = (upper - raw_h) * 60
    return upper if round(mins_to_upper, 4) <= 10 else lower

def is_sunday(date_str):
    try:
        return datetime.strptime(date_str.strip(), '%Y-%m-%d').weekday() == 6
    except:
        return False

def kitchen_late(late_min, daily_rate, hrs_divisor=12.0):
    # กฎใหม่: ผ่อนผัน 10 นาทีแรก, หักแบบรายนาที = (เงินรายวัน / ชั่วโมง / 60)
    if late_min <= 10: return 0.0
    
    # หารเรทต่อนาที และปัดทศนิยม 2 ตำแหน่งให้ตรงกับตัวอย่างที่ให้มา (0.97)
    rpm_exact = (float(daily_rate) / float(hrs_divisor)) / 60.0
    rpm = round(rpm_exact, 2)
    
    # หักตามจำนวนนาทีที่สายจริง (ไม่ต้องปัดนาที)
    return round(late_min * rpm, 2)

def make_sr(emp_type, daily, monthly, shift_start, default_out, hrs_day, ot_type, late_type=None):
    return {
        'emp_type': emp_type, 'daily': daily, 'monthly': monthly,
        'shift_start': shift_start, 'default_out': default_out,
        'hrs_day': hrs_day, 'ot_type': ot_type, 'late_type': late_type
    }

SHIFT = {
    '1':  make_sr('รายวัน',   380,  0,    14.0, 24.0, 10, 'football', 'football'),
    '2':  make_sr('รายวัน',   380,  0,    10.0, 21.0, 10, 'morning'),
    '3':  make_sr('รายเดือน', 0, 11000,   10.0, 21.0, 10, 'morning'),
    '4':  make_sr('รายเดือน', 0, 11000,   10.0, 21.0, 10, 'morning'),
    '5':  make_sr('รายวัน',   380,  0,    15.0,  2.0, 10,  None),
    '6':  make_sr('รายเดือน', 0, 12000,   10.0, 20.0, 10,  None),
    '7':  make_sr('พาร์ทไทม์',240,  0,    17.0, 24.0,  7,  None),
    '8':  make_sr('รายเดือน', 0, 12000,   10.0, 20.0, 10, 'looknum'),
    '9':  make_sr('รายเดือน', 0, 11000,   10.0, 21.0, 10, 'morning'),
    '10': make_sr('พาร์ทไทม์',240,  0,    17.0, 24.0,  7,  None),
    '11': make_sr('พาร์ทไทม์',240,  0,    17.0, 24.0,  7,  None),
    '12': make_sr('พาร์ทไทม์',240,  0,    17.0, 24.0,  7,  None),
    '13': make_sr('รายวัน',   700,  0,    10.0, 22.0, 12, 'kitchen'),
    '14': make_sr('รายวัน',   700,  0,    10.0, 22.0, 12, 'kitchen'),
    '15': make_sr('รายเดือน', 0, 11000,   15.0,  2.0, 10,  None),
    '16': make_sr('รายวัน',   550,  0,    10.0, 22.0, 12, 'kitchen'),
    '17': make_sr('พาร์ทไทม์',240,  0,    17.0, 24.0,  7,  None),
    '18': make_sr('รายวัน',   400,  0,    14.0, 24.0, 10, 'football', 'football'),
    '19': make_sr('รายวัน',   360,  0,    14.0, 24.0, 10, 'football', 'football'),
    '20': make_sr('รายวัน',   240,  0,    17.0, 24.0,  7,  None),
    '21': make_sr('รายวัน',   380,  0,     8.0, 17.0,  9,  None),
    '22': make_sr('รายวัน',   450,  0,    10.0, 22.0, 12, 'kitchen'),
    '23': make_sr('พาร์ทไทม์',240,  0,    17.0, 24.0,  7,  None),
}

def get_shift(eid, cin_h):
    sr = dict(SHIFT[eid])
    if eid == '8' and cin_h is not None and cin_h >= 12.0:
        sr['shift_start'] = 15.0
        sr['default_out'] = 2.0
        sr['ot_type'] = None
    return sr

def calc_ot(eid, cin_h, cout_h, sr, date_str):
    ot_type = sr['ot_type']
    if ot_type is None: return 0.0
    if cin_h is None: return 0.0
    cout = cout_h if cout_h is not None else sr['default_out']
    if cout < cin_h: cout += 24
    if ot_type == 'looknum':
        if cout <= 21.1666: return 0.0
        return round_half(cout - 20.0)
    elif ot_type in ['morning', 'morning_pt']:
        if cout <= 21.1666: return 0.0
        return round_half(cout - 21.0)
    elif ot_type == 'kitchen':
        if cin_h >= 9.0: return 0.0
        return round_half(10.0 - cin_h)
    elif ot_type == 'football':
        if cin_h >= 13.0: return 0.0
        return round_half(14.0 - cin_h)
    return 0.0

def calc_late(late_min, sr, cin_h=None):
    if sr['ot_type'] == 'kitchen':
        daily = sr['daily']
        # ใช้ hrs_day ของกะ (12 ชม.สำหรับกะครัว)
        hrs_day = sr.get('hrs_day', 12)
        return kitchen_late(late_min, daily, hrs_divisor=hrs_day)
    emp_type = sr['emp_type']
    late_type= sr.get('late_type')
    monthly  = sr['monthly']
    hrs_day  = sr['hrs_day']

    # 4.5 กลุ่ม Office (หักรายนาทีแบบเฉพาะเจาะจง ไม่ปัดเศษ)
    if late_type == 'office':
        if late_min <= 10: return 0.0
        # เรทต่อนาที = เงินเดือน / วันในเดือน / 10 ชม. / 60 นาที ปัดทศนิยม 2 ตำแหน่ง
        rpm_exact = (float(monthly) / float(DAYS_IN_MONTH) / 10.0) / 60.0
        rpm = round(rpm_exact, 2)
        return round(late_min * rpm, 2)

    if late_type == 'football':
        if cin_h is None or cin_h <= 14 + 10/60: return 0.0
        periods = 1
        cur = 15.0
        while cur <= 20.0:
            if cin_h > cur:
                periods += 1
                cur += 1.0
            else:
                break
        return periods * OT_RATE
    # 5. พาร์ทไทม์เย็น (พาร์ทไทม์) หัก 40 บาทต่อการสาย (คิดเป็นรายชั่วโมงเต็ม ไม่ปัด 30 นาที)
    if emp_type == 'พาร์ทไทม์':
        if late_min <= 10: return 0.0
        import math
        return float(math.ceil(late_min / 60.0) * 40.0)

    if emp_type == 'รายเดือน':
        if late_min <= 10: return 0.0
        rph = (monthly / DAYS_IN_MONTH) / hrs_day
        late_h = round_half(late_min / 60.0) or 0.5
        return round(rph * late_h, 2)
    else:
        if late_min <= 10: return 0.0
        late_h = round_half(late_min / 60.0) or 0.5
        return round(OT_RATE * late_h, 2)

# อ่าน CSV
csv_path = r'C:\Users\Tmango\Desktop\เงินเดือน\บัตรเวลาทั้งหมด_20260327154545_export.csv'

for enc in ['utf-8-sig', 'utf-8', 'cp874', 'tis-620']:
    try:
        with open(csv_path, encoding=enc) as f:
            reader = csv.DictReader(f)
            rows = list(reader)
        print(f"อ่านสำเร็จด้วย encoding: {enc}")
        print("คอลัมน์:", list(rows[0].keys()) if rows else "ไม่มี")
        break
    except Exception as e:
        print(f"{enc} ล้มเหลว: {e}")

# จัดกลุ่มตาม employee
emp_map = defaultdict(list)
for r in rows:
    eid = str(r.get('หมายเลขพนักงาน', '') or r.get('No.', '') or '').strip()
    if eid and eid in SHIFT:
        emp_map[eid].append(r)
    else:
        # ลองหา key อื่น
        for k in r.keys():
            if 'หมาย' in k or 'No' in k or 'ID' in k.upper():
                val = str(r[k]).strip()
                if val and val in SHIFT:
                    emp_map[val].append(r)
                    break

print(f"\nพบพนักงาน {len(emp_map)} คน: {sorted(emp_map.keys(), key=lambda x: int(x) if x.isdigit() else 99)}")

# คำนวณทีละคน
print("\n" + "="*80)
print(f"{'#':<4} {'ชื่อ':<12} {'ประเภท':<12} {'วันทำงาน':>8} {'เงินเดือน':>12} {'OT':>8} {'หักสาย':>8} {'รวม':>12}")
print("="*80)

summary = {}
for eid in sorted(emp_map.keys(), key=lambda x: int(x) if x.isdigit() else 99):
    sr_base = SHIFT[eid]
    total_base = 0.0
    total_ot   = 0.0
    total_deduct = 0.0
    work_days  = 0

    # Create mapping of date to row for easy lookup
    days_map = {}
    for d in emp_map[eid]:
        date_str = d.get('วันที่', '') or d.get('Date', '') or ''
        if date_str:
            days_map[date_str] = d

    for day in range(1, DAYS_IN_MONTH + 1):
        date_str = f"2026-03-{day:02d}"
        d = days_map.get(date_str, {})
        
        # หาคอลัมน์
        wf_val = d.get('วันทำงาน', '') or d.get('Work Day', '') or ''
        try: wf = float(wf_val) if wf_val else 0
        except: wf = 0

        late_val = d.get('Late In(M)', '') or d.get('Late', '') or '0'
        try: late_m = float(late_val) if late_val else 0
        except: late_m = 0

        checkin  = d.get('นาฬิกาเข้า', '') or d.get('Clock In', '') or ''
        checkout = d.get('นาฬิกาออก', '') or d.get('Clock Out', '') or ''

        cin_h  = parse_h(checkin)
        cout_h = parse_h(checkout)

        if cin_h is None and cout_h is None:
            if sr_base['emp_type'] == 'รายเดือน':
                # ตรวจสอบว่าเป็นวันหยุดที่อนุมัติหรือไม่
                if eid in APPROVED_OFF_DATES and date_str in APPROVED_OFF_DATES[eid]:
                    total_base += round(sr_base['monthly']/DAYS_IN_MONTH, 2)
                    work_days += 1
            continue

        sr = get_shift(eid, cin_h)
        daily_rate = round(sr['monthly']/DAYS_IN_MONTH, 2) if sr['emp_type'] == 'รายเดือน' else sr['daily']

        # TUKTA วันอาทิตย์
        if eid == '21' and is_sunday(date_str):
            total_base += 190
            work_days += 1
            continue

        # TUKTA ออกก่อน 17:00
        if eid == '21' and cout_h is not None and cout_h < 17.0:
            hrs_worked = cout_h - (cin_h if cin_h else 8.0)
            total_base += round(max(0, hrs_worked) * (380/9), 2)
            work_days += 1
            continue

        # พาร์ทไทม์มาแทนกะเช้า
        if eid in ['7','10','11','12','17','23'] and cin_h and cin_h < 12.0:
            daily_rate = 350
            sr['ot_type'] = 'morning_pt'
            
        # กฎสลับกะ (ออกก่อนกำหนด หรือเข้า 17:00 แปลงเป็น Part-Time Base 240)
        # ข้อยกเว้น: Kitchen (13,14,16,22), Football (1,18,19), แม่บ้าน (21)
        is_exempt = eid in ['1','13','14','16','18','19','21','7','10','11','12','17','23']
        actual_cout = cout_h
        if actual_cout is not None and cin_h is not None and actual_cout < cin_h:
            actual_cout += 24

        if not is_exempt:
            if actual_cout is not None and actual_cout <= 18.0:
                daily_rate = 240
                sr['emp_type'] = 'พาร์ทไทม์_override'
            elif cin_h is not None and cin_h >= 16.5:
                # สลับมา 17:00
                daily_rate = 240
                sr['emp_type'] = 'พาร์ทไทม์_override'
                sr['ot_type'] = None

        # หักยอดกรณีลืมสแกนเข้าหรือออก (เหมือน JS: รอใส่เวลาเข้า / ออก)
        if cin_h is None:
            daily_rate = 0.0
        elif cout_h is None:
            daily_rate = 0.0

        work_days += 1
        total_base += daily_rate

        # หักสาย
        deduct = calc_late(late_m, sr, cin_h)
        total_deduct += deduct

        # OT
        eff_cout = cout_h if cout_h is not None else sr['default_out']
        ot_h = calc_ot(eid, cin_h, eff_cout, sr, date_str)
        ot_money = round(ot_h * OT_RATE, 2)
        total_ot += ot_money

    net = round(total_base - total_deduct + total_ot, 2)
    summary[eid] = {'name': EMP_NAMES.get(eid, '?'), 'work_days': work_days,
                     'base': total_base, 'ot': total_ot, 'deduct': total_deduct, 'net': net,
                     'type': sr_base['emp_type']}
    print(f"#{eid:<3} {EMP_NAMES.get(eid,'?'):<12} {sr_base['emp_type']:<12} {work_days:>8} {total_base:>12,.2f} {total_ot:>8,.2f} {total_deduct:>8,.2f} {net:>12,.2f}")

print("="*80)
total_all = sum(v['net'] for v in summary.values())
print(f"{'รวมทั้งหมด':>50} {total_all:>12,.2f} บาท")
