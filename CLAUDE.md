# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React-based educational game application called "Can you beat Park?" - a teaching simulation where players act as instructors trying to maximize student learning through three categories of tasks:
- **Materials** (Slider tasks) - Direct points for teaching materials
- **Research** (Counting tasks) - Adds 15% multiplier per point to all materials
- **Engagement** (Typing tasks) - Adds 0.15% compound interest per point after each task

The app uses Firebase for data persistence and includes an AI teaching assistant that provides task help with varying reliability.

**Game Structure**: 100 levels per task type (300 total levels) with progressive difficulty:
- Levels 1-10: Easy
- Levels 11-24: Medium  
- Levels 25-100: Hard

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run ESLint
npm run lint

# Preview production build
npm run preview
```

## Architecture

### Core Game Flow
1. **Student Login** (`StudentLogin.jsx`) → validates access codes
2. **Practice Mode** (`PracticeMode.jsx`) → mandatory practice tasks requiring 100% accuracy
3. **Main Game** (`App.jsx`) → timed challenge with teaching tasks across multiple semesters
4. **Completion** (`CompletionCodeDisplay.jsx`) → generates unique completion code for study

### Key Components
- **App.jsx** (2835 lines) - Main game orchestrator handling:
  - Session management and Firebase sync
  - Game state (semesters, checkpoints, scoring)
  - Timer management and pause/resume logic
  - Task switching and completion tracking
  - Student learning score calculation

- **Task Components**:
  - `SliderTask.jsx` - Materials tasks (slider precision)
  - `CountingTask.jsx` - Research tasks (pattern counting)
  - `TypingTask.jsx` - Engagement tasks (text replication)

- **AI Assistant** (`ChatContainer.jsx`):
  - Implements deterministic AI help patterns
  - First 5 attempts follow fixed accuracy pattern
  - 75% accuracy for attempts 6+
  - Tracks usage across all tasks

### State Management
- Session data persisted to Firebase Firestore
- Local storage for temporary data and offline fallback
- Event tracking system (`eventTracker.js`) for analytics
- Pattern generator (`patternGenerator.js`) for consistent task generation

### Firebase Integration
- Environment variables required (VITE_FIREBASE_*)
- Firestore for session data
- Offline event queue with sync capability
- Real-time session status updates

## Important Implementation Details

### Scoring System
**CRITICAL: Task Order Determines Score!**

**Optimal Strategy: 1️⃣ Engagement → 2️⃣ Research → 3️⃣ Materials**

**Why Order Matters:**
- Research multipliers (15% per point) ONLY apply to materials earned AFTER
- Engagement interest compounds from the start - do it FIRST for maximum benefit
- Materials done before research = ZERO multiplier (huge score loss!)

**Example - Same Tasks, Different Order:**
- **Bad Order** (Materials→Research): 10 materials × 1.0 + 5 research = 10 points
- **Good Order** (Research→Materials): 5 research first, then 10 materials × 1.75 = 17.5 points
- **75% score difference just from ordering!**

**Technical Implementation:**
- Materials points tracked at each research level: `materialsAtResearchLevel[researchLevel]`
- Formula: Each material batch multiplied by (1 + researchLevel × 0.15)
- Engagement interest: 0.15% × engagement points × current score, applied after EVERY task

**Point Values:**
- Exact answer = 2 points
- Within 1 = 1 point  
- Otherwise = 0 points

### Checkpoint System
- Semester 2 includes midterm at 6-minute mark (1 minute for admin mode)
- **300+ student learning points = 300 bonus points** (increased from 50)
- Checkpoint pauses game for user acknowledgment
- Configurable per access code (checkpointSemester2 flag)

### Session Security
- One-time access codes prevent multiple attempts (students only)
- Session blocking on idle (60s) or tab switch (30s warning)
- No refresh/restart allowed for students
- Admin mode bypasses restrictions
- ADMIN-TEST codes allow unlimited attempts for testing

### AI Strategy Advice
When asked about strategy, the AI MUST emphasize:
- **Engagement → Research → Materials** is the ONLY optimal order
- Materials done before research get NO multiplier (critical mistake!)
- Complete ALL engagement and research before ANY materials
- This order can double the final score

### AI Help Pattern
The AI assistant follows a deterministic pattern for the first 5 uses:
1. Correct (2 pts)
2. Correct (2 pts)
3. Off by 1 (1 pt) - **Always over-highlights for visibility**
4. Correct (2 pts)
5. Correct (2 pts)
6+ 75% correct, 25% mistakes:
   - **50% of mistakes**: Off by 1 (1 pt) - **Over-highlights**
   - **50% of mistakes**: Way off (0 pts) - **Significantly over-highlights**

**Mistake Behavior (Enhanced)**:
- **Letter Counting**: Always adds 1-2 extra wrong letters to highlight
- **Word Counting**: Always highlights extra wrong words beyond target count
- **Visual Feedback**: Over-highlighting makes AI errors obvious for educational value

## Recent Major Improvements

### Latest Updates (December 2024)
- **Expanded Level System**: Increased from 50 to 100 levels per task type (300 total)
  - Levels 1-10: Easy difficulty
  - Levels 11-24: Medium difficulty  
  - Levels 25-100: Hard difficulty (all hard from level 25 onwards)
- **Qualtrics Integration Fix**: Enhanced message passing to ensure Next button remains visible
- **Time Tracking Fix**: Added timeElapsed field for proper duration display in ADMIN-MASTER dashboard
- **UI Performance**: Improved animations with requestAnimationFrame and cubic-bezier transitions
- **Glitch Prevention**: Added debouncing utilities and smooth update mechanisms

### Data Collection System (Enhanced)
- **Comprehensive Event Tracking**: All interactions with readable timestamps (MM:SS after semester start)
- **AI Interaction Correlation**: Tracks help request → player response → outcome
- **Click Tracking**: Element details, coordinates, context for all user clicks
- **Performance Analytics**: Learning curves, improvement trends, struggle identification
- **Firebase Collections**: 
  - `Events`: All user interactions with detailed context
  - `Sessions`: Persistent session data with real-time updates

### AI System Improvements
- **Fixed Letter/Character Counting**: Medium/hard difficulty levels now properly highlight individual letters
- **Character-Level Highlighting**: Animated character highlighting with proper canvas rendering  
- **Educational Mistake Patterns**: AI mistakes now over-highlight for better visibility
- **Multi-Letter Support**: Handles patterns like "a and e", "a, e" correctly

### UI/UX Enhancements  
- **Fixed Student Learning Display**: Resolved issue where score always showed 0
- **Field Name Consistency**: Unified data structure across all components
- **Improved Chatbox Formatting**: Added line breaks for better readability
- **Clean Console Output**: Streamlined to show only essential learning point updates

### System Reliability
- **Disabled Daily Refresh**: Simplified access control by removing admin refresh feature
- **Enhanced Session Management**: Improved anti-refresh protection and offline handling
- **Optimized Firebase Integration**: Better error handling and batch operations
- **Code Cleanup**: Removed debugging logs, kept only student learning formula breakdown

## Data Structure Notes

### CategoryPoints Structure
```javascript
categoryPoints = {
  materials: number,   // Base points (g2 tasks)
  research: number,    // Multiplier source (g1 tasks)
  engagement: number,  // Interest source (g3 tasks)
  bonus: number        // Checkpoint bonuses
}
```

### Event Tracking Format
```javascript
event = {
  sessionId: string,
  type: "user_click" | "task_attempt" | "ai_task_help" | "ai_help_response" | "chat_interaction",
  timestamp: serverTimestamp(),
  readableTime: "12:34", // MM:SS after semester start
  timeElapsed: 754000,    // milliseconds
  semesterTime: { elapsed: 754000, readable: "12:34", minutes: 12, seconds: 34 },
  // Event-specific data...
}
```

## Console Output

**Student Learning Updates** (only console output remaining):
```
📊 STUDENT LEARNING: 15.1 pts | Formula: 8 × 1.60 + 2.3 = 15.1
```

## Testing Considerations

- **Admin Mode**: `?admin=berkeley2024` URL parameter
- **Timer Adjustment**: 2-minute timer for admin vs 12-minute for students (per semester)
- **Practice Skip**: Admin can bypass mandatory practice mode
- **Firebase Testing**: Use `node src/testFirebase.js` to verify connection
- **Checkpoint Timing**: Adjusts based on admin/student mode (1min vs 6min in semester 2)
- **AI Testing**: All difficulty levels now work correctly for counting tasks
- **Data Verification**: Comprehensive event tracking for analysis

## Access Code Reference

### Student Sections (Real IDs - One-time access)
- **Section 01A-Checkpoint**: No AI, with semester 2 checkpoint
- **Section 01A-No Checkpoint**: No AI, no checkpoint
- **Section 02A-Checkpoint**: AI enabled, with semester 2 checkpoint  
- **Section 02A-No Checkpoint**: AI enabled, no checkpoint

### Admin Test Codes (Unlimited access)
- **ADMIN-TEST1 to ADMIN-TEST10**: Student-like 12-min semesters, AI enabled, checkpoint enabled
- **ADMIN-REGULAR**: 12-min mode with AI and checkpoint
- **ADMIN-FAST**: 2-min quick test with AI and checkpoint
- **ADMIN-1-CP**: No AI, with checkpoint (2 min)
- **ADMIN-1-NCP**: No AI, no checkpoint (2 min)
- **ADMIN-2-CP**: AI enabled, with checkpoint (2 min)
- **ADMIN-2-NCP**: AI enabled, no checkpoint (2 min)
- **ADMIN-MASTER**: Access to master admin dashboard (no gameplay)

## Data Collection & Analysis System

### Python Data Cleaning Pipeline
The repository includes a comprehensive data processing system:

**Script**: `clean-data.py`
- Processes raw Firebase event data (`data/dump_events.json`)
- Creates structured CSV datasets for analysis
- Handles bijective session-to-student ID mapping
- Tracks practice mode vs. main game progression

**Key Data Features Extracted**:
- Student ID mapping (session → actual student ID from StudentLogin.jsx)
- Semester progression (1, 2, or empty for practice mode)
- Task details (type, level, difficulty, responses, correctness)
- AI help usage patterns (21.46% overall usage rate across all tasks)
- Time spent analysis (task-to-task duration calculation)
- Condition tracking (AI vs No-AI, Checkpoint vs No-Checkpoint)
- Practice mode identification (empty semester field = practice mode)

**Data Organization**:
```
data/
├── dump_events.json              # Raw Firebase events (~100MB)
├── cleaned_game_data.csv         # Full cleaned dataset (1,915 records)
├── game_data_summary.csv         # Per-student summary statistics
├── cleaned_game_data_sample*.csv # Sample datasets for development
└── game_data_summary_sample*.csv # Sample summaries
```

**Practice Mode Detection**:
- **CRITICAL**: Practice mode determined by empty `currentSemester` field, NOT task IDs
- Practice tasks have no semester context (mode="practice" in React state)
- Main game tasks occur in semesters 1 and 2 (mode="challenge" in React state)
- Example: Both practice g2t1 and main game g2t1 exist, distinguished by semester

**Usage**:
```bash
# Process full dataset
python3 clean-data.py

# Process sample (for testing)
python3 clean-data.py 1000
```

### Data Privacy & Security
- All data files in `data/` folder are git-ignored
- Prevents accidental sharing of sensitive student information
- Safe for development while protecting participant privacy

## Important Notes for Development

- **Field Names**: Use `materials`, `research`, `engagement` (not `slider`, `counting`, `typing`)
- **AI Highlighting**: Always over-highlight when making mistakes for educational clarity
- **Event Tracking**: All significant user actions are automatically tracked
- **Student Learning Formula**: Must use exact calculation with engagement interest from localStorage
- **Session Security**: Students cannot refresh or restart - one-time access only
- **Data Processing**: Use `clean-data.py` for all event data analysis
- **Practice Mode Logic**: Empty semester = practice mode (not specific task IDs)