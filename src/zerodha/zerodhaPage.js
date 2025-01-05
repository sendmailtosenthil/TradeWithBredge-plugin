import { ENV } from "../lib/config.js"
import { KiteTicker } from "./ticker.js"
import { getCookieInfo } from "./zerodha-login.js"
import { placeCalendarOrder } from "./zerodha-connect.js"
import { getNiftyExpiry, getBankNiftyExpiry, getBankNiftySymbols, getNiftySymbols } from './zerodha_script_downloader.js';
import { capitalizeFirstLetter } from "../lib/util.js";

let rowNumber = 1;
let ticker = null;
let orderNumber = 0;
const maxOrder = 2
let zerodhaCache = {}
const tokenCounter = {}
const tokenPricesCache = {};
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
const MONTHS ={
  'JAN': '1',
  'FEB': '2',
  'MAR': '3',
  'APR': '4',
  'MAY': '5',
  'JUN': '6',
  'JUL': '7',
  'AUG': '8',
  'SEP': '9',
  'OCT': 'O',
  'NOV': 'N',
  'DEC': 'D',
}

let indexes = {
  difference: 11,
  buyPrice: 9,
  sellPrice: 10,
  status: 12,
  action: 13
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

function loadUser() {
  const cookie_info = getCookieInfo();
  console.log("Page Cookie Info : ", cookie_info?.user_id);
  if (cookie_info.user_id != null) {
    fetch('https://kite.zerodha.com/oms/user/profile/full', {
      method: 'GET',
      headers: {
        'Authorization': cookie_info.authorization,
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Kite-Version': '3.0.0',
        'X-Kite-Userid': cookie_info.user_id,
      }
    })
      .then(response => response.json())
      .then(data => {
        console.log('Data : ', data);
        if (ENV == 'prod') {
          //console.log("Connecting to Kite Ticker ", cookie_info.user_id, cookie_info.enctoken);
          ticker = new KiteTicker({
            api_key: "your_api_key",
            url: "wss://ws.zerodha.com/?api_key=kitefront&user_id=" + cookie_info.user_id + "&enctoken=" + encodeURIComponent(cookie_info.enctoken)
          });
          //console.log("Connected to Kite Ticker", ticker);
        } else {
          console.log("Connecting to Mock Ticker");
          ticker = new MockTicker({})
        }
        //document.getElementById('status').textContent = 'Logged in as :' + data.data.user_id
        const myEvent = new CustomEvent('calender-loaded', { "detail": {} });
        document.dispatchEvent(myEvent)
      })
      .catch(error => {
        console.log('Error : ', error);
        //document.getElementById('status').textContent = 'Reach to Telegram User @TradeWithBredge Error : ' + error;
      });
  } else {
    console.log('No user id ', cookie_info.user_id);
  }
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
  if(action == 'order' && quantity == ''){
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

function subscribe(tokens) {
  console.log("Connected :", tokens.length);
  if (tokens.length == 2) {
    console.log(`Subscribed to Tokens ${tokens}`);
    ticker.subscribe(tokens);
    ticker.setMode(ticker.modeFull, tokens)
  }
}

function calculateRowPrices() {
  const toBeDeleted = [];
  console.log("Calculating Row Prices", zerodhaCache, tokenPricesCache);
  Object.keys(zerodhaCache).forEach(rowId => {
    const row = zerodhaCache[rowId];
    const buyToken = Number(row.buyToken);
    const sellToken = Number(row.sellToken);
    console.log("tokenPricesCache ", tokenPricesCache, buyToken, sellToken, tokenPricesCache[buyToken], row.depth - 1);
    row.buyPrice = tokenPricesCache[buyToken]?.sellPrices[row.depth - 1]?.price || 0;
    row.sellPrice = tokenPricesCache[sellToken]?.buyPrices[row.depth - 1]?.price || 0;
    console.log("Buy Price", row.buyPrice, "Sell Price", row.sellPrice);
    const rowDoc = document.getElementById(rowId);
    rowDoc.cells[indexes['buyPrice']].textContent = row.buyPrice;
    rowDoc.cells[indexes['sellPrice']].textContent = row.sellPrice;
    if (row.buyPrice > 0 && row.sellPrice > 0) {
      const diff = Number(Math.abs(row.buyPrice - row.sellPrice).toFixed(2));
      rowDoc.cells[indexes['difference']].textContent = diff;
      rowDoc.cells[indexes['status']].textContent = 'Running'
      if (isEligible(row.premiumLess, row.threshold, diff)) {
        console.log("Difference is less than threshold & unsubscribed tokens");
        const alertSound = document.getElementById('alertSound');
        alertSound.play();
        toBeDeleted.push(rowId)
        rowDoc.cells[indexes['status']].textContent = 'Completed'
        rowDoc.style.backgroundColor = '#90EE90';
        if (row.orderFlag) {
          console.log("Order Placed");
          row.orderFlag = false;
          placeCalendarOrder({
            'transactiontype': 'BUY',
            'quantity': row.quantity,
            'tradingsymbol': row.buyScript,
            'price': (Number(row.buyPrice) + 2).toFixed(2),
            'ordertype': row.orderType,
          }, {
            'transactiontype': 'SELL',
            'quantity': row.quantity,
            'tradingsymbol': row.sellScript,
            'price': (Number(row.sellPrice) + 2).toFixed(2),
            'ordertype': row.orderType,
          }, (txt, success) => {
            rowDoc.cells[indexes['status']].textContent = txt
            rowDoc.style.backgroundColor = success ? '#90EE90' : '#FF7F7F';
          }, (msg, success) => {
            rowDoc.cells[indexes['status']].textContent = msg
            if (!success) {
              rowDoc.style.backgroundColor = '#FF7F7F';
            }
          });
        }
      }
    }
  })
  if (toBeDeleted.length > 0) {
    toBeDeleted.forEach(rowId => {
      removeCache(rowId);
    })
  }
  //renderRows();
}

function onTicks(ticks) {
  ticks.forEach(tick => {
    console.log(tick);
    if (tick?.depth?.buy) {
      console.log("Buy Price", tick.depth.buy, "Sell Price", tick.depth.sell);
      const instrumentToken = Number(tick.instrument_token);
      tokenPricesCache[instrumentToken] = {
        buyPrices: tick.depth.buy,
        sellPrices: tick.depth.sell,
      }
    }
  });
  calculateRowPrices();
}

function monitorRow(row) {
  //console.log("Before adding row Cache", zerodhaCache, row);
  zerodhaCache[row.rowId] = {
    buyScript: row.buyScript,
    sellScript: row.sellScript,
    buyToken: row.buyToken,
    sellToken: row.sellToken,
    depth: row.depth,
    threshold: row.threshold,
    status: 'Yet to Start',
    orderFlag: row.orderFlag,
    quantity: row.quantity,
    premiumLess: row.premiumLess,
    orderType: row.orderType,
  }
  //console.log("Cache", zerodhaCache);
  //console.log("Cache row", zerodhaCache[row.rowId]);

  if (ticker != null || !ticker.isAlreadyConnected()) {
    ticker.connect();
    ticker.on('connect', function () {
      ticker.on("ticks", onTicks);
      ticker.on("error", function (e) {
        console.log("Error", e);
      });
      Object.keys(zerodhaCache).forEach(rowId => {
        subscribe([Number(zerodhaCache[rowId].buyToken), Number(zerodhaCache[rowId].sellToken)]);
      });
      //subscribe([Number(cache[row.rowId].buyToken), Number(cache[row.rowId].sellToken)]);
    });
  } else {
    subscribe([Number(zerodhaCache[row.rowId].buyToken), Number(zerodhaCache[row.rowId].sellToken)]);
  }
}

function removeCache(rowId) {
  if (zerodhaCache[rowId]) {
    tokenCounter[zerodhaCache[rowId].buyToken] = tokenCounter[zerodhaCache[rowId].buyToken] - 1;
    tokenCounter[zerodhaCache[rowId].sellToken] = tokenCounter[zerodhaCache[rowId].sellToken] - 1;
    if (zerodhaCache[rowId].orderFlag) {
      orderNumber--;
    }
    delete zerodhaCache[rowId];
    let toBeUnsubscribeTokens = Object.keys(tokenCounter).filter(token => tokenCounter[token] == 0)
    console.log('Unsubscribe ', toBeUnsubscribeTokens);
    if (toBeUnsubscribeTokens.length > 0) {
      ticker.unsubscribe(toBeUnsubscribeTokens)
    }
  }
}

function cancelRow(rowId) {
  const row = document.getElementById(rowId);
  if (row && zerodhaCache[rowId]) {
    row.cells[indexes['status']].textContent = 'Cancelled';
    row.style.backgroundColor = '#FFFFC5';
    row.cells[indexes['action']].textContent = '';
    removeCache(rowId);
  }
}

function isEligible(premiumLess, threshold, difference) {
  return ((premiumLess && difference <= threshold) || (!premiumLess && difference >= threshold))
}

function getTokenFromSymbol(symbol, baseInstrument) {
  //console.log('Symbol',symbol)
  if(baseInstrument == 'NIFTY'){
    return getNiftySymbols()[symbol]
  }
  if(baseInstrument == 'BANKNIFTY'){
    return getBankNiftySymbols(symbol)
  }
  new Error('Invalid baseInstrument')
}

function isMonthlyExpiry(expiry, baseInstrument){
  
  if(baseInstrument == 'NIFTY'){
      let currentExpiryIndex = getNiftyExpiry().indexOf(expiry)
      let nextExpiry = getNiftyExpiry()[currentExpiryIndex + 1]
      return expiry.substring(3, 5) != nextExpiry.substring(3, 5)
  }
  if(baseInstrument == 'BANKNIFTY'){
    let currentExpiryIndex = getBankNiftyExpiry().indexOf(expiry)
    let nextExpiry = getBankNiftyExpiry()[currentExpiryIndex + 1]
    return expiry.substring(3, 5) != nextExpiry.substring(3, 5)
  }
  return false
}

function formatExpiry(expiry, baseInstrument){
    let day = expiry.substring(0, 2)
    let month = expiry.substring(2, 5)
    let year = expiry.substring(5, 7)
    //console.log('Expiry', expiry, year, day, month)
    return (isMonthlyExpiry(expiry, baseInstrument) ? `${year}${month}`:`${year}${MONTHS[month]}${day}`).toUpperCase()
}

function addNewRow() {
  if(!doValidation()){
      return
  }
  const orderFlag = document.getElementById('action').value == 'order';
  const baseInstrument = document.getElementById('baseInstrument').value;
  const strike = document.getElementById('strike').value;
  const optionType = document.getElementById('optionType').value;
  const quantity = document.getElementById('quantity')?.value;
  let sellExpiry = document.getElementById(`sellExpiry`).value;
  sellExpiry = sellExpiry.substring(0, 5) + sellExpiry.substring(7)
  let buyExpiry = document.getElementById(`buyExpiry`).value;
  buyExpiry = buyExpiry.substring(0, 5) + buyExpiry.substring(7)
  const premiumLess = document.getElementById('premiumLess').value;
  const threshold = document.getElementById('threshold').value;
  const depth = document.getElementById('depth').value;
  const orderType = document.getElementById('orderType')?.value;
  const buyScript = `${baseInstrument}${formatExpiry(buyExpiry)}${strike}${optionType}`;
  const sellScript = `${baseInstrument}${formatExpiry(sellExpiry)}${strike}${optionType}`
  
  const tbody = document.getElementById('alertsTableBody');
  const row = tbody.insertRow();
  row.id = 'row-' + rowNumber;
  
  const cells = [
    {value: `${orderFlag ? '🚚' : '🔔'}`},
    {value: `${capitalizeFirstLetter(baseInstrument.toLowerCase())}`},
    {value: strike},
    {value: `${optionType == 'CE'? 'Call': 'Put'}`},
    {value: `${quantity ? quantity : '-'}`},
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
      buyToken: getTokenFromSymbol(buyScript, baseInstrument),
      sellToken: getTokenFromSymbol(sellScript, baseInstrument),
      depth: depth,
      threshold: Number(Number(threshold).toFixed(2)),
      rowId: row.id,
      quantity: quantity,
      orderFlag: orderFlag,
      buyScript: buyScript,
      sellScript: sellScript,
      premiumLess: premiumLess == 'lt' ? true : false,
      orderType: orderType.toUpperCase(),
  })
}

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
    if (ticker.isAlreadyConnected()) {
      ticker.disconnect()
    }
    Object.keys(zerodhaCache).forEach(key => delete cache[key])
    Object.keys(tokenCounter).forEach(key => delete tokenCounter[key])
    Object.keys(tokenPricesCache).forEach(key => delete tokenPricesCache[key])
    rowNumber = 1
    orderNumber = 0
    showOverlay()
  }, timeUntilTarget);
}

