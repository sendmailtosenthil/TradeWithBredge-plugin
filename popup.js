document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('zerodha').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'zerodha/ticker.html',
      active: true
    });
  });

  document.getElementById('angel').addEventListener('click', () => {
    chrome.tabs.create({
      url: 'angel/angel.html',
      active: true
    });
  });
}); 

 