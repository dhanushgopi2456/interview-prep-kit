import { Router } from 'express';
import { Kit } from '../models/Kit';
import {
  authenticate,
  AuthRequest
} from '../middleware/auth';
import {
  asyncHandler
} from '../middleware/errorHandler';
import {
  createKitSchema,
  updateKitSchema
} from '../utils/validation';

const router: Router = Router();

/*
 * All kit routes require authentication.
 */
router.use(authenticate);


/*
 * Extract company name from the company URL.
 *
 * Example:
 * https://www.headout.com
 * -> Headout
 *
 * https://www.microsoft.com
 * -> Microsoft
 *
 * https://www.google.com/jobs/123
 * -> Google
 */
const getCompanyNameFromUrl = (companyUrl: string): string => {
  try {
    const url = new URL(companyUrl);

    const hostname = url.hostname
      .replace(/^www\./, '');

    const parts = hostname.split('.');

    if (parts.length === 0 || !parts[0]) {
      return 'Unknown Company';
    }

    const companyName = parts[0];

    return (
      companyName.charAt(0).toUpperCase() +
      companyName.slice(1)
    );
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

    /*
     * Check authentication.
     */
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }


    /*
     * Validate request body.
     *
     * createKitSchema expects:
     *
     * {
     *   body: {
     *     jobDescription,
     *     companyUrl,
     *     days,
     *     role,
     *     location
     *   }
     * }
     */
    const {
      jobDescription,
      companyUrl,
      days,
      role,
      location
    } = createKitSchema.parse({
      body: req.body
    }).body;


    /*
     * Determine company name from URL.
     */
    const company = getCompanyNameFromUrl(companyUrl);


    /*
     * Create initial kit.
     *
     * Important:
     *
     * The Kit model requires:
     *
     * source.company
     * companyBrief.summary
     * companyBrief.whatTheyDo
     * role.seniority
     *
     * Therefore we must NOT send empty strings
     * for these required fields.
     */
    const kit = await Kit.create({

      userId: req.user._id,

      source: {
        company: company,

        companyUrl: companyUrl,

        role: role || 'Unknown Role',

        location: location || 'Not specified',

        jdChars: jobDescription.length,

        researchedAt: new Date().toISOString(),

        pagesUsed: []
      },


      companyBrief: {
        summary:
          `Interview preparation kit for ${company} based on the provided job description.`,

        whatTheyDo:
          `${company} is the company associated with this job posting.`,

        sources: []
      },


      role: {
        title: role || 'Unknown Role',

        seniority: 'Not specified',

        responsibilities: [],

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
    });


    /*
     * Return newly created kit.
     */
    return res.status(201).json({
      kit
    });
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

    /*
     * Check authentication.
     */
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }


    /*
     * Get all kits belonging to current user.
     */
    const kits = await Kit.find({
      userId: req.user._id
    })
      .select(
        [
          'source.role',
          'source.company',
          'source.companyUrl',
          'source.location',
          'source.researchedAt',
          'status',
          'createdAt',
          'updatedAt'
        ].join(' ')
      )
      .sort({
        createdAt: -1
      });


    return res.json({
      kits
    });
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

    /*
     * Check authentication.
     */
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }


    /*
     * Find kit belonging to current user.
     */
    const kit = await Kit.findOne({
      _id: req.params.id,
      userId: req.user._id
    });


    if (!kit) {
      return res.status(404).json({
        error: 'Kit not found',
        code: 'NOT_FOUND'
      });
    }


    return res.json({
      kit
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

    /*
     * Check authentication.
     */
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }


    /*
     * Validate update body.
     */
    const updates = updateKitSchema.parse({
      body: req.body
    }).body;


    /*
     * Update only the user's own kit.
     */
    const kit = await Kit.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user._id
      },
      {
        $set: updates
      },
      {
        new: true,
        runValidators: true
      }
    );


    if (!kit) {
      return res.status(404).json({
        error: 'Kit not found',
        code: 'NOT_FOUND'
      });
    }


    return res.json({
      kit
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

    /*
     * Check authentication.
     */
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }


    /*
     * Delete only the user's own kit.
     */
    const kit = await Kit.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });


    if (!kit) {
      return res.status(404).json({
        error: 'Kit not found',
        code: 'NOT_FOUND'
      });
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

    /*
     * Check authentication.
     */
    if (!req.user) {
      return res.status(401).json({
        error: 'Not authenticated',
        code: 'NOT_AUTHENTICATED'
      });
    }


    const { section } = req.body;


    /*
     * Allowed sections.
     */
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


    /*
     * Find user's kit.
     */
    const kit = await Kit.findOne({
      _id: req.params.id,
      userId: req.user._id
    });


    if (!kit) {
      return res.status(404).json({
        error: 'Kit not found',
        code: 'NOT_FOUND'
      });
    }


    /*
     * Mark kit as generating.
     */
    kit.status = 'generating';

    await kit.save();


    return res.json({
      kit,
      message: `Regenerating ${section}...`
    });
  })
);


export default router;