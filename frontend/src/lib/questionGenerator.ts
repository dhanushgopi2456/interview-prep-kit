import { GoogleGenAI } from '@google/genai';
import { Question, Kit, Requirement } from './api';

function getAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || !apiKey.startsWith('AIza') || apiKey.length < 20) {
    return null;
  }
  return new GoogleGenAI({ apiKey });
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

export interface GeneratedQuestionsResult {
  questions: Question[];
  category: string;
}

/**
 * Generates important, high-yield questions across all categories or a specific category.
 * Always includes detailed architecture diagrams for system-design questions.
 */
export async function generateImportantQuestions(
  kit: Kit,
  categoryFilter?: 'technical' | 'behavioural' | 'system-design' | 'company-fit' | 'all',
  requestedCount = 4
): Promise<Question[]> {
  const ai = getAI();
  const roleTitle = kit.role?.title || kit.source?.role || 'Senior Professional';
  const companyName = kit.source?.company || kit.companyBrief?.summary?.split(' ')[0] || 'Company';
  const requirements = kit.role?.requirements || [];
  const reqTextSummary = requirements.map(r => `[${r.id}] ${r.text} (${r.kind})`).join('\n');
  const existingQuestions = kit.questions || [];
  const existingPrompts = existingQuestions.map(q => q.prompt);

  const categoriesToGenerate: Array<'technical' | 'behavioural' | 'system-design' | 'company-fit'> =
    !categoryFilter || categoryFilter === 'all'
      ? ['technical', 'behavioural', 'system-design', 'company-fit']
      : [categoryFilter];

  if (ai) {
    try {
      const prompt = `You are a Principal Hiring Committee Lead and Staff Technical Interviewer at top-tier firms.
Generate high-yield, critical interview questions for this target role:
Role: ${roleTitle}
Company: ${companyName}
Seniority: ${kit.role?.seniority || 'Senior'}
Core Requirements:
${reqTextSummary || 'General enterprise requirements for ' + roleTitle}

Categories requested: ${categoriesToGenerate.join(', ')}
Total questions needed: ${categoryFilter === 'all' ? 6 : Math.max(3, requestedCount)}

CRITICAL INSTRUCTIONS:
1. For "system-design" questions:
   - Provide a complex, realistic system or solution architecture problem directly relevant to ${roleTitle} at ${companyName}.
   - You MUST include a structured "diagram" property containing a clean, multi-component ASCII architecture diagram (using boxes like [Client], [API Gateway], [Workers], [Cache], [Database], and arrows -->).
   - The diagram must clearly show data flow, components, message queues, storage layers, and failover/resilience mechanisms.
2. For "technical" questions:
   - Deep, non-trivial questions probing real-world production failure modes, performance bottlenecks, concurrency/scaling, or core domain principles.
3. For "behavioural" questions:
   - High-stakes scenario questions structured for the STAR method (cross-functional conflicts, high-impact escalations, missed milestones, prioritizing trade-offs).
4. For "company-fit" questions:
   - In-depth alignment with ${companyName}'s business model, customer challenges, engineering/cultural values, and immediate 30-60-90 day strategic execution.

Existing questions to avoid duplicating:
${existingPrompts.slice(0, 10).join('\n')}

Output ONLY valid JSON adhering strictly to this schema:
[
  {
    "id": "q_new_1",
    "requirementIds": ["r1"],
    "category": "technical" | "behavioural" | "system-design" | "company-fit",
    "prompt": "Full question statement...",
    "answerOutline": "Step-by-step key points candidate should cover...",
    "difficulty": 1 | 2 | 3,
    "diagram": "Clean multi-line ASCII architecture diagram (MANDATORY for system-design, optional for technical)",
    "diagramType": "architecture" | "flowchart"
  }
]`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt
      });

      const parsed = cleanJsonResponse(response.text || '');
      if (Array.isArray(parsed) && parsed.length > 0) {
        const timestamp = Date.now();
        const validQuestions: Question[] = parsed.map((q: any, i: number) => ({
          id: `q_gen_${timestamp}_${i + 1}`,
          requirementIds: Array.isArray(q.requirementIds) && q.requirementIds.length > 0
            ? q.requirementIds
            : [requirements[i % Math.max(1, requirements.length)]?.id || 'r1'],
          category: ['technical', 'behavioural', 'system-design', 'company-fit'].includes(q.category)
            ? q.category
            : categoriesToGenerate[i % categoriesToGenerate.length],
          prompt: q.prompt || `Interview scenario for ${roleTitle}`,
          answerOutline: q.answerOutline || 'Demonstrate deep structured thinking and quantifiable impact.',
          difficulty: [1, 2, 3].includes(q.difficulty) ? q.difficulty : 2,
          status: 'generated',
          diagram: q.diagram || (q.category === 'system-design' ? getFallbackSystemDesignDiagram(roleTitle, q.prompt) : undefined),
          diagramType: q.diagramType || (q.category === 'system-design' ? 'architecture' : undefined)
        }));

        if (validQuestions.length > 0) {
          return validQuestions;
        }
      }
    } catch (err) {
      console.warn('AI question generation error, falling back to curated bank:', err);
    }
  }

  // Fallback to high-quality curated generator
  return buildCuratedImportantQuestions(kit, categoriesToGenerate, requestedCount);
}

