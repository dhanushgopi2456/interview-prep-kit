'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useKitStore } from '@/stores/kitStore';
import { kitsApi, Kit } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { AnimatedBackground } from '@/components/AnimatedBackground';
import { ArrowLeft, Briefcase, Play, Edit3, RefreshCw, ChevronDown, ChevronUp, Plus, Trash2, GripVertical, Eye, EyeOff, Loader2, Check, X, BookOpen, Target, Calendar, FileText, Zap } from 'lucide-react';
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
  const [prompt, setPrompt] = useState(question.prompt);
  const [answerOutline, setAnswerOutline] = useState(question.answerOutline);
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [category, setCategory] = useState(question.category);
  const [requirementIds, setRequirementIds] = useState(question.requirementIds);

  return (
    <div className={`p-4 rounded-lg border transition-all ${isPinned ? 'border-primary-300 dark:border-primary-700 bg-primary-50/50 dark:bg-primary-900/20' : 'border-dark-200 dark:border-dark-700'}`}>
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="textarea text-sm"
            placeholder="Question prompt..."
            rows={3}
          />
          <textarea
            value={answerOutline}
            onChange={(e) => setAnswerOutline(e.target.value)}
            className="textarea text-sm"
            placeholder="Answer outline..."
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="input text-sm w-40">
              <option value="technical">Technical</option>
              <option value="behavioural">Behavioural</option>
              <option value="system-design">System Design</option>
              <option value="company-fit">Company Fit</option>
            </select>
            <select value={difficulty} onChange={(e) => setDifficulty(parseInt(e.target.value) as 1 | 2 | 3)} className="input text-sm w-28">
              <option value={1}>Easy</option>
              <option value={2}>Medium</option>
              <option value={3}>Hard</option>
            </select>
            <div className="w-full">
              <label className="text-xs text-dark-500 dark:text-dark-400 mb-1 block">Linked Requirements</label>
              <div className="flex flex-wrap gap-1">
                {requirements.map(req => (
                  <button
                    key={req.id}
                    onClick={() => setRequirementIds((prev: string[]) => prev.includes(req.id) ? prev.filter((id: string) => id !== req.id) : [...prev, req.id])}
                    className={`badge text-xs cursor-pointer transition-colors ${requirementIds.includes(req.id) ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300' : 'bg-dark-100 text-dark-500 dark:bg-dark-800 dark:text-dark-400'}`}
                  >
                    {req.id}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { onUpdate({ prompt, answerOutline, difficulty, category, requirementIds }); setIsEditing(false); }} className="btn-primary text-sm py-1 px-3">
              Save
            </button>
            <button onClick={() => setIsEditing(false)} className="btn-ghost text-sm py-1 px-3">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-mono text-dark-500 dark:text-dark-400">{question.id}</span>
                <span className={`badge text-xs ${question.category === 'technical' ? 'badge-technical' : question.category === 'behavioural' ? 'badge-behavioural' : question.category === 'system-design' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300'}`}>
                  {question.category}
                </span>
                <span className="text-xs text-dark-500 dark:text-dark-400">
                  Difficulty: {'★'.repeat(question.difficulty)}{'☆'.repeat(3 - question.difficulty)}
                </span>
              </div>
              <p className="text-sm font-medium text-dark-800 dark:text-dark-200 mb-2">{question.prompt}</p>
              {question.answerOutline && (
                <div className="text-xs text-dark-500 dark:text-dark-400 mt-2 p-2 bg-dark-50 dark:bg-dark-800/50 rounded">
                  <strong>Answer Outline:</strong> {question.answerOutline.slice(0, 200)}{question.answerOutline.length > 200 ? '...' : ''}
                </div>
              )}
              {question.requirementIds && question.requirementIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {question.requirementIds.map((rid: string) => (
                    <span key={rid} className="badge text-xs bg-dark-100 text-dark-600 dark:bg-dark-800 dark:text-dark-300">{rid}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={onPin} className={`p-1 rounded transition-colors ${isPinned ? 'text-primary-500 bg-primary-100 dark:bg-primary-900/30' : 'text-dark-400 hover:text-primary-500'}`} title="Pin this question">
                {isPinned ? <BookOpen className="w-4 h-4" /> : <BookOpen className="w-4 h-4 opacity-50" />}
              </button>
              <button onClick={() => setIsEditing(true)} className="p-1 text-dark-400 hover:text-dark-600 dark:hover:text-dark-300 rounded">
                <Edit3 className="w-4 h-4" />
              </button>
              <select
                onChange={(e) => { if (e.target.value) { onMove(e.target.value); e.target.value = ''; } }}
                className="text-xs border border-dark-200 dark:border-dark-700 rounded p-1"
                defaultValue=""
              >
                <option value="" disabled>Move to...</option>
                <option value="technical">Technical</option>
                <option value="behavioural">Behavioural</option>
                <option value="system-design">System Design</option>
                <option value="company-fit">Company Fit</option>
              </select>
              <button onClick={onDelete} className="p-1 text-dark-400 hover:text-red-500 rounded">
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
  const [newQuestion, setNewQuestion] = useState<{prompt: string; answerOutline: string; category: 'technical' | 'behavioural' | 'system-design' | 'company-fit'; difficulty: 1 | 2 | 3; requirementIds: string[]}>({ prompt: '', answerOutline: '', category: 'technical', difficulty: 2, requirementIds: [] });
  const [showNewQuestion, setShowNewQuestion] = useState(false);
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
      setKit(data.kit);
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
    try {
      await kitsApi.regenerateSection(currentKit._id, section);
      toast.success(`Regenerating ${section}...`);
      setTimeout(loadKit, 2000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to regenerate');
    } finally {
      setGenerating(false);
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
    addQuestion({ id: `q${Date.now()}`, ...newQuestion });
    setNewQuestion({ prompt: '', answerOutline: '', category: 'technical', difficulty: 2, requirementIds: [] });
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
            {currentKit.role.requirements.length === 0 && (
              <p className="text-center text-dark-500 dark:text-dark-400 py-8">No requirements yet</p>
            )}
          </div>
        )}

        {activeTab === 'questions' && (
          <div className="card p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">Questions</h2>
              <div className="flex gap-2">
                {['technical', 'behavioural', 'system-design', 'company-fit'].map(cat => (
                  <button key={cat} onClick={() => handleRegenerate(cat)} className="btn-ghost text-sm" title={`Regenerate ${cat}`}>
                    <RefreshCw className="w-3 h-3" />
                    <span className="hidden sm:inline ml-1">{cat}</span>
                  </button>
                ))}
                <button onClick={() => setShowNewQuestion(!showNewQuestion)} className="btn-primary text-sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Question
                </button>
              </div>
            </div>
            {showNewQuestion && (
              <div className="mb-4 p-4 bg-dark-50 dark:bg-dark-800/50 rounded-lg space-y-3">
                <textarea
                  value={newQuestion.prompt}
                  onChange={(e) => setNewQuestion({ ...newQuestion, prompt: e.target.value })}
                  className="textarea text-sm"
                  placeholder="Question prompt..."
                  rows={2}
                />
                <textarea
                  value={newQuestion.answerOutline}
                  onChange={(e) => setNewQuestion({ ...newQuestion, answerOutline: e.target.value })}
                  className="textarea text-sm"
                  placeholder="Answer outline..."
                  rows={2}
                />
                <div className="flex gap-2">
                  <select value={newQuestion.category} onChange={(e) => setNewQuestion({ ...newQuestion, category: e.target.value as 'technical' | 'behavioural' | 'system-design' | 'company-fit' })} className="input text-sm w-40">
                    <option value="technical">Technical</option>
                    <option value="behavioural">Behavioural</option>
                    <option value="system-design">System Design</option>
                    <option value="company-fit">Company Fit</option>
                  </select>
                  <select value={newQuestion.difficulty} onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: parseInt(e.target.value) as 1 | 2 | 3 })} className="input text-sm w-28">
                    <option value={1}>Easy</option>
                    <option value={2}>Medium</option>
                    <option value={3}>Hard</option>
                  </select>
                  <button onClick={handleAddQuestion} className="btn-primary text-sm py-1 px-3">Add</button>
                  <button onClick={() => setShowNewQuestion(false)} className="btn-ghost text-sm py-1 px-3">Cancel</button>
                </div>
              </div>
            )}
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEndQuestions}>
              <SortableContext items={currentKit.questions.map((q: any) => q.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {currentKit.questions.map((q: any) => (
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
              <h2 className="text-xl font-semibold text-dark-900 dark:text-white">
                Study Schedule ({currentKit.schedule.daysAvailable} days)
              </h2>
              <button onClick={() => handleRegenerate('schedule')} className="btn-secondary text-sm">
                <RefreshCw className="w-4 h-4 mr-1" />
                Regenerate
              </button>
            </div>
            <div className="space-y-4">
              {currentKit.schedule.days.map((day: any) => (
                <div key={day.day} className="p-4 bg-dark-50 dark:bg-dark-800/50 rounded-xl">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-dark-900 dark:text-white">
                      Day {day.day} — {day.focus}
                    </h3>
                    <span className="badge bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                      {day.minutes} min
                    </span>
                  </div>
                  {day.questionIds.length > 0 ? (
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
                    <p className="text-sm text-dark-500 dark:text-dark-400 italic">Review day - revisit flashcards and weak areas</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}