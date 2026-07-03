# Mini MES — ระบบควบคุมการผลิตในโรงงาน (Manufacturing Execution System)

> ระบบจำลองสายการผลิตในโรงงานอุตสาหกรรม สำหรับติดตามการผลิตแบบเรียลไทม์ ตรวจสอบย้อนกลับวัตถุดิบ (Traceability) และจัดการงานซ่อมบำรุง — พัฒนาเป็น Full-Stack Web Application

![Stack](https://img.shields.io/badge/stack-React%20%2B%20Node%20%2B%20PostgreSQL-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-frontend-3178C6)
![License](https://img.shields.io/badge/license-MIT-green)

---
<img width="1912" height="947" alt="image" src="https://github.com/user-attachments/assets/0baf96cb-ec6e-4ad9-a257-68a3905975cb" />
<img width="1907" height="938" alt="image" src="https://github.com/user-attachments/assets/3b5c4209-881d-46f7-9129-498a55996828" />
<img width="1912" height="947" alt="image" src="https://github.com/user-attachments/assets/5651b5f4-a923-40b1-bc54-157a22b5d3f9" />


## 📌 โปรเจคนี้คืออะไร

Mini MES เป็นระบบ **Manufacturing Execution System** ที่จำลองการทำงานของโรงงานจริง ออกแบบมาเพื่อแก้ปัญหาหลักของสายการผลิต คือ การติดตามงาน การตรวจสอบคุณภาพ และการตรวจสอบย้อนกลับเมื่อสินค้ามีปัญหา

ระบบนี้แทนที่การจดบันทึกด้วยกระดาษหน้าไลน์ผลิต ด้วยหน้าจอดิจิทัลที่พนักงานกดบันทึกได้ง่าย และทำให้ผู้จัดการเห็นสถานะการผลิตแบบเรียลไทม์

### ปัญหาที่ระบบนี้แก้

| ปัญหาในโรงงาน | วิธีที่ระบบแก้ |
|---|---|
| ไม่รู้ว่าสินค้าชิ้นนี้ใช้วัตถุดิบล็อตไหน | Traceability ตรวจสอบย้อนกลับได้ทุกชิ้น |
| วัตถุดิบล็อตเสีย ไม่รู้ต้องเรียกคืนสินค้าชิ้นไหน | Backward trace หาชิ้นงานที่กระทบได้ทันที |
| จดบันทึกการผลิตด้วยกระดาษ ตกหล่น ช้า | หน้าจอ Andon กดบันทึกดิจิทัลหน้างาน |
| ไม่รู้สถานะเครื่องจักร / ยอดผลิตปัจจุบัน | Dashboard เรียลไทม์ |
| เครื่องเสียไม่มีระบบติดตามการซ่อม | ระบบ Maintenance + บันทึก downtime |

---

## 🛠️ Tech Stack

**Frontend**
- React 19 + TypeScript
- Vite (build tool)
- Tailwind CSS v4

**Backend**
- Node.js + Express
- JWT Authentication + Role-based Access Control
- RESTful API

**Database**
- PostgreSQL 16
- ออกแบบ schema รองรับ Traceability เต็มรูปแบบ

**DevOps**
- Docker Compose (PostgreSQL)

---

## 🎯 ฟีเจอร์หลัก

### 1. Dashboard เรียลไทม์
แสดง KPI สำคัญ — จำนวนใบสั่งผลิตที่กำลังดำเนินการ, Quality Yield (% ของดี), สถานะเครื่องจักร, งานซ่อมค้าง

### 2. การผลิต (Work Orders)
จัดการใบสั่งผลิต ติดตามความคืบหน้าเทียบเป้าหมาย แยกยอดของดี/ของเสีย

### 3. บันทึกการผลิต (Andon Board)
หน้าจอสำหรับพนักงานหน้าไลน์ — ปุ่มขนาดใหญ่กดบันทึกของดี/ของเสียได้ทันที สร้าง serial อัตโนมัติ เหมาะกับการใช้งานบน tablet หน้างาน

### 4. ตรวจสอบย้อนกลับ (Traceability) ⭐ ฟีเจอร์เด่น
- **Forward trace** — เลือกชิ้นงาน 1 ชิ้น เห็นว่าผลิตเมื่อไหร่ เครื่องไหน ใครผลิต ใช้วัตถุดิบล็อตใดบ้าง
- **Backward trace (Recall)** — เลือกล็อตวัตถุดิบที่มีปัญหา เห็นทันทีว่ามีสินค้าชิ้นไหนได้รับผลกระทบและต้องเรียกคืน

### 5. ระบบซ่อมบำรุง (Maintenance)
แจ้งซ่อมเครื่องจักร ติดตามสถานะ บันทึก downtime สำหรับนำไปคำนวณ OEE

---

## 🗂️ โครงสร้างฐานข้อมูล

ระบบใช้ตารางหลัก 13 ตาราง ออกแบบให้รองรับการตรวจสอบย้อนกลับ หัวใจสำคัญคือตาราง `unit_material_usage` ที่เชื่อมชิ้นงานแต่ละชิ้นกับล็อตวัตถุดิบที่ใช้ ทำให้ตรวจสอบได้ทั้งสองทิศทาง

```
material_lots ──┐
                ├──< unit_material_usage >──┐
production_units ┘                          │
       │                                    │
       ├──> work_orders ──> products        │
       ├──> machines                        │
       └──> users (operator)                │

maintenance_orders ──> machines  (เก็บ downtime สำหรับ OEE)
```

ดูรายละเอียดเต็มใน [`db/schema.sql`](db/schema.sql)

---

## 🚀 วิธีติดตั้งและรัน

### สิ่งที่ต้องมี
- Node.js 18+
- Docker (สำหรับ PostgreSQL) หรือ PostgreSQL ที่ติดตั้งในเครื่อง
- DBeaver หรือเครื่องมือจัดการ database (ไม่บังคับ)

### 1. Database

```bash
# รัน PostgreSQL ผ่าน Docker
docker compose up -d

# โหลด schema และข้อมูลตัวอย่าง (ผ่าน DBeaver หรือ psql)
# เปิดไฟล์ db/schema.sql แล้ว execute
# ตามด้วย db/seed.sql
```

> ⚠️ หากใช้ Windows อย่ารัน seed.sql ผ่าน cmd/PowerShell โดยตรง เพราะภาษาไทยอาจเพี้ยน — แนะนำให้ execute ผ่าน DBeaver ที่อ่าน UTF-8 ได้ถูกต้อง

### 2. Backend

```bash
cd my-backend
npm install
cp .env.example .env        # แก้ DATABASE_URL ให้ตรงกับ database ของคุณ
npm run dev                 # รันที่ http://localhost:8081
```

### 3. Frontend

```bash
cd React/my-client
npm install
npm run dev                 # รันที่ http://localhost:5173
```

เปิดเบราว์เซอร์ → เข้าสู่ระบบด้วย `engineer` / `password123`

### บัญชีทดสอบ (ทุกบัญชีรหัส `password123`)

| Username | Role | สิทธิ์ |
|---|---|---|
| admin | ADMIN | ทั้งหมด |
| engineer | ENGINEER | สร้างใบสั่งผลิต + ทุกอย่าง |
| somchai | OPERATOR | บันทึกการผลิต |
| wichai | TECHNICIAN | งานซ่อมบำรุง |

---

## 📡 API Endpoints

| Method | Endpoint | คำอธิบาย |
|---|---|---|
| POST | `/api/auth/login` | เข้าสู่ระบบ รับ JWT token |
| GET | `/api/dashboard/summary` | ข้อมูลสรุปสำหรับ dashboard |
| GET | `/api/work-orders` | รายการใบสั่งผลิต |
| POST | `/api/work-orders/:id/units` | บันทึกผลิต 1 ชิ้น (ใช้ transaction) |
| GET | `/api/trace/unit/:serial` | Forward trace — ตามชิ้นงาน |
| GET | `/api/trace/lot/:lotNo` | Backward trace — ตามล็อตวัตถุดิบ |
| GET | `/api/maintenance` | รายการงานซ่อมบำรุง |

ทุก endpoint (ยกเว้น login) ต้องแนบ JWT ใน header: `Authorization: Bearer <token>`

---

## 💡 จุดเด่นเชิงเทคนิค

**Database Transaction** — ตอนบันทึกชิ้นงาน 1 ชิ้น ระบบจะทำ 3 อย่างพร้อมกันใน transaction เดียว: สร้างชิ้นงาน, ตัดสต็อกวัตถุดิบจากล็อต, อัปเดตยอดดี/เสียในใบสั่งผลิต — ถ้าขั้นตอนใดล้มเหลวจะ rollback ทั้งหมด ป้องกันข้อมูลไม่สอดคล้องกัน

**Two-way Traceability** — ออกแบบความสัมพันธ์ many-to-many ระหว่างชิ้นงานกับล็อตวัตถุดิบ ทำให้ตรวจสอบย้อนกลับได้ทั้งสองทิศทาง ซึ่งเป็นความต้องการจริงของโรงงานเมื่อต้องเรียกคืนสินค้า (recall)

**Role-based Access Control** — แยกสิทธิ์การเข้าถึงตามบทบาท เช่น เฉพาะ Engineer/Admin เท่านั้นที่สร้างใบสั่งผลิตได้

**Type-safe Frontend** — ใช้ TypeScript กำหนด type ของ API response ทั้งหมด แยก `types.ts` และ `api.ts` ออกจาก component เพื่อให้บำรุงรักษาง่ายและขยายต่อได้

**OEE-ready** — เก็บข้อมูล downtime ในระบบซ่อม และ yield ในใบสั่งผลิต พร้อมต่อยอดคำนวณ Overall Equipment Effectiveness

---

## 🔮 แผนพัฒนาต่อ

- [ ] WebSocket สำหรับอัปเดต dashboard แบบ real-time push
- [ ] เชื่อมต่อข้อมูลจากเครื่องจักรจริงผ่าน MQTT (ตาราง `machine_readings` เตรียมไว้แล้ว)
- [ ] คำนวณ OEE เต็มรูปแบบ (Availability × Performance × Quality)
- [ ] รายงาน PDF สรุปการผลิตรายวัน
- [ ] Docker Compose รวมทั้ง stack (frontend + backend + db)

---

## 📂 โครงสร้างโปรเจค

```
mini-mes/
├── db/
│   ├── schema.sql           # โครงสร้างฐานข้อมูล
│   └── seed.sql             # ข้อมูลตัวอย่าง
├── my-backend/              # Node + Express API
│   ├── Server.js            # entry point
│   └── src/
│       ├── db/pool.js       # connection pool + transaction
│       ├── middleware.js    # JWT auth + role check
│       └── routes/          # auth, work-orders, trace, maintenance, dashboard
└── React/my-client/         # React + TypeScript
    └── src/
        ├── types.ts         # type definitions
        ├── api.ts           # API client (จัดการ JWT)
        ├── App.tsx
        └── components/      # Login, Dashboard, Production, Andon, Traceability, Maintenance
```

---

## 👤 ผู้พัฒนา

พัฒนาเป็น portfolio project เพื่อแสดงความสามารถด้าน Full-Stack Development สำหรับงานสาย Smart Factory / Manufacturing Systems

โปรเจคนี้แสดงทักษะ: การออกแบบฐานข้อมูลเชิงสัมพันธ์, การเขียน REST API ที่มี authentication, การจัดการ transaction, การพัฒนา frontend ด้วย TypeScript และการเข้าใจ domain ของการผลิตในโรงงาน

---

## 📄 License

MIT
