import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    const raw = process.env.NEXT_PUBLIC_API_URL.trim();
    if (raw) {
      return raw.endsWith('/api') ? raw : `${raw.replace(/\/$/, '')}/api`;
    }
  }
  return '/api/backend';
};

const api = axios.create({
  baseURL: getBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      let token = localStorage.getItem('auth_token');
      if (!token) {
        try {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            token = parsed?.state?.token;
          }
        } catch {}
      }
      if (token) {
        config.headers.set('Authorization', `Bearer ${token}`);
        config.headers.set('x-auth-token', token);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        const url = error.config?.url || '';
        const isAuthCheck = url.includes('/auth/me');
        const pathname = window.location.pathname;
        const isPublicPage = pathname === '/login' || pathname === '/register' || pathname === '/';

        localStorage.removeItem('auth_token');

        if (!isAuthCheck && !isPublicPage) {
          // Avoid hard reloading if already on login
          if (pathname !== '/login') {
            window.location.href = '/login';
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
}

export interface Kit {
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
    requirements: Requirement[];
  };
  questions: Question[];
  flashcards: Flashcard[];
  schedule: {
    daysAvailable: number;
    days: ScheduleDay[];
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

export interface Requirement {
  id: string;
  text: string;
  kind: 'technical' | 'behavioural' | 'domain';
  priority: 'must' | 'nice';
}

export interface Question {
  id: string;
  requirementIds: string[];
  category: 'technical' | 'behavioural' | 'system-design' | 'company-fit';
  prompt: string;
  answerOutline: string;
  difficulty: 1 | 2 | 3;
  status?: 'generated' | 'edited' | 'pinned';
  diagram?: string;
  diagramType?: 'architecture' | 'flowchart' | 'sequence' | 'ascii';
  keyRubric?: string[];
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  requirementIds: string[];
  status?: 'generated' | 'edited' | 'pinned';
}

export interface ScheduleDay {
  day: number;
  focus: string;
  questionIds: string[];
  minutes: number;
}

export interface CreateKitInput {
  jobDescription: string;
  companyUrl: string;
  days: number;
  role?: string;
  location?: string;
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    api.post<AuthResponse>('/auth/register', { email, password, name }),
  
  login: (email: string, password: string) =>
    api.post<AuthResponse>('/auth/login', { email, password }),
  
  logout: () => api.post('/auth/logout'),
  
  me: () => api.get<AuthResponse>('/auth/me')
};

export const kitsApi = {
  list: () => api.get<{ kits: Kit[] }>('/kits'),
  
  get: (id: string) => api.get<{ kit: Kit }>(`/kits/${id}`),
  
  create: (data: CreateKitInput) => api.post<{ kit: Kit }>('/kits', data),
  
  update: (id: string, data: Partial<Kit>) => api.patch<{ kit: Kit }>(`/kits/${id}`, data),
  
  delete: (id: string) => api.delete(`/kits/${id}`),
  
  regenerateSection: (id: string, section: string, options?: { count?: number; category?: string }) =>
    api.post<{ kit: Kit; message?: string; addedCount?: number }>(`/kits/${id}/regenerate-section`, { section, ...options }),
  
  generateMoreQuestions: (id: string, category?: string, count?: number) =>
    api.post<{ kit: Kit; message?: string; addedCount?: number }>(`/kits/${id}/regenerate-section`, { section: category || 'more-questions', count: count || 4 }),
  
  generate: (id: string, jobDescription: string) =>
    api.post<{ kit: Kit }>(`/generation/generate/${id}`, { jobDescription })
};

export const researchApi = {
  crawl: (url: string) => api.post('/research/crawl', { url }),
  
  findHiring: (url: string, html?: string) =>
    api.post('/research/find-hiring', { url, html }),
  
  searchDiscussion: (companyName: string) =>
    api.post('/research/search-discussion', { companyName })
};

export default api;