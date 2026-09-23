import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const api = axios.create({
  baseURL: '/api/backend',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
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
  
  regenerateSection: (id: string, section: string) =>
    api.post<{ kit: Kit }>(`/kits/${id}/regenerate-section`, { section }),
  
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