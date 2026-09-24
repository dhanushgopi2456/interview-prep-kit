import { Router } from 'express';
import { Kit } from '../models/Kit';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { createKitSchema, updateKitSchema } from '../utils/validation';
import {
  createMemoryKit,
  getMemoryKits,
  getMemoryKitById,
  updateMemoryKit,
  deleteMemoryKit
} from '../services/kitMemoryStore';

const router: Router = Router();

/*
 * All kit routes require authentication.
 */
router.use(authenticate);

/*
 * Extract company name from the company URL.
 */
const getCompanyNameFromUrl = (companyUrl: string): string => {
  try {
    const url = new URL(companyUrl);
    const hostname = url.hostname.replace(/^www\./, '');
    const parts = hostname.split('.');
    if (parts.length === 0 || !parts[0]) {
      return 'Unknown Company';
    }
    const companyName = parts[0];
    return companyName.charAt(0).toUpperCase() + companyName.slice(1);
  } catch {
    return 'Unknown Company';
  }
};

/**
 * ==========================================
 * CREATE KIT
 * ==========================================
 */
router.post(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const {
      jobDescription,
      companyUrl,
      days,
      role,
      location
    } = createKitSchema.parse({
      body: req.body
    }).body;

    const company = getCompanyNameFromUrl(companyUrl);
    const userId = req.user._id ? req.user._id.toString() : (req.user.id || '507f1f77bcf86cd799439011');

    const initialKitData = {
      userId,
      source: {
        company,
        companyUrl,
        role: role || 'Unknown Role',
        location: location || 'Not specified',
        jdChars: jobDescription.length,
        researchedAt: new Date().toISOString(),
        pagesUsed: []
      },
      companyBrief: {
        summary: `Interview preparation kit for ${company} based on the provided job description.`,
        whatTheyDo: `${company} is the company associated with this job posting.`,
        sources: [companyUrl]
      },
      role: {
        title: role || 'Unknown Role',
        seniority: 'Mid-Senior',
        responsibilities: [
          `Lead delivery and engineering initiatives for ${company}`,
          'Collaborate across cross-functional product and infrastructure teams'
        ],
        requirements: []
      },
      questions: [],
      flashcards: [],
      schedule: {
        daysAvailable: days,
        days: []
      },
      coverage: {
        uncoveredRequirementIds: [],
        passes: 0
      },
      status: 'generating'
    };

    // Try MongoDB first
    try {
      const kit = await Kit.create(initialKitData);
      // Mirror in memory store
      createMemoryKit({ ...initialKitData, _id: kit._id.toString() });
      return res.status(201).json({ kit });
    } catch (dbError) {
      console.warn('[Kit Route] MongoDB create error / offline, falling back to memory store:', dbError);
      // Fallback seamlessly to memory store so creation never fails
      const memoryKit = createMemoryKit(initialKitData);
      return res.status(201).json({ kit: memoryKit });
    }
  })
);

/**
 * ==========================================
 * GET ALL KITS
 * ==========================================
 */
router.get(
  '/',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const userId = req.user._id ? req.user._id.toString() : (req.user.id || '507f1f77bcf86cd799439011');
    const memoryKits = getMemoryKits(userId);

    try {
      const dbKits = await Kit.find({ userId: req.user._id })
        .select([
          'source.role',
          'source.company',
          'source.companyUrl',
          'source.location',
          'source.researchedAt',
          'status',
          'createdAt',
          'updatedAt'
        ].join(' '))
        .sort({ createdAt: -1 });

      if (dbKits && dbKits.length > 0) {
        // Merge without duplicates
        const seenIds = new Set(dbKits.map(k => k._id.toString()));
        const uniqueMemoryKits = memoryKits.filter(k => !seenIds.has(k._id));
        return res.json({ kits: [...dbKits, ...uniqueMemoryKits] });
      }

      return res.json({ kits: memoryKits });
    } catch (err) {
      console.warn('[Kit Route] MongoDB find error / offline, returning memory kits');
      return res.json({ kits: memoryKits });
    }
  })
);

/**
 * ==========================================
 * GET SINGLE KIT
 * ==========================================
 */
router.get(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const kitId = req.params.id;

    // Check memory store first for instant response
    const memKit = getMemoryKitById(kitId);
    if (memKit) {
      return res.json({ kit: memKit });
    }

    try {
      const kit = await Kit.findOne({
        _id: kitId,
        userId: req.user._id
      });

      if (kit) {
        return res.json({ kit });
      }
    } catch (err) {
      console.warn('[Kit Route] MongoDB findOne error:', err);
    }

    return res.status(404).json({
      error: 'Kit not found',
      code: 'NOT_FOUND'
    });
  })
);

/**
 * ==========================================
 * UPDATE KIT
 * ==========================================
 */
router.patch(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const updates = updateKitSchema.parse({
      body: req.body
    }).body;

    const kitId = req.params.id;

    // Update in memory store
    const memUpdated = updateMemoryKit(kitId, updates);

    try {
      const kit = await Kit.findOneAndUpdate(
        { _id: kitId, userId: req.user._id },
        { $set: updates },
        { new: true, runValidators: true }
      );
      if (kit) {
        return res.json({ kit });
      }
    } catch (err) {
      console.warn('[Kit Route] MongoDB findOneAndUpdate error:', err);
    }

    if (memUpdated) {
      return res.json({ kit: memUpdated });
    }

    return res.status(404).json({
      error: 'Kit not found',
      code: 'NOT_FOUND'
    });
  })
);

/**
 * ==========================================
 * DELETE KIT
 * ==========================================
 */
router.delete(
  '/:id',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const kitId = req.params.id;
    deleteMemoryKit(kitId);

    try {
      await Kit.findOneAndDelete({
        _id: kitId,
        userId: req.user._id
      });
    } catch (err) {
      console.warn('[Kit Route] MongoDB findOneAndDelete error:', err);
    }

    return res.json({
      message: 'Kit deleted'
    });
  })
);

/**
 * ==========================================
 * REGENERATE SECTION
 * ==========================================
 */
router.post(
  '/:id/regenerate-section',
  asyncHandler(async (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    const { section } = req.body;
    const validSections = [
      'companyBrief',
      'role',
      'questions',
      'flashcards',
      'schedule'
    ];

    if (!validSections.includes(section)) {
      return res.status(400).json({
        error: 'Invalid section',
        code: 'INVALID_SECTION'
      });
    }

    const kitId = req.params.id;
    const memKit = updateMemoryKit(kitId, { status: 'generating' });

    try {
      const kit = await Kit.findOne({
        _id: kitId,
        userId: req.user._id
      });
      if (kit) {
        kit.status = 'generating';
        await kit.save();
        return res.json({
          kit,
          message: `Regenerating ${section}...`
        });
      }
    } catch (err) {
      console.warn('[Kit Route] MongoDB regenerate section find error:', err);
    }

    if (memKit) {
      return res.json({
        kit: memKit,
        message: `Regenerating ${section}...`
      });
    }

    return res.status(404).json({
      error: 'Kit not found',
      code: 'NOT_FOUND'
    });
  })
);

export default router;
