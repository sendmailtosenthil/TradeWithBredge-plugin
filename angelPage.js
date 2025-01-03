const cache = {};
  
const tokenPriceCache = {} 
const tokenCounter = {}
let rowNumber = 1;
let maxOrder = 2;
let orderNumber = 0;
let indexes = {
    difference: 5,
    buyPrice: 6,
    sellPrice: 7,
    status: 8,
    action: 10
}

function removeCache(rowId){
    tokenCounter[cache[rowId].buyToken] = tokenCounter[cache[rowId].buyToken] - 1;
    tokenCounter[cache[rowId].sellToken] = tokenCounter[cache[rowId].sellToken] - 1;
    delete cache[rowId];
    let toBeUnsubscribeTokens = Object.keys(tokenCounter).filter(token => tokenCounter[token] == 0)
    console.log('Unsubscribe ', toBeUnsubscribeTokens);
    if(toBeUnsubscribeTokens.length > 0){
        ticker.fetchData({
            "correlationID": `Plug${rowId}`, 
            "action":ACTION.Unsubscribe, 
            "mode": MODE.SnapQuote, 
            "exchangeType": EXCHANGES.nse_fo, 
            "tokens": toBeUnsubscribeTokens
        })
    }    
}

function monitorRow(row){
    cache[row.rowId] = {
        buyToken: row.buyToken,
        sellToken: row.sellToken,
        depth: row.depth,
        threshold: row.threshold,
        quantity: row.quantity,
        orderFlag: row.orderFlag,
        buyScript: row.buyScript,
        sellScript: row.sellScript,
        premiumLess: row.premiumLess
    }
    tokenCounter[row.buyToken] = tokenCounter[row.buyToken] ? tokenCounter[row.buyToken] + 1 : 1;
    tokenCounter[row.sellToken] = tokenCounter[row.sellToken] ? tokenCounter[row.sellToken] + 1 : 1;
    tickerConnect(subscribe, [row.buyToken, row.sellToken], row.rowId)
}

function isNotValid(){
    if(orderNumber >= maxOrder){
        alert('You cannot make more than 2 orders at same time')
        return true;
    }
    return false;
}

function cancelRow(rowId) {
    const row = document.getElementById(rowId);
    if (row) {
        row.cells[indexes['status']].textContent = 'Cancelled';
        row.style.backgroundColor = '#FFFFC5';
        row.cells[indexes['action']].textContent = '';
    }
    removeCache(rowId);
    console.log("Cache", cache);
  }

