#!/usr/bin/env python3
"""
Game Data Cleaning and Parsing Script
=====================================

This script processes the dump_events.json file to extract clean, structured data
for analysis. It focuses on student performance, task completion, and AI interaction data.

Key Features Extracted:
- Student ID
- Semester #
- Task #
- Task Type  
- Level of task type
- Student Response
- Correct Response
- AI Help Used
- AI Response
- Time spent (in minutes/seconds)
- Condition (CP/AI?)
- Practice Mode flag
"""

import json
import csv
import re
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from collections import defaultdict, Counter

class GameDataCleaner:
    def __init__(self, json_file: str):
        """Initialize the data cleaner with the JSON events file."""
        self.json_file = json_file
        self.events = []
        self.cleaned_data = []
        self.session_to_student_map = {}  # Bijective mapping: session_id -> student_id
        self.ai_help_index = {}  # Fast AI help lookup: (session_id, task_id) -> events
        
        # Task type mappings
        self.task_type_map = {
            'g1': 'counting',
            'g2': 'slider', 
            'g3': 'typing'
        }
        
        # Section/condition mappings
        self.condition_map = {
            '01A-Checkpoint': 'No_AI_CP',
            '01A-No Checkpoint': 'No_AI_NCP', 
            '02A-Checkpoint': 'AI_CP',
            '02A-No Checkpoint': 'AI_NCP',
            'ADMIN': 'Admin',
            'ADMIN-TEST': 'Admin_Test'
        }
    
    def load_data(self):
        """Load the JSON events data and build session-to-student mapping."""
        print("Loading events data...")
        try:
            with open(self.json_file, 'r', encoding='utf-8') as f:
                self.events = json.load(f)
            print(f"Loaded {len(self.events)} events")
            
            # Build bijective session_id -> student_id mapping
            self.build_session_student_mapping()
            
            # Build AI help index for faster lookup
            self.build_ai_help_index()
            
        except FileNotFoundError:
            print(f"Error: File {self.json_file} not found")
            return False
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON: {e}")
            return False
        return True
    
    def build_session_student_mapping(self):
        """Build bijective mapping from session_id to student_id."""
        print("Building session-to-student mapping...")
        
        for event in self.events:
            session_id = event.get('sessionId')
            student_id = event.get('studentId')
            
            if session_id and student_id:
                if session_id in self.session_to_student_map:
                    # Verify consistency
                    if self.session_to_student_map[session_id] != student_id:
                        print(f"Warning: Session {session_id} mapped to multiple student IDs: "
                              f"{self.session_to_student_map[session_id]} and {student_id}")
                else:
                    self.session_to_student_map[session_id] = student_id
        
        print(f"Created mapping for {len(self.session_to_student_map)} sessions")
        
        # Show sample mapping
        sample_items = list(self.session_to_student_map.items())[:5]
        print("Sample session -> student mappings:")
        for session_id, student_id in sample_items:
            print(f"  {session_id} -> {student_id}")
    
    def get_student_id_from_session(self, session_id: str) -> Optional[str]:
        """Get student ID from session ID using the bijective mapping."""
        return self.session_to_student_map.get(session_id)
    
    def parse_task_id(self, task_id: str) -> Tuple[Optional[str], Optional[int], Optional[int]]:
        """Parse task ID to extract task type, level, and task number.
        
        Args:
            task_id: String like 'g1t5', 'g2t42', etc.
            
        Returns:
            Tuple of (task_type, level, task_number)
        """
        if not task_id or not isinstance(task_id, str):
            return None, None, None
            
        match = re.match(r'g([123])t(\d+)', task_id)
        if not match:
            return None, None, None
            
        task_type_num = match.group(1)
        task_num = int(match.group(2))
        
        # Map task type
        task_type = self.task_type_map.get(f'g{task_type_num}')
        
        # Calculate difficulty level based on task number
        if task_num <= 10:
            level = 'Easy'
        elif task_num <= 24:
            level = 'Medium' 
        else:
            level = 'Hard'
            
        return task_type, level, task_num
    
    def get_student_condition(self, event: Dict) -> str:
        """Determine student condition from event data."""
        # Try to get from section field first
        if 'section' in event and event['section']:
            return self.condition_map.get(event['section'], 'Unknown')
        
        # Fallback: determine from hasAI and hasCheckpoint flags
        has_ai = event.get('hasAI', False)
        has_checkpoint = event.get('hasCheckpoint', False)
        
        if has_ai and has_checkpoint:
            return 'AI_CP'
        elif has_ai and not has_checkpoint:
            return 'AI_NCP'
        elif not has_ai and has_checkpoint:
            return 'No_AI_CP'
        elif not has_ai and not has_checkpoint:
            return 'No_AI_NCP'
        else:
            return 'Unknown'
    
    def parse_time_spent(self, current_event: Dict, events_list: List[Dict], current_idx: int) -> Optional[float]:
        """Calculate time spent on a task by finding the next task event."""
        current_timestamp = current_event.get('timeElapsedSeconds')
        if current_timestamp is None:
            return None
            
        # Look for the next task-related event for the same session
        session_id = current_event.get('sessionId')
        
        for i in range(current_idx + 1, len(events_list)):
            next_event = events_list[i]
            
            # Skip if different session
            if next_event.get('sessionId') != session_id:
                continue
                
            # Look for next task-related event
            event_type = next_event.get('type', '')
            if event_type in ['task_attempt', 'task_complete', 'page_switch']:
                next_timestamp = next_event.get('timeElapsedSeconds')
                if next_timestamp is not None:
                    time_diff = next_timestamp - current_timestamp
                    return max(0, time_diff)  # Ensure non-negative
                    
        return None
    
    def build_ai_help_index(self):
        """Build an index of AI help events for faster lookup."""
        print("Building AI help index...")
        self.ai_help_index = {}
        
        for event in self.events:
            if event.get('type') not in ['ai_task_help', 'ai_help_response']:
                continue
                
            session_id = event.get('sessionId')
            task_id = event.get('taskId', '') or event.get('currentTask', '')
            timestamp = event.get('timeElapsedSeconds', 0)
            
            if session_id and task_id:
                key = (session_id, task_id)
                if key not in self.ai_help_index:
                    self.ai_help_index[key] = []
                self.ai_help_index[key].append(event)
        
        print(f"Built AI help index with {len(self.ai_help_index)} session-task combinations")
    
    def get_ai_help_data(self, session_id: str, task_id: str, timestamp: float) -> Tuple[bool, Optional[str]]:
        """Find AI help data for a specific task attempt using the index."""
        ai_used = False
        ai_response = None
        
        # Use the index for faster lookup
        key = (session_id, task_id)
        if key in self.ai_help_index:
            # Look through AI events for this session-task combination
            for event in self.ai_help_index[key]:
                event_type = event.get('type', '')
                event_timestamp = event.get('timeElapsedSeconds', 0)
                
                # Look for AI events within 60 seconds of the task timestamp
                if abs(timestamp - event_timestamp) <= 60:
                    ai_used = True
                    
                    if event_type == 'ai_task_help':
                        # Get the AI suggestion based on task type
                        task_type_from_id = self.parse_task_id(task_id)[0] if task_id else None
                        
                        if task_type_from_id == 'counting':
                            # For counting tasks, look for suggestion in individual fields
                            suggestion_parts = []
                            for i in range(10):  # Check fields 0-9
                                field_val = event.get(str(i), '')
                                if field_val:
                                    suggestion_parts.append(str(field_val))
                            ai_response = ''.join(suggestion_parts) if suggestion_parts else event.get('response', '')
                        else:
                            # For slider/typing tasks, look for response field
                            ai_response = event.get('response', '')
                    
                    elif event_type == 'ai_help_response':
                        ai_response = event.get('response', '')
                    
                    break  # Found AI help for this task
                
        return ai_used, ai_response
    
    def process_events(self, require_student_id=True):
        """Process all events and extract structured data."""
        print("Processing events...")
        
        # Sort events by timestamp for proper time calculation
        sorted_events = sorted(self.events, key=lambda x: x.get('timeElapsedSeconds', 0))
        
        for idx, event in enumerate(sorted_events):
            event_type = event.get('type', '')
            
            # Only process task attempts and completions
            if event_type not in ['task_attempt', 'task_complete']:
                continue
                
            # Extract basic info
            session_id = event.get('sessionId', '')
            student_id = self.get_student_id_from_session(session_id)  # Get actual student ID
            semester = event.get('currentSemester', '')
            task_id = event.get('taskId', '') or event.get('currentTask', '')
            
            # Skip if no session ID
            if not session_id:
                continue
                
            # If requiring student ID, skip sessions without mapping
            if require_student_id and not student_id:
                continue
                
            # Use session_id as fallback for student_id when not requiring student ID
            if not student_id:
                student_id = f"session_{session_id}"
            
            # Skip if no task ID
            if not task_id:
                continue
                
            # Parse task information
            task_type, level, task_number = self.parse_task_id(task_id)
            if not task_type:
                continue
                
            # Get student responses and correct answers
            student_response = event.get('userAnswer', '')
            correct_response = event.get('correctAnswer', '')
            
            # Calculate time spent
            time_spent_seconds = self.parse_time_spent(event, sorted_events, idx)
            time_spent_minutes = time_spent_seconds / 60 if time_spent_seconds else None
            
            # Get AI help information
            timestamp = event.get('timeElapsedSeconds', 0)
            ai_used, ai_response = self.get_ai_help_data(session_id, task_id, timestamp)
            
            # Get condition
            condition = self.get_student_condition(event)
            
            # Points earned and student learning
            points_earned = event.get('pointsEarned', event.get('points', ''))
            student_learning_goal = event.get('studentLearning', '')
            
            # Determine if this is a practice mode task
            # Practice mode tasks have no semester (empty/null currentSemester)
            is_practice_mode = not semester or semester == ""
            
            # Create cleaned record
            cleaned_record = {
                'student_id': student_id,
                'session_id': session_id,
                'semester': semester,
                'task_number': task_number,
                'task_type': task_type,
                'task_level': level,
                'task_id': task_id,
                'student_response': str(student_response) if student_response is not None else '',
                'correct_response': str(correct_response) if correct_response is not None else '',
                'ai_help_used': ai_used,
                'ai_response': ai_response or '',
                'time_spent_seconds': time_spent_seconds,
                'time_spent_minutes': time_spent_minutes,
                'condition': condition,
                'points_received': points_earned,
                'current_student_learning_goal': student_learning_goal,
                'is_practice_mode': is_practice_mode,
                'event_type': event_type,
                'timestamp': event.get('timestamp', ''),
                'time_elapsed_readable': event.get('readableTime', ''),
                'attempts': event.get('attempts', ''),
                'accuracy': event.get('accuracy', '')
            }
            
            self.cleaned_data.append(cleaned_record)
    
    def save_cleaned_data(self, output_file: str = 'cleaned_game_data.csv'):
        """Save the cleaned data to CSV."""
        if not self.cleaned_data:
            print("No cleaned data to save")
            return None
            
        # Sort data by student_id, semester, then timestamp
        sorted_data = sorted(self.cleaned_data, key=lambda x: (
            x['student_id'], 
            int(x['semester']) if str(x['semester']).isdigit() else 0, 
            x['timestamp']
        ))
        
        # Write to CSV
        if sorted_data:
            fieldnames = sorted_data[0].keys()
            with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(sorted_data)
        
        print(f"Saved {len(sorted_data)} records to {output_file}")
        
        # Print summary statistics
        print("\n=== DATA SUMMARY ===")
        print(f"Total records: {len(sorted_data)}")
        
        # Count unique students and sessions
        unique_students = set(record['student_id'] for record in sorted_data)
        print(f"Unique students: {len(unique_students)}")
        
        # Task type distribution
        task_types = Counter(record['task_type'] for record in sorted_data)
        print("\nTask Type Distribution:")
        for task_type, count in task_types.most_common():
            print(f"  {task_type}: {count}")
        
        # Condition distribution
        conditions = Counter(record['condition'] for record in sorted_data)
        print("\nCondition Distribution:")
        for condition, count in conditions.most_common():
            print(f"  {condition}: {count}")
        
        # AI Help Usage
        ai_help_count = sum(1 for record in sorted_data if record['ai_help_used'])
        no_ai_help_count = len(sorted_data) - ai_help_count
        ai_help_rate = ai_help_count / len(sorted_data) if sorted_data else 0
        
        print("\nAI Help Usage:")
        print(f"Tasks with AI help: {ai_help_count}")
        print(f"Tasks without AI help: {no_ai_help_count}")
        print(f"AI help usage rate: {ai_help_rate:.2%}")
        
        return sorted_data
    
    def create_summary_statistics(self, data: List[Dict], output_file: str = 'game_data_summary.csv'):
        """Create summary statistics by student and condition."""
        if not data:
            return None
        
        # Group data by student_id and condition
        student_stats = defaultdict(lambda: {
            'student_id': '',
            'condition': '',
            'max_semester_reached': 0,
            'total_tasks_attempted': 0,
            'total_points_earned': 0,
            'total_time_minutes': 0,
            'ai_help_count': 0,
            'task_types': set()
        })
        
        for record in data:
            key = (record['student_id'], record['condition'])
            stats = student_stats[key]
            
            stats['student_id'] = record['student_id']
            stats['condition'] = record['condition']
            stats['max_semester_reached'] = max(stats['max_semester_reached'], 
                                               int(record['semester']) if str(record['semester']).isdigit() else 0)
            stats['total_tasks_attempted'] += 1
            
            # Handle points earned
            try:
                points = float(record['points_received']) if record['points_received'] else 0
                stats['total_points_earned'] += points
            except (ValueError, TypeError):
                pass
            
            # Handle time spent
            try:
                time_minutes = float(record['time_spent_minutes']) if record['time_spent_minutes'] else 0
                stats['total_time_minutes'] += time_minutes
            except (ValueError, TypeError):
                pass
            
            # Count AI help
            if record['ai_help_used']:
                stats['ai_help_count'] += 1
                
            # Track task types
            if record['task_type']:
                stats['task_types'].add(record['task_type'])
        
        # Convert to final format and calculate derived metrics
        summary_records = []
        for (student_id, condition), stats in student_stats.items():
            stats['task_types_attempted'] = len(stats['task_types'])
            stats['ai_help_rate'] = round(stats['ai_help_count'] / stats['total_tasks_attempted'], 3) if stats['total_tasks_attempted'] > 0 else 0
            stats['avg_time_per_task'] = round(stats['total_time_minutes'] / stats['total_tasks_attempted'], 2) if stats['total_tasks_attempted'] > 0 else 0
            
            # Remove the set before saving to CSV
            del stats['task_types']
            summary_records.append(stats)
        
        # Sort by student_id
        summary_records.sort(key=lambda x: x['student_id'])
        
        # Write summary to CSV
        if summary_records:
            fieldnames = [
                'student_id', 'condition', 'max_semester_reached',
                'total_tasks_attempted', 'total_points_earned', 'total_time_minutes',
                'ai_help_count', 'task_types_attempted', 'ai_help_rate', 'avg_time_per_task'
            ]
            
            with open(output_file, 'w', newline='', encoding='utf-8') as csvfile:
                writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
                writer.writeheader()
                writer.writerows(summary_records)
        
        print(f"\nSaved summary statistics to {output_file}")
        return summary_records

