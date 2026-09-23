import { Router } from 'express';
import jwt from 'jsonwebtoken';

import { User } from '../models/User';
import {
  authenticate,
  AuthRequest
} from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import {
  registerSchema,
  loginSchema
} from '../utils/validation';

const router: Router = Router();

/**
 * Create authentication cookie
 */
const setTokenCookie = (
  res: any,
  token: string
) => {
  res.cookie('token', token, {
    httpOnly: true,

    secure:
      process.env.NODE_ENV === 'production',

    sameSite: 'lax',

    maxAge: 7 * 24 * 60 * 60 * 1000,

    path: '/'
  });
};

/**
 * Remove authentication cookie
 */
const clearTokenCookie = (res: any) => {
  res.clearCookie('token', {
    httpOnly: true,

    secure:
      process.env.NODE_ENV === 'production',

    sameSite: 'lax',

    path: '/'
  });
};

/**
 * ==========================================
 * REGISTER
 * ==========================================
 *
 * Creates an account.
 *
 * IMPORTANT:
 * Registration does NOT create a JWT.
 * The user must login separately.
 */
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    /**
     * Your Zod schema expects:
     *
     * {
     *   body: {
     *     email,
     *     password,
     *     name
     *   }
     * }
     *
     * Therefore we wrap req.body.
     */
    const {
      email,
      password,
      name
    } = registerSchema.parse({
      body: req.body
    }).body;

    /**
     * Normalize email
     */
    const normalizedEmail =
      email.trim().toLowerCase();

    /**
     * Check existing account
     */
    const existingUser =
      await User.findOne({
        email: normalizedEmail
      });

    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered',
        code: 'EMAIL_EXISTS'
      });
    }

    /**
     * Hash password
     */
    const passwordHash =
      await User.hashPassword(password);

    /**
     * Create user
     */
    const user = await User.create({
      email: normalizedEmail,
      passwordHash,
      name: name.trim()
    });

    /**
     * DO NOT create JWT here.
     *
     * User must login separately.
     */
    return res.status(201).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name
      }
    });
  })
);

/**
 * ==========================================
 * LOGIN
 * ==========================================
 *
 * Checks credentials and creates JWT cookie.
 */
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    /**
     * Wrap req.body because loginSchema
     * expects a "body" property.
     */
    const {
      email,
      password
    } = loginSchema.parse({
      body: req.body
    }).body;

    /**
     * Normalize email
     */
    const normalizedEmail =
      email.trim().toLowerCase();

    /**
     * Find user
     */
    const user =
      await User.findOne({
        email: normalizedEmail
      });

    /**
     * User not found
     */
    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    /**
     * Verify password
     */
    const isValid =
      await user.comparePassword(password);

    /**
     * Wrong password
     */
    if (!isValid) {
      return res.status(401).json({
        error: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    /**
     * Create JWT
     */
    const token = jwt.sign(
      {
        userId: user._id.toString()
      },

      process.env.JWT_SECRET ||
        'dev-secret-change-in-production',

      {
        expiresIn: '7d'
      }
    );

    /**
     * Store JWT in HTTP-only cookie
     */
    setTokenCookie(
      res,
      token
    );

    /**
     * Login successful
     */
    return res.status(200).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name
      }
    });
  })
);

/**
 * ==========================================
 * LOGOUT
 * ==========================================
 */
router.post(
  '/logout',
  (req, res) => {
    clearTokenCookie(res);

    return res.status(200).json({
      message: 'Logged out successfully'
    });
  }
);

/**
 * ==========================================
 * CURRENT USER
 * ==========================================
 *
 * Requires a valid JWT cookie.
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(
    async (
      req: AuthRequest,
      res
    ) => {
      if (!req.user) {
        return res.status(401).json({
          error: 'Not authenticated',
          code: 'NOT_AUTHENTICATED'
        });
      }

      return res.status(200).json({
        user: {
          id: req.user._id.toString(),
          email: req.user.email,
          name: req.user.name
        }
      });
    }
  )
);

export default router;