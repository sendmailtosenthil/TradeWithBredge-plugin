chrome.runtime.sendMessage({
  type: 'GET_LOCAL_STORAGE',
  data: { ...localStorage }
});