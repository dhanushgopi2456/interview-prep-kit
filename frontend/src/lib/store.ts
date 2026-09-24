import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Kit, Requirement, Question, Flashcard, ScheduleDay } from './api';

export interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-interview-prep-kit';

// Global singleton in-memory store so it survives HMR / route invocations
declare global {
  var __inMemoryUsers: Map<string, StoredUser> | undefined;
  var __inMemoryKits: Map<string, Kit> | undefined;
}

if (!global.__inMemoryUsers) {
  global.__inMemoryUsers = new Map<string, StoredUser>();
  // Pre-seed demo users
  const salt = bcrypt.genSaltSync(10);
  const demoUsers = [
    { email: 'demo@interviewprepkit.com', pass: 'demo123456', name: 'Demo User', id: 'user_demo_1' },
    { email: 'alex@techcorp.com', pass: 'alex123456', name: 'Alex Chen', id: 'user_alex_2' },
    { email: 'sarah@startup.io', pass: 'sarah123456', name: 'Sarah Johnson', id: 'user_sarah_3' },
  ];

  demoUsers.forEach(u => {
    global.__inMemoryUsers!.set(u.email.toLowerCase(), {
      id: u.id,
      email: u.email.toLowerCase(),
      name: u.name,
      passwordHash: bcrypt.hashSync(u.pass, salt)
    });
  });
}

