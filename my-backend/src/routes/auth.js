import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "../db/pool.js";

const router = Router();

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "กรุณากรอก username และ password" });
  }

  const { rows } = await query(
    "SELECT id, username, password, full_name, role FROM users WHERE username = $1 AND is_active = TRUE",
    [username]
  );
  const user = rows[0];
  if (!user) {
    return res.status(401).json({ error: "username หรือ password ไม่ถูกต้อง" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: "username หรือ password ไม่ถูกต้อง" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, fullName: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );

  res.json({
    token,
    user: { id: user.id, username: user.username, fullName: user.full_name, role: user.role },
  });
});

export default router;