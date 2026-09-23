# Interview Prep Kit

Turn job descriptions into personalized interview preparation kits.

## Project Overview

Interview Prep Kit is a full-stack web application that takes a job description and company URL, researches the company, and generates a comprehensive interview preparation kit including:

- **Company Brief**: Summary of what the company does and how they hire
- **Role Breakdown**: Title, seniority, responsibilities, and extracted requirements
- **Question Bank**: Categorized questions (technical, behavioural, system-design, company-fit)
- **Flashcards**: For quick review with confidence tracking
- **Study Schedule**: Day-by-day plan prioritizing must-have requirements

## Tech Stack

| Component | Technology | Reasoning |
|-----------|-----------|-----------|
| Frontend | Next.js 14 + Tailwind CSS | Modern React framework with SSR, great DX, and Tailwind for rapid UI development |
| Backend | Node.js + Express | Lightweight, fast to develop, excellent for API servers |
| Database | MongoDB + Mongoose | Flexible schema for kit structures, good for JSON-like documents |
| Language | TypeScript | Type safety across the stack, better IDE support |
| LLM | Google Gemini 1.5 Flash | Free tier available, good performance for code generation |
| Scraping | Cheerio + node-fetch | Lightweight HTML parsing without browser overhead |
| State | Zustand | Minimal, performant state management |

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Auth UI  │ │ Kit List │ │  Builder │ │ Practice │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│         ↓              ↓            ↓           ↓        │
│         └──────────────┴────────────┴───────────┘        │
│                    Zustand Store                         │
└────────────────────┬────────────────────────────────────┘
                     │ REST API
┌────────────────────┴────────────────────────────────────┐
│                   Backend (Express)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  Auth    │ │   Kits   │ │Research  │ │Generation│   │
│  │ Routes   │ │  Routes  │ │ Service  │ │ Service  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│         ↓              ↓            ↓           ↓        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │  User    │ │   Kit    │ │  Crawler │ │  LLM     │   │
│  │  Model   │ │  Model   │ │  Engine  │ │ Pipeline │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
└────────────────────┬────────────────────────────────────┘
                     │
            ┌────────┴────────┐
            │    MongoDB      │
            └─────────────────┘
```

## Retrieval Approach

### 1. Company Site Crawling
- Starts at provided company URL
- Fetches and parses HTML using Cheerio
- Extracts links and scores them based on relevance keywords:
  - High score: `/careers`, `/jobs`, `/hiring`, `/about`
  - Medium score: `/blog`, `/engineering`, `/team`
  - Penalizes: depth, external links
- Respects `robots.txt` using `robots-parser`
- Rate limits requests with exponential backoff

### 2. Hiring Page Discovery
- Ranks crawled pages by hiring-relevant keywords
- Returns top candidates for hiring process information
- Handles pages that may not exist (graceful degradation)

### 3. Public Discussion Search
- Searches DuckDuckGo for company interview discussions
- Extracts snippets from Glassdoor, Reddit, Blind
- Aggregates findings into a research summary

### 4. Content Processing
- Cleans HTML to extract readable text
- Removes scripts, styles, navigation elements
- Respects content type and size limits

## Research and Generation Pipeline

The pipeline executes in a specific sequence where each step depends on the previous:

```
1. Input Validation
   ↓
2. Site Crawling (fetch homepage, find links)
   ↓
3. Hiring Page Discovery (rank and fetch relevant pages)
   ↓
4. Public Discussion Search (find interview experiences)
   ↓
5. Requirement Extraction (from job description via LLM)
   ↓
6. Company Brief Generation (from crawled content via LLM)
   ↓
7. Role Breakdown (from JD + requirements via LLM)
   ↓
8. Question Generation (separate calls per category)
   ↓
9. Flashcard Generation (from requirements + questions)
   ↓
10. Coverage Check (deterministic - compare requirements vs questions)
    ↓
11. Gap Filling (generate missing questions for uncovered reqs)
    ↓
12. Schedule Allocation (deterministic - distribute across days)
```

### Why Separate LLM Calls Per Category?

Questions for different categories require different framing:
- **Technical**: Tests specific skills from the JD
- **Behavioural**: Uses STAR format for soft skills
- **System Design**: Tests architectural thinking
- **Company Fit**: Tests culture alignment

A single prompt would produce homogeneous questions. Separate calls with targeted instructions yield better category-appropriate questions.

## Generated vs Edited vs Pinned State

Each item (question, flashcard, requirement) tracks its state:

- **generated**: Created by the AI pipeline, will be overwritten on regeneration
- **edited**: Modified by the user, will be preserved on regeneration (marked with `status: 'edited'`)
- **pinned**: Manually created or explicitly locked, never overwritten on regeneration

### Implementation:
```typescript
interface ItemState {
  data: any;
  status: 'generated' | 'edited' | 'pinned';
}
```

When regenerating a section:
1. Items with status `'generated'` are replaced with new AI output
2. Items with status `'edited'` are preserved, new questions fill gaps
3. Items with status `'pinned'` are always preserved

## Schedule Allocation Algorithm

The schedule is allocated deterministically (not via LLM):

1. **Priority Sort**: Must-have requirements come first
2. **Difficulty Weighting**: Harder material lands earlier
3. **Even Distribution**: Questions spread across available days
4. **Gap Fill**: Unassigned questions added to last day

```
days_available = N
questions_per_day = ceil(total_questions / N)
base_minutes = 60 + (questions_per_day × 5)

