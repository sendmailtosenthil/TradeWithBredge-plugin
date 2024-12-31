const cache = {
    legs:{}
};
  
const tokenPriceCache = {

} 
let smart_api = null

function initTicker(event){
    let credentials = event.detail.credentials
    ticker = new WebSocketV2({
        clientcode: credentials.ANGEL_USERNAME,
        jwttoken: credentials.jwtToken,
        apikey: credentials.ANGEL_API_KEY,
        feedtype: credentials.feedToken
    });
    ticker.on("tick", handleTicks);
    ticker.on("error", function(e) {
      console.log("Error", e);
    });
    const calendarForm = document.getElementById('calendar-form')
    calendarForm.style.display = 'block';
    document.getElementById('status').textContent = 'Logged in as :' + credentials.ANGEL_USERNAME;
}

function isThresholdCrossed() {
    const toBeDeletedKeys = []
    //console.log(cache.legs)
    Object.keys(cache.legs).forEach(key => {
        const leg = cache.legs[key]
        const buyPrice = tokenPriceCache[leg.buyToken]?.buyPrice[leg.depth-1]?.price || 0;
        const sellPrice = tokenPriceCache[leg.sellToken]?.sellPrice[leg.depth-1]?.price || 0;
        if(buyPrice > 0 && sellPrice > 0) {
            const difference = Number(Math.abs(buyPrice - sellPrice).toFixed(2));
            const threshold = leg.threshold;
            document.getElementById(`status${key}`).textContent = 'Threshold set as :' + threshold + ' Difference is :' + difference;
            if(difference.toFixed(2) <= threshold){
                console.log("Difference is less than threshold ");
                if(Object.keys(tokenPriceCache).length % 2 == 0) {
                  ticker.fetchData({
                      "correlationID": `Plug${key}`, 
                      "action":ACTION.Unsubscribe, 
                      "mode": MODE.SnapQuote, 
                      "exchangeType": EXCHANGES.nse_fo, 
                      "tokens": leg.previousTokens
                  })
                }
                toBeDeletedKeys.push(key)
                const alertSound = document.getElementById(`alertSound${key}`);
                alertSound.play();
                // Add this line to change background color
                document.querySelector(`.leg-form:nth-child(${key})`).style.backgroundColor = '#90EE90';
            }
        }
    })
    toBeDeletedKeys.forEach(key => {
        delete cache.legs[key]
    })  
}

function handleTicks(tick) {
    //console.log("Ticks length", tick);
    if (typeof tick === 'string') {
        console.log("Recived ", tick)
        return;
    }
    
    // console.log("Tick", tick);
    const instrumentToken = Number(tick.token);
    if(tick?.best_5_buy_data?.length > 0){
        tokenPriceCache[instrumentToken] = {
          buyPrice: tick.best_5_buy_data,
          sellPrice: tick.best_5_sell_data
        }
        isThresholdCrossed()
    }
}

function getTokenFromSymbol(baseInstrument, expiry, script) {
    expiry = expiry.substring(0, 5) + expiry.substring(7)
    const symbolKey = `${baseInstrument}${expiry}${script}`;
    return baseInstrument === 'NIFTY' 
        ? Number(niftySymbols[symbolKey]) 
        : Number(bankniftySymbols[symbolKey]);
}

function tickerConnect(subscribe, leg, legId){
    if(!ticker.isAlreadyConnected()){
        ticker.connect().then(data=>{
          subscribe(leg, legId)
        }).catch(err1 => console.log("err1 :", err1));
    } else {
      subscribe(leg, legId);
    }
}

function subscribe(leg, legId){
    if(leg.previousTokens.length > 0){
      console.log("Unsubscribing :", leg.previousTokens);
      ticker.fetchData({
          "correlationID": `Plug${legId}`, 
          "action":ACTION.Unsubscribe, 
          "mode": MODE.SnapQuote, 
          "exchangeType": EXCHANGES.nse_fo, 
          "tokens": leg.previousTokens
        })
    }
    let tokens = [leg.buyToken, leg.sellToken];
    console.log("Connected :", tokens.length);
    if(tokens.length == 2) {
      ticker.fetchData({
          "correlationID": `Plug${legId}`, 
          "action":ACTION.Subscribe, 
          "mode": MODE.SnapQuote, 
          "exchangeType": EXCHANGES.nse_fo, 
          "tokens": tokens
        })
      console.log("Subscribed: ",tokens)
      leg.previousTokens = tokens;
    }
}

function onAlertButtonClick(n){
    
    // Initialize cache for this leg if it doesn't exist
    if (!cache.legs[n]) {
        cache.legs[n] = {
            lastBuyPrice: null,
            lastSellPrice: null,
            threshold: null,
            depth: null,
            buyToken: null,
            sellToken: null,
            previousTokens: []
        };
    }

    const baseInstrument = document.getElementById('baseInstrument').value;
    const buyExpiry = document.getElementById(`buyExpiry${n}`).value;
    const sellExpiry = document.getElementById(`sellExpiry${n}`).value;
    const buyScript = document.getElementById(`buyStrike${n}`).value;
    const sellScript = document.getElementById(`sellStrike${n}`).value;

    cache.legs[n].threshold = Number(parseFloat(document.getElementById(`priceDiff${n}`).value).toFixed(2));
    cache.legs[n].depth = parseInt(document.getElementById(`depth${n}`).value);
    cache.legs[n].buyToken = getTokenFromSymbol(baseInstrument, buyExpiry, buyScript);
    cache.legs[n].sellToken = getTokenFromSymbol(baseInstrument, sellExpiry, sellScript);

    tickerConnect(subscribe, cache.legs[n], n);
}

document.getElementById('baseInstrument').addEventListener('change', function() {
    const addLegButton = document.getElementById('addLeg');
    const selectedInstrument = this.value;
    
    if (selectedInstrument) {
        addLegButton.style.display = 'inline-block';
    } else {
        addLegButton.style.display = 'none';
    }
});

document.getElementById('addLeg').addEventListener('click', function() {
    const container = document.getElementById('legFormsContainer');
    if (container.children.length >= 2) return;
    
    const template = document.getElementById('legFormTemplate');
    const templateContent = template.innerHTML;
    const n = container.children.length + 1;
    
    // Create a new div for the leg form
    const legForm = document.createElement('div');
    legForm.className = 'leg-form';
    legForm.innerHTML = templateContent.replace(/{n}/g, n);
    container.appendChild(legForm);
    
    // Get the newly added selects
    const buyExpirySelect = container.querySelector(`#buyExpiry${n}`);
    const sellExpirySelect = container.querySelector(`#sellExpiry${n}`);
    
    // Get expiry values based on selected instrument
    const selectedInstrument = document.getElementById('baseInstrument').value;
    const expiryValues = selectedInstrument === 'NIFTY' ? niftyExpiry : bankniftyExpiry;
    
    // Populate both dropdowns
    expiryValues.forEach(expiry => {
        const buyOption = document.createElement('option');
        buyOption.value = expiry;
        buyOption.textContent = expiry;
        buyExpirySelect.appendChild(buyOption);
        
        const sellOption = document.createElement('option');
        sellOption.value = expiry;
        sellOption.textContent = expiry;
        sellExpirySelect.appendChild(sellOption);
    });

    // Add event listener to the newly created button
    document.getElementById(`myButton${n}`).addEventListener('click', function() {
      onAlertButtonClick(n)
  });
});
  
document.addEventListener('login-success', initTicker);