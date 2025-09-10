// Format date time string to remove timezone offset
export const formatDateTime = (dateTimeString) => {
  if (!dateTimeString) return 'Not specified';
  
  // Remove timezone offset by converting to local time and formatting
  const date = new Date(dateTimeString);
  return date.toISOString().replace('T', ' ').split('.')[0]; // Returns format: YYYY-MM-DD HH:MM:SS
};

// Format date to local date string
export const formatDate = (dateString) => {
  if (!dateString) return 'Not specified';
  return new Date(dateString).toLocaleDateString();
};

// Format time to local time string
export const formatTime = (timeString) => {
  if (!timeString) return 'Not specified';
  return new Date(timeString).toLocaleTimeString();
};
