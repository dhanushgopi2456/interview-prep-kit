import { Router } from 'express';
import { Kit } from '../models/Kit';
import { authenticate, AuthRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { generateKit } from '../services/generation';
import { crawlCompanySite } from '../services/research';
import { getMemoryKitById, updateMemoryKit } from '../services/kitMemoryStore';

const router: Router = Router();

router.use(authenticate);

/**
 * ==========================================
 * GENERATE COMPLETE KIT
 * ==========================================
 */
router.post(
  '/generate/:kitId',
  asyncHandler(async (req: AuthRequest, res) => {

    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }

    let kit: any = null;
    try {
      kit = await Kit.findOne({
        _id: req.params.kitId,
        userId: req.user._id
      });
    } catch (err) {
      console.warn('[Generation Route] MongoDB find error:', err);
    }

    if (!kit) {
      kit = getMemoryKitById(req.params.kitId);
    }

    if (!kit) {
      return res.status(404).json({
        error: 'Kit not found',
        code: 'NOT_FOUND'
      });
    }

    /*
     * Only block if another generation is actually running.
     *
     * New kits should have status = "draft".
     */
    if (kit.status === 'generating') {
      return res.status(409).json({
        error: 'Generation already in progress',
        code: 'ALREADY_GENERATING'
      });
    }

    /*
     * Get job description from request.
     */
    const jobDescription =
      typeof req.body?.jobDescription === 'string'
        ? req.body.jobDescription.trim()
        : '';

    if (jobDescription.length < 10) {
      return res.status(400).json({
        error: 'Job description is required',
        code: 'INVALID_JOB_DESCRIPTION'
      });
    }

    /*
     * Mark generation as running.
     */
    kit.status = 'generating';
    kit.error = undefined;

    await kit.save();

    try {

      /*
       * ======================================
       * BASIC INPUTS
       * ======================================
       */

      const companyUrl = kit.source.companyUrl;

      const days =
        kit.schedule.daysAvailable || 7;

      /*
       * ======================================
       * COMPANY RESEARCH
       * ======================================
       */

      const research =
        await crawlCompanySite(companyUrl);

      const homepageText =
        research.homepage?.text || '';

      const hiringPagesText =
        Array.isArray(research.hiringPages)
          ? research.hiringPages.map(
              page => page.text || ''
            )
          : [];

      const hiringProcess =
        Array.isArray(research.hiringPages)
          ? research.hiringPages
              .map(
                page =>
                  `${page.title || 'Hiring Page'}: ${(page.text || '').slice(0, 500)}`
              )
              .join('\n')
          : '';

      const researchSources = [
        ...(Array.isArray(research.pages)
          ? research.pages.map(page => page.url)
          : []),

        ...(Array.isArray(research.hiringPages)
          ? research.hiringPages.map(page => page.url)
          : [])
      ];

      const sources = [
        ...new Set(
          researchSources.filter(Boolean)
        )
      ];

      /*
       * ======================================
       * COMPANY NAME
       * ======================================
       */

      let companyName =
        kit.source.company?.trim();

      if (!companyName) {
        try {
          companyName =
            new URL(companyUrl).hostname
              .replace(/^www\./, '')
              .split('.')[0];

          companyName =
            companyName.charAt(0).toUpperCase() +
            companyName.slice(1);

        } catch {
          companyName = 'Company';
        }
      }

      /*
       * ======================================
       * GENERATE KIT
       * ======================================
       */

      const generated = await generateKit(
        jobDescription,
        companyUrl,
        days,
        {
          homepageText,
          hiringPagesText,
          hiringProcess,
          discussionSummary: '',
          sources,
          companyName
        }
      );

      /*
       * ======================================
       * VALIDATE GENERATED RESULT
       * ======================================
       */

      if (!generated) {
        throw new Error(
          'Generation service returned no data'
        );
      }

      /*
       * Make sure required nested objects exist.
       */
      const finalCompanyBrief = {
        summary:
          generated.companyBrief?.summary ||
          `Interview preparation information for ${companyName}.`,

        whatTheyDo:
          generated.companyBrief?.whatTheyDo ||
          `${companyName} information was gathered from the provided company website.`,

        sources:
          generated.companyBrief?.sources ||
          sources
      };

      const finalRole = {
        title:
          generated.role?.title ||
          kit.source.role ||
          'Software Engineer',

        seniority:
          generated.role?.seniority ||
          'Entry Level',

        responsibilities:
          generated.role?.responsibilities ||
          [],

        requirements:
          generated.role?.requirements ||
          []
      };

      const finalQuestions =
        Array.isArray(generated.questions)
          ? generated.questions
          : [];

      const finalFlashcards =
        Array.isArray(generated.flashcards)
          ? generated.flashcards
          : [];

      const finalSchedule = {
        daysAvailable:
          generated.schedule?.daysAvailable ||
          days,

        days:
          Array.isArray(generated.schedule?.days)
            ? generated.schedule.days
            : []
      };

      const finalCoverage = {
        uncoveredRequirementIds:
          generated.coverage?.uncoveredRequirementIds ||
          [],

        passes:
          generated.coverage?.passes ||
          1
      };

      /*
       * ======================================
       * SAVE GENERATED DATA
       * ======================================
       */

      kit.source.company = companyName;
      kit.source.pagesUsed = sources;

      kit.companyBrief =
        finalCompanyBrief;

      kit.role =
        finalRole;

      kit.questions =
        finalQuestions;

      kit.flashcards =
        finalFlashcards;

      kit.schedule =
        finalSchedule;

      kit.coverage =
        finalCoverage;

      kit.status = 'completed';
      kit.error = undefined;

      try {
        if (typeof kit.save === 'function') {
          await kit.save();
        }
      } catch (saveErr) {
        console.warn('[Generation Route] MongoDB kit.save error, mirrored in memory store');
      }

      updateMemoryKit(req.params.kitId, {
        companyBrief: kit.companyBrief,
        role: kit.role,
        questions: kit.questions,
        flashcards: kit.flashcards,
        schedule: kit.schedule,
        coverage: kit.coverage,
        status: 'completed',
        error: undefined
      });

      /*
       * ======================================
       * RESPONSE
       * ======================================
       */

      return res.status(200).json({
        message: 'Interview prep kit generated successfully',
        kit
      });

    } catch (error) {

      console.error(
        'KIT GENERATION ERROR:',
        error
      );

      kit.status = 'failed';

      kit.error =
        error instanceof Error
          ? error.message
          : 'Generation failed';

      try {
        if (typeof kit.save === 'function') {
          await kit.save();
        }
      } catch {}

      updateMemoryKit(req.params.kitId, {
        status: 'failed',
        error: kit.error
      });

      return res.status(500).json({
        error: 'Generation failed',
        code: 'GENERATION_FAILED',
        details:
          error instanceof Error
            ? error.message
            : 'Unknown generation error'
      });
    }
  })
);


/**
 * ==========================================
 * REGENERATE SECTION
 * ==========================================
 */
router.post(
  '/regenerate-section/:kitId',
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

    const kit = await Kit.findOne({
      _id: req.params.kitId,
      userId: req.user._id
    });

    if (!kit) {
      return res.status(404).json({
        error: 'Kit not found',
        code: 'NOT_FOUND'
      });
    }

    return res.json({
      kit,
      message: `Section ${section} regeneration queued`
    });
  })
);


export default router;