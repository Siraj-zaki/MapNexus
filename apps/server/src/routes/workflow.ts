import { Router } from 'express';
import {
  createWorkflow,
  deleteWorkflow,
  getWorkflowById,
  getWorkflows,
  updateWorkflow,
} from '../services/workflow/index.js';

const router = Router();

/**
 * GET /api/workflows
 * List all workflows
 */
router.get('/', async (req, res, next) => {
  try {
    const workflows = await getWorkflows();
    res.json(workflows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/workflows/:id
 * Get single workflow
 */
router.get('/:id', async (req, res, next) => {
  try {
    const workflow = await getWorkflowById(req.params.id);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    res.json(workflow);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/workflows
 * Create new workflow
 */
router.post('/', async (req, res, next) => {
  try {
    const userId = (req as any).user?.id || 'system';
    const workflow = await createWorkflow({ ...req.body, createdBy: userId });
    res.status(201).json(workflow);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/workflows/:id
 * Update workflow
 */
router.put('/:id', async (req, res, next) => {
  try {
    const workflow = await updateWorkflow(req.params.id, req.body);
    res.json(workflow);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/workflows/:id
 * Delete workflow
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await deleteWorkflow(req.params.id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
