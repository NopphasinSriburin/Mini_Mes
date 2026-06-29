import jwt from "jsonwebtoken";

// ตรวจ JWT จาก header Authorization: Bearer <token>
export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "ต้องเข้าสู่ระบบก่อน" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "token ไม่ถูกต้องหรือหมดอายุ" });
  }
}

// จำกัดสิทธิ์ตาม role เช่น requireRole("ENGINEER", "ADMIN")
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "ไม่มีสิทธิ์เข้าถึงส่วนนี้" });
    }
    next();
  };
}