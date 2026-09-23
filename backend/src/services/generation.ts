import { GoogleGenAI } from '@google/genai';
import { Kit, IKit, IRequirement, IQuestion, IFlashcard, IScheduleDay } from '../models/Kit';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const GENERATION_TIMEOUT = 60000;
const MAX_PASSES = 3;

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function generateWithGemini(prompt: string, content: string): Promise<string> {
  const result = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `${prompt}\n\n${content}`
  });
  return result.text || '';
}

function cleanJsonResponse(text: string): any {
  const cleaned = text.replace(/```json\n?|```\n?/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // ignore
      }
    }
    throw new Error('Failed to parse JSON response');
  }
}

export async function extractRequirements(jobDescription: string): Promise<IRequirement[]> {
  const prompt = `Extract requirements from this job description. For each requirement, provide:
- A stable ID (e.g., "r1", "r2")
- The exact text from the description
- Kind: "technical", "behavioural", or "domain"
- Priority: "must" (required, essential, must-have) or "nice" (bonus, preferred, nice-to-have)

Return ONLY a JSON array of requirements.`;

  const text = await generateWithGemini(prompt, `Job Description:\n${jobDescription}`);
  const requirements = cleanJsonResponse(text);
  
  return Array.isArray(requirements) ? requirements.map((r: any, i: number) => ({
    id: r.id || generateId('r'),
    text: r.text || '',
    kind: ['technical', 'behavioural', 'domain'].includes(r.kind) ? r.kind : 'technical',
    priority: ['must', 'nice'].includes(r.priority) ? r.priority : 'must'
  })) : [];
}

export async function generateCompanyBrief(
  companyName: string,
  homepageText: string,
  hiringPagesText: string[],
  sources: string[]
): Promise<{ summary: string; whatTheyDo: string; sources: string[] }> {
  const prompt = `Based on the company website content, create a brief company profile.
Return ONLY JSON with: summary (2-3 sentences), whatTheyDo (detailed paragraph), sources (array of URLs used).`;

  const content = `Company: ${companyName}\n\nHomepage:\n${homepageText}\n\nHiring Pages:\n${hiringPagesText.join('\n\n')}`;
  
  const text = await generateWithGemini(prompt, content);
  
  const parsed = cleanJsonResponse(text);
  return {
    summary: parsed.summary || '',
    whatTheyDo: parsed.whatTheyDo || '',
    sources: parsed.sources || sources
  };
}

export async function generateRoleBreakdown(
  jobDescription: string,
  requirements: IRequirement[],
  companyBrief: { summary: string; whatTheyDo: string }
): Promise<{ title: string; seniority: string; responsibilities: string[] }> {
  const prompt = `Based on the job description and requirements, extract the role title, seniority level, and key responsibilities.
Return ONLY JSON with: title, seniority (junior/mid/senior/lead/principal), responsibilities (array of strings).`;

  const content = `Job Description:\n${jobDescription}\n\nRequirements:\n${requirements.map(r => `- ${r.text} (${r.kind}, ${r.priority})`).join('\n')}\n\nCompany: ${companyBrief.whatTheyDo}`;
  
  const text = await generateWithGemini(prompt, content);
  
  return cleanJsonResponse(text);
}

export async function generateQuestionsForCategory(
  category: 'technical' | 'behavioural' | 'system-design' | 'company-fit',
  requirements: IRequirement[],
  context: { companyBrief: any; hiringProcess?: string; jd: string }
): Promise<IQuestion[]> {
  const categoryPrompts: Record<string, string> = {
    technical: 'Generate technical interview questions testing specific skills and knowledge.',
    behavioural: 'Generate behavioural questions using STAR format for soft skills and experience.',
    'system-design': 'Generate system design questions relevant to the role and company scale.',
    'company-fit': 'Generate questions assessing culture fit and alignment with company values.'
  };

  const prompt = `${categoryPrompts[category]}
Each question must reference requirement IDs it covers.
Return ONLY JSON array of questions with: id, requirementIds (array), category, prompt, answerOutline, difficulty (1-3).`;

  const reqText = requirements.map(r => `${r.id}: ${r.text} (${r.kind}, ${r.priority})`).join('\n');
  const content = `Category: ${category}\nRequirements:\n${reqText}\n\nCompany: ${context.companyBrief.whatTheyDo}\nHiring Process: ${context.hiringProcess || 'Not specified'}\nJob Description: ${context.jd}`;

  const text = await generateWithGemini(prompt, content);
  
  const questions = cleanJsonResponse(text);
  return Array.isArray(questions) ? questions.map((q: any) => ({
    id: q.id || generateId('q'),
    requirementIds: Array.isArray(q.requirementIds) ? q.requirementIds : [],
    category,
    prompt: q.prompt || '',
    answerOutline: q.answerOutline || '',
    difficulty: [1,2,3].includes(q.difficulty) ? q.difficulty : 2
  })) : [];
}

