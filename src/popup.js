document.addEventListener('DOMContentLoaded', () => {
  const showDisclaimer = (brokerName, url) => {
  const confirmed = confirm(`
  Disclaimer
  * You understand the risk of using this plugin. 
  * Any bugs / issues in the plugin are accepted by you and aware of financial losses. 
  * You do not claim / blame anyone for any financial losses
  * Placing an order may result in slippage
  Do you accept these terms?
  `);

    if (confirmed) {
      chrome.tabs.create({
        url: url,
        active: true
      });
    }
  };

  const handleBrokerClick = (brokerName, url) => {
    chrome.tabs.create({
      url: url,
      active: true
    });
    //showDisclaimer(brokerName, url);
  };

  document.getElementById('zerodha').addEventListener('click', () => {
    handleBrokerClick('Zerodha', 'zerodha/index.html');
  });

  document.getElementById('angel').addEventListener('click', () => {
    handleBrokerClick('Angel', 'angel/index.html');
  });
});