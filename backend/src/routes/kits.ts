import { Router } from 'express';
import { Kit } from '../models/Kit';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { createKitSchema, updateKitSchema } from '../utils/validation';
import { buildCompleteKitContent } from '../services/kitContentBuilder';
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

    // Build complete kit content (requirements, questions with diagrams, flashcards, schedule days)
    const generatedContent = buildCompleteKitContent({
      jobDescription,
      company,
      companyUrl,
      role: role || undefined,
      location: location || undefined,
      days: days || 7
    });

    const initialKitData = {
      userId,
      source: {
        company,
        companyUrl,
        role: role || generatedContent.role.title,
        location: location || 'Not specified',
        jdChars: jobDescription.length,
        researchedAt: new Date().toISOString(),
        pagesUsed: [companyUrl]
      },
      companyBrief: generatedContent.companyBrief,
      role: generatedContent.role,
      questions: generatedContent.questions,
      flashcards: generatedContent.flashcards,
      schedule: generatedContent.schedule,
      coverage: generatedContent.coverage,
      status: 'completed'
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
      'requirements',
      'questions',
      'more-questions',
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
    let existingKit: any = null;

    try {
      existingKit = await Kit.findOne({ _id: kitId, userId: req.user._id });
    } catch (err) {
      console.warn('[Kit Route] MongoDB findOne error on regenerate:', err);
    }
    if (!existingKit) {
      existingKit = getMemoryKitById(kitId);
    }

    if (!existingKit) {
      return res.status(404).json({
        error: 'Kit not found',
        code: 'NOT_FOUND'
      });
    }

    // Build regenerated section updates
    const updates: any = { status: 'completed' };
    const daysAvailable = existingKit.schedule?.daysAvailable || 7;
    const questionsList = existingKit.questions || [];
    const reqsList = existingKit.role?.requirements || [];

    if (section === 'schedule') {
      const qPerDay = Math.max(1, Math.ceil(questionsList.length / daysAvailable));
      const freshDays = Array.from({ length: daysAvailable }, (_, i) => {
        const d = i + 1;
        const start = i * qPerDay;
        const dayQs = questionsList.slice(start, start + qPerDay);
        const req = reqsList[i % Math.max(1, reqsList.length)];
        return {
          day: d,
          focus: d === 1
            ? 'Core Architecture & Technical Fundamentals'
            : d === 2
            ? 'Distributed System Design & Microservices'
            : d === 3
            ? 'Database Tuning, Edge Cases & Performance'
            : d === 4
            ? 'Behavioural STAR Scenarios & Team Leadership'
            : d === daysAvailable
            ? 'Final Mock Interview & Rapid Flashcard Review'
            : req ? `Targeted Mastery: ${req.text.slice(0, 50)}` : `Day ${d} Focused Study`,
          questionIds: dayQs.map(q => q.id),
          minutes: 60 + dayQs.length * 15
        };
      });

      updates.schedule = {
        daysAvailable,
        days: freshDays
      };
    } else if (section === 'role' || section === 'requirements') {
      const regenerated = buildCompleteKitContent({
        jobDescription: existingKit.source?.role || 'Senior Software Engineer',
        company: existingKit.source?.company || 'Company',
        companyUrl: existingKit.source?.companyUrl || '',
        role: existingKit.source?.role,
        days: daysAvailable
      });
      updates.role = regenerated.role;
    } else if (section === 'questions' || section === 'more-questions') {
      const regenerated = buildCompleteKitContent({
        jobDescription: existingKit.source?.role || 'Senior Software Engineer',
        company: existingKit.source?.company || 'Company',
        companyUrl: existingKit.source?.companyUrl || '',
        role: existingKit.source?.role,
        days: daysAvailable
      });
      const newQuestions = regenerated.questions.map((q, idx) => ({
        ...q,
        id: `q_regen_${Date.now()}_${idx + 1}`
      }));
      updates.questions = [...(existingKit.questions || []), ...newQuestions];
    } else if (section === 'flashcards') {
      updates.flashcards = (reqsList.length > 0 ? reqsList : [{ id: 'r1', text: 'Core System Architecture' }]).map((r: any, i: number) => ({
        id: `f_regen_${Date.now()}_${i + 1}`,
        front: `Core Concept & Best Practices: ${r.text.slice(0, 75)}`,
        back: `Detailed explanation of ${r.text}. Focus on architectural trade-offs, scalability, and measurable production impact.`,
        requirementIds: [r.id],
        status: 'generated'
      }));
    }

    // Persist updates to MongoDB and Memory Store
    let savedKit: any = null;
    try {
      if (existingKit._id && existingKit.save) {
        Object.assign(existingKit, updates);
        savedKit = await existingKit.save();
      } else {
        savedKit = await Kit.findByIdAndUpdate(kitId, { $set: updates }, { new: true });
      }
    } catch (dbErr) {
      console.warn('[Kit Route] MongoDB update error on regenerate:', dbErr);
    }

    const memKit = updateMemoryKit(kitId, updates);
    const finalKit = savedKit || memKit || existingKit;

    return res.json({
      kit: finalKit,
      message: `Section ${section} regenerated successfully`
    });
  })
);

export default router;