document.addEventListener('zerodha-login-success', loadUser);
document.getElementById('addFormButton').addEventListener('click', addNewRow);

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
        document.getElementById('qunatity-section').style.display = 'none'
    } else {
        document.getElementById('action-depth').style.display = 'block'
        document.getElementById('qunatity-section').style.display = 'block'
    }
});

scheduleDisconnectAt345PM()

class MockTicker {
  constructor(params) {
    this.url = params.url || "ws://localhost:8080";
    this.ws = null;
    this.triggers = {
      connect: [],
      ticks: [],
      disconnect: [],
      error: []
    };
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.addEventListener('open', () => {
      console.log('Connected to WebSocket server');
      this._trigger('connect');
    });

    this.ws.addEventListener('message', (event) => {
      const ticks = JSON.parse(event.data);
      this._trigger('ticks', ticks);
    });

    this.ws.addEventListener('close', () => {
      console.log('Disconnected from WebSocket server');
      this._trigger('disconnect');
    });

    this.ws.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this._trigger('error', error);
    });
  }

  subscribe(tokens) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`Subscribed to tokens: ${tokens}`);
      // You can send a subscription message to the server if needed
      // this.ws.send(JSON.stringify({ action: 'subscribe', tokens }));
    }
  }

  unsubscribe(tokens) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`Unsubscribed to tokens: ${tokens}`);
      // You can send a subscription message to the server if needed
      // this.ws.send(JSON.stringify({ action: 'subscribe', tokens }));
    }
  }

  setMode(mode, tokens) {
    console.log(`Set mode: ${mode} for tokens: ${tokens}`);
    // Implement mode setting logic if needed
  }

  on(event, callback) {
    if (this.triggers[event]) {
      this.triggers[event].push(callback);
    }
  }

  disconnect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  _trigger(event, data) {
    if (this.triggers[event]) {
      this.triggers[event].forEach(callback => callback(data));
    }
  }
}
