document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('zerodha').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'ticker.html',
      active: true
    });
  });

  document.getElementById('angel').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'angel.html',
      active: true
    });
  });
}); 

 