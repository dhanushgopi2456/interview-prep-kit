'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useKitStore } from '@/stores/kitStore';
import { kitsApi, Kit } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { ArchitectureDiagram } from '@/components/ArchitectureDiagram';
import { ThemeToggle } from '@/components/ThemeToggle';
import {
  ArrowLeft,
  Briefcase,
  Play,
  Edit3,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Loader2,
  Check,
  X,
  BookOpen,
  Target,
  Calendar,
  FileText,
  Zap,
  Sparkles,
  Layers,
  Cpu,
  Users,
  Building2,
  Search,
  Copy,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 0
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} className="relative">
      <div {...listeners} className="absolute left-2 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-dark-400 hover:text-dark-600 dark:hover:text-dark-300">
        <GripVertical className="w-4 h-4" />
      </div>
      {children}
    </div>
  );
}

function RequirementEditor({ requirement, onUpdate, onDelete, onPin, isPinned }: {
  requirement: any;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onPin: () => void;
  isPinned: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(requirement.text);
  const [priority, setPriority] = useState(requirement.priority);

  return (
    <div className={`p-3 rounded-lg border transition-all ${isPinned ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/20' : 'border-dark-200 dark:border-dark-700'}`}>
      {isEditing ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="textarea text-sm min-h-[60px]"
          />
          <div className="flex items-center gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="input text-sm w-24"
            >
              <option value="must">Must Have</option>
              <option value="nice">Nice to Have</option>
            </select>
            <button onClick={() => { onUpdate({ text, priority }); setIsEditing(false); }} className="btn-primary text-sm py-1 px-2">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setIsEditing(false)} className="btn-ghost text-sm py-1 px-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-dark-500 dark:text-dark-400">{requirement.id}</span>
              <span className={`badge text-xs ${requirement.priority === 'must' ? 'badge-must' : 'badge-nice'}`}>
                {requirement.priority}
              </span>
              <span className={`badge badge-${requirement.kind}`}>{requirement.kind}</span>
            </div>
            <p className="text-sm text-dark-700 dark:text-dark-300">{requirement.text}</p>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onPin} className={`p-1 rounded transition-colors ${isPinned ? 'text-primary-500 bg-primary-100 dark:bg-primary-900/30' : 'text-dark-400 hover:text-primary-500'}`} title="Pin this requirement">
              {isPinned ? <BookOpen className="w-4 h-4" /> : <BookOpen className="w-4 h-4 opacity-50" />}
            </button>
            <button onClick={() => setIsEditing(true)} className="p-1 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 rounded">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-1 text-dark-400 hover:text-red-500 rounded">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionEditor({ question, requirements, onUpdate, onDelete, onMove, onPin, isPinned }: {
  question: any;
  requirements: any[];
  onUpdate: (updates: any) => void;
  onDelete: () => void;
  onMove: (category: string) => void;
  onPin: () => void;
  isPinned: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [prompt, setPrompt] = useState(question.prompt);
  const [answerOutline, setAnswerOutline] = useState(question.answerOutline);
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [category, setCategory] = useState(question.category);
  const [requirementIds, setRequirementIds] = useState(question.requirementIds || []);
  const [diagram, setDiagram] = useState(question.diagram || '');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const textToCopy = `Question (${question.category}, Difficulty: ${question.difficulty}/3):\n${question.prompt}\n\nAnswer Outline:\n${question.answerOutline}${question.diagram ? `\n\nArchitecture Diagram:\n${question.diagram}` : ''}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    toast.success('Question and outline copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'technical':
        return {
          icon: <Cpu className="w-3.5 h-3.5" />,
          label: 'Technical',
          className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50'
        };
      case 'behavioural':
        return {
          icon: <Users className="w-3.5 h-3.5" />,
          label: 'Behavioural',
          className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
        };
      case 'system-design':
        return {
          icon: <Layers className="w-3.5 h-3.5" />,
          label: 'System Design',
          className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800/50'
        };
      case 'company-fit':
      default:
        return {
          icon: <Building2 className="w-3.5 h-3.5" />,
          label: 'Company Fit',
          className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/50'
        };
    }
  };

  const catBadge = getCategoryBadge(question.category);

  return (
    <div className={`p-4 rounded-xl border transition-all ${isPinned ? 'border-primary-300 dark:border-primary-700 bg-primary-50/40 dark:bg-primary-950/20 shadow-xs' : 'border-dark-200 dark:border-dark-700/80 bg-white/70 dark:bg-dark-800/60 shadow-xs'}`}>
      {isEditing ? (
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 block">Question Prompt</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="textarea text-sm"
              placeholder="Question prompt..."
              rows={3}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 block">Answer Outline & Model Response</label>
            <textarea
              value={answerOutline}
              onChange={(e) => setAnswerOutline(e.target.value)}
              className="textarea text-sm"
              placeholder="Answer outline..."
              rows={4}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-dark-700 dark:text-dark-300 mb-1 block">
              Architecture / Flow Diagram (ASCII Blueprint)
            </label>
            <textarea
              value={diagram}
              onChange={(e) => setDiagram(e.target.value)}
              className="textarea text-xs font-mono"
              placeholder="ASCII architecture diagram or flow chart..."
              rows={5}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div>
              <label className="text-xs text-dark-500 mb-1 block">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="input text-sm w-44">
                <option value="technical">Technical</option>
                <option value="behavioural">Behavioural</option>
                <option value="system-design">System Design</option>
                <option value="company-fit">Company Fit</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-dark-500 mb-1 block">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(parseInt(e.target.value) as 1 | 2 | 3)} className="input text-sm w-32">
                <option value={1}>★☆☆ Easy</option>
                <option value={2}>★★☆ Medium</option>
                <option value={3}>★★★ Hard</option>
              </select>
            </div>
            <div className="w-full">
              <label className="text-xs text-dark-500 dark:text-dark-400 mb-1 block">Linked Requirements</label>
              <div className="flex flex-wrap gap-1">
                {requirements.map(req => (
                  <button
                    key={req.id}
                    type="button"
                    onClick={() => setRequirementIds((prev: string[]) => prev.includes(req.id) ? prev.filter((id: string) => id !== req.id) : [...prev, req.id])}
                    className={`badge text-xs cursor-pointer transition-colors ${requirementIds.includes(req.id) ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 font-semibold' : 'bg-dark-100 text-dark-500 dark:bg-dark-800 dark:text-dark-400'}`}
                  >
                    {req.id}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={() => {
                onUpdate({ prompt, answerOutline, difficulty, category, requirementIds, diagram: diagram.trim() || undefined });
                setIsEditing(false);
              }}
              className="btn-primary text-sm py-1.5 px-4"
            >
              Save Changes
            </button>
            <button onClick={() => setIsEditing(false)} className="btn-ghost text-sm py-1.5 px-3">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-xs font-mono font-bold text-dark-400 dark:text-dark-500">{question.id}</span>
                <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${catBadge.className}`}>
                  {catBadge.icon}
                  <span>{catBadge.label}</span>
                </span>
                <span className="text-xs text-dark-500 dark:text-dark-400 font-medium">
                  Difficulty: <span className="text-amber-500 tracking-wider">{'★'.repeat(question.difficulty)}</span>
                  <span className="text-dark-300 dark:text-dark-600">{'☆'.repeat(3 - question.difficulty)}</span>
                </span>
                {question.diagram && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                    <Layers className="w-3 h-3" />
                    <span>Diagram Included</span>
                  </span>
                )}
              </div>

              <p className="text-sm font-semibold text-dark-900 dark:text-white leading-relaxed mb-2">
                {question.prompt}
              </p>

              {/* Collapsed Outline preview or Expanded Detailed View */}
              {question.answerOutline && (
                <div className="mt-2.5">
                  {!isExpanded ? (
                    <div className="text-xs text-dark-600 dark:text-dark-300 p-2.5 bg-dark-50 dark:bg-dark-900/40 rounded-lg border border-dark-100 dark:border-dark-800/80">
                      <div className="flex items-center justify-between mb-1">
                        <strong className="text-dark-800 dark:text-dark-200">Answer Outline:</strong>
                        <button
                          type="button"
                          onClick={() => setIsExpanded(true)}
                          className="text-[11px] text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-0.5 font-medium cursor-pointer"
                        >
                          View Full Outline & Diagram
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="line-clamp-2 text-dark-600 dark:text-dark-400">
                        {question.answerOutline}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 p-3.5 bg-dark-50/80 dark:bg-dark-900/60 rounded-xl border border-dark-200 dark:border-dark-700/80 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-dark-200/80 dark:border-dark-700/80 pb-2">
                        <span className="text-xs font-bold text-dark-800 dark:text-dark-200 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-primary-500" />
                          Model Answer Structure & Evaluation Guide
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleCopy}
                            className="text-xs text-dark-500 hover:text-dark-800 dark:text-dark-400 dark:hover:text-dark-200 flex items-center gap-1 py-0.5 px-2 rounded hover:bg-dark-200/60 dark:hover:bg-dark-800 cursor-pointer"
                          >
                            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            <span>{copied ? 'Copied' : 'Copy'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsExpanded(false)}
                            className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium cursor-pointer"
                          >
                            Collapse
                          </button>
                        </div>
                      </div>

                      <div className="text-xs text-dark-700 dark:text-dark-300 whitespace-pre-line leading-relaxed space-y-2">
                        {question.answerOutline}
                      </div>

                      {/* Architecture Diagram if available */}
                      {question.diagram && (
                        <ArchitectureDiagram
                          diagram={question.diagram}
                          title={`${question.prompt.slice(0, 55)}...`}
                          category={question.category}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {question.requirementIds && question.requirementIds.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                  <span className="text-[11px] text-dark-400 dark:text-dark-500 font-medium">Mapped to:</span>
                  {question.requirementIds.map((rid: string) => (
                    <span key={rid} className="badge text-[10px] font-mono bg-dark-100 text-dark-600 dark:bg-dark-800 dark:text-dark-300">
                      {rid}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onPin}
                className={`p-1.5 rounded-md transition-colors ${isPinned ? 'text-primary-600 bg-primary-100 dark:bg-primary-950/60 dark:text-primary-300' : 'text-dark-400 hover:text-primary-500'}`}
                title={isPinned ? 'Unpin question' : 'Pin question'}
              >
                <BookOpen className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="p-1.5 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-800 rounded-md"
                title="Edit question"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <select
                onChange={(e) => { if (e.target.value) { onMove(e.target.value); e.target.value = ''; } }}
                className="text-xs border border-dark-200 dark:border-dark-700 bg-white dark:bg-dark-800 rounded-md p-1 text-dark-700 dark:text-dark-300"
                defaultValue=""
                title="Move question to another category"
              >
                <option value="" disabled>Move to...</option>
                <option value="technical">Technical</option>
                <option value="behavioural">Behavioural</option>
                <option value="system-design">System Design</option>
                <option value="company-fit">Company Fit</option>
              </select>
              <button
                onClick={onDelete}
                className="p-1.5 text-dark-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md"
                title="Delete question"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function FlashcardEditor({ flashcard, onUpdate, onDelete }: {
  flashcard: any;
  onUpdate: (updates: any) => void;
  onDelete: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [front, setFront] = useState(flashcard.front);
  const [back, setBack] = useState(flashcard.back);

  return (
    <div className="p-3 rounded-lg border border-dark-200 dark:border-dark-700">
      {isEditing ? (
        <div className="space-y-2">
          <input
            value={front}
            onChange={(e) => setFront(e.target.value)}
            className="input text-sm"
            placeholder="Front (question)..."
          />
          <textarea
            value={back}
            onChange={(e) => setBack(e.target.value)}
            className="textarea text-sm min-h-[60px]"
            placeholder="Back (answer)..."
            rows={2}
          />
          <div className="flex items-center gap-2">
            <button onClick={() => { onUpdate({ front, back }); setIsEditing(false); }} className="btn-primary text-sm py-1 px-2">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => setIsEditing(false)} className="btn-ghost text-sm py-1 px-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-dark-800 dark:text-dark-200">{flashcard.front}</p>
            <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">{flashcard.back.slice(0, 100)}{flashcard.back.length > 100 ? '...' : ''}</p>
            {flashcard.requirementIds && flashcard.requirementIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {flashcard.requirementIds.map((rid: string) => (
                  <span key={rid} className="badge text-xs bg-dark-100 text-dark-600 dark:bg-dark-800 dark:text-dark-300">{rid}</span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsEditing(true)} className="p-1 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 rounded">
              <Edit3 className="w-4 h-4" />
            </button>
            <button onClick={onDelete} className="p-1 text-dark-400 hover:text-red-500 rounded">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KitPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { currentKit, setKit, setGenerating, isGenerating, generationProgress, updateRequirement, addRequirement, deleteRequirement, updateQuestion, addQuestion, deleteQuestion, moveQuestion, pinQuestion, unpinQuestion, updateFlashcard, addFlashcard, deleteFlashcard, updateCompanyBrief, regenerateQuestions } = useKitStore();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    companyBrief: true,
    role: true,
    questions: true,
    flashcards: true,
    schedule: true,
    coverage: true
  });
  const [newRequirement, setNewRequirement] = useState<{text: string; kind: 'technical' | 'behavioural' | 'domain'; priority: 'must' | 'nice'}>({ text: '', kind: 'technical', priority: 'must' });
  const [showNewRequirement, setShowNewRequirement] = useState(false);
  const [newQuestion, setNewQuestion] = useState<{prompt: string; answerOutline: string; category: 'technical' | 'behavioural' | 'system-design' | 'company-fit'; difficulty: 1 | 2 | 3; requirementIds: string[]; diagram: string}>({ prompt: '', answerOutline: '', category: 'technical', difficulty: 2, requirementIds: [], diagram: '' });
  const [showNewQuestion, setShowNewQuestion] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'technical' | 'behavioural' | 'system-design' | 'company-fit'>('all');
  const [questionSearch, setQuestionSearch] = useState('');
  const [generatingCategory, setGeneratingCategory] = useState<string | null>(null);
  const [newFlashcard, setNewFlashcard] = useState<{front: string; back: string; requirementIds: string[]}>({ front: '', back: '', requirementIds: [] });
  const [showNewFlashcard, setShowNewFlashcard] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) checkAuth();
  }, [isAuthenticated, checkAuth]);

  useEffect(() => {
    if (isAuthenticated && params.id) loadKit();
  }, [isAuthenticated, params.id]);

  const loadKit = async () => {
    try {
      const { data } = await kitsApi.get(params.id as string);
      let kit = data.kit;

      if (kit) {
        let needsSync = false;
        const updates: any = {};

        // Auto-heal schedule days if empty
        if (!kit.schedule?.days || kit.schedule.days.length === 0) {
          const daysAvailable = kit.schedule?.daysAvailable || 7;
          const questionsList = kit.questions || [];
          const reqsList = kit.role?.requirements || [];
          const qPerDay = Math.max(1, Math.ceil(questionsList.length / daysAvailable));

          const healedDays = Array.from({ length: daysAvailable }, (_, idx) => {
            const d = idx + 1;
            const start = idx * qPerDay;
            const dayQs = questionsList.slice(start, start + qPerDay);
            const req = reqsList[idx % Math.max(1, reqsList.length)];
            return {
              day: d,
              focus: d === 1
                ? 'Core Architecture & Technical Fundamentals'
                : d === 2
                ? 'Distributed System Design & Microservices'
                : d === 3
                ? 'Database Optimization, Edge Cases & Performance'
                : d === 4
                ? 'Behavioural STAR Scenarios & Team Leadership'
                : d === daysAvailable
                ? 'Final Mock Interview & Rapid Review'
                : req ? `Targeted Mastery: ${req.text.slice(0, 50)}` : `Day ${d} Focused Study`,
              questionIds: dayQs.map(q => q.id),
              minutes: 60 + dayQs.length * 15
            };
          });

          kit = {
            ...kit,
            schedule: {
              daysAvailable,
              days: healedDays
            }
          };
          updates.schedule = kit.schedule;
          needsSync = true;
        }

        // Auto-heal requirements if empty
        if (!kit.role?.requirements || kit.role.requirements.length === 0) {
          const defaultReqs = [
            { id: 'r1', text: `Proficiency in core architecture, coding standards, and APIs for ${kit.role?.title || 'the role'}`, kind: 'technical' as const, priority: 'must' as const },
            { id: 'r2', text: 'Distributed systems design, microservices architecture, and database modeling', kind: 'technical' as const, priority: 'must' as const },
            { id: 'r3', text: 'Cloud infrastructure deployment, containerization, and CI/CD pipelines', kind: 'technical' as const, priority: 'must' as const },
            { id: 'r4', text: 'Collaborative team leadership, code reviews, and stakeholder communication', kind: 'behavioural' as const, priority: 'must' as const },
            { id: 'r5', text: 'Performance profiling, latency optimization, and production monitoring', kind: 'technical' as const, priority: 'nice' as const }
          ];
          kit = {
            ...kit,
            role: {
              ...kit.role,
              requirements: defaultReqs
            }
          };
          updates.role = kit.role;
          needsSync = true;
        }

        if (needsSync) {
          kitsApi.update(kit._id, updates).catch(() => {});
        }
      }

      setKit(kit);
    } catch (error: any) {
      toast.error('Failed to load kit');
      router.push('/dashboard');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegenerate = async (section: string) => {
    if (!currentKit) return;
    setGenerating(true);
    setGeneratingCategory(section);
    try {
      const res = await kitsApi.regenerateSection(currentKit._id, section);
      if (res.data?.kit) {
        setKit(res.data.kit);
      }
      toast.success(res.data?.message || `Generated ${section} questions!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to generate');
    } finally {
      setGenerating(false);
      setGeneratingCategory(null);
    }
  };

  const handleSave = async (updates: any) => {
    if (!currentKit) return;
    try {
      const { data } = await kitsApi.update(currentKit._id, updates);
      setKit(data.kit);
      toast.success('Saved!');
    } catch (error: any) {
      toast.error('Failed to save');
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleAddRequirement = () => {
    if (!newRequirement.text.trim()) return;
    addRequirement({ id: `r${Date.now()}`, ...newRequirement });
    setNewRequirement({ text: '', kind: 'technical', priority: 'must' });
    setShowNewRequirement(false);
  };

  const handleAddQuestion = () => {
    if (!newQuestion.prompt.trim()) return;
    addQuestion({
      id: `q${Date.now()}`,
      prompt: newQuestion.prompt.trim(),
      answerOutline: newQuestion.answerOutline.trim(),
      category: newQuestion.category,
      difficulty: newQuestion.difficulty,
      requirementIds: newQuestion.requirementIds,
      diagram: newQuestion.diagram.trim() || undefined,
      diagramType: newQuestion.diagram.trim() ? 'architecture' : undefined
    });
    setNewQuestion({ prompt: '', answerOutline: '', category: 'technical', difficulty: 2, requirementIds: [], diagram: '' });
    setShowNewQuestion(false);
  };

  const handleAddFlashcard = () => {
    if (!newFlashcard.front.trim()) return;
    addFlashcard({ id: `f${Date.now()}`, ...newFlashcard });
    setNewFlashcard({ front: '', back: '', requirementIds: [] });
    setShowNewFlashcard(false);
  };

  const handleDragEndQuestions = (event: DragEndEvent) => {
    if (!currentKit) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = currentKit.questions.findIndex(q => q.id === active.id);
    const newIndex = currentKit.questions.findIndex(q => q.id === over.id);
    const newOrder = arrayMove(currentKit.questions.map(q => q.id), oldIndex, newIndex);
    // Reorder in store would go here
  };

  const handleDragEndRequirements = (event: DragEndEvent) => {
    if (!currentKit) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = currentKit.role.requirements.findIndex(r => r.id === active.id);
    const newIndex = currentKit.role.requirements.findIndex(r => r.id === over.id);
    const newOrder = arrayMove(currentKit.role.requirements.map(r => r.id), oldIndex, newIndex);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen relative">
        <AnimatedBackground />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
            <p className="text-dark-600 dark:text-dark-400">Loading kit...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentKit) {
    return (
      <div className="min-h-screen relative">
        <AnimatedBackground />
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-dark-600 dark:text-dark-400">Kit not found</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'requirements', label: 'Requirements', icon: Target },
    { id: 'questions', label: 'Questions', icon: Zap },
    { id: 'flashcards', label: 'Flashcards', icon: BookOpen },
    { id: 'schedule', label: 'Schedule', icon: Calendar }
  ];

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-dark-200/50 dark:border-dark-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <ArrowLeft className="w-5 h-5 text-dark-500" />
                <span className="font-medium text-dark-700 dark:text-dark-300 hidden sm:block">Dashboard</span>
              </Link>
              <div className="h-6 w-px bg-dark-200 dark:bg-dark-700 hidden sm:block" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold text-dark-900 dark:text-white truncate max-w-[300px]">
                  {currentKit.source.role || currentKit.role.title}
                </h1>
                <p className="text-xs text-dark-500 dark:text-dark-400">{currentKit.source.company}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href={`/kit/${currentKit._id}/practice`} className="btn-primary text-sm">
                <Play className="w-4 h-4 mr-1" />
                Practice
              </Link>
              <button onClick={() => handleRegenerate('all')} disabled={isGenerating} className="btn-secondary text-sm">
                <RefreshCw className={`w-4 h-4 mr-1 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-4 overflow-x-auto pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${activeTab === tab.id ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium' : 'text-dark-600 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800'}`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Company Brief</h2>
                <button onClick={() => handleRegenerate('companyBrief')} className="btn-ghost text-sm">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              {currentKit.companyBrief.summary ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium text-dark-500 dark:text-dark-400 mb-1">Summary</h3>
                    <p className="text-dark-700 dark:text-dark-300">{currentKit.companyBrief.summary}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-dark-500 dark:text-dark-400 mb-1">What They Do</h3>
                    <p className="text-dark-700 dark:text-dark-300">{currentKit.companyBrief.whatTheyDo}</p>
                  </div>
                  {currentKit.companyBrief.sources && currentKit.companyBrief.sources.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-dark-500 dark:text-dark-400 mb-1">Sources</h3>
                      <ul className="list-disc list-inside text-sm text-dark-600 dark:text-dark-400">
                        {currentKit.companyBrief.sources.map((src: string, i: number) => (
                          <li key={i}><a href={src} target="_blank" rel="noopener noreferrer" className="text-primary-600 dark:text-primary-400 hover:underline">{src}</a></li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-dark-500 dark:text-dark-400 italic">No company brief generated yet</p>
              )}
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Role Breakdown</h2>
                <button onClick={() => handleRegenerate('role')} className="btn-ghost text-sm">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium text-dark-500 dark:text-dark-400 mb-1">Title</h3>
                  <p className="text-dark-700 dark:text-dark-300 font-medium">{currentKit.role.title}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-dark-500 dark:text-dark-400 mb-1">Seniority</h3>
                  <p className="text-dark-700 dark:text-dark-300 font-medium">{currentKit.role.seniority || 'Not specified'}</p>
                </div>
                <div className="md:col-span-2">
                  <h3 className="text-sm font-medium text-dark-500 dark:text-dark-400 mb-1">Responsibilities</h3>
                  <ul className="list-disc list-inside text-dark-700 dark:text-dark-300">
                    {currentKit.role.responsibilities.map((resp: string, i: number) => (
                      <li key={i} className="text-sm">{resp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-4">Coverage</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1 h-3 bg-dark-200 dark:bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary-500 to-green-500 rounded-full transition-all"
                    style={{ width: `${currentKit.role.requirements.length > 0 ? ((currentKit.role.requirements.length - currentKit.coverage.uncoveredRequirementIds.length) / currentKit.role.requirements.length) * 100 : 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-dark-700 dark:text-dark-300">
                  {currentKit.role.requirements.length - currentKit.coverage.uncoveredRequirementIds.length}/{currentKit.role.requirements.length} requirements covered
                </span>
              </div>
              {currentKit.coverage.uncoveredRequirementIds.length > 0 && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium mb-1">Uncovered Requirements</p>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-400 list-disc list-inside">
                    {currentKit.coverage.uncoveredRequirementIds.map((rid: string) => {
                      const req = currentKit.role.requirements.find(r => r.id === rid);
                      return <li key={rid}>{rid}: {req?.text || 'Unknown'}</li>;
                    })}
                  </ul>
                </div>
              )}
              <p className="text-xs text-dark-500 dark:text-dark-400 mt-2">
                Generation passes: {currentKit.coverage.passes}
              </p>
            </div>

            <div className="card p-6">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white mb-4">Statistics</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-dark-50 dark:bg-dark-800/50 rounded-xl">
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{currentKit.role.requirements.length}</p>
                  <p className="text-sm text-dark-500 dark:text-dark-400">Requirements</p>
                </div>
                <div className="text-center p-4 bg-dark-50 dark:bg-dark-800/50 rounded-xl">
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{currentKit.questions.length}</p>
                  <p className="text-sm text-dark-500 dark:text-dark-400">Questions</p>
                </div>
                <div className="text-center p-4 bg-dark-50 dark:bg-dark-800/50 rounded-xl">
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{currentKit.flashcards.length}</p>
                  <p className="text-sm text-dark-500 dark:text-dark-400">Flashcards</p>
                </div>
                <div className="text-center p-4 bg-dark-50 dark:bg-dark-800/50 rounded-xl">
                  <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{currentKit.schedule.daysAvailable}</p>
                  <p className="text-sm text-dark-500 dark:text-dark-400">Days</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'requirements' && (
          <div className="card p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Requirements</h2>
              <button onClick={() => setShowNewRequirement(!showNewRequirement)} className="btn-primary text-sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Requirement
              </button>
            </div>
            {showNewRequirement && (
              <div className="mb-4 p-4 bg-dark-50 dark:bg-dark-800/50 rounded-lg space-y-3">
                <textarea
                  value={newRequirement.text}
                  onChange={(e) => setNewRequirement({ ...newRequirement, text: e.target.value })}
                  className="textarea text-sm"
                  placeholder="Enter requirement text..."
                  rows={2}
                />
                <div className="flex gap-2">
                  <select value={newRequirement.kind} onChange={(e) => setNewRequirement({ ...newRequirement, kind: e.target.value as 'technical' | 'behavioural' | 'domain' })} className="input text-sm w-32">
                    <option value="technical">Technical</option>
                    <option value="behavioural">Behavioural</option>
                    <option value="domain">Domain</option>
                  </select>
                  <select value={newRequirement.priority} onChange={(e) => setNewRequirement({ ...newRequirement, priority: e.target.value as 'must' | 'nice' })} className="input text-sm w-32">
                    <option value="must">Must Have</option>
                    <option value="nice">Nice to Have</option>
                  </select>
                  <button onClick={handleAddRequirement} className="btn-primary text-sm py-1 px-3">Add</button>
                  <button onClick={() => setShowNewRequirement(false)} className="btn-ghost text-sm py-1 px-3">Cancel</button>
                </div>
              </div>
            )}
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndRequirements}>
              <SortableContext items={currentKit.role.requirements.map((r: any) => r.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {currentKit.role.requirements.map((req: any) => (
                    <SortableItem key={req.id} id={req.id}>
                      <RequirementEditor
                        requirement={req}
                        onUpdate={(updates) => updateRequirement(req.id, updates)}
                        onDelete={() => deleteRequirement(req.id)}
                        onPin={() => {}}
                        isPinned={false}
                      />
                    </SortableItem>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            {(!currentKit.role?.requirements || currentKit.role.requirements.length === 0) && (
              <div className="text-center py-10 space-y-3 bg-dark-50/60 dark:bg-dark-900/40 rounded-xl border border-dashed border-dark-200 dark:border-dark-800">
                <p className="text-dark-600 dark:text-dark-400 text-sm">No requirements extracted yet</p>
                <button
                  type="button"
                  onClick={() => handleRegenerate('role')}
                  disabled={isGenerating}
                  className="btn-primary text-sm inline-flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating && generatingCategory === 'role' ? 'animate-spin' : ''}`} />
                  <span>Generate Requirements from Role</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="card p-6 animate-fade-in space-y-6">
            {/* Header & Primary Actions */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-dark-100 dark:border-dark-800">
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-dark-900 dark:text-white">Interview Questions & Architecture</h2>
                  <span className="badge font-mono text-xs bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 font-bold px-2 py-0.5">
                    {currentKit.questions.length} Total
                  </span>
                </div>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">
                  High-yield questions with model answers, rubrics, and interactive ASCII architecture diagrams.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleRegenerate('more-questions')}
                  disabled={isGenerating}
                  className="btn-primary text-sm flex items-center gap-1.5 shadow-sm"
                  title="Generate high-yield questions across Technical, Behavioural, System Design, and Company Fit"
                >
                  {isGenerating && (!generatingCategory || generatingCategory === 'more-questions') ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  )}
                  <span>Generate More (All Categories)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowNewQuestion(!showNewQuestion)}
                  className="btn-ghost border border-dark-200 dark:border-dark-700 text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4 mr-0.5" />
                  Add Question
                </button>
              </div>
            </div>

            {/* Category Quick Generators Toolbar */}
            <div className="p-3 bg-dark-50/70 dark:bg-dark-900/40 rounded-xl border border-dark-200/80 dark:border-dark-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-semibold text-dark-600 dark:text-dark-400 flex items-center gap-1.5 shrink-0">
                <RefreshCw className="w-3.5 h-3.5 text-primary-500" />
                Generate More By Category:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleRegenerate('technical')}
                  disabled={isGenerating}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {generatingCategory === 'technical' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Cpu className="w-3 h-3" />
                  )}
                  <span>+3 Technical</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRegenerate('behavioural')}
                  disabled={isGenerating}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {generatingCategory === 'behavioural' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Users className="w-3 h-3" />
                  )}
                  <span>+3 Behavioural (STAR)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRegenerate('system-design')}
                  disabled={isGenerating}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 hover:bg-orange-100 dark:hover:bg-orange-900/60 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {generatingCategory === 'system-design' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Layers className="w-3 h-3" />
                  )}
                  <span>+3 System Design (Diagrams)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRegenerate('company-fit')}
                  disabled={isGenerating}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {generatingCategory === 'company-fit' ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Building2 className="w-3 h-3" />
                  )}
                  <span>+2 Company Fit</span>
                </button>
              </div>
            </div>

            {/* Filter Chips & Search Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'All', count: currentKit.questions.length },
                  { id: 'technical', label: 'Technical', count: currentKit.questions.filter((q: any) => q.category === 'technical').length },
                  { id: 'behavioural', label: 'Behavioural', count: currentKit.questions.filter((q: any) => q.category === 'behavioural').length },
                  {
                    id: 'system-design',
                    label: 'System Design',
                    count: currentKit.questions.filter((q: any) => q.category === 'system-design').length,
                    diagramCount: currentKit.questions.filter((q: any) => q.category === 'system-design' && q.diagram).length
                  },
                  { id: 'company-fit', label: 'Company Fit', count: currentKit.questions.filter((q: any) => q.category === 'company-fit').length },
                ].map((item) => {
                  const isActive = selectedCategoryFilter === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(item.id as any)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                        isActive
                          ? 'bg-primary-600 text-white shadow-xs'
                          : 'bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/20 text-white' : 'bg-dark-200 dark:bg-dark-700 text-dark-500 dark:text-dark-400'
                      }`}>
                        {item.count}
                      </span>
                      {item.diagramCount && item.diagramCount > 0 ? (
                        <span className="text-[10px] text-amber-300 font-semibold" title={`${item.diagramCount} with diagrams`}>
                          📐
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>

              {/* Search filter input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-dark-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={questionSearch}
                  onChange={(e) => setQuestionSearch(e.target.value)}
                  placeholder="Search questions or req IDs..."
                  className="input text-xs pl-8 pr-7 py-1.5 w-full"
                />
                {questionSearch && (
                  <button
                    type="button"
                    onClick={() => setQuestionSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-600 dark:hover:text-dark-200 text-xs"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* New Question Creator Modal / Box */}
            {showNewQuestion && (
              <div className="p-4 bg-primary-50/40 dark:bg-dark-800/80 rounded-xl border border-primary-200 dark:border-primary-900/40 space-y-3 animate-fade-in shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-primary-800 dark:text-primary-300">
                    Create New Question
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNewQuestion(false)}
                    className="text-xs text-dark-400 hover:text-dark-600 dark:hover:text-dark-200"
                  >
                    Cancel
                  </button>
                </div>

                <textarea
                  value={newQuestion.prompt}
                  onChange={(e) => setNewQuestion({ ...newQuestion, prompt: e.target.value })}
                  className="textarea text-sm"
                  placeholder="Interview prompt (e.g. Design an asynchronous notifications service...)"
                  rows={2}
                />
                <textarea
                  value={newQuestion.answerOutline}
                  onChange={(e) => setNewQuestion({ ...newQuestion, answerOutline: e.target.value })}
                  className="textarea text-sm"
                  placeholder="Answer outline / evaluation rubric (STAR method, system components, trade-offs...)"
                  rows={3}
                />

                <div>
                  <label className="text-xs font-medium text-dark-600 dark:text-dark-400 mb-1 block">
                    Architecture Diagram (ASCII or Text Blueprint - Optional)
                  </label>
                  <textarea
                    value={newQuestion.diagram}
                    onChange={(e) => setNewQuestion({ ...newQuestion, diagram: e.target.value })}
                    className="textarea text-xs font-mono"
                    placeholder={`[Client] -> [Load Balancer] -> [API Gateway]\n                     |\n        +------------+------------+\n        |                         |\n  [Worker Service]         [Redis Cache]\n        |\n   [Database]`}
                    rows={4}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <div>
                    <label className="text-xs text-dark-500 mb-1 block">Category</label>
                    <select
                      value={newQuestion.category}
                      onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value as any })}
                      className="input text-sm w-44"
                    >
                      <option value="technical">Technical</option>
                      <option value="behavioural">Behavioural</option>
                      <option value="system-design">System Design</option>
                      <option value="company-fit">Company Fit</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-dark-500 mb-1 block">Difficulty</label>
                    <select
                      value={newQuestion.difficulty}
                      onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: parseInt(e.target.value) as 1 | 2 | 3 })}
                      className="input text-sm w-32"
                    >
                      <option value={1}>★☆☆ Easy</option>
                      <option value={2}>★★☆ Medium</option>
                      <option value={3}>★★★ Hard</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 ml-auto pt-5">
                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="btn-primary text-sm py-1.5 px-4"
                    >
                      Add Question
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewQuestion(false)}
                      className="btn-ghost text-sm py-1.5 px-3"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Questions List (Filtered & Searchable) */}
            {(() => {
              const filteredQuestions = currentKit.questions.filter((q: any) => {
                const matchesCategory = selectedCategoryFilter === 'all' || q.category === selectedCategoryFilter;
                const matchesSearch = !questionSearch.trim() ||
                  q.prompt.toLowerCase().includes(questionSearch.toLowerCase()) ||
                  (q.answerOutline && q.answerOutline.toLowerCase().includes(questionSearch.toLowerCase())) ||
                  (q.requirementIds && q.requirementIds.some((r: string) => r.toLowerCase().includes(questionSearch.toLowerCase())));
                return matchesCategory && matchesSearch;
              });

              if (filteredQuestions.length === 0) {
                return (
                  <div className="text-center py-12 px-4 rounded-xl border border-dashed border-dark-300 dark:border-dark-700">
                    <Layers className="w-10 h-10 text-dark-300 dark:text-dark-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-dark-700 dark:text-dark-300">
                      No questions match your current filter
                    </p>
                    <p className="text-xs text-dark-500 mt-1 max-w-sm mx-auto">
                      {selectedCategoryFilter !== 'all'
                        ? `You don't have questions under ${selectedCategoryFilter} yet. Generate more or clear filters.`
                        : 'No questions available.'}
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                      {selectedCategoryFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => handleRegenerate(selectedCategoryFilter)}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          Generate {selectedCategoryFilter} Questions
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { setSelectedCategoryFilter('all'); setQuestionSearch(''); }}
                        className="btn-ghost text-xs py-1.5 px-3"
                      >
                        Reset Filter
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndQuestions}>
                  <SortableContext items={filteredQuestions.map((q: any) => q.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                      {filteredQuestions.map((q: any) => (
                        <SortableItem key={q.id} id={q.id}>
                          <QuestionEditor
                            question={q}
                            requirements={currentKit.role.requirements}
                            onUpdate={(updates) => updateQuestion(q.id, updates)}
                            onDelete={() => deleteQuestion(q.id)}
                            onMove={(cat) => moveQuestion(q.id, cat as any)}
                            onPin={() => pinQuestion(q.id)}
                            isPinned={q.status === 'pinned'}
                          />
                        </SortableItem>
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              );
            })()}

            {currentKit.questions.length === 0 && (
              <p className="text-center text-dark-500 dark:text-dark-400 py-8">No questions generated yet</p>
            )}
          </div>
        )}

        {activeTab === 'flashcards' && (
          <div className="card p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Flashcards</h2>
              <button onClick={() => setShowNewFlashcard(!showNewFlashcard)} className="btn-primary text-sm">
                <Plus className="w-4 h-4 mr-1" />
                Add Flashcard
              </button>
            </div>
            {showNewFlashcard && (
              <div className="mb-4 p-4 bg-dark-50 dark:bg-dark-800/50 rounded-lg space-y-3">
                <input
                  value={newFlashcard.front}
                  onChange={(e) => setNewFlashcard({ ...newFlashcard, front: e.target.value })}
                  className="input text-sm"
                  placeholder="Front (question/concept)..."
                />
                <textarea
                  value={newFlashcard.back}
                  onChange={(e) => setNewFlashcard({ ...newFlashcard, back: e.target.value })}
                  className="textarea text-sm"
                  placeholder="Back (answer/explanation)..."
                  rows={2}
                />
                <div className="flex gap-2">
                  <button onClick={handleAddFlashcard} className="btn-primary text-sm py-1 px-3">Add</button>
                  <button onClick={() => setShowNewFlashcard(false)} className="btn-ghost text-sm py-1 px-3">Cancel</button>
                </div>
              </div>
            )}
            <div className="grid md:grid-cols-2 gap-3">
              {currentKit.flashcards.map((fc: any) => (
                <FlashcardEditor
                  key={fc.id}
                  flashcard={fc}
                  onUpdate={(updates) => updateFlashcard(fc.id, updates)}
                  onDelete={() => deleteFlashcard(fc.id)}
                />
              ))}
            </div>
            {currentKit.flashcards.length === 0 && (
              <p className="text-center text-dark-500 dark:text-dark-400 py-8">No flashcards generated yet</p>
            )}
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="card p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-dark-900 dark:text-white">
                  Study Schedule ({currentKit.schedule?.daysAvailable || currentKit.schedule?.days?.length || 7} days)
                </h2>
                <p className="text-xs text-dark-500 dark:text-dark-400 mt-0.5">
                  Structured day-by-day plan mapped to interview topics and practice questions.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRegenerate('schedule')}
                disabled={isGenerating}
                className="btn-secondary text-sm flex items-center gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${isGenerating && generatingCategory === 'schedule' ? 'animate-spin' : ''}`} />
                <span>{isGenerating && generatingCategory === 'schedule' ? 'Regenerating...' : 'Regenerate'}</span>
              </button>
            </div>
            <div className="space-y-4">
              {(currentKit.schedule?.days || []).map((day: any) => (
                <div key={day.day} className="p-4 bg-dark-50 dark:bg-dark-800/50 rounded-xl border border-dark-100 dark:border-dark-800/60">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-dark-900 dark:text-white">
                      Day {day.day} — {day.focus}
                    </h3>
                    <span className="badge bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300 font-medium">
                      {day.minutes} min
                    </span>
                  </div>
                  {day.questionIds && day.questionIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {day.questionIds.map((qid: string) => {
                        const q = currentKit.questions.find((question: any) => question.id === qid);
                        return q ? (
                          <span key={qid} className="badge text-xs bg-dark-100 dark:bg-dark-700 text-dark-700 dark:text-dark-300">
                            {q.id}: {q.prompt.slice(0, 50)}...
                          </span>
                        ) : null;
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-dark-500 dark:text-dark-400 italic">Review day - revisit flashcards, practice architecture diagrams, and review core concepts</p>
                  )}
                </div>
              ))}
              {(!currentKit.schedule?.days || currentKit.schedule.days.length === 0) && (
                <div className="text-center py-10 space-y-3 bg-dark-50/60 dark:bg-dark-900/40 rounded-xl border border-dashed border-dark-200 dark:border-dark-800">
                  <p className="text-dark-600 dark:text-dark-400 text-sm">No schedule days generated yet</p>
                  <button
                    type="button"
                    onClick={() => handleRegenerate('schedule')}
                    disabled={isGenerating}
                    className="btn-primary text-sm inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Generate {currentKit.schedule?.daysAvailable || 7}-Day Study Schedule</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}