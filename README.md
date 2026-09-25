# 🚀 Interview Prep Kit

### 🎯 Turn Any Job Description Into a Personalized Interview Preparation Plan

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=24&pause=1000&color=6366F1&center=true&vCenter=true&width=800&lines=AI-Powered+Interview+Preparation;Analyze+Job+Descriptions+%F0%9F%94%8D;Research+Companies+%F0%9F%8F%A2;Generate+Targeted+Questions+%F0%9F%A7%A0;Practice+Smarter+%F0%9F%8E%AF" />
</p>

<p align="center">
  <strong>From Job Description → Company Research → Questions → Flashcards → Study Plan</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" />
  <img src="https://img.shields.io/badge/Node.js-Express-green?style=for-the-badge&logo=node.js" />
  <img src="https://img.shields.io/badge/MongoDB-Mongoose-success?style=for-the-badge&logo=mongodb" />
  <img src="https://img.shields.io/badge/Google-Gemini-orange?style=for-the-badge&logo=google" />
</p>

---

## 🌟 What Is Interview Prep Kit?

**Interview Prep Kit** is an AI-powered full-stack platform designed to transform a job description into a structured, personalized interview preparation experience.

Instead of manually searching through company websites, interview experiences, technical topics, and preparation resources, candidates can provide a **Job Description + Company URL** and let the platform build a complete preparation kit.

### 🔄 The Journey

```text
📄 Job Description
        │
        ▼
🔍 Requirement Extraction
        │
        ▼
🏢 Company Research
        │
        ▼
💼 Role Analysis
        │
        ▼
🧠 AI Question Generation
        │
        ├───────────────┐
        ▼               ▼
   🎯 Technical     💬 Behavioral
        │               │
        ├───────────────┤
        ▼               ▼
   🏗️ System Design  🏢 Company Fit
        │
        ▼
🎴 Smart Flashcards
        │
        ▼
📅 Personalized Study Plan
        │
        ▼
🚀 Interview Ready
```

---

## ✨ Why Interview Prep Kit?

### 🧠 AI-Powered Preparation

Uses Google Gemini to transform raw job descriptions and researched company information into targeted interview material.

### 🔍 Company Intelligence

Automatically crawls relevant company pages and identifies careers, hiring, engineering, team, and company information.

### 🎯 Requirement-Driven Questions

Questions are generated around the actual skills and requirements mentioned in the job description instead of generic interview questions.

### 🎴 Smart Practice

Flashcards are prioritized according to confidence, helping candidates spend more time on weaker areas.

### 📅 Personalized Study Schedule

Automatically distributes preparation material across the available number of days.

### 🛡️ Regeneration Without Losing Your Work

Generated, edited, and pinned items are tracked separately so user modifications are protected during regeneration.

---

## 🚀 Core Features

| Feature                      | Description                                                          |
| ---------------------------- | -------------------------------------------------------------------- |
| 🔐 **Authentication**        | Secure user authentication with JWT                                  |
| 📄 **JD Analyzer**           | Extracts skills, requirements, responsibilities and role information |
| 🏢 **Company Research**      | Crawls company websites for relevant information                     |
| 🔎 **Hiring Discovery**      | Finds careers and hiring-related pages                               |
| 💬 **Interview Research**    | Searches public interview discussions                                |
| 🧠 **AI Question Generator** | Generates targeted interview questions                               |
| 🏗️ **System Design Prep**   | Creates architecture-focused questions                               |
| 🎴 **Smart Flashcards**      | Confidence-based review system                                       |
| 📅 **Study Planner**         | Automatically creates day-by-day preparation plans                   |
| 📊 **Coverage Checker**      | Detects missing requirement coverage                                 |
| 🔄 **Gap Filling**           | Generates additional questions for uncovered skills                  |
| 📌 **Pinned Content**        | Protects important questions from regeneration                       |
| ✏️ **Editable Content**      | User edits survive future AI regeneration                            |
| ⚡ **Graceful Failures**      | Handles unavailable sites, rate limits and missing data              |

---

## 🧩 The AI Preparation Pipeline

The application uses a multi-stage pipeline rather than sending everything to one giant AI prompt.

```text
                    ┌─────────────────────┐
                    │   Job Description   │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Input Validation    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Company Crawling    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Hiring Discovery    │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Public Discussions  │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │ Requirement Extract │
                    └──────────┬──────────┘
                               │
             ┌─────────────────┼─────────────────┐
             ▼                 ▼                 ▼
       🏢 Company          💼 Role            🎯 Questions
          Brief           Breakdown            Bank
             │                 │                 │
             └─────────────────┼─────────────────┘
                               ▼
                       🎴 Flashcards
                               │
                               ▼
                       🔍 Coverage Check
                               │
                         Missing Skills?
                           /       \
                         YES        NO
                          │          │
                          ▼          │
                    ➕ Gap Filling  │
                          │          │
                          └────┬─────┘
                               ▼
                       📅 Study Schedule
```

---

## 💎 Smart Coverage System

One of the key features is that the application doesn't simply generate questions and stop.

It checks whether the generated question bank actually covers the requirements extracted from the job description.

```text
Requirements
     │
     ▼
Generated Questions
     │
     ▼
Requirement Mapping
     │
     ▼
Coverage Analysis
     │
     ├── ✅ Covered
     │
     └── ❌ Missing
             │
             ▼
       Targeted Questions
             │
             ▼
       Re-check Coverage
```

The system can perform up to **3 coverage passes** before finalizing the kit.

---

## 🎴 Confidence-Weighted Practice

Preparation doesn't end after generating questions.

