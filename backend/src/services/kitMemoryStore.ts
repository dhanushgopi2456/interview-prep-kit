export interface MemoryKit {
  _id: string;
  userId: string;
  source: {
    company: string;
    companyUrl: string;
    role: string;
    location: string;
    jdChars: number;
    researchedAt: string;
    pagesUsed: string[];
  };
  companyBrief: {
    summary: string;
    whatTheyDo: string;
    sources: string[];
  };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: Array<{
      id: string;
      text: string;
      kind: 'technical' | 'behavioural' | 'domain';
      priority: 'must' | 'nice';
    }>;
  };
  questions: Array<{
    id: string;
    requirementIds: string[];
    category: 'technical' | 'behavioural' | 'system-design' | 'company-fit';
    prompt: string;
    answerOutline: string;
    difficulty: 1 | 2 | 3;
    status?: string;
  }>;
  flashcards: Array<{
    id: string;
    front: string;
    back: string;
    requirementIds: string[];
    status?: string;
  }>;
  schedule: {
    daysAvailable: number;
    days: Array<{
      day: number;
      focus: string;
      questionIds: string[];
      minutes: number;
    }>;
  };
  coverage: {
    uncoveredRequirementIds: string[];
    passes: number;
  };
  status: 'draft' | 'generating' | 'completed' | 'failed';
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export const kitsMemoryStore = new Map<string, MemoryKit>();

const sampleAccentureRequirements: MemoryKit['role']['requirements'] = [
  { id: 'r1', text: 'Proficiency in Full Stack Architecture, TypeScript, Node.js and modern web frameworks', kind: 'technical', priority: 'must' },
  { id: 'r2', text: 'Experience developing microservices, RESTful APIs, and event-driven distributed systems', kind: 'technical', priority: 'must' },
  { id: 'r3', text: 'Hands-on database optimization, SQL/NoSQL data modeling, and caching mechanisms (Redis)', kind: 'technical', priority: 'must' },
  { id: 'r4', text: 'Cloud infrastructure deployment and containerization using Docker, Kubernetes, and CI/CD pipelines', kind: 'technical', priority: 'nice' },
  { id: 'r5', text: 'Experience with client consulting, agile methodologies, and enterprise delivery standards', kind: 'domain', priority: 'nice' },
  { id: 'r6', text: 'Effective collaboration across global distributed teams and clear stakeholder communication', kind: 'behavioural', priority: 'must' }
];

const sampleAccentureQuestions: MemoryKit['questions'] = [
  {
    id: 'q1',
    requirementIds: ['r1', 'r2'],
    category: 'technical',
    prompt: 'How would you architect a scalable microservices backend in Node.js/TypeScript that handles millions of client events per day with resilience against partial network partitions?',
    answerOutline: 'Discuss asynchronous messaging via message brokers (Kafka/RabbitMQ), circuit breaker patterns, health checks, rate limiting, and centralized logging/observability using OpenTelemetry.',
    difficulty: 3,
    status: 'generated'
  },
  {
    id: 'q2',
    requirementIds: ['r2'],
    category: 'system-design',
    prompt: 'Design an enterprise-grade order execution service with strict idempotency and real-time status notifications for global enterprise clients.',
    answerOutline: 'Detail idempotency keys with atomic DB operations, transaction outbox pattern, WebSocket/SSE push notifications, and disaster recovery replication.',
    difficulty: 3,
    status: 'generated'
  },
  {
    id: 'q3',
    requirementIds: ['r3'],
    category: 'technical',
    prompt: 'Explain how you diagnose and eliminate database connection pool exhaustion in high-throughput enterprise applications.',
    answerOutline: 'Cover connection pooling parameters (max connections, idle timeouts), query latency profiling, index optimization, read replicas, and caching read-heavy queries in Redis.',
    difficulty: 2,
    status: 'generated'
  },
  {
    id: 'q4',
    requirementIds: ['r6'],
    category: 'behavioural',
    prompt: 'Describe a situation where a client or senior stakeholder pushed for an unrealistic delivery deadline on a critical project. How did you manage expectations and deliver value?',
    answerOutline: 'STAR method: Explain the scope pressure, how you broke down milestones into a high-value MVP, transparently communicated trade-offs, and successfully hit the key release window.',
    difficulty: 1,
    status: 'generated'
  },
  {
    id: 'q5',
    requirementIds: ['r4', 'r5'],
    category: 'technical',
    prompt: 'How do you design automated canary deployments and zero-downtime database migrations in an enterprise Kubernetes environment?',
    answerOutline: 'Detail backward-compatible schema changes (expand/contract pattern), Kubernetes rolling updates, readiness probes, traffic splitting via service mesh, and automated rollback triggers.',
    difficulty: 2,
    status: 'generated'
  }
];