function addNewRow() {
    if(isNotValid()){
        return
    }
    const buyScript = document.getElementById('buyScript').value;
    const sellScript = document.getElementById('sellScript').value;
    const depth = document.getElementById('depth').value;
    const threshold = document.getElementById('threshold').value;
    const premiumLess = document.getElementById('premiumLess').value;
    const quantity = document.getElementById('quantity').value;
    const orderFlag = document.getElementById('orderPlz').checked;
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
      {value: quantity},
      {value: depth},
      {value: `${(premiumLess == 'lt' ? '< ' : '> ') + threshold}`},
      {value: '0'},
      {value: '0'},
      {value: '0'},
      {value: 'Yet to Start'},
      {value: orderFlag}
    ];

    cells.forEach(({value}) => {
      const cell = row.insertCell();
      cell.textContent = value;
    });

    // Add a Cancel button
    const cancelCell = row.insertCell();
    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.addEventListener('click', () => cancelRow(row.id));
    cancelCell.appendChild(cancelButton);

    // Clear form inputs
    document.getElementById('depth').value = '3';
    document.getElementById('threshold').value = '';
    document.getElementById('orderPlz').checked = false;
    
    rowNumber++;
    monitorRow({
        buyToken: getTokenFromSymbol(baseInstrument, buyExpiry, buyScript),
        sellToken: getTokenFromSymbol(baseInstrument, sellExpiry, sellScript),
        depth: depth,
        threshold: Number(Number(threshold).toFixed(2)),
        rowId: row.id,
        quantity: quantity,
        orderFlag: orderFlag,
        buyScript: `${baseInstrument}${buyExpiry}${buyScript}`,
        sellScript: `${baseInstrument}${sellExpiry}${sellScript}`,
        premiumLess: premiumLess == 'lt' ? true : false
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
    const myEvent = new CustomEvent('calender-loaded', {"detail":{}});
    document.dispatchEvent(myEvent)
}

function updatePrices(key, buyPrice, sellPrice){
    const rowDoc = document.getElementById(key);
    rowDoc.cells[indexes['buyPrice']].textContent = buyPrice;
    rowDoc.cells[indexes['sellPrice']].textContent = sellPrice;
    const difference = Number(Math.abs(buyPrice - sellPrice).toFixed(2));
    rowDoc.cells[indexes['difference']].textContent = difference;
    rowDoc.cells[indexes['status']].textContent = 'Running'
}

function placeOrder(row, rowId) {
    if(!row.orderFlag){
        console.log('Order not placed for ', row.rowId);
        return
    }
    console.log('Placing order ', JSON.stringify(row))
    const rowDoc = document.getElementById(rowId)
    let orders = []
    ANGEL_ONE.placeOrder({
        "variety":"NORMAL",
        "tradingsymbol":row.buyScript,
        "symboltoken":String(row.buyToken),
        "transactiontype":"BUY",
        "exchange":"NFO",
        "ordertype":"MARKET",
        "producttype":"CARRYFORWARD",
        "duration":"DAY",
        "quantity": String(row.quantity)
    }).then(data => {
        console.log("Buy success", data)
        rowDoc.cells[indexes['status']].textContent = ' Buy '+ data.message + ' order id '+ data?.data?.orderid
        if(data.data.orderid){
            orders.push(data.data.uniqueorderid)
            ANGEL_ONE.placeOrder({
                "variety":"NORMAL",
                "tradingsymbol":row.sellScript,
                "symboltoken":String(row.sellToken),
                "transactiontype":"SELL",
                "exchange":"NFO",
                "ordertype":"MARKET",
                "producttype":"CARRYFORWARD",
                "duration":"DAY",
                "quantity": String(row.quantity)
            }).then(sellData => {
                console.log("Sell success", sellData)
                rowDoc.cells[indexes['status']].textContent = rowDoc.cells[indexes['status']].textContent + ' Sell '+ sellData?.message + ' order '+ sellData?.data?.orderid + ' '
                if(sellData.data.orderid){
                    orders.push(sellData.data.uniqueorderid)
                    getOrderBook(orders, rowDoc)
                } else {
                    rowDoc.style.backgroundColor = '#FFC300'
                }
            }).catch(exe => {
                console.log("Sell Failed ", exe)
                rowDoc.cells[indexes['status']].textContent = rowDoc.cells[indexes['status']].textContent + ' Sell Failed '+exe
            })
        } else {
            getOrderBook(orders, rowDoc)
            rowDoc.style.backgroundColor = '#FF7F7F'
        }
    }).catch(ex => {
        console.log("Buy Failed ", ex)
        rowDoc.cells[indexes['status']].textContent = 'Buy Failed '+ ex
    })
    
}

function getOrderBook(orders, rowDoc){
    console.log("Given orders ", orders)
    ANGEL_ONE.getOrderBook().then(fetchedOrders => {
        console.log("Fetched orders ", fetchedOrders)
        let executedOrders = fetchedOrders.data.filter(o => orders.includes(o.uniqueorderid))
        if(orders.length != executedOrders.length){
            rowDoc.cells[indexes['status']].textContent = rowDoc.cells[indexes['status']].textContent + 'Missing orders '+ orders
            rowDoc.style.backgroundColor = '#FF7F7F';
        }
        executedOrders.forEach(o => {
            if(o.orderstatus == 'rejected'){
                rowDoc.cells[indexes['status']].textContent = rowDoc.cells[indexes['status']].textContent + `[${o.transactiontype}]`+ o.text + ' '
                rowDoc.style.backgroundColor = '#FF7F7F';
            } else {
                rowDoc.cells[indexes['status']].textContent = rowDoc.cells[indexes['status']].textContent +  o.transactiontype + '::'+ o.tradingsymbol + '::@' +o.price +' '+o.text + ' '
            }
            
        })
    }).catch(err => rowDoc.cells[indexes['status']].textContent = 'Unable to get Order book '+ err)
}

function isEligible(premiumLess, threshold, difference){
    difference = Number(difference.toFixed(2))
    return ((premiumLess && difference <= threshold) || (!premiumLess && difference >= threshold))
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
            updatePrices(key, buyPrice, sellPrice)
            const threshold = leg.threshold;
            const difference = Math.abs(buyPrice - sellPrice);
            if(isEligible(leg.premiumLess, threshold, difference)) {
                console.log("Difference is less than threshold ");
                // if(Object.keys(tokenPriceCache).length % 2 == 0) {
                
                toBeDeletedKeys.push(key)
                const alertSound = document.getElementById(`alertSound`);
                alertSound.play();
                placeOrder(leg, key)
                const rowDoc = document.getElementById(key);
                // Add this line to change background color
                rowDoc.cells[indexes['status']].textContent = 'Completed'
                rowDoc.style.backgroundColor = '#90EE90';
            }
        }
    })
    toBeDeletedKeys.forEach(key => {
        removeCache(key)
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
            console.log("New Connected....");
            Object.keys(cache).forEach(key => {
                subscribe([Number(cache[key].buyToken), Number(cache[key].sellToken)], key)
            })
          //subscribe(tokens, rowId)
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