/**
 * Builds rich, contextual questions with ASCII architecture diagrams for any role
 */
export function buildCuratedImportantQuestions(
  kit: Kit,
  categories: Array<'technical' | 'behavioural' | 'system-design' | 'company-fit'>,
  countPerCategory = 2
): Question[] {
  const roleTitle = kit.role?.title || kit.source?.role || 'Senior Professional';
  const companyName = kit.source?.company || 'Target Company';
  const requirements = kit.role?.requirements || [];
  const questions: Question[] = [];
  const timestamp = Date.now();
  const isTechRole = /engineer|developer|architect|devops|sre|software|fullstack|backend|frontend|data/i.test(roleTitle);

  let counter = 1;

  for (const cat of categories) {
    if (cat === 'technical') {
      const techItems = isTechRole
        ? [
            {
              prompt: `How do you diagnose and mitigate a cascading tail-latency spike (p99 > 3s) in a distributed microservice mesh under peak load? Walk through profiling, circuit breakers, and database connection pooling.`,
              outline: `1. Observability Triad: Correlate distributed traces (OpenTelemetry), APM metrics, and slow query logs.\n2. Root Cause Analysis: Distinguish between GC pauses, thread exhaustion, lock contention, and downstream DB starvation.\n3. Mitigation Patterns: Adaptive concurrency limits, bulkhead isolation, circuit breakers with exponential backoff, and read-replica offloading.\n4. Prevention: Automated load testing with chaos engineering (Chaos Mesh/Toxiproxy) in staging.`,
              diff: 3 as const
            },
            {
              prompt: `Explain how you would design an idempotency key mechanism for critical state-mutating APIs (such as payment processing or order booking) across distributed workers.`,
              outline: `1. Contract: Client supplies unique Idempotency-Key header per mutation.\n2. Atomic Locking: Redis SET key requestId NX EX 120 before executing transaction.\n3. State Machine: If key exists with IN_PROGRESS status, return 409 or poll; if COMPLETED, replay cached response payload.\n4. Failure Handling: Clean rollback if worker crashes midway, ensuring no duplicate charges or state corruption.`,
              diff: 2 as const
            },
            {
              prompt: `Compare optimistic locking vs pessimistic locking in high-concurrency relational data models. When would you choose each, and how do you handle deadlocks in PostgreSQL/MySQL?`,
              outline: `1. Optimistic Locking: Version/timestamp columns; ideal for low-to-moderate contention, high read-to-write ratios. Fails fast on conflict.\n2. Pessimistic Locking: SELECT ... FOR UPDATE; necessary when retry cost is prohibitive or external resource is committed.\n3. Deadlock Resolution: Enforce consistent table/row lock acquisition ordering; configure short deadlock detection timeouts; keep transaction scopes minimal.`,
              diff: 2 as const
            }
          ]
        : [
            {
              prompt: `Walk through your methodology for analyzing enterprise account health, contract retention metrics (NRR/GRR), and pipeline velocity using CRM data and telemetry.`,
              outline: `1. Core Metric Formulas: Net Revenue Retention (NRR = [Beginning ARR + Expansion - Churn - Contraction] / Beginning ARR) vs Gross Revenue Retention.\n2. Leading Health Indicators: Product utilization drop-offs, executive sponsor turnover, open support escalations, and feature adoption gaps.\n3. Data Pipeline: Integrating Salesforce/HubSpot with product analytics (Mixpanel/Snowflake) to trigger proactive QBR alerts.`,
              diff: 2 as const
            },
            {
              prompt: `How do you handle technical API integration hurdles and security compliance reviews (SOC2, GDPR, SSO/SAML) when onboarding a major tier-1 enterprise partner?`,
              outline: `1. Technical Due Diligence: Review OpenAPI specs, rate limits, webhook delivery retries, and data encryption standards (TLS 1.3, AES-256).\n2. Security Governance: Address info-sec questionnaires, DPAs (Data Processing Agreements), and role-based access delegation.\n3. Implementation Plan: Phased sandbox testing, staging verification with synthetic data, and mutual signing of SLAs.`,
              diff: 3 as const
            },
            {
              prompt: `Describe your framework for building pricing proposals, discount tier structures, and multi-year custom SLAs without compromising company margins.`,
              outline: `1. Value-Based Pricing: Anchor on client ROI and cost of inaction rather than cost-plus margin.\n2. Guardrails: Tiered volume thresholds, minimum commitments, indexation/inflation clauses, and clawbacks for SLA breach.\n3. Cross-Functional Sign-off: Synchronize Finance, Legal, and Product teams before contract delivery.`,
              diff: 2 as const
            }
          ];

      techItems.slice(0, countPerCategory).forEach((item, idx) => {
        questions.push({
          id: `q_imp_${timestamp}_${counter++}`,
          requirementIds: [requirements[idx % Math.max(1, requirements.length)]?.id || 'r1'],
          category: 'technical',
          prompt: item.prompt,
          answerOutline: item.outline,
          difficulty: item.diff,
          status: 'generated'
        });
      });
    }

    if (cat === 'system-design') {
      const designItems = isTechRole
        ? [
            {
              prompt: `Design a high-throughput, fault-tolerant Event Ingestion & Analytics Pipeline capable of processing 100,000 events/second with sub-second dashboard updates for ${companyName}.`,
              outline: `1. Functional Requirements: Ingest events via REST/gRPC, deduplicate, aggregate metrics, and provide real-time query API.\n2. Non-Functional: High availability (99.99%), sub-second latency, horizontal scalability, zero data loss.\n3. Architecture Components: DNS -> Geo-Load Balancer -> Edge Ingestion Services -> Apache Kafka (partitioned by entityId) -> Stream Processors (Flink/Spark Streaming) -> Hot Path (ClickHouse / TimescaleDB) + Cold Path (S3 / Parquet) -> Query Service + Redis Cache.\n4. Scalability & Resilience: Backpressure handling, dead-letter queues (DLQ), consumer group scaling, and multi-AZ failover.`,
              diff: 3 as const,
              diagram: `+-----------------------------------------------------------------------------------+
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
  | Ingestion |     | Ingestion |  --> Stateless Go/Rust API Nodes
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
            },
            {
              prompt: `Design a global Distributed Rate Limiting & API Quota Service that enforces per-tenant token bucket quotas across multiple geographic regions with minimal latency overhead (<5ms).`,
              outline: `1. Core Requirements: Support tiered rate limits (e.g. 500 req/min free, 10,000 req/min enterprise); sliding window counter or token bucket algorithm.\n2. Low Latency Strategy: Local in-memory caching at edge API gateways with periodic batch synchronization against centralized Redis cluster.\n3. Conflict Resolution: Eventual consistency with CRDTs (Conflict-free Replicated Data Types) or local token reservation.\n4. Graceful Degradation: If Redis cluster is partitioned, fail-open with conservative local limits to protect customer uptime.`,
              diff: 3 as const,
              diagram: `+-----------------------------------------------------------------------------------+
|                 GLOBAL MULTI-REGION DISTRIBUTED RATE LIMITER                      |
+-----------------------------------------------------------------------------------+
            [Global Inbound Traffic]
                       |
        +--------------+--------------+
        | (US-East Region)            | (EU-West Region)
        v                             v
  +------------+                +------------+
  | Edge Envoy |                | Edge Envoy |
  | Proxy / GW |                | Proxy / GW |
  +------------+                +------------+
        |                             |
        v (Local In-Memory Cache)     v (Local In-Memory Cache)
  +------------+                +------------+
  | Local 100ms|                | Local 100ms|
  | Token Bucket                | Token Bucket
  +------------+                +------------+
        | (Async Batch Sync)          | (Async Batch Sync)
        v                             v
  +--------------------+        +--------------------+
  | Redis Cluster      |<======>| Redis Cluster      |
  | (US Region Primary)| Multi- | (EU Region Primary)|
  | Sliding Counter    | Region | Sliding Counter    |
  +--------------------+  Sync  +--------------------+
        |                             |
        v (Audit & Quotas)            v (Audit & Quotas)
  +--------------------------------------------------+
  | Centralized Account & Billing Service (Postgres)  |
  +--------------------------------------------------+`
            }
          ]
        : [
            {
              prompt: `Design an Enterprise B2B Partner Integration & Webhook Delivery Platform that guarantees reliable event synchronization, custom field mapping, and automatic retry backoffs for ${companyName}.`,
              outline: `1. Requirements: Ingest account updates, transform payloads to partner formats, dispatch webhooks with HMAC signatures, and handle partner endpoint downtime.\n2. Reliable Delivery: At-least-once delivery with exponential backoff (1m, 5m, 30m, 2h, 24h), idempotency keys, and manual replay console.\n3. Security & Isolation: Circuit breaker per partner URL to avoid worker thread exhaustion when a single partner system is down.\n4. Scalability: Sharded job queues prioritized by customer SLA tier (Enterprise vs Standard).`,
              diff: 3 as const,
              diagram: `+-----------------------------------------------------------------------------------+
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
                                    +-----------------------+`
            },
            {
              prompt: `Design a Multi-Tenant Client Onboarding & Data Reconciliation Architecture that verifies enterprise contract terms, automates provisioning, and detects revenue leakage for ${companyName}.`,
              outline: `1. Architecture Flow: Contract signing (DocuSign/Salesforce) -> Webhook Trigger -> Orchestration Engine (Temporal/Airflow) -> Provisioning Workers -> Audit & Billing Engine.\n2. State Management: Idempotent state machine ensuring clients are never double-billed or partially provisioned.\n3. Reconciliation: Daily automated reconciliation jobs comparing signed contract seats against active database permissions.\n4. Notification & Alerts: Real-time Slack/PagerDuty escalation if provisioning fails or discrepancy exceeds threshold.`,
              diff: 3 as const,
              diagram: `+-----------------------------------------------------------------------------------+
|             MULTI-TENANT ONBOARDING & RECONCILIATION ARCHITECTURE                 |
+-----------------------------------------------------------------------------------+
   [DocuSign / CRM Contract Signed]
                 |
                 v (Signed Webhook)
       +--------------------+
       | Ingestion Gateway  | --> Verifies Cryptographic Signature
       +--------------------+
                 |
                 v
       +--------------------+
       | Workflow Engine    | --> Temporal / State Machine Orchestrator
       | (Saga Pattern)     | --> Tracks: Pending -> Provisioned -> Verified
       +--------------------+
                 |
        +--------+--------+
        |                 |
        v                 v
  +-----------+     +-----------+
  | Identity  |     | Billing & |
  | & Tenant  |     | Entitlement
  | Service   |     | Service   |
  +-----------+     +-----------+
        |                 |
        +--------+--------+
                 |
                 v
       +--------------------+
       | Automated Daily    | <== Compares Active Seats vs Contracted Minimums
       | Reconciliation Job | ==> Emits Discrepancy Alerts & True-Up Invoices
       +--------------------+
                 |
                 v
       +--------------------+
       | Executive Health   |
       | Dashboard (Admin)  |
       +--------------------+`
            }
          ];

      designItems.slice(0, countPerCategory).forEach((item, idx) => {
        questions.push({
          id: `q_imp_${timestamp}_${counter++}`,
          requirementIds: [requirements[idx % Math.max(1, requirements.length)]?.id || 'r1'],
          category: 'system-design',
          prompt: item.prompt,
          answerOutline: item.outline,
          difficulty: item.diff,
          status: 'generated',
          diagram: item.diagram,
          diagramType: 'architecture'
        });
      });
    }

    if (cat === 'behavioural') {
      const behItems = [
        {
          prompt: `Tell me about a time when a critical project deadline or production deliverable was at serious risk of failure. How did you realign cross-functional stakeholders, de-scope requirements, and ensure successful execution?`,
          outline: `STAR Framework Structure:\n- Situation: Describe the project scope, technical/commercial constraints, and the unexpected blocker.\n- Task: Your specific ownership in assessing blast radius and formulating an action plan.\n- Action: How you communicated with transparent data, negotiated de-scoping with product/business leaders, and unblocked the team.\n- Result: Quantified delivery outcome, customer feedback, and post-mortem safeguards instituted.`,
          diff: 2 as const
        },
        {
          prompt: `Describe a scenario where you strongly disagreed with a senior stakeholder or engineering peer regarding architectural or product direction. How did you navigate the impasse constructively?`,
          outline: `STAR Framework Structure:\n- Situation: The conflict context (e.g. build vs buy, monolithic vs microservice, short-term patch vs refactor).\n- Task: Responsibility to ensure technical integrity while maintaining team cohesion.\n- Action: Built an objective decision matrix with benchmarks/POCs; separated ego from outcomes; listened actively to counter-arguments.\n- Result: Consensus reached or disagree-and-commit followed by high velocity delivery.`,
          diff: 2 as const
        },
        {
          prompt: `Give an example of a mistake or oversight you made in a past project that impacted customers or internal workflows. How did you handle the aftermath and what long-term changes resulted?`,
          outline: `STAR Framework Structure:\n- Situation: The mistake (e.g., missed edge case, configuration drift, incomplete client specification).\n- Task: Immediate incident containment and transparent escalation.\n- Action: Owned accountability immediately without deflecting; implemented immediate fix and communicated status updates.\n- Result: Conducted blameless post-mortem; introduced automated linting/guardrails preventing recurrence.`,
          diff: 1 as const
        }
      ];

      behItems.slice(0, countPerCategory).forEach((item, idx) => {
        questions.push({
          id: `q_imp_${timestamp}_${counter++}`,
          requirementIds: [requirements[idx % Math.max(1, requirements.length)]?.id || 'r1'],
          category: 'behavioural',
          prompt: item.prompt,
          answerOutline: item.outline,
          difficulty: item.diff,
          status: 'generated'
        });
      });
    }

    if (cat === 'company-fit') {
      const fitItems = [
        {
          prompt: `Why ${companyName}? Specifically, which aspects of ${companyName}'s product architecture, market position, and culture make this the exact right step in your career right now?`,
          outline: `1. Domain Fascination: Concrete references to ${companyName}'s technological or industry moat.\n2. Alignment of Working Style: High ownership, customer-centric velocity, and blameless continuous improvement.\n3. Unique Contribution: How your past background bridges current gaps and solves immediate roadmap hurdles for the team.`,
          diff: 1 as const
        },
        {
          prompt: `In your first 90 days as ${roleTitle} at ${companyName}, how would you balance rapid short-term wins with understanding existing team dynamics and architectural/operational standards?`,
          outline: `1. Days 1-30 (Listen & Learn): Shadow team members, set up 1-on-1s, review runbooks, and ship a low-risk task.\n2. Days 31-60 (Execute & Optimize): Identify high-leverage bottlenecks, take full ownership of major features, and gather peer feedback.\n3. Days 61-90 (Scale & Lead): Propose measurable architectural or operational enhancements; mentor others and contribute to quarter planning.`,
          diff: 2 as const
        }
      ];

      fitItems.slice(0, countPerCategory).forEach((item, idx) => {
        questions.push({
          id: `q_imp_${timestamp}_${counter++}`,
          requirementIds: [requirements[idx % Math.max(1, requirements.length)]?.id || 'r1'],
          category: 'company-fit',
          prompt: item.prompt,
          answerOutline: item.outline,
          difficulty: item.diff,
          status: 'generated'
        });
      });
    }
  }

  return questions;
}

