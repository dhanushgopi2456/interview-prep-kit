import { IRequirement, IQuestion, IFlashcard, IScheduleDay } from '../models/Kit';

export interface GeneratedKitContent {
  companyBrief: {
    summary: string;
    whatTheyDo: string;
    sources: string[];
  };
  role: {
    title: string;
    seniority: string;
    responsibilities: string[];
    requirements: IRequirement[];
  };
  questions: IQuestion[];
  flashcards: IFlashcard[];
  schedule: {
    daysAvailable: number;
    days: IScheduleDay[];
  };
  coverage: {
    uncoveredRequirementIds: string[];
    passes: number;
  };
}

export function buildCompleteKitContent(params: {
  jobDescription: string;
  company: string;
  companyUrl: string;
  role?: string;
  location?: string;
  days: number;
}): GeneratedKitContent {
  const { jobDescription, company, companyUrl, role, days } = params;
  const daysAvailable = Math.max(1, days || 7);

  const lines = jobDescription
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  // 1. Extract requirements
  const extractedRequirements: IRequirement[] = [];
  let reqCount = 0;

  for (const line of lines) {
    const isBullet = line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || /^\d+[\.\)]/.test(line);
    const cleaned = line.replace(/^[-•*\d\.\)\s]+/, '').trim();
    const lower = line.toLowerCase();

    if (
      cleaned.length >= 15 &&
      (isBullet ||
        lower.includes('experience') ||
        lower.includes('knowledge') ||
        lower.includes('proficien') ||
        lower.includes('skill') ||
        lower.includes('require') ||
        lower.includes('ability') ||
        lower.includes('responsible'))
    ) {
      reqCount++;
      const isNice = lower.includes('nice to have') || lower.includes('plus') || lower.includes('preferred') || lower.includes('bonus');
      const isBehavioural = lower.includes('collaborat') || lower.includes('communicat') || lower.includes('lead') || lower.includes('team') || lower.includes('stakeholder');
      const isDomain = lower.includes('compliance') || lower.includes('fintech') || lower.includes('healthcare') || lower.includes('domain') || lower.includes('business');

      extractedRequirements.push({
        id: `r${reqCount}`,
        text: cleaned,
        kind: isBehavioural ? 'behavioural' : isDomain ? 'domain' : 'technical',
        priority: isNice ? 'nice' : 'must'
      });

      if (extractedRequirements.length >= 8) break;
    }
  }

  // If few requirements found, split sentences to extract discrete requirements from paragraphs
  if (extractedRequirements.length < 3) {
    const rawSentences = jobDescription
      .split(/(?<=[.!?])\s+|[;•\n]+/)
      .map(s => s.trim().replace(/^[-•*\d\.\)\s]+/, ''))
      .filter(s => s.length >= 25 && s.length <= 250);

    if (rawSentences.length >= 2) {
      if (extractedRequirements.length <= 1) {
        extractedRequirements.length = 0;
      }
      for (const sent of rawSentences) {
        if (!extractedRequirements.some(r => r.text === sent)) {
          const lower = sent.toLowerCase();
          const isNice = lower.includes('nice to have') || lower.includes('plus') || lower.includes('preferred') || lower.includes('bonus');
          const isBehavioural = lower.includes('collaborat') || lower.includes('communicat') || lower.includes('lead') || lower.includes('team') || lower.includes('culture');
          const isDomain = lower.includes('compliance') || lower.includes('fintech') || lower.includes('business') || lower.includes('domain');

          extractedRequirements.push({
            id: `r${extractedRequirements.length + 1}`,
            text: sent,
            kind: isBehavioural ? 'behavioural' : isDomain ? 'domain' : 'technical',
            priority: isNice ? 'nice' : 'must'
          });

          if (extractedRequirements.length >= 7) break;
        }
      }
    }
  }

  const roleTitle = role || (lines[0] && lines[0].length < 60 ? lines[0].replace(/^#+\s*/, '') : 'Software Development Engineer');
  const lowerRole = roleTitle.toLowerCase();
  const isTechRole = /engineer|developer|architect|devops|sre|software|fullstack|backend|frontend|data|cloud/i.test(lowerRole);
  const seniority = lowerRole.includes('senior') || lowerRole.includes('lead') || lowerRole.includes('principal')
    ? 'Senior'
    : lowerRole.includes('junior') || lowerRole.includes('intern')
    ? 'Junior'
    : 'Mid-Senior';

  // Fallback requirements if none extracted
  if (extractedRequirements.length === 0) {
    if (isTechRole) {
      extractedRequirements.push(
        { id: 'r1', text: `Proficiency in core programming languages, modern frameworks, and API engineering for ${roleTitle}`, kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'Distributed systems design, microservices architecture, and database modeling', kind: 'technical', priority: 'must' },
        { id: 'r3', text: 'Cloud infrastructure (AWS/GCP/Azure), containerization, and automated CI/CD pipelines', kind: 'technical', priority: 'must' },
        { id: 'r4', text: 'Cross-functional engineering leadership, code reviews, and architectural documentation', kind: 'behavioural', priority: 'must' },
        { id: 'r5', text: 'Performance profiling, latency optimization, and production monitoring/observability', kind: 'technical', priority: 'nice' }
      );
    } else {
      extractedRequirements.push(
        { id: 'r1', text: `Demonstrated domain mastery and operational excellence in ${roleTitle}`, kind: 'technical', priority: 'must' },
        { id: 'r2', text: 'Strategic cross-functional collaboration and senior stakeholder alignment', kind: 'behavioural', priority: 'must' },
        { id: 'r3', text: 'Data-driven decision making, metrics tracking, and process optimization', kind: 'technical', priority: 'must' },
        { id: 'r4', text: `End-to-end execution of high-impact strategic initiatives at ${company}`, kind: 'behavioural', priority: 'must' }
      );
    }
  }

  // 2. Generate Questions
  const questions: IQuestion[] = [];
  const flashcards: IFlashcard[] = [];

  extractedRequirements.forEach((req, idx) => {
    const qId = `q${idx + 1}`;
    const fId = `f${idx + 1}`;
    const isTechnical = req.kind === 'technical';

    if (isTechnical) {
      questions.push({
        id: qId,
        requirementIds: [req.id],
        category: 'technical',
        prompt: isTechRole
          ? `How would you demonstrate deep expertise in "${req.text}" in a production setting at ${company}? Walk through a concrete architecture, edge cases, and performance trade-offs.`
          : `Walk through your proven methodology for executing on "${req.text}" at ${company}. What metrics, workflows, and tools do you use to guarantee success?`,
        answerOutline: isTechRole
          ? `1. Explain fundamental principles and architecture.\n2. Discuss trade-offs, performance considerations, and edge cases.\n3. Detail failure modes, monitoring, and lessons learned in high-throughput production.`
          : `1. Define target KPIs and success metrics for this requirement.\n2. Outline step-by-step execution and stakeholder alignment process.\n3. Address risk mitigation and quantitative outcomes achieved.`,
        difficulty: (idx % 3 + 1) as 1 | 2 | 3,
        status: 'generated'
      });

      flashcards.push({
        id: fId,
        requirementIds: [req.id],
        front: `Core principles & best practices: ${req.text.slice(0, 75)}`,
        back: isTechRole
          ? `Key concepts: Separation of concerns, scalability patterns, automated testing, observability, and cloud-native resilience.`
          : `Key concepts: Stakeholder alignment, proactive risk mitigation, measurable SLAs, data-driven optimization, and cross-functional transparency.`
      });
    } else {
      questions.push({
        id: qId,
        requirementIds: [req.id],
        category: 'behavioural',
        prompt: `Describe a high-stakes situation where you had to lead or deliver on: "${req.text}". What actions did you take and what was the quantifiable impact on the organization?`,
        answerOutline: `Structure response using the STAR method:\n- Situation: Context, challenge, and constraints at hand.\n- Task: Your explicit ownership and responsibility.\n- Action: Specific collaborative techniques and technical decisions executed.\n- Result: Measurable outcome and retrospective reflection.`,
        difficulty: 2,
        status: 'generated'
      });

      flashcards.push({
        id: fId,
        requirementIds: [req.id],
        front: `STAR Response Strategy: ${req.text.slice(0, 75)}`,
        back: `S: Context & Stakeholders\nT: Goal, Deadlines & Measurable Scope\nA: Decisive actions, conflict resolution, technical rigor\nR: Quantitative delivery metrics & team trust`
      });
    }
  });

  // System Design Question with ASCII Diagram
  const sysDesignPrompt = isTechRole
    ? `Design a high-throughput, fault-tolerant distributed system capable of processing 100,000 requests/sec with sub-second latency for ${company}.`
    : `Design an enterprise workflow and analytics platform ensuring zero data loss and automated multi-team task synchronization for ${company}.`;

  const sysDesignOutline = isTechRole
    ? `1. Functional Requirements: Ingestion via REST/gRPC, deduplication, stream aggregation, query API.\n2. Non-Functional: High availability (99.99%), horizontal scaling, multi-region failover.\n3. Components: Edge CDN -> Load Balancer -> Stateless API Cluster -> Kafka Event Bus -> Stream Workers -> Redis Cache + Sharded Database.\n4. Resilience: Circuit breakers, rate limiting, and Dead-Letter Queues (DLQ).`
    : `1. Workflow definition & orchestration engine.\n2. Audit logging, role-based access control, and SLA guarantees.\n3. Asynchronous notification delivery and failure recovery.`;

  const sysDesignDiagram = `+-----------------------------------------------------------------------------------+
|                         ENTERPRISE DISTRIBUTED SYSTEM ARCHITECTURE                |
+-----------------------------------------------------------------------------------+
  [Global Clients / Mobile / Third-Party Partners]
                 |
                 v (HTTPS / TLS 1.3)
       +--------------------+
       |  CDN & WAF Layer   |  --> DDoS Protection & SSL Termination
       +--------------------+
                 |
                 v
       +--------------------+
       | Layer-7 Load Bal.  |  --> Round-Robin & Health Checked Balancing
       +--------------------+
                 |
        +--------+--------+
        |                 |
        v                 v
  +-----------+     +-----------+
  | API Node  |     | API Node  |  --> Stateless Microservices
  | Instance 1|     | Instance 2|  --> Token Authentication & Schema Validation
  +-----------+     +-----------+
        |                 |
        +--------+--------+
                 v
     =========================
     |   DISTRIBUTED BUS       |  --> Apache Kafka / PubSub Partitioned Cluster
     |  Topic: core-events-v1  |  --> Replication Factor: 3, At-Least-Once Delivery
     =========================
          /              \\
         v                v
   +------------+   +------------+
   | Stream     |   | Stream     |  --> Distributed Workers (Flink / Node / Go)
   | Worker A   |   | Worker B   |  --> Idempotent Processing with Redis Deduplication
   +------------+   +------------+
         |                 |
    +----+----+       +----+----+
    |         |       |         |
    v         v       v         v
+--------+ +--------+  +--------+ +-------------------+
| Hot DB | | Cache  |  | Cold   | | Dead Letter Queue |
| Sharded| | Redis  |  | Storage| | (DLQ) for Failed  |
| Store  | | Cluster|  | S3/GCS | | Event Processing  |
+--------+ +--------+  +--------+ +-------------------+
    ^         ^
    |         |
+-----------------------+
| Query & Analytics API | <--- Real-Time Dashboards & Health Monitoring
+-----------------------+`;

  questions.push({
    id: `q${questions.length + 1}`,
    requirementIds: [extractedRequirements[0]?.id || 'r1'],
    category: 'system-design',
    prompt: sysDesignPrompt,
    answerOutline: sysDesignOutline,
    difficulty: 3,
    diagram: sysDesignDiagram,
    diagramType: 'architecture',
    status: 'generated'
  });

  // Company Fit Question
  questions.push({
    id: `q${questions.length + 1}`,
    requirementIds: [extractedRequirements[0]?.id || 'r1'],
    category: 'company-fit',
    prompt: `Why does ${company}'s culture, market mission, and operational standards align with your career goals? How will you make an immediate positive impact in your first 90 days?`,
    answerOutline: `1. Reference specific ${company} values, technological innovation, and market presence.\n2. Connect past experience to ${company}'s engineering challenges.\n3. 30-60-90 Day Plan: Learn systems & build relationships (30d), execute key deliverables (60d), optimize & lead initiatives (90d).`,
    difficulty: 2,
    status: 'generated'
  });

  // 3. Build Study Schedule (Day 1 through Day N)
  const scheduleDays: IScheduleDay[] = [];
  const qCount = questions.length;
  const qPerDay = Math.max(1, Math.ceil(qCount / daysAvailable));

  for (let d = 1; d <= daysAvailable; d++) {
    const startIdx = (d - 1) * qPerDay;
    const dayQuestions = questions.slice(startIdx, startIdx + qPerDay);
    const dayReq = extractedRequirements[(d - 1) % extractedRequirements.length];

    let focus = `Day ${d} Review & Core Competency Practice`;
    if (d === 1) {
      focus = `Core Architecture & Fundamentals: ${dayReq ? dayReq.text.slice(0, 50) : roleTitle}`;
    } else if (d === 2) {
      focus = 'Distributed System Design & Scalability Deep-Dive';
    } else if (d === 3) {
      focus = 'Technical Deep Dive, Edge Cases & Database Tuning';
    } else if (d === 4) {
      focus = 'Behavioural STAR Scenarios & Engineering Leadership';
    } else if (d === 5) {
      focus = `${company} Company Culture, Mission & 30-60-90 Day Plan`;
    } else if (d === daysAvailable) {
      focus = 'Final Mock Interview & Rapid Flashcard Review';
    } else {
      focus = dayReq ? `Targeted Mastery: ${dayReq.text.slice(0, 50)}` : `Day ${d} Advanced Practice`;
    }

    scheduleDays.push({
      day: d,
      focus,
      questionIds: dayQuestions.map(q => q.id),
      minutes: 60 + dayQuestions.length * 15
    });
  }

  return {
    companyBrief: {
      summary: `${company} is actively recruiting for the ${roleTitle} role. This preparation kit covers core system architecture, key requirements, and interview strategies.`,
      whatTheyDo: `${company} builds high-impact enterprise and customer-facing products, emphasizing software excellence, resilient cloud architecture, and agile delivery.`,
      sources: [companyUrl]
    },
    role: {
      title: roleTitle,
      seniority,
      responsibilities: [
        `Deliver high quality production software aligned with ${roleTitle} standards`,
        `Collaborate with cross-functional product, design, and engineering teams at ${company}`,
        'Participate in architectural reviews, code quality initiatives, and system reliability'
      ],
      requirements: extractedRequirements
    },
    questions,
    flashcards,
    schedule: {
      daysAvailable,
      days: scheduleDays
    },
    coverage: {
      uncoveredRequirementIds: [],
      passes: 1
    }
  };
}