The practice system tracks confidence and prioritizes weaker topics.

```text
        📚 Flashcard Deck
               │
               ▼
        ┌──────────────┐
        │ Review Card  │
        └──────┬───────┘
               │
               ▼
      ⭐ Confidence Score
               │
       ┌───────┴────────┐
       ▼                ▼
   Low Confidence   High Confidence
       │                │
       ▼                ▼
   Review Soon      Review Later
       │                │
       └───────┬────────┘
               ▼
        Updated Progress
```

Cards are sorted by confidence, updated after each review, and assigned a future review interval based on confidence and review history.

---

## 🛠️ Technology Stack

### Frontend

* ⚛️ Next.js 14
* 🎨 Tailwind CSS
* 🟦 TypeScript
* 🧠 Zustand

### Backend

* 🟢 Node.js
* 🚂 Express.js
* 🟦 TypeScript
* 🔐 JWT Authentication

### Database

* 🍃 MongoDB
* 🔗 Mongoose

### AI

* 🤖 Google Gemini 1.5 Flash

### Web Research

* 🔎 Cheerio
* 🌐 node-fetch
* 🤖 robots-parser
* 🔍 DuckDuckGo search

The project's documented stack is Next.js, Tailwind, Node/Express, MongoDB/Mongoose, TypeScript, Gemini, Cheerio/node-fetch, and Zustand.

---

## 🏗️ Architecture

```text
                         👤 USER
                           │
                           ▼
              ┌────────────────────────┐
              │     Next.js Frontend   │
              │                        │
              │ 🔐 Auth                │
              │ 📚 Kit List            │
              │ 🛠️ Builder             │
              │ 🎯 Practice            │
              └───────────┬────────────┘
                          │
                     REST API
                          │
                          ▼
              ┌────────────────────────┐
              │    Express Backend     │
              │                        │
              │ 🔐 Auth Routes         │
              │ 📦 Kit Routes          │
              │ 🔍 Research Service    │
              │ 🤖 Generation Service  │
              └───────┬────────┬───────┘
                      │        │
             ┌────────┘        └─────────┐
             ▼                          ▼
      🍃 MongoDB                 🤖 Gemini AI
             │                          │
             ▼                          ▼
       User + Kit Data           AI Generation
```

The repository documents this frontend → REST API → Express → MongoDB/LLM architecture.

---

## 📊 Engineering Highlights

* ⚡ **Multi-stage AI pipeline** instead of a single monolithic prompt
* 🎯 **Requirement-to-question coverage validation**
* 🔄 **Automatic gap filling**
* 🧠 **Confidence-weighted practice**
* 📌 **Generated / Edited / Pinned state management**
* 🛡️ **robots.txt-aware crawling**
* 🚦 **Rate limiting with exponential backoff**
* 🧩 **Graceful degradation when company research fails**
* 📅 **Deterministic study schedule allocation**
* 🔁 **Retry and fallback handling for invalid AI output**

---

## 🔄 Content State Management

Every generated item can exist in one of three states:

```text
                Generated
                    │
          ┌─────────┴─────────┐
          ▼                   ▼
       ✏️ Edited           📌 Pinned
          │                   │
          ▼                   ▼
  Preserved during      Never overwritten
   regeneration          by regeneration
```

| Status         | Behavior                                |
| -------------- | --------------------------------------- |
| 🤖 `generated` | Can be replaced during regeneration     |
| ✏️ `edited`    | User modifications are preserved        |
| 📌 `pinned`    | Permanently protected from regeneration |

This state model is explicitly implemented for questions, flashcards, and requirements.

---

## 🗺️ Roadmap

### ✅ Completed

* [x] Job description analysis
* [x] Company website crawling
* [x] Hiring page discovery
* [x] Interview discussion research
* [x] AI question generation
* [x] Flashcards
* [x] Coverage validation
* [x] Gap filling
* [x] Personalized study schedule
* [x] Confidence-based practice
* [x] Editable & pinned content

### 🔮 Future Enhancements

* [ ] 🎤 AI mock interviews
* [ ] 🗣️ Voice-based interview practice
* [ ] 📈 Interview performance analytics
* [ ] ☁️ Cloud-synced practice progress
* [ ] 📱 Mobile application
* [ ] 📧 Interview reminder notifications
* [ ] 📊 Company-specific preparation analytics
* [ ] 🤖 Adaptive difficulty levels
* [ ] 🧑‍💻 Coding-round practice integration

---

## ⚡ Quick Start

```bash
# Clone
git clone <repo-url>

# Enter project
cd interview-prep-kit

# Install dependencies
npm run install:all

# Configure environment
cp backend/.env.example backend/.env

# Start development
npm run dev
```

### 🌐 Local URLs

| Service         | URL                                |
| --------------- | ---------------------------------- |
| 🎨 Frontend     | `http://localhost:3000`            |
| ⚙️ Backend      | `http://localhost:3001`            |
| ❤️ Health Check | `http://localhost:3001/api/health` |

---

## 🎯 Project Goal

> **Don't prepare for "an interview." Prepare for *this interview*.**

Interview Prep Kit bridges the gap between a generic interview-preparation platform and the actual requirements of a specific job opportunity.

**Paste the JD. Add the company. Start preparing. 🚀**

---

## ⭐ If You Like This Project

If Interview Prep Kit helped you or you found the architecture interesting:

⭐ Star the repository
🍴 Fork the project
🐛 Report issues
💡 Suggest improvements
🤝 Contribute

**Built with ❤️, TypeScript, Node.js, Next.js, MongoDB & AI.**
