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
    const response = await fetchWithAuth(`/api/auth/milestones/${userId}`);
    if (!response.ok) return false;
    
    const data = await response.json();
    const flags = data.milestoneFlags || {};
    return flags[milestone] === true;
  } catch (error) {
    console.error('Error checking milestone:', error);
    return false;
  }
};

// Update a milestone flag
export const updateMilestone = async (userId, milestone) => {
  try {
    const response = await fetchWithAuth('/api/auth/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, milestone })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update milestone');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating milestone:', error);
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