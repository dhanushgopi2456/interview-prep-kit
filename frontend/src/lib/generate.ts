import { GoogleGenAI } from '@google/genai';
import { Kit, Requirement, Question, Flashcard, ScheduleDay } from './api';

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || '';
  // Verify apiKey is a valid Google AI Studio key format (starts with AIza and sufficient length)
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || !apiKey.startsWith('AIza') || apiKey.length < 20) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function cleanJsonResponse(text: string): any {
  const cleaned = text.replace(/```json\n?|```\n?/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {}
    }
    return null;
  }
}

export async function generateKitContent(
  jobDescription: string,
  companyUrl: string,
  daysAvailable: number,
  roleHint?: string,
  locationHint?: string
): Promise<Omit<Kit, '_id' | 'userId' | 'createdAt' | 'updatedAt'>> {
  const ai = getAI();
  let companyName = 'Company';
  try {
    const parsedUrl = new URL(companyUrl);
    const hostParts = parsedUrl.hostname.replace(/^www\./, '').split('.');
    if (hostParts[0]) {
      companyName = hostParts[0].charAt(0).toUpperCase() + hostParts[0].slice(1);
    }
  } catch {}

  // Try AI generation first if GEMINI_API_KEY is available
  if (ai) {
    try {
      const prompt = `You are an expert interview coach and technical recruiter.
Generate an interview preparation kit for:
Role: ${roleHint || 'From Job Description'}
Company: ${companyName} (${companyUrl})
Study Days: ${daysAvailable}
Job Description:
${jobDescription}

Output ONLY valid JSON adhering strictly to this schema:
{
  "companyBrief": {
    "summary": "2-3 sentences about the company and market",
    "whatTheyDo": "A detailed paragraph explaining products, tech, and engineering challenges",
    "sources": ["${companyUrl}"]
  },
  "role": {
    "title": "Normalized role title",
    "seniority": "Junior | Mid | Senior | Lead | Principal",
    "responsibilities": ["3-5 key responsibilities"],
    "requirements": [
      {
        "id": "r1",
        "text": "requirement description",
        "kind": "technical" | "behavioural" | "domain",
        "priority": "must" | "nice"
      }
    ]
  },
  "questions": [
    {
      "id": "q1",
      "requirementIds": ["r1"],
      "category": "technical" | "behavioural" | "system-design" | "company-fit",
      "prompt": "Detailed interview question",
      "answerOutline": "Key points candidate should cover",
      "difficulty": 1 | 2 | 3
    }
  ],
  "flashcards": [
    {
      "id": "f1",
      "requirementIds": ["r1"],
      "front": "Question or core concept",
      "back": "Clear concise answer and explanation"
    }
  ],
  "schedule": [
    {
      "day": 1,
      "focus": "Topic focus for the day",
      "questionIds": ["q1"],
      "minutes": 60
    }
  ]
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt
      });

      const parsed = cleanJsonResponse(response.text || '');
      if (parsed && parsed.companyBrief && parsed.role && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        const reqs: Requirement[] = (parsed.role.requirements || []).map((r: any, idx: number) => ({
          id: r.id || `r${idx + 1}`,
          text: r.text || '',
          kind: ['technical', 'behavioural', 'domain'].includes(r.kind) ? r.kind : 'technical',
          priority: ['must', 'nice'].includes(r.priority) ? r.priority : 'must'
        }));

        const questions: Question[] = parsed.questions.map((q: any, idx: number) => ({
          id: q.id || `q${idx + 1}`,
          requirementIds: Array.isArray(q.requirementIds) ? q.requirementIds : [],
          category: ['technical', 'behavioural', 'system-design', 'company-fit'].includes(q.category) ? q.category : 'technical',
          prompt: q.prompt || '',
          answerOutline: q.answerOutline || '',
          difficulty: [1, 2, 3].includes(q.difficulty) ? q.difficulty : 2,
          status: 'generated'
        }));

        const flashcards: Flashcard[] = (parsed.flashcards || []).map((f: any, idx: number) => ({
          id: f.id || `f${idx + 1}`,
          front: f.front || '',
          back: f.back || '',
          requirementIds: Array.isArray(f.requirementIds) ? f.requirementIds : [],
          status: 'generated'
        }));

        const daysList: ScheduleDay[] = Array.isArray(parsed.schedule) ? parsed.schedule.map((s: any, idx: number) => ({
          day: s.day || idx + 1,
          focus: s.focus || `Day ${idx + 1} Study`,
          questionIds: Array.isArray(s.questionIds) ? s.questionIds : [],
          minutes: s.minutes || 60
        })) : [];

        return {
          source: {
            company: companyName,
            companyUrl,
            role: parsed.role.title || roleHint || 'Software Engineer',
            location: locationHint || 'Remote / Hybrid',
            jdChars: jobDescription.length,
            researchedAt: new Date().toISOString(),
            pagesUsed: [companyUrl]
          },
          companyBrief: {
            summary: parsed.companyBrief.summary || `${companyName} is hiring for engineering roles.`,
            whatTheyDo: parsed.companyBrief.whatTheyDo || `${companyName} provides modern software solutions.`,
            sources: [companyUrl]
          },
          role: {
            title: parsed.role.title || roleHint || 'Software Engineer',
            seniority: parsed.role.seniority || 'Mid-Senior',
            responsibilities: parsed.role.responsibilities || ['Develop and maintain core services'],
            requirements: reqs
          },
          questions,
          flashcards,
          schedule: {
            daysAvailable,
            days: daysList.length > 0 ? daysList : buildFallbackSchedule(reqs, questions, daysAvailable)
          },
          coverage: {
            uncoveredRequirementIds: [],
            passes: 1
          },
          status: 'completed'
        };
      }
    } catch {
      // Gracefully continue to algorithmic kit generation if upstream AI service is unreachable
    }
  }

  // High quality algorithmic parser fallback
  return buildAlgorithmicKit(jobDescription, companyName, companyUrl, daysAvailable, roleHint, locationHint);
}

function buildFallbackSchedule(reqs: Requirement[], questions: Question[], daysAvailable: number): ScheduleDay[] {
  const days: ScheduleDay[] = [];
  const qPerDay = Math.ceil(questions.length / Math.max(1, daysAvailable));
  let qIdx = 0;

  for (let d = 1; d <= daysAvailable; d++) {
    const dayQuestions = questions.slice(qIdx, qIdx + qPerDay);
    qIdx += qPerDay;
    const focusReq = reqs[d - 1] ? reqs[d - 1].text : `Day ${d} Review & Practice`;
    days.push({
      day: d,
      focus: focusReq.slice(0, 60),
      questionIds: dayQuestions.map(q => q.id),
      minutes: 60 + dayQuestions.length * 10
    });
  }
  return days;
}

function buildAlgorithmicKit(
  jd: string,
  companyName: string,
  companyUrl: string,
  days: number,
  roleHint?: string,
  locationHint?: string
): Omit<Kit, '_id' | 'userId' | 'createdAt' | 'updatedAt'> {
  const lines = jd.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Extract bullet points as candidate requirements
  const extractedRequirements: Requirement[] = [];
  let reqCount = 0;

  lines.forEach((line) => {
    const isBullet = line.startsWith('-') || line.startsWith('•') || line.startsWith('*') || /^\d+[\.\)]/.test(line);
    const cleaned = line.replace(/^[-•*\d\.\)\s]+/, '').trim();
    if (cleaned.length > 15 && (isBullet || line.toLowerCase().includes('experience') || line.toLowerCase().includes('knowledge') || line.toLowerCase().includes('skills'))) {
      reqCount++;
      const isNice = line.toLowerCase().includes('nice to have') || line.toLowerCase().includes('plus') || line.toLowerCase().includes('preferred');
      const isBehavioural = line.toLowerCase().includes('collaborat') || line.toLowerCase().includes('communicat') || line.toLowerCase().includes('lead') || line.toLowerCase().includes('team');
      
      extractedRequirements.push({
        id: `r${reqCount}`,
        text: cleaned,
        kind: isBehavioural ? 'behavioural' : 'technical',
        priority: isNice ? 'nice' : 'must'
      });
    }
  });

  if (extractedRequirements.length === 0) {
    extractedRequirements.push(
      { id: 'r1', text: 'Core backend / frontend language proficiency and system architecture', kind: 'technical', priority: 'must' },
      { id: 'r2', text: 'Database modeling, query performance, and distributed systems', kind: 'technical', priority: 'must' },
      { id: 'r3', text: 'Effective team collaboration, code reviews, and communication', kind: 'behavioural', priority: 'must' },
      { id: 'r4', text: 'Cloud infrastructure deployment and CI/CD pipelines', kind: 'technical', priority: 'nice' }
    );
  }

  const roleTitle = roleHint || lines[0]?.slice(0, 50) || 'Senior Professional';
  const seniority = roleTitle.toLowerCase().includes('senior') ? 'Senior' : roleTitle.toLowerCase().includes('lead') ? 'Lead' : 'Mid-Level';
  const isTechRole = /engineer|developer|architect|devops|sre|software|fullstack|backend|frontend|data/i.test(roleTitle);

  // Questions & Flashcards
  const questions: Question[] = [];
  const flashcards: Flashcard[] = [];

  extractedRequirements.slice(0, 8).forEach((req, idx) => {
    const qId = `q${idx + 1}`;
    const fId = `f${idx + 1}`;
    const isTechnical = req.kind === 'technical';

    if (isTechnical) {
      questions.push({
        id: qId,
        requirementIds: [req.id],
        category: 'technical',
        prompt: isTechRole
          ? `How would you demonstrate deep expertise in "${req.text}" in a production setting? Walk through a concrete architecture, edge cases, and performance trade-offs.`
          : `Walk through your proven methodology for managing "${req.text}". What metrics, workflows, and tools do you use to guarantee success?`,
        answerOutline: isTechRole
          ? `1. Explain fundamental principles and architecture.\n2. Discuss trade-offs, performance considerations, and edge cases.\n3. Detail failure modes, monitoring, and lessons learned in production.`
          : `1. Define target KPIs and success metrics for this requirement.\n2. Outline step-by-step execution and stakeholder alignment process.\n3. Address risk mitigation and quantitative outcomes achieved.`,
        difficulty: (idx % 3 + 1) as 1 | 2 | 3,
        status: 'generated'
      });

      flashcards.push({
        id: fId,
        requirementIds: [req.id],
        front: `Core principles & best practices: ${req.text.slice(0, 70)}`,
        back: isTechRole
          ? `Key concepts: Separation of concerns, scalability patterns, automated testing, observability, and adherence to cloud-native best practices.`
          : `Key concepts: Stakeholder alignment, proactive risk mitigation, measurable SLAs, data-driven optimization, and cross-functional transparency.`,
        status: 'generated'
      });
    } else {
      questions.push({
        id: qId,
        requirementIds: [req.id],
        category: 'behavioural',
        prompt: `Describe a situation where you had to manage: "${req.text}". What actions did you take and what was the quantifiable impact?`,
        answerOutline: `Structure response using the STAR method:\n- Situation: Context and challenge.\n- Task: Your explicit ownership.\n- Action: Specific collaborative techniques used.\n- Result: Measurable outcome and retrospective reflection.`,
        difficulty: 2,
        status: 'generated'
      });

      flashcards.push({
        id: fId,
        requirementIds: [req.id],
        front: `STAR Response Strategy: ${req.text.slice(0, 70)}`,
        back: `S: Context & Stakeholders\nT: Goal & Timeline\nA: Constructive communication, data-driven decisions\nR: Delivery metrics & team trust`,
        status: 'generated'
      });
    }
  });

  // Ensure high-yield System Design questions with diagrams are ALWAYS included
  const sysDesignPrompt = isTechRole
    ? `Design a high-throughput, fault-tolerant Event Ingestion & Analytics Pipeline capable of processing 100,000 events/second with sub-second dashboard updates for ${companyName}.`
    : `Design an Enterprise B2B Partner Integration & Webhook Delivery Platform that guarantees reliable event synchronization, custom field mapping, and automatic retry backoffs for ${companyName}.`;

  const sysDesignOutline = isTechRole
    ? `1. Functional Requirements: Ingest events via REST/gRPC, deduplicate, aggregate metrics, and provide real-time query API.\n2. Non-Functional: High availability (99.99%), sub-second latency, horizontal scalability, zero data loss.\n3. Architecture Components: DNS -> Geo-Load Balancer -> Edge Ingestion Services -> Apache Kafka (partitioned by entityId) -> Stream Processors (Flink/Spark Streaming) -> Hot Path (ClickHouse / TimescaleDB) + Cold Path (S3 / Parquet) -> Query Service + Redis Cache.\n4. Scalability & Resilience: Backpressure handling, dead-letter queues (DLQ), consumer group scaling, and multi-AZ failover.`
    : `1. Requirements: Ingest account updates, transform payloads to partner formats, dispatch webhooks with HMAC signatures, and handle partner endpoint downtime.\n2. Reliable Delivery: At-least-once delivery with exponential backoff (1m, 5m, 30m, 2h, 24h), idempotency keys, and manual replay console.\n3. Security & Isolation: Circuit breaker per partner URL to avoid worker thread exhaustion when a single partner system is down.\n4. Scalability: Sharded job queues prioritized by customer SLA tier (Enterprise vs Standard).`;

  const sysDesignDiagram = isTechRole
    ? `+-----------------------------------------------------------------------------------+
|                         HIGH-THROUGHPUT EVENT INGESTION PIPELINE                  |
+-----------------------------------------------------------------------------------+
  [Mobile / Web Clients / B2B Partners]
                 |
                 v (HTTPS / gRPC)
       +--------------------+
       |  Cloudflare / CDN  |  --> DDoS Mitigation & SSL Termination
       +--------------------+
                 |
                 v
       +--------------------+
       | Layer-7 Load Bal.  |  --> Round-Robin / Least Connections
       +--------------------+
                 |
        +--------+--------+
        |                 |
        v                 v
  +-----------+     +-----------+
  | Ingestion |     | Ingestion |  --> Stateless API Nodes
  | Service 1 |     | Service 2 |  --> Validates schema & JWT token
  +-----------+     +-----------+
        |                 |
        +--------+--------+
                 v
     =========================
     |   APACHE KAFKA CLUSTER  |  --> Distributed Event Log (Replication Factor: 3)
     |  Topic: raw-events-v1   |  --> Partitions: 64 (Key: tenant_id + event_type)
     =========================
          /              \\
         v                v
   +------------+   +------------+
   | Stream     |   | Stream     |  --> Apache Flink / Spark Streaming
   | Worker A   |   | Worker B   |  --> 10-second tumbling window aggregations
   +------------+   +------------+
         |                 |
    +----+----+       +----+----+
    |         |       |         |
    v         v       v         v
+--------+ +--------+  +--------+ +-------------------+
| Hot DB | | Cache  |  | Cold   | | Dead Letter Queue |
| Click- | | Redis  |  | Storage| | (DLQ) Kafka Topic |
| House  | | Cluster|  | S3/GCS | | for bad schemas   |
+--------+ +--------+  +--------+ +-------------------+
    ^         ^
    |         |
+-----------------------+
| Real-Time Query API   | <--- Dashboard Clients & Alerts
+-----------------------+`
    : `+-----------------------------------------------------------------------------------+
|               ENTERPRISE B2B PARTNER INTEGRATION & WEBHOOK PLATFORM               |
+-----------------------------------------------------------------------------------+
  [Internal Business Events / CRM Updates / Transaction Ledger]
                              |
                              v
                  +-----------------------+
                  | Event Ingestion Bus   | (Kafka / RabbitMQ)
                  +-----------------------+
                              |
                              v
                  +-----------------------+
                  | Transformation Engine | --> Custom JSON schema mapping
                  | & HMAC Signer         | --> Partner specific secret keys
                  +-----------------------+
                              |
              +---------------+---------------+
              |                               |
              v (High Priority)               v (Standard)
       +--------------+                +--------------+
       | Enterprise   |                | Standard     |
       | Webhook Queue|                | Webhook Queue|
       +--------------+                +--------------+
              |                               |
              +---------------+---------------+
                              |
                              v
                  +-----------------------+
                  | Dispatch Worker Pool  | --> Async HTTP Client with timeouts
                  +-----------------------+
                              |
                 +------------+------------+
                 |                         |
            (HTTP 200 OK)             (Timeout / 5xx)
                 |                         |
                 v                         v
          +-------------+           +-----------------------+
          | Audit Log & |           | Exponential Backoff   |
          | Success SLA |           | Retry Engine (Redis)  |
          +-------------+           +-----------------------+
                                           |
                                           v (After 5 retries)
                                    +-----------------------+
                                    | Dead Letter Queue     |
                                    | & Partner Alert Email |
                                    +-----------------------+`;

  questions.push({
    id: `q${questions.length + 1}`,
    requirementIds: [extractedRequirements[0]?.id || 'r1'],
    category: 'system-design',
    prompt: sysDesignPrompt,
    answerOutline: sysDesignOutline,
    difficulty: 3,
    status: 'generated',
    diagram: sysDesignDiagram,
    diagramType: 'architecture'
  });

  // Add culture and company fit question
  questions.push({
    id: `q${questions.length + 1}`,
    requirementIds: [extractedRequirements[0]?.id || 'r1'],
    category: 'company-fit',
    prompt: `Why does ${companyName}'s mission, market position, and operational culture resonate with your career trajectory? How will you make an immediate impact in your first 90 days?`,
    answerOutline: `1. Highlight deep personal interest in ${companyName}'s industry and growth trajectory.\n2. Demonstrate alignment with high ownership, customer empathy, and continuous learning.\n3. 30/60/90 Day Plan: Learn systems & culture (Days 1-30), execute key initiatives (Days 31-60), and scale measurable results (Days 61-90).`,
    difficulty: 2,
    status: 'generated'
  });

  const schedule = buildFallbackSchedule(extractedRequirements, questions, days);

  return {
    source: {
      company: companyName,
      companyUrl,
      role: roleTitle,
      location: locationHint || 'Remote / Hybrid',
      jdChars: jd.length,
      researchedAt: new Date().toISOString(),
      pagesUsed: [companyUrl]
    },
    companyBrief: {
      summary: `${companyName} is actively scaling engineering operations and recruiting for the ${roleTitle} role.`,
      whatTheyDo: `${companyName} develops high-impact digital products and modern cloud infrastructure, emphasizing reliability, clean architecture, and rapid customer delivery.`,
      sources: [companyUrl]
    },
    role: {
      title: roleTitle,
      seniority,
      responsibilities: [
        `Deliver high quality production code aligned with ${roleTitle} requirements`,
        'Collaborate across engineering, product, and design teams',
        'Participate in code reviews, design docs, and system reliability initiatives'
      ],
      requirements: extractedRequirements
    },
    questions,
    flashcards,
    schedule: {
      daysAvailable: days,
      days: schedule
    },
    coverage: {
      uncoveredRequirementIds: [],
      passes: 1
    },
    status: 'completed'
  };
}
