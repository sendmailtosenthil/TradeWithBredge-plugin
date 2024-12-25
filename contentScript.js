console.log('Content script is running.', JSON.stringify({ ...localStorage }));
chrome.runtime.sendMessage({
  type: 'GET_LOCAL_STORAGE',
  data: { ...localStorage }
});