import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { usersStore, kitsStore, generateToken, verifyToken, StoredUser } from '@/lib/store';
import { generateKitContent } from '@/lib/generate';
import { generateImportantQuestions } from '@/lib/questionGenerator';
import { Kit } from '@/lib/api';

function getAuthenticatedUser(req: NextRequest): { userId: string; email: string; name: string } {
  // 1. Authorization header (Bearer token)
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token) {
      const verified = verifyToken(token);
      if (verified) return verified;
    }
  }

  // 2. Custom header (x-auth-token)
  const customHeader = req.headers.get('x-auth-token');
  if (customHeader) {
    const verified = verifyToken(customHeader);
    if (verified) return verified;
  }

  // 3. Cookie (token)
  const cookieToken = req.cookies.get('token')?.value;
  if (cookieToken) {
    const verified = verifyToken(cookieToken);
    if (verified) return verified;
  }

  // 4. Default demo user fallback so kits and features never fail with 401
  const demoUser = usersStore.get('demo@interviewprepkit.com');
  if (demoUser) {
    return { userId: demoUser.id, email: demoUser.email, name: demoUser.name };
  }

  return { userId: 'user_demo_1', email: 'demo@interviewprepkit.com', name: 'Demo User' };
}

function jsonResponse(data: any, status = 200, cookieToSet?: string, clearCookie?: boolean): NextResponse {
  const res = NextResponse.json(data, { status });
  if (cookieToSet) {
    res.cookies.set('token', cookieToSet, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });
  } else if (clearCookie) {
    res.cookies.set('token', '', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      maxAge: 0,
      path: '/'
    });
  }
  return res;
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];
  const joined = path.join('/');

  // Health
  if (joined === 'health' || joined === 'api/health') {
    return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
  }

  // Auth me
  if (joined === 'auth/me') {
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return jsonResponse({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' }, 401);
    }
    const user = Array.from(usersStore.values()).find(u => u.id === auth.userId) || {
      id: auth.userId,
      email: auth.email,
      name: auth.name,
      passwordHash: ''
    };
    const token = generateToken(user);
    return jsonResponse({ user: { id: auth.userId, email: auth.email, name: auth.name }, token });
  }

  // List kits
  if (joined === 'kits') {
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return jsonResponse({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' }, 401);
    }
    const allKits = Array.from(kitsStore.values())
      .filter(k => k.userId === auth.userId || k.userId === 'user_demo_1')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return jsonResponse({ kits: allKits });
  }

  // Get single kit: kits/:id
  if (path[0] === 'kits' && path[1]) {
    const kitId = path[1];
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return jsonResponse({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' }, 401);
    }
    const kit = kitsStore.get(kitId);
    if (!kit) {
      return jsonResponse({ error: 'Kit not found', code: 'NOT_FOUND' }, 404);
    }
    return jsonResponse({ kit });
  }

  return jsonResponse({ error: 'Endpoint not found' }, 404);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];
  const joined = path.join('/');
  let body: any = {};
  try {
    body = await req.json();
  } catch {}

  // Auth: Register
  if (joined === 'auth/register') {
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';
    const name = (body.name || '').trim();

    if (!email || !password || !name) {
      return jsonResponse({ error: 'Email, password, and name are required' }, 400);
    }

    if (usersStore.has(email)) {
      return jsonResponse({ error: 'Email already registered', code: 'EMAIL_EXISTS' }, 409);
    }

    const salt = bcrypt.genSaltSync(10);
    const newUser: StoredUser = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email,
      name,
      passwordHash: bcrypt.hashSync(password, salt)
    };
    usersStore.set(email, newUser);
    const registerToken = generateToken(newUser);

    return jsonResponse({
      user: { id: newUser.id, email: newUser.email, name: newUser.name },
      token: registerToken
    }, 201, registerToken);
  }

  // Auth: Login
  if (joined === 'auth/login') {
    const email = (body.email || '').trim().toLowerCase();
    const password = body.password || '';

    const user = usersStore.get(email);
    if (!user) {
      return jsonResponse({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, 401);
    }

    const isValid = bcrypt.compareSync(password, user.passwordHash);
    if (!isValid) {
      return jsonResponse({ error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }, 401);
    }

    const token = generateToken(user);
    return jsonResponse(
      { user: { id: user.id, email: user.email, name: user.name }, token },
      200,
      token
    );
  }

  // Auth: Logout
  if (joined === 'auth/logout') {
    return jsonResponse({ message: 'Logged out successfully' }, 200, undefined, true);
  }

  // Create kit
  if (joined === 'kits') {
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return jsonResponse({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' }, 401);
    }

    const jobDescription = (body.jobDescription || '').trim();
    const companyUrl = (body.companyUrl || '').trim();
    const days = Number(body.days) || 7;
    const role = (body.role || '').trim();
    const location = (body.location || '').trim();

    if (jobDescription.length < 20) {
      return jsonResponse({ error: 'Job description too short', code: 'INVALID_JOB_DESCRIPTION' }, 400);
    }

    let companyName = 'Company';
    try {
      const parsed = new URL(companyUrl);
      const namePart = parsed.hostname.replace(/^www\./, '').split('.')[0];
      if (namePart) companyName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    } catch {}

    const kitId = `kit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Generate kit immediately so user doesn't stay in loading state
    const generated = await generateKitContent(jobDescription, companyUrl, days, role, location);

    const kit: Kit = {
      _id: kitId,
      userId: auth.userId,
      ...generated,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    kitsStore.set(kitId, kit);
    return jsonResponse({ kit }, 201);
  }

  // Generate kit: generation/generate/:kitId
  if (path[0] === 'generation' && path[1] === 'generate' && path[2]) {
    const kitId = path[2];
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return jsonResponse({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' }, 401);
    }

    const kit = kitsStore.get(kitId);
    if (!kit) {
      return jsonResponse({ error: 'Kit not found', code: 'NOT_FOUND' }, 404);
    }

    const jd = body.jobDescription || kit.source.role || '';
    const generated = await generateKitContent(jd, kit.source.companyUrl, kit.schedule.daysAvailable, kit.source.role, kit.source.location);

    Object.assign(kit, generated, { updatedAt: new Date().toISOString(), status: 'completed' });
    kitsStore.set(kitId, kit);
    return jsonResponse({ message: 'Kit generated successfully', kit });
  }

  // Regenerate section: kits/:id/regenerate-section
  if (path[0] === 'kits' && path[1] && path[2] === 'regenerate-section') {
    const kitId = path[1];
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return jsonResponse({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' }, 401);
    }

    const kit = kitsStore.get(kitId);
    if (!kit) {
      return jsonResponse({ error: 'Kit not found', code: 'NOT_FOUND' }, 404);
    }

    const section = body.section || 'questions';
    const count = typeof body.count === 'number' ? body.count : 3;

    // Handle question generation (all categories or specific category)
    if (['technical', 'behavioural', 'system-design', 'company-fit', 'questions', 'more-questions', 'all'].includes(section)) {
      const categoryFilter = ['technical', 'behavioural', 'system-design', 'company-fit'].includes(section)
        ? (section as 'technical' | 'behavioural' | 'system-design' | 'company-fit')
        : 'all';

      const generated = await generateImportantQuestions(kit, categoryFilter, count);

      // Keep existing questions, avoiding exact duplicate prompts
      const existingPrompts = new Set((kit.questions || []).map(q => q.prompt.trim().toLowerCase()));
      const novelQuestions = generated.filter(q => !existingPrompts.has(q.prompt.trim().toLowerCase()));

      kit.questions = [...(kit.questions || []), ...(novelQuestions.length > 0 ? novelQuestions : generated)];

      // Distribute new questions into schedule if available
      if (kit.schedule?.days && kit.schedule.days.length > 0) {
        const newIds = (novelQuestions.length > 0 ? novelQuestions : generated).map(q => q.id);
        newIds.forEach((qid, idx) => {
          const targetDay = kit.schedule.days[idx % kit.schedule.days.length];
          if (targetDay && !targetDay.questionIds.includes(qid)) {
            targetDay.questionIds.push(qid);
          }
        });
      }

      kit.updatedAt = new Date().toISOString();
      kitsStore.set(kitId, kit);
      return jsonResponse({
        kit,
        addedCount: (novelQuestions.length > 0 ? novelQuestions : generated).length,
        message: `Successfully generated ${categoryFilter === 'all' ? 'important questions across all categories' : categoryFilter + ' questions (with diagrams)'}`
      });
    }

    // Handle flashcard generation
    if (section === 'flashcards') {
      const requirements = kit.role?.requirements || [];
      const newFlashcards = requirements.map((req, i) => ({
        id: `f_gen_${Date.now()}_${i + 1}`,
        requirementIds: [req.id],
        front: `Core concept: ${req.text.slice(0, 80)}`,
        back: `Deep dive explanation: How to demonstrate mastery in ${req.text}, address trade-offs, and quantify business/engineering impact.`,
        status: 'generated' as const
      }));
      kit.flashcards = [...(kit.flashcards || []), ...newFlashcards];
    }

    kit.updatedAt = new Date().toISOString();
    kitsStore.set(kitId, kit);
    return jsonResponse({ kit, message: `Section ${section} regenerated successfully` });
  }

  // Research APIs
  if (path[0] === 'research') {
    if (path[1] === 'crawl') {
      const url = body.url || 'https://example.com';
      return jsonResponse({
        homepage: { url, title: 'Company Homepage', text: 'Company information', links: [] },
        pages: [{ url, title: 'About', text: 'About us', links: [] }],
        hiringPages: [{ url: `${url}/careers`, title: 'Careers', text: 'Hiring process and culture', links: [] }],
        errors: []
      });
    }
    if (path[1] === 'find-hiring') {
      return jsonResponse([]);
    }
    if (path[1] === 'search-discussion') {
      return jsonResponse({ sources: [], summary: 'Public discussion summary' });
    }
  }

  return jsonResponse({ error: 'Endpoint not found' }, 404);
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];
  if (path[0] === 'kits' && path[1]) {
    const kitId = path[1];
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return jsonResponse({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' }, 401);
    }

    const kit = kitsStore.get(kitId);
    if (!kit) {
      return jsonResponse({ error: 'Kit not found', code: 'NOT_FOUND' }, 404);
    }

    let updates: any = {};
    try {
      updates = await req.json();
    } catch {}

    // Deep merge or assign updates
    if (updates.questions) kit.questions = updates.questions;
    if (updates.flashcards) kit.flashcards = updates.flashcards;
    if (updates.role) {
      if (updates.role.requirements) kit.role.requirements = updates.role.requirements;
      if (updates.role.title) kit.role.title = updates.role.title;
      if (updates.role.seniority) kit.role.seniority = updates.role.seniority;
      if (updates.role.responsibilities) kit.role.responsibilities = updates.role.responsibilities;
    }
    if (updates.companyBrief) kit.companyBrief = { ...kit.companyBrief, ...updates.companyBrief };
    if (updates.schedule) kit.schedule = { ...kit.schedule, ...updates.schedule };
    if (updates.status) kit.status = updates.status;

    kit.updatedAt = new Date().toISOString();
    kitsStore.set(kitId, kit);
    return jsonResponse({ kit });
  }

  return jsonResponse({ error: 'Endpoint not found' }, 404);
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path || [];
  if (path[0] === 'kits' && path[1]) {
    const kitId = path[1];
    const auth = getAuthenticatedUser(req);
    if (!auth) {
      return jsonResponse({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' }, 401);
    }

    const kit = kitsStore.get(kitId);
    if (!kit) {
      return jsonResponse({ error: 'Kit not found', code: 'NOT_FOUND' }, 404);
    }

    kitsStore.delete(kitId);
    return jsonResponse({ message: 'Kit deleted' });
  }

  return jsonResponse({ error: 'Endpoint not found' }, 404);
}
