document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('transferBtn').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'ticker.html',
      active: true
    });
  });
}); 

 