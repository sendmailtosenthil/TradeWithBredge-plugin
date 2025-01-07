const credentials = {
    client_id: 'b495e688-64f8-4dc4-898a-75e8204a2fc5',
    client_secret: 'i3k5cjy9bj',
    redirect_uri: 'https://www.tradewithbredge.in/auth',
    grant_type: 'authorization_code',

}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginButton').addEventListener('click', () => {
        chrome.tabs.create({ url: `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${credentials.client_id}&redirect_uri=${credentials.redirect_uri}` }, (tab) => {
            const tabId = tab.id;

            // Listen for URL updates
            chrome.tabs.onUpdated.addListener(function listener(updatedTabId, changeInfo, updatedTab) {
                if (updatedTabId === tabId && changeInfo.url) {
                    const currentUrl = changeInfo.url;

                    // Check if the URL matches the target domain
                    if (currentUrl.startsWith('https://www.tradewithbredge.in')) {
                        console.log('Redirected URL:', currentUrl);

                        // Extract query parameters
                        const queryParams = new URLSearchParams(new URL(currentUrl).search);

                        const authCode = queryParams.get('code');

                        if (authCode) {
                            // Prepare data for token request
                            const tokenRequestData = new URLSearchParams({
                                code: authCode,
                                client_id: 'b495e688-64f8-4dc4-898a-75e8204a2fc5',
                                client_secret: 'i3k5cjy9bj',
                                redirect_uri: 'https://www.tradewithbredge.in/auth',
                                grant_type: 'authorization_code'
                            });

                            // Make POST request to get access token
                            fetch('https://api.upstox.com/v2/login/authorization/token', {
                                method: 'POST',
                                headers: {
                                    'Accept': 'application/json',
                                    'Content-Type': 'application/x-www-form-urlencoded'
                                },
                                body: tokenRequestData
                            })
                                .then(response => response.json())
                                .then(data => {
                                    console.log('Token Response:', data);
                                    // You can store the access token or perform further actions
                                })
                                .catch(error => {
                                    console.error('Error fetching token:', error);
                                });

                            // Close the tab
                            chrome.tabs.remove(tabId);

                            // Stop listening to this tab
                            chrome.tabs.onUpdated.removeListener(listener);
                        }
                    }
                }
            });
        });
    });
});