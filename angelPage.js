const cache = {
    legs:{}
};
  
const tokenPriceCache = {

} 
let smart_api = null
let rowNumber = 1;

function monitorRow(row){
    cache[row.rowId] = {
        buyToken: row.buyToken,
        sellToken: row.sellToken,
        depth: row.depth,
        threshold: row.threshold
    }
    tickerConnect(subscribe, [row.buyToken, row.sellToken], row.rowId)
}

function addNewRow() {
    const buyScript = document.getElementById('buyScript').value;
    const sellScript = document.getElementById('sellScript').value;
    const depth = document.getElementById('depth').value;
    const threshold = document.getElementById('threshold').value;
    const baseInstrument = document.getElementById('baseInstrument').value;
    let buyExpiry = document.getElementById(`buyExpiry`).value;
    buyExpiry = buyExpiry.substring(0, 5) + buyExpiry.substring(7)
    let sellExpiry = document.getElementById(`sellExpiry`).value;
    sellExpiry = sellExpiry.substring(0, 5) + sellExpiry.substring(7)
    
    const tbody = document.getElementById('alertsTableBody');
    const row = tbody.insertRow();
    row.id = 'row-' + rowNumber;
    
    const cells = [
      {value: `${baseInstrument}${buyExpiry}${buyScript}`},
      {value: `${baseInstrument}${sellExpiry}${sellScript}`},
      {value: depth},
      {value: threshold},
      {value: '0'},
      {value: '0'},
      {value: '0'},
      {value: 'Yet to Start'},
    ];

    cells.forEach(({value}) => {
      const cell = row.insertCell();
      cell.textContent = value;
    });

    // Clear form inputs
    document.getElementById('buyScript').value = '';
    document.getElementById('sellScript').value = '';
    document.getElementById('depth').value = '2';
    document.getElementById('threshold').value = '';
    
    rowNumber++;
    monitorRow({
        buyToken: getTokenFromSymbol(baseInstrument, buyExpiry, buyScript),
        sellToken: getTokenFromSymbol(baseInstrument, sellExpiry, sellScript),
        depth: depth,
        threshold: Number(Number(threshold).toFixed(2)),
        rowId: row.id
    })
}

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
    document.getElementById('addFormButton').addEventListener('click', addNewRow);
    // const calendarForm = document.getElementById('calendar-form')
    document.getElementById('monitoring-form').style.display = 'block';
    document.getElementById('alertsTable').style.display = 'block';
    document.getElementById('status').style.display = 'block';
    document.getElementById('status').textContent = 'Logged in as :' + credentials.ANGEL_USERNAME;
}

function isThresholdCrossed() {
    const toBeDeletedKeys = []
    //console.log(cache.legs)
    Object.keys(cache).forEach(key => {
        const leg = cache[key]
        //console.log("Leg ", leg, "tokenPriceCache ",tokenPriceCache)
        const buyPrice = tokenPriceCache[leg.buyToken]?.sellPrices[leg.depth-1]?.price || 0;
        const sellPrice = tokenPriceCache[leg.sellToken]?.buyPrices[leg.depth-1]?.price || 0;
        if(buyPrice > 0 && sellPrice > 0) {
            const rowDoc = document.getElementById(key);
            rowDoc.cells[5].textContent = buyPrice;
            rowDoc.cells[6].textContent = sellPrice;
            const difference = Number(Math.abs(buyPrice - sellPrice).toFixed(2));
            const threshold = leg.threshold;
            rowDoc.cells[4].textContent = difference;
            rowDoc.cells[7].textContent = 'Running'
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
                const alertSound = document.getElementById(`alertSound`);
                alertSound.play();
                // Add this line to change background color
                rowDoc.cells[7].textContent = 'Completed'
                rowDoc.style.backgroundColor = '#90EE90';
            }
        }
    })
    toBeDeletedKeys.forEach(key => {
        delete cache[key]
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
          buyPrices: tick.best_5_buy_data,
          sellPrices: tick.best_5_sell_data
        }
        isThresholdCrossed()
    }
}

function getTokenFromSymbol(baseInstrument, expiry, script) {
    //expiry = expiry.substring(0, 5) + expiry.substring(7)
    const symbolKey = `${baseInstrument}${expiry}${script}`;
    return baseInstrument === 'NIFTY' 
        ? Number(niftySymbols[symbolKey]) 
        : Number(bankniftySymbols[symbolKey]);
}

function tickerConnect(subscribe, tokens, rowId){
    if(!ticker.isAlreadyConnected()){
        ticker.connect().then(data=>{
          subscribe(tokens, rowId)
        }).catch(err1 => console.log("err1 :", err1));
    } else {
      subscribe(tokens, rowId);
    }
}

function subscribe(tokens, rowId){
    //console.log("Connected :", tokens.length);
    if(tokens.length == 2) {
      ticker.fetchData({
          "correlationID": `Plug${rowId}`, 
          "action":ACTION.Subscribe, 
          "mode": MODE.SnapQuote, 
          "exchangeType": EXCHANGES.nse_fo, 
          "tokens": tokens
        })
      console.log("Subscribed: ",tokens)
    }
}

document.getElementById('baseInstrument').addEventListener('change', function() {
    const selectedInstrument = document.getElementById('baseInstrument').value
    const expiryValues = selectedInstrument === 'NIFTY' ? niftyExpiry : bankniftyExpiry;
    const buyExpirySelect = document.getElementById("buyExpiry")
    const sellExpirySelect = document.getElementById("sellExpiry")
    // Clear existing options
    buyExpirySelect.innerHTML = '';
    sellExpirySelect.innerHTML = '';

    // Add default empty option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select Expiry';
    buyExpirySelect.appendChild(defaultOption.cloneNode(true));
    sellExpirySelect.appendChild(defaultOption);

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
});

document.addEventListener('login-success', initTicker);
