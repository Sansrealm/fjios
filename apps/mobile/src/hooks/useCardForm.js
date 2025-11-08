import { useState } from 'react';

export function useCardForm(initialUser) {
  const [formData, setFormData] = useState({
    name: initialUser?.name || '',
    startup_name: '',
    startup_website: '',
    role: '',
    description: '',
    profile_video_url: '',
    industry_tag_ids: [],
    location_city: '',
    location_state: '',
    location_country: '',
  });

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleTagToggle = (tagId) => {
    setFormData((prev) => ({
      ...prev,
      industry_tag_ids: prev.industry_tag_ids.includes(tagId)
        ? prev.industry_tag_ids.filter((id) => id !== tagId)
        : [...prev.industry_tag_ids, tagId],
    }));
  };

  const setVideoUrl = (url) => {
    setFormData((prev) => ({ ...prev, profile_video_url: url }));
  };

  const setLocation = (city, state, country) => {
    setFormData((prev) => ({
      ...prev,
      location_city: city,
      location_state: state,
      location_country: country,
    }));
  };

  return {
    formData,
    updateField,
    handleTagToggle,
    setVideoUrl,
    setLocation,
  };
}
