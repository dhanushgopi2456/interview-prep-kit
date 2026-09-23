import { allocateSchedule, checkCoverage, validateKitStructure } from '../services/generation';
import { IRequirement, IQuestion } from '../models/Kit';

describe('Schedule Allocation', () => {
  const mockRequirements: IRequirement[] = [
    { id: 'r1', text: '5+ years React', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Node.js experience', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Team leadership', kind: 'behavioural', priority: 'must' },
    { id: 'r4', text: 'GraphQL knowledge', kind: 'technical', priority: 'nice' },
    { id: 'r5', text: 'Cloud infrastructure', kind: 'domain', priority: 'nice' }
  ];

  const mockQuestions: IQuestion[] = [
    { id: 'q1', requirementIds: ['r1'], category: 'technical', prompt: 'React hooks question', answerOutline: 'Hooks allow...', difficulty: 2 },
    { id: 'q2', requirementIds: ['r1', 'r2'], category: 'technical', prompt: 'Full stack question', answerOutline: 'Full stack...', difficulty: 3 },
    { id: 'q3', requirementIds: ['r2'], category: 'technical', prompt: 'Node.js question', answerOutline: 'Node.js...', difficulty: 2 },
    { id: 'q4', requirementIds: ['r3'], category: 'behavioural', prompt: 'Leadership question', answerOutline: 'Leadership...', difficulty: 2 },
    { id: 'q5', requirementIds: ['r4'], category: 'technical', prompt: 'GraphQL question', answerOutline: 'GraphQL...', difficulty: 1 },
    { id: 'q6', requirementIds: ['r5'], category: 'domain', prompt: 'Cloud question', answerOutline: 'Cloud...', difficulty: 2 }
  ];

  test('allocates questions across requested days', () => {
    const schedule = allocateSchedule(mockRequirements, mockQuestions, 3);
    expect(schedule).toHaveLength(3);
    expect(schedule[0].day).toBe(1);
    expect(schedule[1].day).toBe(2);
    expect(schedule[2].day).toBe(3);
  });

  test('all days have minutes assigned', () => {
    const schedule = allocateSchedule(mockRequirements, mockQuestions, 3);
    schedule.forEach(day => {
      expect(day.minutes).toBeGreaterThan(0);
      expect(Number.isInteger(day.minutes)).toBe(true);
    });
  });

  test('each day has a focus', () => {
    const schedule = allocateSchedule(mockRequirements, mockQuestions, 3);
    schedule.forEach(day => {
      expect(day.focus).toBeTruthy();
      expect(typeof day.focus).toBe('string');
    });
  });

  test('handles 1-day schedule', () => {
    const schedule = allocateSchedule(mockRequirements, mockQuestions, 1);
    expect(schedule).toHaveLength(1);
    expect(schedule[0].questionIds.length).toBe(mockQuestions.length);
  });

  test('handles 60-day schedule', () => {
    const schedule = allocateSchedule(mockRequirements, mockQuestions, 60);
    expect(schedule).toHaveLength(60);
  });

  test('handles empty questions', () => {
    const schedule = allocateSchedule(mockRequirements, [], 5);
    expect(schedule).toHaveLength(5);
    schedule.forEach(day => {
      expect(day.questionIds).toHaveLength(0);
    });
  });
});

describe('Coverage Check', () => {
  const requirements: IRequirement[] = [
    { id: 'r1', text: 'React', kind: 'technical', priority: 'must' },
    { id: 'r2', text: 'Node.js', kind: 'technical', priority: 'must' },
    { id: 'r3', text: 'Leadership', kind: 'behavioural', priority: 'nice' }
  ];

  test('returns empty when all must-have requirements are covered', () => {
    const questions: IQuestion[] = [
      { id: 'q1', requirementIds: ['r1', 'r2'], category: 'technical', prompt: 'Q1', answerOutline: 'A1', difficulty: 2 }
    ];
    const uncovered = checkCoverage(requirements, questions);
    expect(uncovered).toEqual([]);
  });

  test('finds uncovered must-have requirements', () => {
    const questions: IQuestion[] = [
      { id: 'q1', requirementIds: ['r1'], category: 'technical', prompt: 'Q1', answerOutline: 'A1', difficulty: 2 }
    ];
    const uncovered = checkCoverage(requirements, questions);
    expect(uncovered).toContain('r2');
    expect(uncovered).not.toContain('r3'); // nice-to-have not required
  });

  test('returns all must-have ids when no questions exist', () => {
    const uncovered = checkCoverage(requirements, []);
    expect(uncovered).toEqual(['r1', 'r2']);
  });

  test('nice-to-have requirements not required for coverage', () => {
    const questions: IQuestion[] = [
      { id: 'q1', requirementIds: ['r1', 'r2'], category: 'technical', prompt: 'Q1', answerOutline: 'A1', difficulty: 2 }
    ];
    const uncovered = checkCoverage(requirements, questions);
    expect(uncovered).toHaveLength(0);
  });
});

describe('Kit Structure Validation', () => {
  test('validates correct kit structure', () => {
    const kit = {
      source: { company: 'Test', companyUrl: 'https://test.com', role: 'Engineer', location: 'Remote', jdChars: 100, researchedAt: '2024-01-01', pagesUsed: [] },
      companyBrief: { summary: 'Test', whatTheyDo: 'Test', sources: [] },
      role: { title: 'Engineer', seniority: 'Senior', responsibilities: [], requirements: [] },
      questions: [],
      flashcards: [],
      schedule: { daysAvailable: 5, days: [] },
      coverage: { uncoveredRequirementIds: [], passes: 1 }
    };
    const result = validateKitStructure(kit);
    expect(result.valid).toBe(true);
  });

  test('rejects kit missing required fields', () => {
    const kit = {
      source: { company: 'Test' }
    };
    const result = validateKitStructure(kit);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });
});