import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { pool } from '../db.js';
import { signAccessToken } from '../lib/tokens.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  workspaceName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  password: z.string().min(12).max(128)
});
const loginSchema = z.object({ email: z.string().trim().email().max(254).transform(v => v.toLowerCase()), password: z.string().min(1).max(128) });

router.post('/register', async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid registration details.', details: parsed.error.flatten().fieldErrors });
  const { name, workspaceName, email, password } = parsed.data;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const hash = await bcrypt.hash(password, 12);
    const userResult = await client.query('INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email', [name, email, hash]);
    const user = userResult.rows[0];
    const workspaceResult = await client.query('INSERT INTO workspaces (name, created_by) VALUES ($1, $2) RETURNING id, name', [workspaceName, user.id]);
    const workspace = workspaceResult.rows[0];
    await client.query('INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3)', [workspace.id, user.id, 'owner']);
    await client.query('COMMIT');
    res.status(201).json({ user, workspace, accessToken: signAccessToken(user), tokenType: 'Bearer', expiresIn: 7200 });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    if (err.code === '23505') return res.status(409).json({ error: 'An account with that email already exists.' });
    next(err);
  } finally { client.release(); }
});

router.post('/login', async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid login details.' });
  try {
    const result = await pool.query('SELECT id, name, email, password_hash FROM users WHERE email = $1 AND disabled_at IS NULL', [parsed.data.email]);
    const userRow = result.rows[0];
    if (!userRow || !(await bcrypt.compare(parsed.data.password, userRow.password_hash))) return res.status(401).json({ error: 'Email or password is incorrect.' });
    const user = { id: userRow.id, name: userRow.name, email: userRow.email };
    res.json({ user, accessToken: signAccessToken(user), tokenType: 'Bearer', expiresIn: 7200 });
  } catch (err) { next(err); }
});

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(`SELECT u.id, u.name, u.email, wm.workspace_id, w.name AS workspace_name, wm.role
      FROM users u JOIN workspace_members wm ON wm.user_id = u.id JOIN workspaces w ON w.id = wm.workspace_id
      WHERE u.id = $1 AND u.disabled_at IS NULL AND w.archived_at IS NULL ORDER BY wm.created_at LIMIT 20`, [req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'User or workspace not found.' });
    res.json({ user: { id: result.rows[0].id, name: result.rows[0].name, email: result.rows[0].email }, workspaces: result.rows.map(r => ({ id: r.workspace_id, name: r.workspace_name, role: r.role })) });
  } catch (err) { next(err); }
});
export default router;
