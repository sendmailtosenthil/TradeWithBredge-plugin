chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  //console.log(`=======BG Request =======> ${JSON.stringify(request)} ${JSON.stringify(sender)}`);
  if (request.action === 'getCookies') {
    chrome.cookies.getAll({domain: 'kite.zerodha.com'}, (cookies) => {
      const cookieData = {
        user_id: cookies.find(c => c.name === 'user_id')?.value,
        enctoken: cookies.find(c => c.name === 'enctoken')?.value,
      };
      sendResponse(cookieData);
    });
    return true; // Required for async response
  }
  if (request.action === 'GET_LOCAL_STORAGE') {
    // Handle the local storage data
    const storageData = request.data;
    //console.log('BG Local Storage Data:', storageData);
    //console.log('Local Storage Data json:', JSON.stringify(storageData));
    sendResponse(storageData);
    // Do something with the data
    return true;
  }
});