def main():
    """Main function to run the data cleaning process."""
    import sys
    
    # Check command line arguments
    sample_size = None
    include_all_sessions = False
    
    for arg in sys.argv[1:]:
        if arg == "--all-sessions":
            include_all_sessions = True
            print("Including all sessions (even without student ID mapping)...")
        elif arg.isdigit():
            sample_size = int(arg)
            print(f"Processing first {sample_size} events only...")
        elif arg in ["-h", "--help"]:
            print("Usage: python clean-data.py [options] [sample_size]")
            print("Options:")
            print("  --all-sessions  Include all sessions even without student ID mapping")
            print("  -h, --help      Show this help message")
            print("Examples:")
            print("  python clean-data.py                # Process only sessions with student IDs")
            print("  python clean-data.py --all-sessions # Process ALL sessions")
            print("  python clean-data.py 1000          # Process first 1000 events (student ID only)")
            print("  python clean-data.py --all-sessions 1000  # Process first 1000 events (all sessions)")
            return
        else:
            print(f"Unknown argument: {arg}")
            print("Use -h or --help for usage information")
            return
    
    # Initialize cleaner
    cleaner = GameDataCleaner('data/dump_events.json')
    
    # Load and process data
    if not cleaner.load_data():
        return
    
    # Optionally limit to sample size
    if sample_size:
        cleaner.events = cleaner.events[:sample_size]
        print(f"Limited to first {len(cleaner.events)} events")
        
    # Process events based on command line options
    cleaner.process_events(require_student_id=not include_all_sessions)
    
    # Save cleaned data
    output_suffix = ""
    if include_all_sessions:
        output_suffix += "_all_sessions"
    if sample_size:
        output_suffix += f"_sample{sample_size}"
    
    cleaned_data = cleaner.save_cleaned_data(f'data/cleaned_game_data{output_suffix}.csv')
    
    if cleaned_data is not None:
        # Create summary statistics
        cleaner.create_summary_statistics(cleaned_data, f'data/game_data_summary{output_suffix}.csv')
        
        print("\n=== SAMPLE DATA ===")
        for i, record in enumerate(cleaned_data[:5]):  # Show fewer records
            print(f"\nRecord {i+1}:")
            for key, value in record.items():
                if len(str(value)) > 50:  # Truncate long values
                    print(f"  {key}: {str(value)[:50]}...")
                else:
                    print(f"  {key}: {value}")
        
        print("\n=== DATA CLEANING COMPLETE ===")
        print("Output files created:")
        print(f"1. data/cleaned_game_data{output_suffix}.csv - {'Sample' if sample_size else 'Full'} cleaned dataset")
        print(f"2. data/game_data_summary{output_suffix}.csv - Summary statistics by student")
        
        if sample_size:
            print(f"\nTo process the full dataset, run: python clean-data.py")

if __name__ == "__main__":
    main()