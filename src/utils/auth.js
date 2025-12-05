// Authentication utilities for admin access

const ADMIN_USERNAME = 'admin';
// Default password hash (SHA-256 of 'admin123')
// In production, this should be changed to a secure password
const DEFAULT_PASSWORD_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
const SESSION_KEY = 'grn_admin_session';
const PASSWORD_HASH_KEY = 'grn_admin_password_hash';

// Simple SHA-256 hashing function
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Initialize admin password if not set
export function initializeAdminPassword() {
  if (!localStorage.getItem(PASSWORD_HASH_KEY)) {
    localStorage.setItem(PASSWORD_HASH_KEY, DEFAULT_PASSWORD_HASH);
  }
}

// Set admin password
export async function setAdminPassword(newPassword) {
  const hash = await sha256(newPassword);
  localStorage.setItem(PASSWORD_HASH_KEY, hash);
  return true;
}

// Verify admin credentials
export async function verifyAdminCredentials(username, password) {
  if (username !== ADMIN_USERNAME) {
    return false;
  }
  
  const storedHash = localStorage.getItem(PASSWORD_HASH_KEY) || DEFAULT_PASSWORD_HASH;
  const inputHash = await sha256(password);
  
  return storedHash === inputHash;
}

// Create admin session
export function createAdminSession() {
  const sessionToken = btoa(Date.now().toString() + Math.random().toString());
  localStorage.setItem(SESSION_KEY, sessionToken);
  return sessionToken;
}

// Check if admin is logged in
export function isAdminLoggedIn() {
  return !!localStorage.getItem(SESSION_KEY);
}

// Clear admin session (logout)
export function clearAdminSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Get current session token
export function getSessionToken() {
  return localStorage.getItem(SESSION_KEY);
}

