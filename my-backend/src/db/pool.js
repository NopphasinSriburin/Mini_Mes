import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// ต่อ Postgres บน cloud (เช่น Railway) ต้องเปิด SSL เสมอ
// แต่ database ในเครื่อง (localhost) ไม่รองรับ SSL — เช็คจาก connection string ให้เปิดเฉพาะตอนจำเป็น
const connectionString = process.env.DATABASE_URL || "";
const isLocalDb = /localhost|127\.0\.0\.1/.test(connectionString);

export const pool = new Pool({
  connectionString,
  ssl: isLocalDb ? false : { rejectUnauthorized: false },
});

// helper สั้น ๆ ใช้ query ทั่วระบบ
export const query = (text, params) => pool.query(text, params);

// helper สำหรับ transaction (ใช้ตอนสร้างชิ้นงาน + ตัดสต็อกวัตถุดิบพร้อมกัน)
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}