const sampleAccentureFlashcards: MemoryKit['flashcards'] = [
  {
    id: 'f1',
    front: 'What is the Circuit Breaker pattern in microservices?',
    back: 'A design pattern that monitors remote calls. If failure rates cross a threshold, the circuit trips (Open state) to instantly fail without hammering the downstream service, before entering Half-Open state to test recovery.',
    requirementIds: ['r2'],
    status: 'generated'
  },
  {
    id: 'f2',
    front: 'What is the Transactional Outbox Pattern?',
    back: 'Writing events to a database table within the same ACID transaction as the business entity changes, then publishing them to the message broker via an asynchronous poller or change-data-capture (CDC).',
    requirementIds: ['r2'],
    status: 'generated'
  },
  {
    id: 'f3',
    front: 'How does Redis handle Cache Invalidation strategies (Cache-Aside vs Write-Through)?',
    back: 'Cache-Aside: The application checks cache first, queries DB on miss, then populates cache. Write-Through: The application writes to cache, which synchronously updates the database.',
    requirementIds: ['r3'],
    status: 'generated'
  },
  {
    id: 'f4',
    front: 'What are the core stages of the STAR behavioural framework?',
    back: 'Situation (context/background) -> Task (your specific challenge/responsibility) -> Action (precise steps you engineered) -> Result (quantifiable impact and outcome).',
    requirementIds: ['r6'],
    status: 'generated'
  }
];

const sampleAccentureSchedule: MemoryKit['schedule']['days'] = [
  { day: 1, focus: 'Enterprise Architecture & Microservices Fundamentals', questionIds: ['q1'], minutes: 75 },
  { day: 2, focus: 'Distributed System Design & Idempotent APIs', questionIds: ['q2'], minutes: 90 },
  { day: 3, focus: 'Database Optimization & Connection Pooling', questionIds: ['q3'], minutes: 70 },
  { day: 4, focus: 'Kubernetes, Cloud Deployments & CI/CD', questionIds: ['q5'], minutes: 80 },
  { day: 5, focus: 'Client Delivery, Stakeholder Management & STAR Stories', questionIds: ['q4'], minutes: 60 }
];

// Initialize sample kit
const initialDemoKit: MemoryKit = {
  _id: 'kit_demo_accenture_1',
  userId: '507f1f77bcf86cd799439011',
  source: {
    company: 'Accenture',
    companyUrl: 'https://www.accenture.com',
    role: 'Full Stack Engineer',
    location: 'Bangalore, India',
    jdChars: 1250,
    researchedAt: new Date().toISOString(),
    pagesUsed: ['https://www.accenture.com/careers', 'https://www.accenture.com/technology']
  },
  companyBrief: {
    summary: 'Accenture is a global professional services company leading in digital, cloud and security, partnering with 9,000+ clients across 120 countries.',
    whatTheyDo: 'Accenture delivers enterprise transformation, custom software engineering, cloud migration, and data platforms at massive global scale.',
    sources: ['https://www.accenture.com']
  },
  role: {
    title: 'Full Stack Engineer',
    seniority: 'Mid-Senior',
    responsibilities: [
      'Design, develop, and maintain high-concurrency microservices and client-facing web applications',
      'Optimize database schema and caching layers to guarantee low latency and high availability',
      'Collaborate with global clients, architects, and product managers across agile sprints'
    ],
    requirements: sampleAccentureRequirements
  },
  questions: sampleAccentureQuestions,
  flashcards: sampleAccentureFlashcards,
  schedule: {
    daysAvailable: 5,
    days: sampleAccentureSchedule
  },
  coverage: {
    uncoveredRequirementIds: [],
    passes: 1
  },
  status: 'completed',
  createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
  updatedAt: new Date().toISOString()
};

