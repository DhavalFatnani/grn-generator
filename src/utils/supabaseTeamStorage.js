// Supabase-based team member storage

import { supabase, TABLES } from './supabase';

// Get team members from Supabase
export async function getTeamMembers() {
  try {
    const { data, error } = await supabase
      .from(TABLES.TEAM_MEMBERS)
      .select('*')
      .order('category')
      .order('value');

    if (error) {
      console.error('Error fetching team members:', error);
      return getDefaultTeamStructure();
    }

    // Transform data to match expected structure
    const teamMembers = getDefaultTeamStructure();
    if (data) {
      data.forEach(item => {
        if (teamMembers.hasOwnProperty(item.category) && !teamMembers[item.category].includes(item.value)) {
          teamMembers[item.category].push(item.value);
          teamMembers[item.category].sort();
        }
      });
    }

    return teamMembers;
  } catch (error) {
    console.error('Error getting team members:', error);
    return getDefaultTeamStructure();
  }
}

// Default team member structure
function getDefaultTeamStructure() {
  return {
    warehouseNos: [],
    qcPersons: [],
    supervisors: [],
    warehouseManagers: []
  };
}

// Add a team member
export async function addTeamMember(category, value) {
  try {
    const { error } = await supabase
      .from(TABLES.TEAM_MEMBERS)
      .insert([
        {
          category: category,
          value: value.trim(),
          created_at: new Date().toISOString()
        }
      ]);

    if (error) {
      // If duplicate, that's okay
      if (error.code === '23505') { // Unique constraint violation
        return { success: false, error: 'Item already exists' };
      }
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding team member:', error);
    return { success: false, error: error.message };
  }
}

// Remove a team member
export async function removeTeamMember(category, value) {
  try {
    const { error } = await supabase
      .from(TABLES.TEAM_MEMBERS)
      .delete()
      .eq('category', category)
      .eq('value', value);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error removing team member:', error);
    return { success: false, error: error.message };
  }
}

// Update a team member
export async function updateTeamMember(category, oldValue, newValue) {
  try {
    const { error } = await supabase
      .from(TABLES.TEAM_MEMBERS)
      .update({ value: newValue.trim() })
      .eq('category', category)
      .eq('value', oldValue);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error updating team member:', error);
    return { success: false, error: error.message };
  }
}

// Reset team members to defaults
export async function resetTeamMembers() {
  try {
    const { error } = await supabase
      .from(TABLES.TEAM_MEMBERS)
      .delete()
      .neq('id', 0); // Delete all

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error resetting team members:', error);
    return { success: false, error: error.message };
  }
}

