const cache = {
    buy: null,
    sell: null
};
  
let threshold = 200
let previousTokens = []

let smart_api = null

function initTicker(event){
    let credentials = event.detail.credentials
    ticker = new WebSocketV2({
        clientcode: credentials.ANGEL_USERNAME,
        jwttoken: credentials.jwtToken,
        apikey: credentials.ANGEL_API_KEY,
        feedtype: credentials.feedToken
    });
    const calendarForm = document.getElementById('calendar-form')
    calendarForm.style.display = 'block';
    document.getElementById('status').textContent = 'Logged in as :' + credentials.ANGEL_USERNAME;
}

function getTokenFromSymbol(baseInstrument, expiry, script) {
    expiry = expiry.substring(0, 5) + expiry.substring(7)
    const symbolKey = `${baseInstrument}${expiry}${script}`;
    return baseInstrument === 'NIFTY' 
        ? niftySymbols[symbolKey] 
        : bankniftySymbols[symbolKey];
}

document.getElementById('baseInstrument').addEventListener('change', function() {
    const buyExpirySelect = document.getElementById('buyExpiry');
    const sellExpirySelect = document.getElementById('sellExpiry');
    
    // Reset both dropdowns
    buyExpirySelect.innerHTML = '<option value="">Select</option>';
    sellExpirySelect.innerHTML = '<option value="">Select</option>';
    
    const selectedInstrument = this.value;
    let expiryValues = [];
    
    if (selectedInstrument === 'NIFTY') {
        expiryValues = niftyExpiry;
    } else if (selectedInstrument === 'BANKNIFTY') {
        expiryValues = bankniftyExpiry;
    }
    
    // Populate both dropdowns with the same expiry values
    expiryValues.forEach(expiry => {
        // Add to Buy Expiry
        const buyOption = document.createElement('option');
        buyOption.value = expiry;
        buyOption.textContent = expiry;
        buyExpirySelect.appendChild(buyOption);
        
        // Add to Sell Expiry
        const sellOption = document.createElement('option');
        sellOption.value = expiry;
        sellOption.textContent = expiry;
        sellExpirySelect.appendChild(sellOption);
    });
});
  
document.addEventListener('login-success', initTicker);

document.getElementById('myButton').addEventListener('click', function() {
    threshold = parseFloat(document.getElementById('priceDiff').value);
    cache.buy = null;
    cache.sell = null;
  
    const baseInstrument = document.getElementById('baseInstrument').value;
    const buyExpiry = document.getElementById('buyExpiry').value;
    const sellExpiry = document.getElementById('sellExpiry').value;
    const buyScript = document.getElementById('buyStrike').value;
    const sellScript = document.getElementById('sellStrike').value;
    const depth = document.getElementById('depth').value;

    const buyToken = getTokenFromSymbol(baseInstrument, buyExpiry, buyScript);
    const sellToken = getTokenFromSymbol(baseInstrument, sellExpiry, sellScript);
    
    const tokens = [Number(buyToken), Number(sellToken)];
    //console.log(tokens);
    if(!ticker.isAlreadyConnected()){
      ticker.connect().then(data=>{
        connected()
      }).catch(err1 => console.log("err1 :", err1));
      
    } else {
      connected();
    }
    
  
    ticker.on("tick", onTicks);
    ticker.on("error", function(e) {
      console.log("Error", e);
    });
  
    function connected(){

      if(previousTokens.length > 0){
        console.log("Unsubscribing :", previousTokens);
        ticker.fetchData({
            "correlationID": "Plug1", 
            "action":ACTION.Unsubscribe, 
            "mode": MODE.SnapQuote, 
            "exchangeType": EXCHANGES.nse_fo, 
            "tokens": previousTokens
          })
      }
      console.log("Connected :", tokens.length);
      if(tokens.length == 2) {
        ticker.fetchData({
            "correlationID": "Plug1", 
            "action":ACTION.Subscribe, 
            "mode": MODE.SnapQuote, 
            "exchangeType": EXCHANGES.nse_fo, 
            "tokens": tokens
          })
        console.log("Subscribed: ",tokens)
        previousTokens = tokens;
      }
    }
    function onTicks(tick) {
      //console.log("Ticks", tick, tokens);
      handleTicks(tick, tokens);
    }
  
    
    // Assuming this function is called whenever new tick data is received
    function handleTicks(tick, tokens) {
        //console.log("Ticks length", ticks.length);
        if (typeof tick === 'string') {
            console.log("Recived ", tick)
            return;
        }
        
        // console.log("Tick", tick);
        const instrumentToken = Number(tick.token);
        if(tick?.best_5_buy_data?.length > 0){
            const buyDepth = tick.best_5_buy_data;
            const sellDepth = tick.best_5_sell_data;
            // console.log("Buy Depth", buyDepth);
            // console.log("Sel Depth", sellDepth);
            // Get the third element price for buy and sell
            const buyPrice = sellDepth[depth-1]?.price || 0;
            const sellPrice = buyDepth[depth-1]?.price || 0;

            // Update cache based on instrument token
            //console.log("Instrument Token", instrumentToken, tokens[0], tokens[1]);
            if (instrumentToken == tokens[0]) {
                cache.buy = buyPrice;
            } else if (instrumentToken == tokens[1]) {
                cache.sell = sellPrice;
            }

            //console.log("Cache", JSON.stringify(cache));
            // Check if both buy and sell prices are available and more than 0
            console.log("Buy Price", cache.buy, "Sell Price", cache.sell);
            if (cache.buy > 0 && cache.sell > 0) {
                const difference = Math.abs(cache.buy - cache.sell);

                document.getElementById('status').textContent = `Difference: ${difference.toFixed(2)} Threshold: ${threshold}`;
                // Alert if the difference is less than the threshold
                if (difference.toFixed(2) <= Number(threshold).toFixed(2)) {
                    console.log("Difference is less than threshold & unsubscribed tokens");
                    ticker.fetchData({
                        "correlationID": "Plug1", 
                        "action":ACTION.Unsubscribe, 
                        "mode": MODE.SnapQuote, 
                        "exchangeType": EXCHANGES.nse_fo, 
                        "tokens": previousTokens
                      })
                    tokens.pop()
                    tokens.pop()
                    tokens.shift();
                    ticker.disconnect();
                    // Play the alert sound
                    const alertSound = document.getElementById('alertSound');
                    alertSound.play();
                }
            }
        }
    }
  
  });
