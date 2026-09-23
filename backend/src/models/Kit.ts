import mongoose, {
  Document,
  Schema,
  Types
} from 'mongoose';

/*
 * ==========================================
 * REQUIREMENT
 * ==========================================
 */

export interface IRequirement {
  id: string;
  text: string;
  kind: 'technical' | 'behavioural' | 'domain';
  priority: 'must' | 'nice';
}


/*
 * ==========================================
 * QUESTION
 * ==========================================
 */

export interface IQuestion {
  id: string;
  requirementIds: string[];

  category:
    | 'technical'
    | 'behavioural'
    | 'system-design'
    | 'company-fit';

  prompt: string;
  answerOutline: string;

  difficulty: 1 | 2 | 3;
}


/*
 * ==========================================
 * FLASHCARD
 * ==========================================
 */

export interface IFlashcard {
  id: string;
  front: string;
  back: string;
  requirementIds: string[];
}


/*
 * ==========================================
 * SCHEDULE DAY
 * ==========================================
 */

export interface IScheduleDay {
  day: number;
  focus: string;
  questionIds: string[];
  minutes: number;
}


/*
 * ==========================================
 * COVERAGE
 * ==========================================
 */

export interface ICoverage {
  uncoveredRequirementIds: string[];
  passes: number;
}


/*
 * ==========================================
 * SOURCE
 * ==========================================
 */

export interface ISource {
  company: string;
  companyUrl: string;
  role: string;
  location: string;
  jdChars: number;
  researchedAt: string;
  pagesUsed: string[];
}


/*
 * ==========================================
 * COMPANY BRIEF
 * ==========================================
 */

export interface ICompanyBrief {
  summary: string;
  whatTheyDo: string;
  sources: string[];
}


/*
 * ==========================================
 * ROLE
 * ==========================================
 */

export interface IRole {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: IRequirement[];
}


/*
 * ==========================================
 * KIT
 * ==========================================
 */

export interface IKit extends Document {
  userId: Types.ObjectId;

  source: ISource;

  companyBrief: ICompanyBrief;

  role: IRole;

  questions: IQuestion[];

  flashcards: IFlashcard[];

  schedule: {
    daysAvailable: number;
    days: IScheduleDay[];
  };

  coverage: ICoverage;

  status:
    | 'draft'
    | 'generating'
    | 'completed'
    | 'failed';

  error?: string;

  createdAt: Date;
  updatedAt: Date;
}


/*
 * ==========================================
 * REQUIREMENT SCHEMA
 * ==========================================
 */

const requirementSchema =
  new Schema<IRequirement>(
    {
      id: {
        type: String,
        required: true
      },

      text: {
        type: String,
        required: true
      },

      kind: {
        type: String,
        enum: [
          'technical',
          'behavioural',
          'domain'
        ],
        required: true
      },

      priority: {
        type: String,
        enum: [
          'must',
          'nice'
        ],
        required: true
      }
    },
    {
      _id: false
    }
  );


/*
 * ==========================================
 * QUESTION SCHEMA
 * ==========================================
 */

const questionSchema =
  new Schema<IQuestion>(
    {
      id: {
        type: String,
        required: true
      },

      requirementIds: [
        {
          type: String,
          required: true
        }
      ],

      category: {
        type: String,
        enum: [
          'technical',
          'behavioural',
          'system-design',
          'company-fit'
        ],
        required: true
      },

      prompt: {
        type: String,
        required: true
      },

      answerOutline: {
        type: String,
        required: true
      },

      difficulty: {
        type: Number,
        enum: [1, 2, 3],
        required: true
      }
    },
    {
      _id: false
    }
  );


/*
 * ==========================================
 * FLASHCARD SCHEMA
 * ==========================================
 */

const flashcardSchema =
  new Schema<IFlashcard>(
    {
      id: {
        type: String,
        required: true
      },

      front: {
        type: String,
        required: true
      },

      back: {
        type: String,
        required: true
      },

      requirementIds: [
        {
          type: String,
          required: true
        }
      ]
    },
    {
      _id: false
    }
  );


/*
 * ==========================================
 * SCHEDULE DAY SCHEMA
 * ==========================================
 */

const scheduleDaySchema =
  new Schema<IScheduleDay>(
    {
      day: {
        type: Number,
        required: true
      },

      focus: {
        type: String,
        required: true
      },

      questionIds: [
        {
          type: String,
          required: true
        }
      ],

      minutes: {
        type: Number,
        required: true
      }
    },
    {
      _id: false
    }
  );


/*
 * ==========================================
 * COVERAGE SCHEMA
 * ==========================================
 */

const coverageSchema =
  new Schema<ICoverage>(
    {
      uncoveredRequirementIds: [
        {
          type: String
        }
      ],

      passes: {
        type: Number,
        required: true,
        default: 1
      }
    },
    {
      _id: false
    }
  );


/*
 * ==========================================
 * SOURCE SCHEMA
 * ==========================================
 */

const sourceSchema =
  new Schema<ISource>(
    {
      company: {
        type: String,
        required: true
      },

      companyUrl: {
        type: String,
        required: true
      },

      role: {
        type: String,
        required: true
      },

      location: {
        type: String,
        default: ''
      },

      jdChars: {
        type: Number,
        required: true
      },

      researchedAt: {
        type: String,
        required: true
      },

      pagesUsed: [
        {
          type: String
        }
      ]
    },
    {
      _id: false
    }
  );


/*
 * ==========================================
 * COMPANY BRIEF SCHEMA
 * ==========================================
 */

const companyBriefSchema =
  new Schema<ICompanyBrief>(
    {
      summary: {
        type: String,
        required: true
      },

      whatTheyDo: {
        type: String,
        required: true
      },

      sources: [
        {
          type: String
        }
      ]
    },
    {
      _id: false
    }
  );


/*
 * ==========================================
 * ROLE SCHEMA
 * ==========================================
 */

const roleSchema =
  new Schema<IRole>(
    {
      title: {
        type: String,
        required: true
      },

      seniority: {
        type: String,
        required: true
      },

      responsibilities: [
        {
          type: String
        }
      ],

      requirements: [
        requirementSchema
      ]
    },
    {
      _id: false
    }
  );


/*
 * ==========================================
 * KIT SCHEMA
 * ==========================================
 */

const kitSchema =
  new Schema<IKit>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },

      source: {
        type: sourceSchema,
        required: true
      },

      companyBrief: {
        type: companyBriefSchema,
        required: true
      },

      role: {
        type: roleSchema,
        required: true
      },

      questions: {
        type: [questionSchema],
        default: []
      },

      flashcards: {
        type: [flashcardSchema],
        default: []
      },

      schedule: {
        daysAvailable: {
          type: Number,
          required: true
        },

        days: {
          type: [scheduleDaySchema],
          default: []
        }
      },

      coverage: {
        type: coverageSchema,
        required: true
      },

      status: {
        type: String,
        enum: [
          'draft',
          'generating',
          'completed',
          'failed'
        ],
        default: 'draft'
      },

      error: {
        type: String
      }
    },
    {
      timestamps: true
    }
  );


/*
 * ==========================================
 * INDEX
 * ==========================================
 */

kitSchema.index({
  userId: 1,
  createdAt: -1
});


/*
 * ==========================================
 * MODEL
 * ==========================================
 *
 * IMPORTANT:
 *
 * This MUST be a named export because your
 * other files use:
 *
 * import { Kit } from '../models/Kit';
 */

export const Kit =
  mongoose.models.Kit ||
  mongoose.model<IKit>(
    'Kit',
    kitSchema
  );