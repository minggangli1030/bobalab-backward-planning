// src/utils/codeVerification.js - Code Verification System
import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export const codeVerification = {
  // Generate a unique code for Qualtrics
  generateCode() {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomStr}`.toUpperCase();
  },
  
  // Store code in Firebase when generating from Qualtrics
  async createCode(qualtricsData = {}) {
    const code = this.generateCode();
    const codeData = {
      code,
      createdAt: serverTimestamp(),
      status: 'unused',
      qualtricsResponseId: qualtricsData.responseId || null,
      qualtricsUserId: qualtricsData.userId || null,
      metadata: qualtricsData,
      usedAt: null,
      sessionId: null
    };
    
    try {
      await setDoc(doc(db, 'accessCodes', code), codeData);
      return { success: true, code };
    } catch (error) {
      console.error('Error creating code:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Verify code when user arrives from Qualtrics
  async verifyCode(code) {
    if (!code) {
      return { valid: false, reason: 'No code provided' };
    }
    
    try {
      const codeDoc = await getDoc(doc(db, 'accessCodes', code));
      
      if (!codeDoc.exists()) {
        return { valid: false, reason: 'Invalid code' };
      }
      
      const codeData = codeDoc.data();
      
      // Check if code has been used
      if (codeData.status === 'used') {
        return { valid: false, reason: 'Code already used', usedAt: codeData.usedAt };
      }
      
      // Check if code is expired (24 hours)
      const createdAt = codeData.createdAt?.toDate();
      const expiryTime = 24 * 60 * 60 * 1000; // 24 hours
      if (createdAt && Date.now() - createdAt.getTime() > expiryTime) {
        return { valid: false, reason: 'Code expired' };
      }
      
      return { valid: true, codeData };
    } catch (error) {
      console.error('Error verifying code:', error);
      return { valid: false, reason: 'Verification error', error: error.message };
    }
  },
  
  // Mark code as used
  async markCodeAsUsed(code, sessionId) {
    try {
      await updateDoc(doc(db, 'accessCodes', code), {
        status: 'used',
        usedAt: serverTimestamp(),
        sessionId
      });
      return { success: true };
    } catch (error) {
      console.error('Error marking code as used:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Get code from URL parameters
  getCodeFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('code') || params.get('c') || null;
  }
};