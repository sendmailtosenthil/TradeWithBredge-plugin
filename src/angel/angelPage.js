import {WebSocketV2} from './angel_ticker.js'
import { getNiftyExpiry, getBankNiftyExpiry, getBankNiftySymbols, getNiftySymbols } from './angel_script_downloader.js';
import { ACTION, MODE, EXCHANGES } from './angel_constants.js';
import { getConnector } from './angel_login.js';
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
let ticker

function removeCache(rowId){
    if(cache[rowId]){
        tokenCounter[cache[rowId].buyToken] = tokenCounter[cache[rowId].buyToken] - 1;
        tokenCounter[cache[rowId].sellToken] = tokenCounter[cache[rowId].sellToken] - 1;
        if(cache[rowId].orderFlag){
            orderNumber--;
        }
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
    if(Object.keys(cache).length == 0){
        ticker.disconnect()
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


function cancelRow(rowId) {
    const row = document.getElementById(rowId);
    if (row && cache[rowId]) {
        row.cells[indexes['status']].textContent = 'Cancelled';
        row.style.backgroundColor = '#FFFFC5';
        row.cells[indexes['action']].textContent = '';
    }
    removeCache(rowId);
    console.log("Cache", cache);
}

function doValidation(){
    const orderPlz = document.getElementById('orderPlz').checked;
    if(orderNumber >= maxOrder && orderPlz){
        alert('You cannot make more than 2 running orders at same time')
        return false;
    }
    const baseInstrument = document.getElementById('baseInstrument').value;
    if(baseInstrument == ''){
        alert('Please enter base instrument')
        return false;
    }
    const buyScript = document.getElementById('buyScript').value;
    if(buyScript == ''){
        alert('Please enter Buy script')
        return false;
    }
    const sellScript = document.getElementById('sellScript').value;
    if(sellScript == ''){
        alert('Please enter Sell script')
        return false;
    }
    const depth = document.getElementById('depth').value;
    if(depth == ''){
        alert('Please enter depth')
        return false;
    }
    const threshold = document.getElementById('threshold').value;
    if(threshold == ''){
        alert('Please enter premium difference')
        return false;
    }
    const quantity = document.getElementById('quantity').value;
    if(quantity == ''){
        alert('Please enter Quantity')
        return false;
    }
    if(baseInstrument == 'NIFTY'){
        let isValidQty = parseInt(quantity) % 75;
        if(isValidQty != 0){
            alert('Please enter quantity in multiple of 75')
            return false;
        }
    }
    if(baseInstrument == 'BANKNIFTY'){
        let isValidQty = parseInt(quantity) % 30;
        if(isValidQty != 0){
            alert('Please enter quantity in multiple of 30')
            return false;
        }
    }
    
    let buyExpiry = document.getElementById(`buyExpiry`).value;
    if(buyExpiry == ''){
        alert('Please enter Buy Expiry')
        return false;
    }
    let sellExpiry = document.getElementById(`sellExpiry`).value;
    if(sellExpiry == ''){
        alert('Please enter Sell Expiry')
        return false;
    }
    const premiumLess = document.getElementById('premiumLess').value;
    if(premiumLess == ''){
        alert('Please enter Less Than or More Than premium')
        return false;
    }
    return true;
}

function addNewRow() {
    if(!doValidation()){
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
    document.getElementById('premiumLess').value = '';
    document.getElementById('orderPlz').checked = false;
    
    rowNumber++;
    if(orderFlag){
        orderNumber++
    }
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

function initTicker(credentials){
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
}

function postLoginSuccess(event){
    let credentials = event.detail.credentials
    initTicker(credentials)
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

function placeOrder(order){
    return getConnector().placeOrder({
        "variety":"NORMAL",
        "tradingsymbol":order.tradingsymbol,
        "symboltoken":String(order.token),
        "transactiontype":order.transactiontype,
        "exchange":"NFO",
        "ordertype":"MARKET",
        "producttype":"CARRYFORWARD",
        "duration":"DAY",
        "quantity": String(order.quantity)
    })
}

function parseResponse(resp){
    let result = resp.result
    if(resp.status == 'fulfilled'){
        let angelResp = resp.value
        console.log('Parse Resp Inside', angelResp)
        result.msg += resp.ordertype + ' '
        if(angelResp.message == 'SUCCESS'){
            result.msg += 'Placed' + ' '
        } else {
            result.msg += angelResp.message + ' ' + angelResp.errorcode + ' '
            result.success = false
        }

        if(angelResp.status && angelResp.data?.orderid){
            resp.orders.push(angelResp.data.orderid)
        } else {
            result.success = false
        }
    }
    //console.log('Parse Resp return', result, resp.orders)
    return {result, orders:resp.orders}
}

async function placeCalenderOrder(buyOrder, sellOrder) {
    console.log('Placing order ', JSON.stringify(buyOrder), JSON.stringify(sellOrder))  
    let result = {msg : '', success: true}
    let reponses = await Promise.allSettled([
        placeOrder(buyOrder),
        placeOrder(sellOrder),
    ]).catch(ex => {
        console.log("Orders failed ", ex)
        return {msg: ex.message, success: false}
    })
    console.log("Response ", reponses)
    let resp = parseResponse({...reponses[0], ordertype: 'BUY', result:result, orders: []}) 
    resp = parseResponse({...reponses[1], ordertype: 'SELL', result:resp.result, orders: resp.orders})
       
    return await getOrderBook(resp.orders, resp.result)
}

async function getOrderBook(orders, result){
    //console.log("Given orders ", orders)
    let fetchedOrders = await getConnector().getOrderBook().catch(err => {
        return {
            msg:result.msg + ' Unable to get Order book '+err, 
            success: false
        }
    })
    //console.log("Fetched orders ", fetchedOrders)
    let executedOrders = fetchedOrders.data.filter(o => orders.includes(o.orderid))
    if(orders.length != executedOrders.length){
        result.msg = result.msg + ' Missing orders '+ orders + ' ' + executedOrders + ' '
        result.success = false
    }
    executedOrders.forEach(o => {
        if(o.orderstatus == 'rejected' || o.orderstatus == 'cancelled'){
            result.msg = result.msg + `[${o.transactiontype} Status] :`+ o.status + ' ' + o.text + ' '
            result.success = false
        } else {
            result.msg = result.msg +  o.transactiontype + '::'+ o.tradingsymbol + '::@' +o.price +' '+o.text + ' '
        }
    })
    return result;
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
                const rowDoc = document.getElementById(key);
                // Add this line to change background color
                rowDoc.cells[indexes['status']].textContent = 'Triggered'
                rowDoc.style.backgroundColor = '#90EE90';

                if(leg.orderFlag){
                    placeCalenderOrder({
                        tradingsymbol: leg.buyScript,
                        token: leg.buyToken,
                        quantity: leg.quantity,
                        transactiontype: 'BUY'
                    }, {
                        tradingsymbol: leg.sellScript,
                        token: leg.sellToken,
                        quantity: leg.quantity,
                        transactiontype: 'SELL'
                    }).then(result => {
                        console.log("Order result ", result)
                        if(result.success){
                            rowDoc.cells[indexes['status']].textContent = 'Completed '+ result.msg 
                            rowDoc.style.backgroundColor = '#90EE90';
                        } else {
                            rowDoc.cells[indexes['status']].textContent = result.msg
                            rowDoc.style.backgroundColor = '#FF7F7F';
                        }
                    })
                }
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
        ? Number(getNiftySymbols()[symbolKey]) 
        : Number(getBankNiftySymbols()[symbolKey]);
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
    const expiryValues = selectedInstrument === 'NIFTY' ? getNiftyExpiry() : getBankNiftyExpiry();
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

document.addEventListener('login-success', postLoginSuccess);

function scheduleDisconnectAt345PM() {
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(15, 45, 0);
    //targetTime.setHours(7, 26, 0); 

    if (now > targetTime) {
        return
    }

    const timeUntilTarget = targetTime - now;
    setTimeout(() => {
        console.log('Clearing for the day')
        if(ticker != null && ticker.isAlreadyConnected()){
            ticker.disconnect()
        }
        Object.keys(cache).forEach(key => delete cache[key])
        Object.keys(tokenCounter).forEach(key => delete tokenCounter[key])
        Object.keys(tokenPriceCache).forEach(key => delete tokenPriceCache[key]) 
        rowNumber = 1
        orderNumber = 0
        showOverlay()
    }, timeUntilTarget);
}

scheduleDisconnectAt345PM()