export async function generateFlashcards(
  requirements: IRequirement[],
  questions: IQuestion[]
): Promise<IFlashcard[]> {
  const prompt = `Create flashcards for interview preparation based on requirements and questions.
Each card: front (question/concept), back (answer/explanation), requirementIds.
Return ONLY JSON array.`;

  const content = `Requirements:\n${requirements.map(r => `${r.id}: ${r.text}`).join('\n')}\n\nQuestions:\n${questions.map(q => `${q.id}: ${q.prompt}`).join('\n')}`;

  const text = await generateWithGemini(prompt, content);
  
  const cards = cleanJsonResponse(text);
  return Array.isArray(cards) ? cards.map((c: any) => ({
    id: c.id || generateId('f'),
    front: c.front || '',
    back: c.back || '',
    requirementIds: Array.isArray(c.requirementIds) ? c.requirementIds : []
  })) : [];
}

export function allocateSchedule(
  requirements: IRequirement[],
  questions: IQuestion[],
  daysAvailable: number
): IScheduleDay[] {
  const mustRequirements = requirements.filter(r => r.priority === 'must');
  const niceRequirements = requirements.filter(r => r.priority === 'nice');
  
  const reqToQuestions = new Map<string, IQuestion[]>();
  questions.forEach(q => {
    q.requirementIds.forEach(rid => {
      if (!reqToQuestions.has(rid)) reqToQuestions.set(rid, []);
      reqToQuestions.get(rid)!.push(q);
    });
  });

  const schedule: IScheduleDay[] = [];
  const questionsPerDay = Math.ceil(questions.length / daysAvailable);
  const baseMinutes = 60;
  
  let day = 1;
  let questionIndex = 0;
  
  const sortedRequirements = [
    ...mustRequirements.sort((a, b) => {
      const aQ = reqToQuestions.get(a.id)?.length || 0;
      const bQ = reqToQuestions.get(b.id)?.length || 0;
      return bQ - aQ;
    }),
    ...niceRequirements
  ];

  while (day <= daysAvailable && questionIndex < questions.length) {
    const dayQuestions = questions.slice(questionIndex, questionIndex + questionsPerDay);
    const coveredReqs = new Set(dayQuestions.flatMap(q => q.requirementIds));
    const focusReq = sortedRequirements.find(r => coveredReqs.has(r.id));
    
    schedule.push({
      day,
      focus: focusReq ? focusReq.text.slice(0, 80) : `Day ${day} review`,
      questionIds: dayQuestions.map(q => q.id),
      minutes: baseMinutes + (dayQuestions.length * 5)
    });
    
    questionIndex += questionsPerDay;
    day++;
  }

  while (day <= daysAvailable) {
    schedule.push({
      day,
      focus: 'Review and practice',
      questionIds: [],
      minutes: baseMinutes
    });
    day++;
  }

  const allScheduledQuestions = new Set(schedule.flatMap(d => d.questionIds));
  questions.forEach(q => {
    if (!allScheduledQuestions.has(q.id)) {
      const targetDay = schedule[Math.min(day - 2, schedule.length - 1)];
      if (targetDay) targetDay.questionIds.push(q.id);
    }
  });

  mustRequirements.forEach(req => {
    const hasQuestion = reqToQuestions.has(req.id) && reqToQuestions.get(req.id)!.length > 0;
    if (!hasQuestion) {
      console.warn(`Must requirement ${req.id} has no questions`);
    }
  });

  return schedule;
}

