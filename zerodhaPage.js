let rowNumber = 1;
let ticker = null;
const cookie_info = {
    user_id: null,
    enctoken: null,
    authorization: null
}
let zerodhaCache = {}
const tokenCounter = {}
const tokenPricesCache = {

};

let indexes = {
  difference: 5,
  buyPrice: 6,
  sellPrice: 7,
  status: 8,
  action: 10
}

chrome.runtime.sendMessage({action: 'getCookies'}, (response) => {
    const {user_id, enctoken} = response;
    
    cookie_info.user_id = user_id;
    cookie_info.enctoken = enctoken
    cookie_info.authorization = `enctoken ${enctoken}`;
    
    if (user_id && enctoken && ticker == null) {
      loadUser();
      if(ENV == 'prod') {
        console.log("Connecting to Kite Ticker");
        ticker = new KiteTicker({
          api_key: "your_api_key",
          url: "wss://ws.zerodha.com/?api_key=kitefront&user_id=" + user_id + "&enctoken=" + encodeURIComponent(enctoken)
        });
      } else {
        console.log("Connecting to Mock Ticker");
        ticker = new MockTicker({})
      }
    }
    //console.log(cookie_info);
    return true;
});

function loadUser() {
    if(cookie_info.user_id != null){
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
            document.getElementById('status').textContent = 'Logged in as :' + data.data.user_id
        })
        .catch(error => {
        console.log('Error : ', error);
        document.getElementById('status').textContent = 'Reach to Telegram User @TradeWithBredge Error : ' + error;
        });
    } else {
        console.log('No user id ', cookie_info.user_id);
    }
}

function subscribe(tokens){
    console.log("Connected :", tokens.length);
    if(tokens.length == 2) {
        console.log(`Subscribed to Tokens ${tokens}`);
        ticker.subscribe(tokens);
        ticker.setMode(ticker.modeFull, tokens)
    }
}

function calculateRowPrices(){
    const toBeDeleted = [];
    //console.log("Calculating Row Prices", zerodhaCache);
    Object.keys(zerodhaCache).forEach(rowId => {
        const row = zerodhaCache[rowId];
        const buyToken = row.buyToken;
        const sellToken = row.sellToken;
        console.log("tokenPricesCache ", tokenPricesCache, buyToken, sellToken);
        row.buyPrice = tokenPricesCache[buyToken]?.sellPrices[row.depth-1]?.price || 0;
        row.sellPrice = tokenPricesCache[sellToken]?.buyPrices[row.depth-1]?.price || 0;
        console.log("Buy Price", row.buyPrice, "Sell Price", row.sellPrice);
        const rowDoc = document.getElementById(rowId);
        rowDoc.cells[indexes['buyPrice']].textContent = row.buyPrice;
        rowDoc.cells[indexes['sellPrice']].textContent = row.sellPrice;
        if(row.buyPrice > 0 && row.sellPrice > 0){
            const diff = Number(Math.abs(row.buyPrice - row.sellPrice).toFixed(2));
            rowDoc.cells[indexes['difference']].textContent = diff;
            rowDoc.cells[indexes['status']].textContent = 'Running'
            if(isEligible(row.premiumLess, row.threshold, diff)){
                console.log("Difference is less than threshold & unsubscribed tokens");
                const alertSound = document.getElementById('alertSound');
                alertSound.play();
                toBeDeleted.push(rowId)    
                rowDoc.cells[indexes['status']].textContent = 'Completed'
                rowDoc.style.backgroundColor = '#90EE90';
                if(row.orderFlag){
                    console.log("Order Placed");
                    row.orderFlag = false;
                    placeCalendarOrder({
                      'transactiontype': 'BUY',
                      'quantity': row.quantity,
                      'tradingsymbol': row.buyScript
                    }, {'transactiontype': 'SELL',
                      'quantity': row.quantity,
                      'tradingsymbol': row.sellScript}, (txt, success)=>{
                        rowDoc.cells[indexes['status']].textContent = txt
                        rowDoc.style.backgroundColor = success ? '#90EE90':'#FF7F7F';
                    });
                }
            }
        }
    })
    if(toBeDeleted.length > 0){
        toBeDeleted.forEach(rowId => {
            removeCache(rowId);
        })
    }
    //renderRows();
}

function onTicks(ticks) {
    ticks.forEach(tick => {
      console.log(tick);
        if(tick?.depth?.buy){
            const instrumentToken = Number(tick.instrument_token);
            tokenPricesCache[instrumentToken] = {
                buyPrices: tick.depth.buy,
                sellPrices: tick.depth.sell,
            }
        }
    });
    calculateRowPrices();
}

function monitorRow(row){
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

    if(ticker == null || !ticker.isAlreadyConnected()){
        ticker.connect();
        ticker.on('connect', function() {
            ticker.on("ticks", onTicks);
            ticker.on("error", function(e) {
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

function removeCache(rowId){
  tokenCounter[zerodhaCache[rowId].buyToken] = tokenCounter[zerodhaCache[rowId].buyToken] - 1;
  tokenCounter[zerodhaCache[rowId].sellToken] = tokenCounter[zerodhaCache[rowId].sellToken] - 1;
  delete zerodhaCache[rowId];
  let toBeUnsubscribeTokens = Object.keys(tokenCounter).filter(token => tokenCounter[token] == 0)
  console.log('Unsubscribe ', toBeUnsubscribeTokens);
  if(toBeUnsubscribeTokens.length > 0){
      ticker.unsubscribe(toBeUnsubscribeTokens)
  }    
}

function cancelRow(rowId) {
  const row = document.getElementById(rowId);
  if (row) {
      row.cells[indexes['status']].textContent = 'Cancelled';
      row.style.backgroundColor = '#FFFFC5';
      row.cells[indexes['action']].textContent = '';
  }
  removeCache(rowId);
}

function isEligible(premiumLess, threshold, difference){
  return ((premiumLess && difference <= threshold) || (!premiumLess && difference >= threshold))
}

function addNewRow() {
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
      {value: buyScript},
      {value: sellScript},
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
    //document.getElementById('buyScript').value = '';
    //document.getElementById('sellScript').value = '';
    document.getElementById('depth').value = '';
    document.getElementById('threshold').value = '';
    //document.getElementById('quantity').value = '';
    document.getElementById('orderPlz').checked = false;
    rowNumber++;
    
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

  document.addEventListener('DOMContentLoaded', loadUser);
  document.getElementById('addFormButton').addEventListener('click', addNewRow);


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
  