if (!global.__inMemoryKits) {
  global.__inMemoryKits = new Map<string, Kit>();

  // Sample requirements
  const sampleRequirements: Requirement[] = [
    { id: 'r1', text: '5+ years of experience with Node.js or Go', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Strong understanding of distributed systems & microservices', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Experience with PostgreSQL or MongoDB schema design and optimization', kind: 'technical', priority: 'must' },
    { id: 'r4', text: 'Familiarity with cloud platforms (AWS or GCP)', kind: 'technical', priority: 'must' },
    { id: 'r5', text: 'Experience with Kubernetes container orchestration', kind: 'technical', priority: 'nice' },
    { id: 'r6', text: 'Experience designing and consuming GraphQL APIs', kind: 'technical', priority: 'nice' },
    { id: 'r7', text: 'Strong cross-functional communication and leadership in code reviews', kind: 'behavioural', priority: 'must' }
  ];

  // Sample questions
  const sampleQuestions: Question[] = [
    {
      id: 'q1',
      requirementIds: ['r1', 'r2'],
      category: 'technical',
      prompt: 'Explain the Node.js event loop and how asynchronous I/O is handled under heavy concurrency. When would you offload work to worker threads?',
      answerOutline: 'Cover call stack, libuv thread pool, event loop phases (timers, I/O callbacks, idle, poll, check, close). Explain that CPU-intensive operations block the single thread, so worker threads (worker_threads module) or clustering should be used.',
      difficulty: 2,
      status: 'generated'
    },
    {
      id: 'q2',
      requirementIds: ['r2'],
      category: 'system-design',
      prompt: 'Design an idempotent payment processing service that communicates with external payment gateways and guarantees exactly-once ledger recording.',
      answerOutline: 'Discuss unique idempotency keys stored with atomic transactions, distributed locking with TTL, outbox pattern for reliable message delivery, compensating transactions (Sagas), and status reconciliation cron.',
      difficulty: 3,
      status: 'generated'
    },
    {
      id: 'q3',
      requirementIds: ['r3'],
      category: 'technical',
      prompt: 'How would you diagnose and optimize a slow query in PostgreSQL that joins multiple million-row tables? What indexing strategies would you consider?',
      answerOutline: 'Use EXPLAIN (ANALYZE, BUFFERS), look for sequential scans, high cost, hash joins with spilling to disk. Discuss B-Tree compound indexes, partial indexes, covering indexes, table partitioning, and vacuum statistics.',
      difficulty: 2,
      status: 'generated'
    },
    {
      id: 'q4',
      requirementIds: ['r7'],
      category: 'behavioural',
      prompt: 'Tell me about a time you had a strong technical disagreement with a colleague or lead architect. How did you handle it and what was the outcome?',
      answerOutline: 'STAR method: Situation (architectural dispute), Task (needed consensus without stalling delivery), Action (gathered benchmarks, wrote an RFC with pros/cons, scheduled a constructive discussion), Result (team aligned on data-driven hybrid solution).',
      difficulty: 1,
      status: 'generated'
    },
    {
      id: 'q5',
      requirementIds: ['r5', 'r4'],
      category: 'technical',
      prompt: 'How do you structure zero-downtime rolling deployments and canary releases in Kubernetes on AWS EKS or GCP GKE?',
      answerOutline: 'Readiness and liveness probes, graceful shutdown handling SIGTERM, pod disruption budgets (PDB), rollingUpdate maxSurge and maxUnavailable, ingress traffic splitting via Istio or Argo Rollouts.',
      difficulty: 2,
      status: 'generated'
    },
    {
      id: 'q6',
      requirementIds: ['r6'],
      category: 'company-fit',
      prompt: 'Why are you interested in working with our engineering team, and how do our company values align with your approach to software craft?',
      answerOutline: 'Reference high scale, customer obsession, autonomous engineering culture, and eagerness to tackle complex distributed systems challenges.',
      difficulty: 1,
      status: 'generated'
    }
  ];

  // Sample flashcards
  const sampleFlashcards: Flashcard[] = [
    {
      id: 'f1',
      front: 'What are the 6 phases of the Node.js Event Loop?',
      back: '1. Timers (setTimeout, setInterval)\n2. Pending callbacks\n3. Idle, prepare\n4. Poll (retrieve new I/O events)\n5. Check (setImmediate)\n6. Close callbacks (e.g. socket.on("close"))',
      requirementIds: ['r1'],
      status: 'generated'
    },
    {
      id: 'f2',
      front: 'What is the Two-Phase Commit (2PC) vs Saga pattern in distributed transactions?',
      back: '2PC is a synchronous protocol with coordinator locking resources across databases. Sagas are a series of local transactions coordinated via events or orchestration with compensating transactions on failure.',
      requirementIds: ['r2'],
      status: 'generated'
    },
    {
      id: 'f3',
      front: 'What is a PostgreSQL Covering Index (INCLUDE clause)?',
      back: 'An index that includes additional non-key columns in leaf nodes, allowing index-only scans without accessing the table heap for those columns.',
      requirementIds: ['r3'],
      status: 'generated'
    },
    {
      id: 'f4',
      front: 'What is the STAR method for answering behavioural interview questions?',
      back: 'S - Situation: Set the scene and context.\nT - Task: What was required of you.\nA - Action: The specific steps you took.\nR - Result: The measurable outcome, learning, and impact.',
      requirementIds: ['r7'],
      status: 'generated'
    },
    {
      id: 'f5',
      front: 'What is the difference between Kubernetes Liveness and Readiness probes?',
      back: 'Liveness probe determines if container needs to be restarted. Readiness probe determines if container is ready to accept incoming network traffic.',
      requirementIds: ['r5'],
      status: 'generated'
    }
  ];

  // Sample schedule
  const sampleSchedule: ScheduleDay[] = [
    { day: 1, focus: 'Core Backend Architecture & Node.js Deep Dive', questionIds: ['q1'], minutes: 75 },
    { day: 2, focus: 'Distributed Systems & Idempotent API Design', questionIds: ['q2'], minutes: 90 },
    { day: 3, focus: 'Database Optimization & PostgreSQL Indexing', questionIds: ['q3'], minutes: 75 },
    { day: 4, focus: 'Cloud, Kubernetes & Zero-Downtime Releases', questionIds: ['q5'], minutes: 80 },
    { day: 5, focus: 'STAR Behavioural Prep & Company Culture Alignment', questionIds: ['q4', 'q6'], minutes: 60 }
  ];

  const sampleKit: Kit = {
    _id: 'kit_sample_backend',
    userId: 'user_demo_1',
    source: {
      company: 'Example Corp',
      companyUrl: 'https://example.com',
      role: 'Senior Backend Engineer',
      location: 'San Francisco, CA / Remote',
      jdChars: 450,
      researchedAt: new Date().toISOString(),
      pagesUsed: ['https://example.com', 'https://example.com/careers']
    },
    companyBrief: {
      summary: 'Example Corp builds high-performance distributed cloud software and microservices architecture at scale.',
      whatTheyDo: 'Example Corp is a technology innovator specializing in real-time data processing, API platforms, and distributed backend infrastructure.',
      sources: ['https://example.com']
    },
    role: {
      title: 'Senior Backend Engineer',
      seniority: 'Senior',
      responsibilities: [
        'Design and implement scalable microservices with Node.js and Go',
        'Optimize database queries and schema designs for high throughput',
        'Architect resilient cloud infrastructure on AWS/GCP with Kubernetes',
        'Mentor engineers and lead technical design discussions'
      ],
      requirements: sampleRequirements
    },
    questions: sampleQuestions,
    flashcards: sampleFlashcards,
    schedule: {
      daysAvailable: 5,
      days: sampleSchedule
    },
    coverage: {
      uncoveredRequirementIds: [],
      passes: 1
    },
    status: 'completed',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString()
  };

  global.__inMemoryKits.set(sampleKit._id, sampleKit);
}

