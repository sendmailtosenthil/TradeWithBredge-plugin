import { ENV } from "../lib/config.js"
import { KiteTicker } from "./ticker.js"
import { getCookieInfo } from "./zerodha-login.js"
import { placeCalendarOrder } from "./zerodha-connect.js"

let rowNumber = 1;
let ticker = null;
let orderNumber = 0;
const maxOrder = 2
let zerodhaCache = {}
const tokenCounter = {}
const tokenPricesCache = {};

let indexes = {
  difference: 5,
  buyPrice: 6,
  sellPrice: 7,
  status: 8,
  action: 10
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
        document.getElementById('status').textContent = 'Logged in as :' + data.data.user_id
        const myEvent = new CustomEvent('calender-loaded', { "detail": {} });
        document.dispatchEvent(myEvent)
      })
      .catch(error => {
        console.log('Error : ', error);
        document.getElementById('status').textContent = 'Reach to Telegram User @TradeWithBredge Error : ' + error;
      });
  } else {
    console.log('No user id ', cookie_info.user_id);
  }
}

function doValidation() {
  const orderPlz = document.getElementById('orderPlz').checked;
  if (orderNumber >= 2 && orderPlz) {
    alert('You cannot make more than 2 running orders per day')
    return false
  }

  const buyScript = document.getElementById('buyScript').value;
  if (buyScript == '') {
    alert('Please enter Buy script')
    return false;
  }
  const sellScript = document.getElementById('sellScript').value;
  if (sellScript == '') {
    alert('Please enter Sell script')
    return false;
  }
  const depth = document.getElementById('depth').value;
  if (depth == '') {
    alert('Please enter depth')
    return false;
  }
  const threshold = document.getElementById('threshold').value;
  if (threshold == '') {
    alert('Please enter premium difference')
    return false;
  }
  const quantity = document.getElementById('quantity').value;
  if (quantity == '') {
    alert('Please enter Quantity')
    return false;
  }
  if (buyScript.startsWith('NIFTY')) {
    let isValidQty = parseInt(quantity) % 75;
    if (isValidQty != 0) {
      alert('Please enter quantity in multiple of 75')
      return false;
    }
  }
  if (buyScript.startsWith('BANKNIFTY')) {
    let isValidQty = parseInt(quantity) % 30;
    if (isValidQty != 0) {
      alert('Please enter quantity in multiple of 30')
      return false;
    }
  }

  const premiumLess = document.getElementById('premiumLess').value;
  if (premiumLess == '') {
    alert('Please enter Less Than or More Than premium')
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
            'tradingsymbol': row.buyScript
          }, {
            'transactiontype': 'SELL',
            'quantity': row.quantity,
            'tradingsymbol': row.sellScript
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
    buyScript: row.buyScript.split('/')[0],
    sellScript: row.sellScript.split('/')[0],
    buyToken: row.buyScript.split('/')[1],
    sellToken: row.sellScript.split('/')[1],
    depth: row.depth,
    threshold: row.threshold,
    status: 'Yet to Start',
    orderFlag: row.orderFlag,
    quantity: row.quantity,
    premiumLess: row.premiumLess
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

function addNewRow() {
  if (!doValidation()) {
    return
  }
  const buyScript = document.getElementById('buyScript').value;
  const sellScript = document.getElementById('sellScript').value;
  const depth = document.getElementById('depth').value;
  const premiumLess = document.getElementById('premiumLess').value;
  const threshold = document.getElementById('threshold').value;
  const quantity = document.getElementById('quantity').value;
  const orderFlag = document.getElementById('orderPlz').checked;

  const tbody = document.getElementById('alertsTableBody');
  const row = tbody.insertRow();
  row.id = 'row-' + rowNumber;

  const cells = [
    { value: buyScript },
    { value: sellScript },
    { value: quantity },
    { value: depth },
    { value: `${(premiumLess == 'lt' ? '< ' : '> ') + threshold}` },
    { value: '0' },
    { value: '0' },
    { value: '0' },
    { value: 'Yet to Start' },
    { value: orderFlag }
  ];

  cells.forEach(({ value }) => {
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
  //document.getElementById('buyScript').value = '';
  //document.getElementById('sellScript').value = '';
  document.getElementById('depth').value = '';
  document.getElementById('threshold').value = '';
  document.getElementById('premiumLess').value = '';
  document.getElementById('orderPlz').checked = false;
  rowNumber++;
  if (orderFlag) {
    orderNumber++
  }

  monitorRow({
    buyScript: buyScript,
    sellScript: sellScript,
    depth: depth,
    threshold: Number(Number(threshold).toFixed(2)),
    rowId: row.id,
    status: 'Yet to Start',
    orderFlag: orderFlag,
    quantity: quantity,
    premiumLess: premiumLess == 'lt' ? true : false
  });
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
