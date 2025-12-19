# Firebase Database Setup Instructions

Since you've deleted the previous Firebase database and are starting fresh, follow these steps to configure your new Firebase project:

## 1. Create a New Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "teaching-game")
4. Follow the setup wizard (you can disable Google Analytics if not needed)

## 2. Enable Firestore Database

1. In your Firebase project, go to **Build** → **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode** (or test mode for development)
4. Select a location for your database (choose the closest to your users)
5. Click **Enable**

## 3. Set Up Firestore Security Rules

Go to **Firestore Database** → **Rules** and use these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents (adjust for production)
    // For production, you should restrict access based on authentication
    match /{document=**} {
      allow read, write: if true;
    }

    // Alternative: More secure rules for production
    // match /events/{eventId} {
    //   allow create: if true; // Anyone can create events
    //   allow read: if request.auth != null; // Only authenticated users can read
    // }
    //
    // match /sessions/{sessionId} {
    //   allow read, write: if request.auth != null;
    // }
    //
    // match /students/{studentId} {
    //   allow read, write: if request.auth != null;
    // }
    //
    // match /game_settings/{settingId} {
    //   allow read: if true; // Anyone can read settings
    //   allow write: if request.auth != null; // Only authenticated users can write
    // }
  }
}
```

**Note**: For production, you should implement proper authentication and restrict access. The rules above allow full access for development.

## 4. Create Required Collections

Firestore will automatically create collections when data is written, but you can pre-create them for organization:

### Collections to Create:

1. **`events`** - Stores all user interaction events
2. **`sessions`** - Stores game session data
3. **`students`** - Stores student roster information (optional, if you have a roster)
4. **`game_settings`** - Stores global game configuration

### To Create Collections:

1. Go to **Firestore Database** → **Data**
2. Click **Start collection**
3. Enter collection ID (e.g., "events")
4. Click **Next** (you can add a document or leave it empty - it will be created when data is written)

## 5. Get Firebase Configuration

1. Go to **Project Settings** (gear icon) → **General**
2. Scroll down to **Your apps** section
3. Click the **Web** icon (`</>`) to add a web app
4. Register your app (give it a nickname)
5. Copy the Firebase configuration object

## 6. Update Environment Variables

Create or update `.env` file in your project root with:

```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

Replace the values with your actual Firebase config values.

## 7. Initialize game_settings Collection

Create a document in the `game_settings` collection:

1. Go to **Firestore Database** → **Data**
2. Click on `game_settings` collection (or create it)
3. Click **Add document**
4. Set Document ID to: `global`
5. Add the following fields (you can add more later via Master Admin panel):

```json
{
  "semesterDuration": 12,
  "totalTasks": 10,
  "totalSemesters": 2,
  "midtermEnabled": true,
  "aiCost": 0,
  "wrongAnswerPenalty": 0,
  "switchCost": 0,
  "jarRefillFreezeTime": 0,
  "unfinishedJarPenalty": 0,
  "unfinishedTaskPenalty": 0,
  "aiDelay": 0,
  "taskOrderStrategy": "sequential_task",
  "difficultyMode": "fixed",
  "gameMode": "knapsack",
  "scoring": {
    "g1": {
      "easy": { "fullCorrect": 2, "halfCorrect": 1 },
      "medium": { "fullCorrect": 2, "halfCorrect": 1 },
      "hard": { "fullCorrect": 2, "halfCorrect": 1 }
    },
    "g2": {
      "easy": { "fullCorrect": 2, "halfCorrect": 1 },
      "medium": { "fullCorrect": 2, "halfCorrect": 1 },
      "hard": { "fullCorrect": 2, "halfCorrect": 1 }
    },
    "g3": {
      "easy": { "fullCorrect": 2, "halfCorrect": 1 },
      "medium": { "fullCorrect": 2, "halfCorrect": 1 },
      "hard": { "fullCorrect": 2, "halfCorrect": 1 }
    }
  }
}
```

## 8. Optional: Set Up Indexes

If you plan to query events by specific fields, you may need to create indexes:

1. Go to **Firestore Database** → **Indexes**
2. Click **Create Index**
3. Add composite indexes for common queries (e.g., by `studentId` and `timestamp`)

## 9. Test the Connection

1. Start your development server: `npm run dev`
2. Log in to the game
3. Perform some actions (complete tasks, use AI help, etc.)
4. Check **Firestore Database** → **Data** to verify events are being created

## Data Collection Summary

The following data is now being tracked in every event:

### User Information:

- `studentId` - Student identifier
- `username` / `displayName` - User's display name
- `sessionId` - Unique session identifier

### Configuration (All Master Admin Settings):

- `gameConfig.semesterDuration` - Duration in minutes
- `gameConfig.totalTasks` - Total number of tasks
- `gameConfig.totalSemesters` - Number of semesters
- `gameConfig.midtermEnabled` - Whether checkpoint is enabled
- `gameConfig.aiCost` - Cost for AI help
- `gameConfig.switchCost` - Cost for switching tasks
- `gameConfig.jarRefillFreezeTime` - Time freeze for refill
- `gameConfig.unfinishedJarPenalty` - Penalty for unfinished jar
- `gameConfig.unfinishedTaskPenalty` - Penalty for unfinished task
- `gameConfig.aiDelay` - AI help delay time
- `gameConfig.taskOrderStrategy` - Task ordering strategy
- `gameConfig.difficultyMode` - "fixed" or "manual"
- `gameConfig.gameMode` - "knapsack" or "sequential"
- `gameConfig.scoring` - Full scoring configuration (18 variables)

### Timestamps:

- `timestamp` - ISO format timestamp
- `clientTimestamp` - Client-side timestamp (milliseconds)
- `timeElapsedSeconds` - Time since session start
- `readableTime` - Human-readable time (MM:SS)
- `semesterTime` - Time within current semester

### User Actions Tracked:

- **Task Switch** (`task_switch`) - When user switches between tasks
  - `fromTask`, `toTaskType`, `toDifficulty`, `switchCost`, `currentScore`
- **Jar Refill** (`jar_refill`, `jar_refill_complete`) - When user refills a jar
  - `jarKey`, `taskType`, `difficulty`, `freezeTime`, `newTaskId`, `currentScore`
- **AI Help Task** (`ai_help_task`) - When user requests AI help for a task
  - `taskId`, `taskType`, `helpType`, `aiFeedback` (full output), `wasCorrect`, `attemptNumber`
- **AI Help Plan** (`ai_help_plan`) - When user requests planning help
  - `helpType`, `aiFeedback` (full response text), `currentTask`
- **AI Chat Message** (`ai_chat_message`) - When user sends a chat message
  - `userMessage`, `aiResponse` (full AI output), `context`
- **Task Complete** (`task_complete`) - When user completes a task
  - `taskId`, `pointsEarned`, `totalScore`, `categoryPoints`, `studentLearningScore`
- **Game Complete** (`game_complete`) - When game ends
  - `totalTime`, `finalScore`, `completedTasks`, `completionReason`

### Score Information:

- `totalScore` - Current total score (Materials + Research + Engagement - Penalties)
- `studentLearningScore` - Calculated student learning score
- `categoryPoints` - Points by category (materials, research, engagement, bonus)
- `finalScore` - Final score at game completion

All events include the full game context and configuration at the time of the event.
