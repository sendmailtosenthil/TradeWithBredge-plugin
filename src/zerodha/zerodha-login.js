const cookie_info = {
    user_id: null,
    enctoken: null,
    authorization: null
}

chrome.runtime.sendMessage({action: 'getCookies'}, (response) => {
    const {user_id, enctoken} = response;
    
    cookie_info.user_id = user_id;
    cookie_info.enctoken = enctoken
    cookie_info.authorization = `enctoken ${enctoken}`;
    //console.log('Cookie info', cookie_info)
    if (user_id && enctoken) {
        const myEvent = new CustomEvent('zerodha-login-success', {"detail":{}});
        document.dispatchEvent(myEvent)
    }
    return true;
});

module.exports = {
    getCookieInfo: () => cookie_info
}