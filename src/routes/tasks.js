import { Router } from 'express';
import { z } from 'zod';
import { pool } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
const router = Router();
router.use(requireAuth);
const taskSchema = z.object({ workspaceId: z.string().uuid(), title: z.string().trim().min(1).max(240), description: z.string().max(10000).optional().default(''), dueDate: z.string().date().optional().nullable(), priority: z.enum(['low','normal','high','urgent']).optional().default('normal') });
async function isMember(userId, workspaceId) {
  const r = await pool.query('SELECT 1 FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id WHERE wm.user_id=$1 AND wm.workspace_id=$2 AND w.archived_at IS NULL', [userId, workspaceId]);
  return r.rowCount > 0;
}
router.get('/', async (req, res, next) => {
  const workspaceId = req.query.workspaceId;
  if (typeof workspaceId !== 'string') return res.status(400).json({ error: 'workspaceId query parameter is required.' });
  try {
    if (!(await isMember(req.user.id, workspaceId))) return res.status(403).json({ error: 'You do not have access to this workspace.' });
    const r = await pool.query('SELECT id, workspace_id, title, description, due_date, priority, completed_at, created_at, updated_at FROM tasks WHERE workspace_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 500', [workspaceId]);
    res.json({ tasks: r.rows });
  } catch (err) { next(err); }
});
router.post('/', async (req, res, next) => {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid task details.', details: parsed.error.flatten().fieldErrors });
  try {
    const d = parsed.data;
    if (!(await isMember(req.user.id, d.workspaceId))) return res.status(403).json({ error: 'You do not have access to this workspace.' });
    const r = await pool.query('INSERT INTO tasks (workspace_id, created_by, title, description, due_date, priority) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, workspace_id, title, description, due_date, priority, completed_at, created_at, updated_at', [d.workspaceId, req.user.id, d.title, d.description, d.dueDate || null, d.priority]);
    res.status(201).json({ task: r.rows[0] });
  } catch (err) { next(err); }
});
router.patch('/:id', async (req, res, next) => {
  const schema = z.object({ workspaceId: z.string().uuid(), title: z.string().trim().min(1).max(240).optional(), description: z.string().max(10000).optional(), dueDate: z.string().date().nullable().optional(), priority: z.enum(['low','normal','high','urgent']).optional(), completed: z.boolean().optional() }).refine(d => Object.keys(d).some(k => k !== 'workspaceId'), 'At least one field to update is required');
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid update details.', details: parsed.error.flatten().fieldErrors });
  try {
    const d = parsed.data;
    if (!(await isMember(req.user.id, d.workspaceId))) return res.status(403).json({ error: 'You do not have access to this workspace.' });
    const r = await pool.query(`UPDATE tasks SET title=COALESCE($1,title), description=COALESCE($2,description), due_date=CASE WHEN $3 THEN $4::date ELSE due_date END, priority=COALESCE($5,priority), completed_at=CASE WHEN $6::boolean IS NULL THEN completed_at WHEN $6 THEN COALESCE(completed_at,now()) ELSE NULL END, updated_at=now() WHERE id=$7 AND workspace_id=$8 AND deleted_at IS NULL RETURNING id, workspace_id, title, description, due_date, priority, completed_at, created_at, updated_at`, [d.title ?? null, d.description ?? null, Object.hasOwn(d,'dueDate'), d.dueDate ?? null, d.priority ?? null, d.completed ?? null, req.params.id, d.workspaceId]);
    if (!r.rowCount) return res.status(404).json({ error: 'Task not found.' });
    res.json({ task: r.rows[0] });
  } catch (err) { next(err); }
});
router.delete('/:id', async (req, res, next) => {
  const workspaceId = req.query.workspaceId;
  if (typeof workspaceId !== 'string') return res.status(400).json({ error: 'workspaceId query parameter is required.' });
  try {
    if (!(await isMember(req.user.id, workspaceId))) return res.status(403).json({ error: 'You do not have access to this workspace.' });
    const r = await pool.query('UPDATE tasks SET deleted_at=now(), updated_at=now() WHERE id=$1 AND workspace_id=$2 AND deleted_at IS NULL RETURNING id', [req.params.id, workspaceId]);
    if (!r.rowCount) return res.status(404).json({ error: 'Task not found.' });
    res.status(204).end();
  } catch (err) { next(err); }
});
export default router;
