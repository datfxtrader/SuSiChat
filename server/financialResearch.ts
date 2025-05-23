
import { Router } from 'express';
import { performFinancialAnalysis } from './deerflow-integration';
import { isAuthenticated } from './replitAuth';

const router = Router();

router.post('/analyze', isAuthenticated, async (req, res) => {
  try {
    const result = await performFinancialAnalysis(req.body);
    res.json(result);
  } catch (error) {
    console.error('Financial analysis error:', error);
    res.status(500).json({ error: 'Failed to perform financial analysis' });
  }
});

export default router;
