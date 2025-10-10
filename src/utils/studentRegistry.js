// src/utils/studentRegistry.js - Simple Version
export const studentRegistry = {
  // Placeholder - you can implement the full version later
  async verifyAndGenerateCode(identifier) {
    // For now, just return success
    // Later you can add the Firebase integration
    return {
      success: true,
      studentName: identifier,
      message: 'Access granted'
    };
  }
};