For each day:
  - Select next batch of questions
  - Focus = first requirement covered that day
  - Ensure all must-have requirements appear somewhere
```

## Coverage Checking (Second Pass)

Coverage is checked deterministically:

1. After initial generation, compare `requirement_ids` in questions vs all requirements
2. Find uncovered must-have requirements
3. Generate targeted questions for gaps
4. Re-check (up to MAX_PASSES = 3)
5. Record final coverage stats in `coverage.passes`

## Edge Cases and Failure Handling

| Case | Approach |
|------|----------|
| Invalid company URL | Reject at input validation, return 400 |
| Company site 404 | Record error, continue with empty research |
| No hiring page found | Generate questions from JD only, note in brief |
| Stub job description | Extract fewer requirements, produce thinner kit |
| No public discussion | Skip search results, rely on site content |
| Invalid LLM JSON | Retry with cleaned response, fallback to defaults |
| Rate limiting | Exponential backoff, retry up to 3 times |
| Duplicate submission | New kit created (idempotent via timestamp) |
| 1-day schedule | All questions in one day |
| 60-day schedule | Spread thin, add review days |

## Setup Instructions

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Google Gemini API key (free tier)
- VS Code (recommended)

### Running in VS Code (Step by Step)

1. **Open VS Code** and clone or open the project folder:
   ```
   File > Open Folder > Select interview-prep-kit
   ```

2. **Install required VS Code extensions** (recommended):
   - ESLint (`dbaeumer.vscode-eslint`)
   - Tailwind CSS IntelliSense (`bradlc.vscode-tailwindcss`)
   - TypeScript (`ms-vscode.vscode-typescript-next`)

3. **Open the terminal in VS Code** (Ctrl+` or View > Terminal)

4. **Install dependencies** - run in terminal:
   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend && npm install && cd ..

   # Install frontend dependencies
   cd frontend && npm install && cd ..
   ```

5. **Set up environment variables**:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Then edit `backend/.env` in VS Code and add:
   - Your MongoDB connection string (or use local MongoDB)
   - A Gemini API key from https://makersuite.google.com/app/apikey
   - A secure JWT_SECRET

6. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

7. **Run the application** - Option A (single command):
   ```bash
   npm run dev
   ```

8. **Run the application** - Option B (separate terminals):
   - Terminal 1 (Backend): `cd backend && npm run dev`
   - Terminal 2 (Frontend): `cd frontend && npm run dev`

9. **Open in browser**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api/health

10. **Demo credentials** (on login page):
    - Email: `demo@interviewprepkit.com` / Password: `demo123456`
    - Email: `alex@techcorp.com` / Password: `alex123456`
    - Email: `sarah@startup.io` / Password: `sarah123456`

### Local Development (CLI)

```bash
# Clone repository
git clone <repo-url>
cd interview-prep-kit

# Install dependencies
npm run install:all

# Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI and Gemini API key

# Start development servers
npm run dev
```

Frontend: http://localhost:3000
Backend: http://localhost:3001

### Batch Entry Point

```bash
# Create input file
cat > cases.json << 'EOF'
[
  {
    "id": "case-01",
    "jd": "Senior Backend Engineer\n\nWe are looking for...",
    "company_url": "https://example.com",
    "days": 5
  }
]
EOF

# Run evaluation
npm run evaluate -- --input cases.json --output kits.json
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | 3001 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/interview-prep-kit |
| `JWT_SECRET` | Secret for JWT signing | (must be set) |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:3000 |
| `GEMINI_API_KEY` | Google Gemini API key | (must be set) |

## Known Limitations

1. **Rate Limits**: Free tier Gemini has 15 RPM limit; pipeline handles with backoff
2. **Site Accessibility**: Some company sites block automated access
3. **LLM Quality**: Question quality depends on JD clarity and company research
4. **Local Storage**: Practice progress stored in localStorage (not synced across devices)

## Creative Feature: Confidence-Weighted Practice

The practice mode implements a spaced repetition algorithm:

- Cards sorted by confidence (weakest first)
- After each review, confidence is updated (0.2 to 1.0)
- Next review interval calculated based on confidence × review count
- Progress persists locally for session continuity

This ensures candidates focus on areas where they need the most improvement.