function getFallbackSystemDesignDiagram(roleTitle: string, prompt: string): string {
  return `+-----------------------------------------------------------------------------------+
|                        SYSTEM ARCHITECTURE & DATA FLOW                            |
+-----------------------------------------------------------------------------------+
  [Clients / Users / Microservices]
                |
                v (HTTPS / TLS 1.3)
      +--------------------+
      |  API Gateway & WAF |  --> Authentication & Global Rate Limiting
      +--------------------+
                |
                v
      +--------------------+
      | Load Balancer (L7) |  --> Health Checks & Routing
      +--------------------+
                |
        +-------+-------+
        |               |
        v               v
  +-----------+   +-----------+
  | Service   |   | Service   |  --> Application Workers (Stateless Nodes)
  | Instance A|   | Instance B|
  +-----------+   +-----------+
        |               |
        +-------+-------+
                |
        +-------+-------+
        |               |
        v               v
  +-----------+   +-----------+
  | In-Memory |   | Message   |  --> Redis / Memcached (Hot Data)
  | Cache     |   | Broker    |  --> Kafka / RabbitMQ (Async Events)
  +-----------+   +-----------+
        |               |
        +-------+-------+
                |
                v
      +--------------------+
      | Primary Relational |  --> PostgreSQL / CockroachDB (ACID Transactions)
      | Database (Read/Wr) |
      +--------------------+
                |
                v (Replication)
      +--------------------+
      | Read Replicas      |  --> Horizontally Scaled Queries & Analytics
      +--------------------+`;
}
