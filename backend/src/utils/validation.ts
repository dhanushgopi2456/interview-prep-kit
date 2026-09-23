import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),

    password: z.string().min(
      8,
      'Password must be at least 8 characters'
    ),

    name: z.string()
      .min(1, 'Name is required')
      .max(100)
  })
});


export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),

    password: z.string().min(
      1,
      'Password is required'
    )
  })
});


/*
 * ==========================================
 * CREATE KIT
 * ==========================================
 *
 * The Create page currently provides:
 *
 * - Company URL
 * - Days
 * - Role
 * - Location
 *
 * Job description is therefore optional.
 */
export const createKitSchema = z.object({
  body: z.object({

    jobDescription: z
      .string()
      .optional()
      .default(''),

    companyUrl: z
      .string()
      .url('Invalid company URL'),

    days: z
      .coerce
      .number()
      .int('Days must be a whole number')
      .min(1, 'At least 1 day required')
      .max(60, 'Maximum 60 days allowed'),

    role: z
      .string()
      .optional()
      .default(''),

    location: z
      .string()
      .optional()
      .default('')
  })
});


export const batchInputSchema = z.object({
  body: z.array(
    z.object({
      id: z.string(),

      jd: z.string().min(10),

      company_url: z.string().url(),

      days: z
        .number()
        .int()
        .min(1)
        .max(60)
    })
  )
});


export const updateKitSchema = z.object({
  body: z.object({

    companyBrief: z.object({
      summary: z.string().optional(),

      whatTheyDo: z.string().optional(),

      sources: z
        .array(z.string().url())
        .optional()
    }).optional(),


    role: z.object({

      title: z.string().optional(),

      seniority: z.string().optional(),

      responsibilities: z
        .array(z.string())
        .optional(),

      requirements: z
        .array(
          z.object({
            id: z.string(),

            text: z.string(),

            kind: z.enum([
              'technical',
              'behavioural',
              'domain'
            ]),

            priority: z.enum([
              'must',
              'nice'
            ])
          })
        )
        .optional()

    }).optional(),


    questions: z
      .array(
        z.object({
          id: z.string(),

          requirementIds: z.array(
            z.string()
          ),

          category: z.enum([
            'technical',
            'behavioural',
            'system-design',
            'company-fit'
          ]),

          prompt: z.string(),

          answerOutline: z.string(),

          difficulty: z
            .number()
            .int()
            .min(1)
            .max(3)
        })
      )
      .optional(),


    flashcards: z
      .array(
        z.object({
          id: z.string(),

          front: z.string(),

          back: z.string(),

          requirementIds: z.array(
            z.string()
          )
        })
      )
      .optional(),


    schedule: z.object({

      daysAvailable: z
        .number()
        .int()
        .min(1)
        .max(60),

      days: z.array(
        z.object({

          day: z
            .number()
            .int()
            .min(1),

          focus: z.string(),

          questionIds: z.array(
            z.string()
          ),

          minutes: z
            .number()
            .int()
            .min(1)
        })
      )

    }).optional()

  })
});