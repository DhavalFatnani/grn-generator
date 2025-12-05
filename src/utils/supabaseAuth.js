// Supabase-based authentication utilities

import { supabase, TABLES } from './supabase';

// Initialize admin user (run once to create default admin)
export async function initializeAdmin() {
  try {
    // Check if admin exists
    const { data: existingAdmin } = await supabase
      .from(TABLES.ADMINS)
      .select('*')
      .eq('username', 'admin')
      .single();

    if (!existingAdmin) {
      // Create default admin (password: admin123)
      // In production, password should be hashed before storing
      const { error } = await supabase
        .from(TABLES.ADMINS)
        .insert([
          {
            username: 'admin',
            password_hash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', // SHA-256 of 'admin123'
            created_at: new Date().toISOString()
          }
        ]);

      if (error) {
        console.error('Error initializing admin:', error);
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error initializing admin:', error);
    return false;
  }
}

// Simple SHA-256 hashing function
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Verify admin credentials
export async function verifyAdminCredentials(username, password) {
  try {
    const { data, error } = await supabase
      .from(TABLES.ADMINS)
      .select('*')
      .eq('username', username)
      .single();

    if (error || !data) {
      return false;
    }

    const inputHash = await sha256(password);
    return data.password_hash === inputHash;
  } catch (error) {
    console.error('Error verifying credentials:', error);
    return false;
  }
}

// Create admin session (store in localStorage for now, can be enhanced with Supabase Auth)
export function createAdminSession(username) {
  const sessionToken = btoa(Date.now().toString() + Math.random().toString());
  const sessionData = {
    token: sessionToken,
    username: username,
    timestamp: Date.now()
  };
  localStorage.setItem('grn_admin_session', JSON.stringify(sessionData));
  return sessionToken;
}

// Check if admin is logged in
export function isAdminLoggedIn() {
  const session = localStorage.getItem('grn_admin_session');
  if (!session) return false;
  
  try {
    const sessionData = JSON.parse(session);
    // Check if session is less than 24 hours old
    const isExpired = Date.now() - sessionData.timestamp > 24 * 60 * 60 * 1000;
    if (isExpired) {
      clearAdminSession();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Get current admin username
export function getCurrentAdmin() {
  const session = localStorage.getItem('grn_admin_session');
  if (!session) return null;
  
  try {
    const sessionData = JSON.parse(session);
    return sessionData.username;
  } catch {
    return null;
  }
}

// Clear admin session
export function clearAdminSession() {
  localStorage.removeItem('grn_admin_session');
}

// Change admin password
export async function changeAdminPassword(username, oldPassword, newPassword) {
  try {
    // Verify old password first
    const isValid = await verifyAdminCredentials(username, oldPassword);
    if (!isValid) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Hash new password
    const newHash = await sha256(newPassword);

    // Update password
    const { error } = await supabase
      .from(TABLES.ADMINS)
      .update({ password_hash: newHash })
      .eq('username', username);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: error.message };
  }
}

