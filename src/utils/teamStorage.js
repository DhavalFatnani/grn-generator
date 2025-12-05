// Team member storage utilities

const TEAM_STORAGE_KEY = 'grn_admin_team_members';

// Default team member structure
const DEFAULT_TEAM_STRUCTURE = {
  warehouseNos: [],
  qcPersons: [],
  supervisors: [],
  warehouseManagers: []
};

// Get team members from storage
export function getTeamMembers() {
  try {
    const stored = localStorage.getItem(TEAM_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure all keys exist
      return {
        ...DEFAULT_TEAM_STRUCTURE,
        ...parsed
      };
    }
  } catch (error) {
    console.error('Error reading team members from storage:', error);
  }
  return DEFAULT_TEAM_STRUCTURE;
}

// Save team members to storage
export function saveTeamMembers(teamMembers) {
  try {
    localStorage.setItem(TEAM_STORAGE_KEY, JSON.stringify(teamMembers));
    return true;
  } catch (error) {
    console.error('Error saving team members to storage:', error);
    return false;
  }
}

// Add a team member to a specific category
export function addTeamMember(category, value) {
  if (!DEFAULT_TEAM_STRUCTURE.hasOwnProperty(category)) {
    console.error(`Invalid category: ${category}`);
    return false;
  }
  
  const teamMembers = getTeamMembers();
  if (!teamMembers[category].includes(value)) {
    teamMembers[category].push(value);
    teamMembers[category].sort();
    return saveTeamMembers(teamMembers);
  }
  return false;
}

// Remove a team member from a specific category
export function removeTeamMember(category, value) {
  if (!DEFAULT_TEAM_STRUCTURE.hasOwnProperty(category)) {
    console.error(`Invalid category: ${category}`);
    return false;
  }
  
  const teamMembers = getTeamMembers();
  teamMembers[category] = teamMembers[category].filter(item => item !== value);
  return saveTeamMembers(teamMembers);
}

// Update a team member in a specific category
export function updateTeamMember(category, oldValue, newValue) {
  if (!DEFAULT_TEAM_STRUCTURE.hasOwnProperty(category)) {
    console.error(`Invalid category: ${category}`);
    return false;
  }
  
  const teamMembers = getTeamMembers();
  const index = teamMembers[category].indexOf(oldValue);
  if (index !== -1) {
    teamMembers[category][index] = newValue;
    teamMembers[category].sort();
    return saveTeamMembers(teamMembers);
  }
  return false;
}

// Reset team members to defaults
export function resetTeamMembers() {
  return saveTeamMembers(DEFAULT_TEAM_STRUCTURE);
}

