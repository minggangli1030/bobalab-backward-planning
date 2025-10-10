// Utility for communicating with Qualtrics parent window
export const qualtricsMessenger = {
  // Notify Qualtrics when all semesters are completed
  notifyGameComplete(data = {}) {
    try {
      // Send completion message to parent window (Qualtrics)
      window.parent.postMessage({
        type: 'gameComplete',
        status: 'finished',
        timestamp: new Date().toISOString(),
        ...data
      }, '*');
      
      // Force show Qualtrics next button if it exists
      try {
        if (window.parent && window.parent.document) {
          const nextBtn = window.parent.document.querySelector('#NextButton');
          if (nextBtn) {
            nextBtn.style.display = 'inline-block';
            nextBtn.style.visibility = 'visible';
            nextBtn.disabled = false;
          }
        }
      } catch (e) {
        // Cross-origin restriction, use postMessage instead
        window.parent.postMessage({
          type: 'showNextButton',
          action: 'show'
        }, '*');
      }
      
      console.log('✅ Game completion notification sent to Qualtrics');
    } catch (error) {
      console.error('Failed to notify Qualtrics:', error);
    }
  },

  // Notify Qualtrics of semester progress (optional)
  notifySemesterComplete(semesterNumber, totalSemesters, data = {}) {
    try {
      window.parent.postMessage({
        type: 'semesterComplete',
        semester: semesterNumber,
        totalSemesters: totalSemesters,
        timestamp: new Date().toISOString(),
        ...data
      }, '*');
      
      // Ensure Next button stays visible during semester transitions
      window.parent.postMessage({
        type: 'keepNextButtonVisible',
        action: 'maintain'
      }, '*');
      
      console.log(`📚 Semester ${semesterNumber} completion notification sent`);
    } catch (error) {
      console.error('Failed to notify Qualtrics of semester completion:', error);
    }
  },
  
  // Ensure Next button remains visible
  ensureNextButtonVisible() {
    try {
      window.parent.postMessage({
        type: 'ensureNextButton',
        action: 'show',
        timestamp: new Date().toISOString()
      }, '*');
    } catch (error) {
      console.error('Failed to ensure Next button visibility:', error);
    }
  }
};