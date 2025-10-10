// Utility for debouncing rapid function calls
export function debounce(func, delay) {
  let timeoutId;
  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(this, args), delay);
  };
}

// Utility for throttling function calls
export function throttle(func, limit) {
  let inThrottle;
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Utility for smooth animations using requestAnimationFrame
export function smoothUpdate(callback) {
  let rafId = null;
  return function (...args) {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    rafId = requestAnimationFrame(() => {
      callback.apply(this, args);
      rafId = null;
    });
  };
}