export async function generateKit(
  jobDescription: string,
  companyUrl: string,
  days: number,
  researchData: {
    homepageText: string;
    hiringPagesText: string[];
    hiringProcess: string;
    discussionSummary: string;
    sources: string[];
    companyName: string;
  }
): Promise<Partial<IKit>> {
  const requirements = await extractRequirements(jobDescription);
  
  const companyBrief = await generateCompanyBrief(
    researchData.companyName,
    researchData.homepageText,
    researchData.hiringPagesText,
    researchData.sources
  );

  const roleBreakdown = await generateRoleBreakdown(jobDescription, requirements, companyBrief);

  let allQuestions: IQuestion[] = [];
  const categories: Array<'technical' | 'behavioural' | 'system-design' | 'company-fit'> = 
    ['technical', 'behavioural', 'system-design', 'company-fit'];

  for (const category of categories) {
    const catRequirements = requirements.filter(r => 
      category === 'technical' ? r.kind === 'technical' :
      category === 'behavioural' ? r.kind === 'behavioural' :
      category === 'system-design' ? r.kind === 'technical' || r.kind === 'domain' :
      true
    );
    
    if (catRequirements.length > 0) {
      const questions = await generateQuestionsForCategory(category, catRequirements, {
        companyBrief,
        hiringProcess: researchData.hiringProcess,
        jd: jobDescription
      });
      allQuestions.push(...questions);
    }
  }

  let passes = 1;
  let uncovered = checkCoverage(requirements, allQuestions);
  
  while (uncovered.length > 0 && passes < MAX_PASSES) {
    const uncoveredReqs = requirements.filter(r => uncovered.includes(r.id));
    const missingQuestions = await generateQuestionsForCategory('technical', uncoveredReqs, {
      companyBrief,
      hiringProcess: researchData.hiringProcess,
      jd: jobDescription
    });
    allQuestions.push(...missingQuestions);
    passes++;
    uncovered = checkCoverage(requirements, allQuestions);
  }

  const flashcards = await generateFlashcards(requirements, allQuestions);
  const schedule = allocateSchedule(requirements, allQuestions, days);

  return {
    source: {
      company: researchData.companyName,
      companyUrl,
      role: roleBreakdown.title,
      location: '',
      jdChars: jobDescription.length,
      researchedAt: new Date().toISOString(),
      pagesUsed: researchData.sources
    },
    companyBrief,
    role: {
      title: roleBreakdown.title,
      seniority: roleBreakdown.seniority,
      responsibilities: roleBreakdown.responsibilities,
      requirements
    },
    questions: allQuestions,
    flashcards,
    schedule: {
      daysAvailable: days,
      days: schedule
    },
    coverage: {
      uncoveredRequirementIds: uncovered,
      passes
    },
    status: 'completed'
  };
}

export function checkCoverage(requirements: IRequirement[], questions: IQuestion[]): string[] {
  const coveredReqs = new Set<string>();
  questions.forEach(q => q.requirementIds.forEach(rid => coveredReqs.add(rid)));
  
  return requirements
    .filter(r => r.priority === 'must' && !coveredReqs.has(r.id))
    .map(r => r.id);
}

export function validateKitStructure(kit: any): { valid: boolean; errors?: string[] } {
  const errors: string[] = [];
  
  if (!kit.source) errors.push('Missing source');
  else {
    if (!kit.source.company) errors.push('Missing source.company');
    if (!kit.source.companyUrl) errors.push('Missing source.companyUrl');
    if (typeof kit.source.jdChars !== 'number') errors.push('Missing source.jdChars');
  }
  
  if (!kit.companyBrief) errors.push('Missing companyBrief');
  else {
    if (typeof kit.companyBrief.summary !== 'string') errors.push('Missing companyBrief.summary');
    if (typeof kit.companyBrief.whatTheyDo !== 'string') errors.push('Missing companyBrief.whatTheyDo');
  }
  
  if (!kit.role) errors.push('Missing role');
  else {
    if (!kit.role.title) errors.push('Missing role.title');
    if (!Array.isArray(kit.role.requirements)) errors.push('Missing role.requirements');
  }
  
  if (!Array.isArray(kit.questions)) errors.push('Missing questions array');
  if (!Array.isArray(kit.flashcards)) errors.push('Missing flashcards array');
  
  if (!kit.schedule) errors.push('Missing schedule');
  else {
    if (typeof kit.schedule.daysAvailable !== 'number') errors.push('Missing schedule.daysAvailable');
    if (!Array.isArray(kit.schedule.days)) errors.push('Missing schedule.days');
  }
  
  if (!kit.coverage) errors.push('Missing coverage');
  
  return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
}