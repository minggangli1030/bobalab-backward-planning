# Can you beat Park? - Educational Teaching Simulation Game

An interactive React-based educational game where players act as instructors trying to maximize student learning through strategic teaching task management. Players complete three types of tasks across multiple semesters with time pressure and AI assistance.

## 🎯 Game Overview

**Objective**: Maximize student learning points by strategically completing teaching tasks across multiple semesters.

### 🎮 Strategic Mechanics (ORDER MATTERS!)

**Key Insight**: Task completion order significantly affects your final score!

**Core Mechanics**:
- **Materials Tasks** (Slider precision) → Direct base points
- **Research Tasks** (Pattern counting) → 15% multiplier per point to FUTURE materials only
- **Engagement Tasks** (Text replication) → 0.15% compound interest per point after each task

**Scoring Formula**: `Score = Materials × (1 + Research×0.15) + Engagement Interest`
- Research multipliers ONLY apply to materials earned AFTER the research
- Players must discover the optimal strategy through experimentation or AI assistance!

**Level System**: 100 levels per task type (300 total levels)
- Levels 1-10: Easy difficulty
- Levels 11-24: Medium difficulty
- Levels 25-100: Hard difficulty (all hard from level 25 onwards)

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run ESLint
npm run lint

# Preview production build
npm run preview
```

## 🏗️ Architecture

### Core Game Flow (V2)
1. **Student Login** → Access code validation
2. **Practice Mode** → Mandatory practice requiring 100% accuracy
3. **Task Allocation** → Allocate 10 tasks among 3 types with AI assistance
4. **Main Game** → Linear progression of allocated tasks with switching capability
5. **Bonus Round** → Optional extra tasks if finished early
6. **Completion** → Unique completion code generation

### Key Components
- **App.jsx** (2835+ lines) - Main game orchestrator
- **Task Components**: SliderTask, CountingTask, TypingTask
- **AI Assistant** (ChatContainer.jsx) - Deterministic help with 75% accuracy
- **Session Management** - Firebase integration with offline fallback

### AI Help System
**Deterministic Pattern (First 5 uses)**:
1. Correct (2 pts)
2. Correct (2 pts) 
3. Off by 1 (1 pt)
4. Correct (2 pts)
5. Correct (2 pts)
6+ 75% correct, 25% mistakes (over-highlighting for visibility)

## 📊 Data Collection & Analysis

**Comprehensive Analytics**:
- Readable timestamps (MM:SS after semester start)
- Complete task attempt history with accuracy progression
- AI interaction tracking (help requests, player responses, time between help and submission)
- Click tracking with element details and coordinates
- Chat interaction analysis with query categorization
- Learning curve analysis and performance metrics
- Practice mode vs. main game distinction

**Firebase Collections**:
- **Events**: All user interactions with detailed context
- **Sessions**: Persistent session data with real-time updates

**Data Processing**:
- **Python Data Cleaner** (`clean-data.py`): Processes raw event data into structured CSV format
- **Key Features Extracted**:
  - Student ID mapping (bijective session-to-student mapping)
  - Semester progression tracking
  - Task completion details (type, level, responses)
  - AI help usage patterns (21.46% overall usage rate)
  - Practice mode identification (empty semester = practice mode)
  - Time spent analysis and learning progression
  - Condition tracking (AI vs No-AI, Checkpoint vs No-Checkpoint)

**Data Organization**:
- All data files organized in `data/` folder
- Git-ignored to prevent accidental public sharing
- Sample datasets available for testing and development

## 🎮 Game Features

### Student Experience
- **Semester System**: 2 semesters (12 minutes each for students)
- **Checkpoint System**: Semester 2 midterm at 6-minute mark
- **Checkpoint Rewards**: 300 bonus points if ≥300 learning points at midterm
- **AI Teaching Assistant**: Context-aware help with educational mistake patterns
- **Anti-Cheating**: Session blocking, refresh prevention, tab-switch detection
- **One-Time Access**: Students can only play once per day

### Admin Features
- **Admin Mode**: `?admin=berkeley2024` URL parameter
- **Test Codes**: `ADMIN-TEST1` to `ADMIN-TEST10` - Student-like experience with infinite attempts
- **Quick Test Codes**: Various admin codes for different testing scenarios
- **Master Admin**: `ADMIN-MASTER` - Access to admin dashboard
- **Shortened Timer**: 2 minutes per semester for admin testing
- **Practice Skip**: Bypass mandatory practice mode
- **Debug Access**: Enhanced logging and session management

## 🛠️ Configuration

### Environment Variables
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

### Game Configuration Options
- **Semester Duration**: 12 minutes for students (720000ms), 2 minutes for admin (120000ms)
- **Checkpoint System**: Semester 2 midterm at 6 minutes (1 minute for admin mode)
- **AI Availability**: Configurable per access code (Section 01A: No AI, Section 02A: AI enabled)
- **Access Codes**: Student IDs for one-time access, Admin codes for unlimited testing

### Access Code Types
1. **Student IDs**: Real student IDs organized in 4 sections
   - Section 01A-Checkpoint: No AI, with semester 2 checkpoint
   - Section 01A-No Checkpoint: No AI, no checkpoint
   - Section 02A-Checkpoint: AI enabled, with semester 2 checkpoint
   - Section 02A-No Checkpoint: AI enabled, no checkpoint

2. **Admin Test Codes** (`ADMIN-TEST1` to `ADMIN-TEST10`):
   - Student-like experience (12-minute semesters)
   - AI enabled, checkpoint in semester 2
   - Unlimited attempts for testing
   
3. **Admin Quick Test Codes**:
   - `ADMIN-REGULAR`: 12-minute mode with AI
   - `ADMIN-FAST`: 2-minute quick test with AI
   - `ADMIN-1-CP`: No AI, with checkpoint (2 min)
   - `ADMIN-1-NCP`: No AI, no checkpoint (2 min)
   - `ADMIN-2-CP`: AI enabled, with checkpoint (2 min)
   - `ADMIN-2-NCP`: AI enabled, no checkpoint (2 min)
   - `ADMIN-MASTER`: Access to master admin dashboard

## 📈 Recent Improvements

### Latest Updates (V2 - January 2025)
- **New Game Flow**: Introduced Task Allocation and Linear Progression.
- **Task Allocation**: Participants choose their mix of 10 tasks (Slider, Counting, Typing).
- **Task Switching**: Ability to defer current task to the end of the queue.
- **UI Overhaul**: New Task Runner layout with global timer, points, and task counter.
- **Bonus Round**: Opportunity to earn extra points if tasks are completed early.
- **AI Assistance**: Added AI help for task allocation decision.

### Previous Updates (December 2024)
- **Expanded Level System**: Increased from 50 to 100 levels per task type (300 total)
- **Qualtrics Integration**: Fixed Next button visibility issues with enhanced message passing
- **Time Tracking**: Fixed duration display in ADMIN-MASTER dashboard with periodic updates
- **Performance Optimization**: Improved animations with requestAnimationFrame and smoother transitions
- **Glitch Prevention**: Added debouncing utilities and optimized UI updates

### Data Collection Enhancement
- Added comprehensive event tracking with readable timestamps
- Implemented AI interaction correlation (help → response → outcome)
- Enhanced click tracking with element details and coordinates
- Added Levenshtein distance for text comparison analysis

### AI System Improvements
- Fixed letter/character counting for medium/hard difficulty levels
- Implemented over-highlighting for mistake visibility
- Added character-level highlighting with animated feedback
- Enhanced accuracy patterns for educational value

### UI/UX Enhancements
- Fixed student learning goal display (was showing 0)
- Added line breaks in chatbox messages for better readability
- Streamlined console output to show only learning point updates
- Improved field name consistency across components

### System Reliability
- Disabled daily refresh access feature for simplified access control
- Enhanced error handling and offline fallback systems
- Improved session management with anti-refresh protection
- Optimized Firebase integration with batch operations

## 📚 Development Notes

- **React 18** with Vite build system
- **Firebase** for real-time data and authentication
- **ESLint** configuration for code quality
- **Modular Architecture** with separated concerns
- **Comprehensive Testing** capabilities with admin mode

## 🔍 Debugging

**Console Output**: Clean logging focused on student learning updates
```
📊 STUDENT LEARNING: 15.1 pts | Formula: 8 × 1.60 + 2.3 = 15.1
```

**Testing Access**: Use `?admin=berkeley2024` for development and testing

**Firebase Testing**: Run `node src/testFirebase.js` to verify connection