kitsMemoryStore.set(initialDemoKit._id, initialDemoKit);

export function createMemoryKit(data: any): MemoryKit {
  const kitId = data._id || `kit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const company = data.source?.company || 'Company';
  const roleTitle = data.source?.role || data.role?.title || 'Engineer';
  const days = data.schedule?.daysAvailable || 5;

  const kit: MemoryKit = {
    _id: kitId,
    userId: data.userId ? String(data.userId) : '507f1f77bcf86cd799439011',
    source: {
      company,
      companyUrl: data.source?.companyUrl || '',
      role: roleTitle,
      location: data.source?.location || 'Not specified',
      jdChars: data.source?.jdChars || 500,
      researchedAt: new Date().toISOString(),
      pagesUsed: data.source?.pagesUsed || []
    },
    companyBrief: data.companyBrief || {
      summary: `Comprehensive interview preparation kit for ${company} covering technical architecture, system design, and behavioural competencies.`,
      whatTheyDo: `${company} is a leading organization specializing in technology-driven customer and enterprise solutions.`,
      sources: [data.source?.companyUrl || '']
    },
    role: data.role?.requirements && data.role.requirements.length > 0
      ? data.role
      : {
          title: roleTitle,
          seniority: 'Mid-Senior',
          responsibilities: [
            `Deliver robust, production-grade applications for ${company}`,
            'Participate in architecture reviews, code quality initiatives, and system design'
          ],
          requirements: sampleAccentureRequirements
        },
    questions: data.questions && data.questions.length > 0 ? data.questions : sampleAccentureQuestions,
    flashcards: data.flashcards && data.flashcards.length > 0 ? data.flashcards : sampleAccentureFlashcards,
    schedule: data.schedule?.days && data.schedule.days.length > 0
      ? data.schedule
      : {
          daysAvailable: days,
          days: Array.from({ length: days }, (_, idx) => ({
            day: idx + 1,
            focus: idx === 0
              ? 'Core Architecture & Fundamentals'
              : idx === 1
              ? 'Distributed Systems & Microservices'
              : idx === 2
              ? 'Database Optimization & Edge Cases'
              : idx === 3
              ? 'Behavioural STAR Scenarios & Team Leadership'
              : idx === days - 1
              ? 'Mock Interview & Flashcard Mastery'
              : `Day ${idx + 1} Technical & Practical Review`,
            questionIds: sampleAccentureQuestions[idx % sampleAccentureQuestions.length]
              ? [sampleAccentureQuestions[idx % sampleAccentureQuestions.length].id]
              : ['q1'],
            minutes: 60 + ((idx % 3) + 1) * 10
          }))
        },
    coverage: data.coverage || {
      uncoveredRequirementIds: [],
      passes: 1
    },
    status: data.status || 'completed',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  kitsMemoryStore.set(kitId, kit);
  return kit;
}

export function getMemoryKits(userId: string): MemoryKit[] {
  const uid = String(userId);
  const isDemo = uid === '507f1f77bcf86cd799439011' || uid.includes('demo');
  const kits = Array.from(kitsMemoryStore.values()).filter(k => {
    return k.userId === uid || (isDemo && (k.userId === '507f1f77bcf86cd799439011' || k.userId.includes('demo')));
  });
  return kits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getMemoryKitById(id: string, _userId?: string): MemoryKit | undefined {
  return kitsMemoryStore.get(id);
}

export function updateMemoryKit(id: string, updates: any, _userId?: string): MemoryKit | undefined {
  const kit = kitsMemoryStore.get(id);
  if (!kit) return undefined;
  const updated = {
    ...kit,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  kitsMemoryStore.set(id, updated);
  return updated;
}

export function deleteMemoryKit(id: string, _userId?: string): boolean {
  return kitsMemoryStore.delete(id);
}
