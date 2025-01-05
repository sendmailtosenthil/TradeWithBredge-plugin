import {WebSocketV2} from './angel_ticker.js'
import { getNiftyExpiry, getBankNiftyExpiry, getBankNiftySymbols, getNiftySymbols } from './angel_script_downloader.js';
import { ACTION, MODE, EXCHANGES } from './angel_constants.js';
import { getConnector } from './angel_login.js';
const cache = {};
const quantities = {
    'NIFTY': [75, 150, 225],
    'BANKNIFTY': [30, 60, 90]
}
const depths = {
    '0': 'First',
    '1': 'Second',
    '2': 'Third',
    '3': 'Fourth',
    '4': 'Fifth'
}
  
const tokenPriceCache = {} 
const tokenCounter = {}
let rowNumber = 1;
let maxOrder = 2;
let orderNumber = 0;
let indexes = {
    difference: 11,
    buyPrice: 9,
    sellPrice: 10,
    status: 12,
    action: 13
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
        row.cells[indexes['status']].textContent = '🛑';
        row.style.backgroundColor = '#FFFFC5';
        row.cells[indexes['action']].textContent = '';
    }
    removeCache(rowId);
    console.log("Cache", cache);
}

function doValidation(){
    const action = document.getElementById('action').value;
    if(orderNumber >= maxOrder && action == 'order'){
        alert('You cannot make more than 2 running 🏃 orders at same time')
        return false;
    }
    const baseInstrument = document.getElementById('baseInstrument').value;
    if(baseInstrument == ''){
        alert('Please enter base instrument')
        return false;
    }
    const strike = document.getElementById('strike').value;
    if(strike == ''){
        alert('Please enter strike value')
        return false;
    }
    const optionType = document.getElementById('optionType').value;
    if(optionType == ''){
        alert('Please select option type')
        return false;
    }
    const quantity = document.getElementById('quantity').value;
    if(quantity == ''){
        alert('Please select Quantity')
        return false;
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

    const depth = document.getElementById('depth').value;
    if(depth == ''){
        alert('Please select correct depth')
        return false;
    }
    const threshold = document.getElementById('threshold').value;
    if(threshold == ''){
        alert('Please enter premium difference')
        return false;
    }
    const orderType = document.getElementById('orderType')?.value;
    if(action == 'order' && orderType == ''){
        alert('Please select appropriate order type')
        return false;
    }
    return true;
}

function capitalizeFirstLetter(val) {
    return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function addNewRow() {
    if(!doValidation()){
        return
    }
    const orderFlag = document.getElementById('action').value == 'order';
    const baseInstrument = document.getElementById('baseInstrument').value;
    const strike = document.getElementById('strike').value;
    const optionType = document.getElementById('optionType').value;
    const quantity = document.getElementById('quantity').value;
    let sellExpiry = document.getElementById(`sellExpiry`).value;
    sellExpiry = sellExpiry.substring(0, 5) + sellExpiry.substring(7)
    let buyExpiry = document.getElementById(`buyExpiry`).value;
    buyExpiry = buyExpiry.substring(0, 5) + buyExpiry.substring(7)
    const premiumLess = document.getElementById('premiumLess').value;
    const threshold = document.getElementById('threshold').value;
    const depth = document.getElementById('depth').value;
    const orderType = document.getElementById('orderType')?.value;
    const buyScript = `${strike}${optionType}`;
    const sellScript = buyScript
    
    const tbody = document.getElementById('alertsTableBody');
    const row = tbody.insertRow();
    row.id = 'row-' + rowNumber;
    
    const cells = [
      {value: `${orderFlag ? '🚚' : '🔔'}`},
      {value: `${capitalizeFirstLetter(baseInstrument.toLowerCase())}`},
      {value: strike},
      {value: `${optionType == 'CE'? 'Call': 'Put'}`},
      {value: quantity},
      {value: sellExpiry},
      {value: buyExpiry},
      {value: `${depths[depth]}`},
      {value: `${orderType ? capitalizeFirstLetter(orderType.toLowerCase()) : '-'}`},
      {value: '0'},
      {value: '0'},
      {value: '0'},
      {value: '⭕'}
    ];

    cells.forEach(({value}) => {
      const cell = row.insertCell();
      cell.textContent = value;
    });

    // Add a Cancel button
    const cancelCell = row.insertCell();
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '✘';
    cancelButton.addEventListener('click', () => cancelRow(row.id));
    cancelCell.appendChild(cancelButton);

    // Clear form inputs
    clearForm()
    
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
        premiumLess: premiumLess == 'lt' ? true : false,
        orderType: orderType.toUpperCase(),
    })
}

