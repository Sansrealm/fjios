import { fetchWithAuth } from '@/utils/api';

// Milestone types
export const MILESTONES = {
  CARD_CREATED: 'card_created',
  FIRST_ASK: 'first_ask', 
  PROFILE_VIDEO: 'profile_video',
  PROFILE_COMPLETE: 'profile_complete'
};

// Check if a milestone has been completed
export const checkMilestone = async (userId, milestone) => {
  try {
    if (!userId || !milestone) {
      console.warn('checkMilestone: Missing userId or milestone', { userId, milestone });
      return false;
    }
    
    const response = await fetchWithAuth(`/api/auth/milestones/${userId}`);
    if (!response.ok) {
      console.warn('checkMilestone: API response not ok', { status: response.status });
      return false;
    }
    
    const data = await response.json().catch(() => ({}));
    const flags = data.milestoneFlags || {};
    return flags[milestone] === true;
  } catch (error) {
    console.error('Error checking milestone:', error);
    // Return false on error - assume milestone not completed
    return false;
  }
};

// Update a milestone flag
export const updateMilestone = async (userId, milestone) => {
  try {
    if (!userId || !milestone) {
      const error = new Error('Missing userId or milestone');
      console.error('updateMilestone:', error.message, { userId, milestone });
      throw error;
    }
    
    const response = await fetchWithAuth('/api/auth/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, milestone })
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      const error = new Error(`Failed to update milestone: ${response.status} ${errorText}`);
      console.error('updateMilestone: API error', { status: response.status, errorText });
      throw error;
    }
    
    return await response.json().catch(() => ({}));
  } catch (error) {
    console.error('Error updating milestone:', error);
    // Re-throw so caller can handle it
    throw error;
  }
};

// Check if profile is complete
export const checkProfileComplete = (user, card) => {
  if (!user || !card) return false;
  
  const hasName = !!card.name?.trim();
  const hasDescription = !!card.description?.trim();
  const hasProfileVideo = !!card.profile_video_url;
  const hasAsk = card.asks && card.asks.length > 0;
  const hasIndustryTags = card.industry_tags && card.industry_tags.length > 0;
  
  return hasName && hasDescription && hasProfileVideo && hasAsk && hasIndustryTags;
};