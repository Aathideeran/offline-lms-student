# SIET-LMS Offline

**SIET-LMS Offline** is an offline-first Learning Management System and local **Gemma 4** educational assistant designed for students of **Sri Shakthi Institute of Engineering and Technology (SIET)** on Windows computers and Android devices.

---

## Key Capabilities

1. **Faithful SIET-LMS Interface**:
   - **Login Page**: Preserves the two-column dark green (`#015303`) and yellow (`#f6e01c`) layout, SIET college crest, introductory bullet points, username/password validation, and offline password recovery workflow.
   - **Student Dashboard**: Preserves the Moodle-based top navigation (`Home`, `Dashboard`, `My courses`), `AV` user account dropdown, personalized greeting (`Hi, AATHIDEERAN! 👋`), `Recently accessed courses` carousel, `Upcoming events` card, and interactive `Timeline` with date filters, sorting, and search.
   - **Course Detail & Activity Reader**: Preserves the collapsible left course index drawer, expandable section cards (`ER Diagram`, `Keys`, `SQL Commands`, `Operators`), interactive `Done` completion toggles, offline MCQ quizzes, and personal study notes.

2. **Genuine Offline-First Architecture**:
   - **Service Worker & PWA**: Configured via `vite-plugin-pwa` (`manifest.webmanifest`, Workbox asset precaching, and in-app install support for Windows and Android).
   - **IndexedDB Persistence (`src/services/localDb.ts`)**: Stores courses, activity completion states, personal study notes, imported documents, RAG chunks, chat conversations, and the local modification queue.
   - **Honest Synchronization Ledger**: Clearly distinguishes baseline sample data, unsynced local changes, and failed/unreachable synchronization attempts without ever fabricating remote server confirmation or deleting local work.

3. **Local Gemma 4 AI Tutor & Document RAG Pipeline**:
   - **Zero Cloud Substitution**: Never silently substitutes cloud Gemini API inference for local Gemma 4 inference.
   - **Local RAG Engine (`src/utils/ragEngine.ts`)**: Extracts, chunks, and indexes course documents in IndexedDB and ranks passages using BM25-inspired TF-IDF scoring with source citations.
   - **Modular Runtime Adapter (`src/services/gemmaAdapter.ts`)**: Connects to a local Gemma 4 runtime on Windows or Android (`Ollama` at `http://127.0.0.1:11434` or `llama.cpp` / `LiteRT` OpenAI-compatible server at `http://127.0.0.1:8080`). When the local native runtime is not reachable from the browser sandbox, it transparently reports the limitation and provides deterministic, citation-backed local document extraction.

---

## Project Architecture

```text
/src
  /components
    CourseBanner.tsx         # SVG course card banners matching SIET-LMS
    CourseDetailView.tsx     # Collapsible course index, sections, quizzes & notes
    DashboardView.tsx        # Greeting, course carousel, upcoming events & timeline
    DocumentsAndSyncView.tsx # Local document importer, reader & honest sync ledger
    GemmaTutorView.tsx       # Local Gemma 4 chat UI, RAG citations & adapter config
    HomeView.tsx             # SIET-LMS Offline overview
    LoginPage.tsx            # Two-column dark green & yellow SIET-LMS login page
    MyCoursesView.tsx        # Searchable course catalog with completion progress
    SietLogo.tsx             # SIET college crest component
    TopNavBar.tsx            # Top navigation bar, PWA installer & user menu
  /data
    initialData.ts           # Clearly labeled baseline sample courses & documents
  /hooks
    usePWAInstall.ts         # PWA install prompt & online/offline status hooks
  /services
    gemmaAdapter.ts          # Local Gemma 4 inference adapter (Ollama / llama.cpp)
    localDb.ts               # IndexedDB storage & honest synchronization logic
  /types
    lms.ts                   # TypeScript interfaces
  /utils
    lmsLogic.ts              # Pure timeline filtering, sorting & completion math
    ragEngine.ts             # Pure document chunking & BM25 retrieval engine
    ragEngine.test.ts        # Node unit tests for RAG & LMS logic
```

---

## Local Setup & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Unit Tests
```bash
npx --yes tsx --test src/utils/ragEngine.test.ts
```

### 3. Start the Development Server
```bash
npm run dev
```

### 4. Connect a Local Gemma 4 Runtime (Windows / Android)
- **Option A — Ollama (Windows / Linux)**:
  ```bash
  OLLAMA_ORIGINS=* ollama serve
  ollama run gemma4:e4b
  ```
- **Option B — llama.cpp / LiteRT Server (Windows / Android Termux)**:
  ```bash
  llama-server -m gemma-4-E4B-it-Q4_K_M.gguf --port 8080 --cors
  ```
Then open the **Gemma 4 Tutor** tab in SIET-LMS Offline and click **Verify Local Runtime**.