function clearForm(){
    const retain = document.getElementById('retain').checked;
    if(retain){
        document.getElementById('depth').value = '';
        document.getElementById('threshold').value = '';
        document.getElementById('premiumLess').value = '';
        document.getElementById('action').value = '';
        return
    }
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
    //document.getElementById('status').style.display = 'block';
    //document.getElementById('status').textContent = 'Logged in as :' + credentials.ANGEL_USERNAME;
    const myEvent = new CustomEvent('calender-loaded', {"detail":{}});
    document.dispatchEvent(myEvent)
}

function updatePrices(key, buyPrice, sellPrice, threshold, premiumLess){
    const rowDoc = document.getElementById(key);
    rowDoc.cells[indexes['buyPrice']].textContent = buyPrice;
    rowDoc.cells[indexes['sellPrice']].textContent = sellPrice;
    const difference = Number(Math.abs(buyPrice - sellPrice).toFixed(2));
    rowDoc.cells[indexes['difference']].textContent = `${premiumLess ? threshold +' < ' + difference: threshold +' > ' + difference}`;
    rowDoc.cells[indexes['status']].textContent = '🏃'
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
            const threshold = leg.threshold;
            updatePrices(key, buyPrice, sellPrice, threshold, leg.premiumLess);
            const difference = Math.abs(buyPrice - sellPrice);
            if(isEligible(leg.premiumLess, threshold, difference)) {
                console.log("Difference is less than threshold ");
                // if(Object.keys(tokenPriceCache).length % 2 == 0) {
                
                toBeDeletedKeys.push(key)
                const alertSound = document.getElementById(`alertSound`);
                alertSound.play();
                const rowDoc = document.getElementById(key);
                // Add this line to change background color
                rowDoc.cells[indexes['status']].textContent = '✔'
                rowDoc.style.backgroundColor = '#D2F8D2';

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
                            rowDoc.cells[indexes['status']].textContent = '✔ '+ result.msg 
                            rowDoc.style.backgroundColor = '#D2F8D2';
                        } else {
                            rowDoc.cells[indexes['status']].textContent = '❗'+result.msg
                            rowDoc.style.backgroundColor = '#FBD9D3';
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
    const quantitySelect = document.getElementById("quantity")
    // Clear existing options
    buyExpirySelect.innerHTML = '';
    sellExpirySelect.innerHTML = '';
    quantitySelect.innerHTML = '';

    // Add default empty option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select';
    buyExpirySelect.appendChild(defaultOption.cloneNode(true));
    sellExpirySelect.appendChild(defaultOption.cloneNode(true));
    quantitySelect.appendChild(defaultOption.cloneNode(true));

    quantities[selectedInstrument].forEach(quantity => {
        const qtyOption = document.createElement('option');
        qtyOption.value = quantity;
        qtyOption.textContent = quantity;
        quantitySelect.appendChild(qtyOption);
    });

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

document.getElementById('action').addEventListener('change', function() {
    const action = document.getElementById('action').value
    if(action =='alert' || action ==''){
        document.getElementById('action-depth').style.display = 'none'
    } else {
        document.getElementById('action-depth').style.display = 'block'
    }
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