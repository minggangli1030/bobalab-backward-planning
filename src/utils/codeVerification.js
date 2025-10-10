// src/utils/codeVerification.js - Simplified for Student-First Access
import { db } from "../firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";

export const codeVerification = {
  // Generate a unique code
  generateCode() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomStr}`.toUpperCase();
  },

  // Create a code (mainly for student logins now)
  async createCode(data = {}) {
    const code = this.generateCode();

    // For student logins, we don't need to store in Firebase immediately
    // We'll only store when they actually start playing (to track usage)

    return {
      success: true,
      code,
      data,
    };
  },

  // Mark code as used (for replay prevention)
  async markCodeAsUsed(code, sessionId) {
    if (!code) return { success: false, error: "No code provided" };

    try {
      // Store this code as used in Firebase
      const codeData = {
        code,
        status: "used",
        usedAt: serverTimestamp(),
        sessionId,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "accessCodes", code), codeData);

      return { success: true };
    } catch (error) {
      console.error("Error marking code as used:", error);
      return { success: false, error: error.message };
    }
  },

  // Check if a code has been used (for replay prevention)
  async checkCodeUsage(code) {
    if (!code) return { used: false };

    try {
      const codeDoc = await getDoc(doc(db, "accessCodes", code));

      if (codeDoc.exists()) {
        const data = codeDoc.data();
        return {
          used: data.status === "used",
          sessionId: data.sessionId,
          usedAt: data.usedAt,
        };
      }

      return { used: false };
    } catch (error) {
      console.error("Error checking code usage:", error);
      return { used: false, error: error.message };
    }
  },

  // Get code from URL
  getCodeFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("code") || params.get("c") || null;
  },

  // Future: Verify Qualtrics codes
  async verifyQualtricsCode(code) {
    // This is for future implementation when you add Qualtrics support
    // For now, just return invalid
    return {
      valid: false,
      reason: "Qualtrics codes not yet supported",
    };
  },
};