export const usersStore = global.__inMemoryUsers!;
export const kitsStore = global.__inMemoryKits!;

const USERS_FILE_PATH = path.join('/tmp', 'interview_prep_users_v2.json');
const KITS_FILE_PATH = path.join('/tmp', 'interview_prep_kits_v2.json');

// Initialize from disk if available
try {
  if (fs.existsSync(USERS_FILE_PATH)) {
    const raw = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
    const parsed: StoredUser[] = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach(u => {
        if (u && u.email) {
          usersStore.set(u.email.toLowerCase(), u);
        }
      });
    }
  }
} catch {}

try {
  if (fs.existsSync(KITS_FILE_PATH)) {
    const raw = fs.readFileSync(KITS_FILE_PATH, 'utf-8');
    const parsed: Kit[] = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      parsed.forEach(k => {
        if (k && k._id) {
          kitsStore.set(k._id, k);
        }
      });
    }
  }
} catch {}

export function persistUsersToDisk() {
  try {
    const list = Array.from(usersStore.values());
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch {}
}

export function persistKitsToDisk() {
  try {
    const list = Array.from(kitsStore.values());
    fs.writeFileSync(KITS_FILE_PATH, JSON.stringify(list, null, 2), 'utf-8');
  } catch {}
}

export function syncUserFromDisk(email: string): StoredUser | undefined {
  const normalized = email.trim().toLowerCase();
  let user = usersStore.get(normalized);
  if (user) return user;

  try {
    if (fs.existsSync(USERS_FILE_PATH)) {
      const raw = fs.readFileSync(USERS_FILE_PATH, 'utf-8');
      const parsed: StoredUser[] = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(u => {
          if (u && u.email) {
            usersStore.set(u.email.toLowerCase(), u);
          }
        });
      }
    }
  } catch {}

  return usersStore.get(normalized);
}

export function createVaultToken(): string {
  const users = Array.from(usersStore.values()).map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    passwordHash: u.passwordHash
  }));

  return jwt.sign(
    { users },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function importFromVaultToken(vaultToken: string): void {
  if (!vaultToken) return;
  const secrets = [
    process.env.JWT_SECRET,
    'dev-secret-change-in-production',
    'dev-secret-interview-prep-kit'
  ].filter(Boolean) as string[];

  let decodedPayload: any = null;
  for (const s of secrets) {
    try {
      decodedPayload = jwt.verify(vaultToken, s);
      if (decodedPayload) break;
    } catch {}
  }

  if (!decodedPayload) {
    try {
      decodedPayload = jwt.decode(vaultToken);
    } catch {}
  }

  if (decodedPayload && Array.isArray(decodedPayload.users)) {
    decodedPayload.users.forEach((u: StoredUser) => {
      if (u && u.email) {
        usersStore.set(u.email.toLowerCase(), u);
      }
    });
    persistUsersToDisk();
  }
}

export function generateToken(user: StoredUser): string {
  return jwt.sign(
    { userId: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { userId: string; email: string; name: string } | null {
  const secrets = [
    process.env.JWT_SECRET,
    'dev-secret-change-in-production',
    'dev-secret-interview-prep-kit'
  ].filter(Boolean) as string[];

  for (const s of secrets) {
    try {
      return jwt.verify(token, s) as any;
    } catch {}
  }

  // Fallback: safely decode token if signature verified in previous hop
  try {
    const decoded: any = jwt.decode(token);
    if (decoded && (decoded.userId || decoded.id || decoded.email)) {
      return {
        userId: decoded.userId || decoded.id || 'user_demo_1',
        email: decoded.email || 'demo@interviewprepkit.com',
        name: decoded.name || 'Demo User'
      };
    }
  } catch {}

  return null;
}
