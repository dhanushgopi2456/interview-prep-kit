import { Router } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { crawlCompanySite, findHiringPages, searchPublicDiscussion } from '../services/research';

const router: Router = Router();

router.use(authenticate);

router.post('/crawl', asyncHandler(async (req: AuthRequest, res) => {
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required', code: 'MISSING_URL' });
  }

  try {
    const result = await crawlCompanySite(url);
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      error: 'Crawling failed', 
      code: 'CRAWL_FAILED',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.post('/find-hiring', asyncHandler(async (req: AuthRequest, res) => {
  const { url, html } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required', code: 'MISSING_URL' });
  }

  const hiringPages = await findHiringPages(url, html);
  res.json({ hiringPages });
}));

router.post('/search-discussion', asyncHandler(async (req: AuthRequest, res) => {
  const { companyName } = req.body;
  if (!companyName) {
    return res.status(400).json({ error: 'Company name is required', code: 'MISSING_NAME' });
  }

  const results = await searchPublicDiscussion(companyName);
  res.json({ results });
}));

export default router;