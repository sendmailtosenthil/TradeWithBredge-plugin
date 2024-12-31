let rowNumber = 1;
let ticker = null;
const cookie_info = {
    user_id: null,
    enctoken: null,
    authorization: null
}
const cache = {

}

const tokenPricesCache = {

};

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
    console.log("Calculating Row Prices", cache);
    Object.keys(cache).forEach(rowId => {
        const row = cache[rowId];
        const buyToken = row.buyToken;
        const sellToken = row.sellToken;
        row.buyPrice = tokenPricesCache[buyToken]?.sellPrices[row.depth]?.price || 0;
        row.sellPrice = tokenPricesCache[sellToken]?.buyPrices[row.depth]?.price || 0;
        console.log("Buy Price", row.buyPrice, "Sell Price", row.sellPrice, rowId, row);
        const rowDoc = document.getElementById(rowId);
        rowDoc.cells[5].textContent = row.buyPrice;
        rowDoc.cells[6].textContent = row.sellPrice;
        if(row.buyPrice > 0 && row.sellPrice > 0){
            const diff = Number(Math.abs(row.buyPrice - row.sellPrice).toFixed(2));
            rowDoc.cells[4].textContent = diff;
            rowDoc.cells[7].textContent = 'Running'
            if(diff <= row.threshold){
                console.log("Difference is less than threshold & unsubscribed tokens");
                const alertSound = document.getElementById('alertSound');
                alertSound.play();
                toBeDeleted.push(rowId)    
                rowDoc.cells[7].textContent = 'Completed'
                rowDoc.style.backgroundColor = '#90EE90';
            }
        }
    })
    if(toBeDeleted.length > 0){
        toBeDeleted.forEach(rowId => {
            delete cache[rowId];
        })
    }
    //renderRows();
}

function onTicks(ticks) {
    ticks.forEach(tick => {
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
    cache[row.rowId] = {
        buyToken: row.buyScript.split('/')[1],
        sellToken: row.sellScript.split('/')[1],
        depth: row.depth,
        threshold: row.threshold,
        status: 'Yet to Start',
    }

    if(ticker == null || !ticker.isAlreadyConnected()){
        ticker.connect();
        ticker.on('connect', function() {
            ticker.on("ticks", onTicks);
            ticker.on("error", function(e) {
                console.log("Error", e);
            });
            subscribe([Number(cache[row.rowId].buyToken), Number(cache[row.rowId].sellToken)]);
        });
    } else {
        subscribe([Number(cache[row.rowId].buyToken), Number(cache[row.rowId].sellToken)]);
    }
}

function addNewRow() {
    const buyScript = document.getElementById('buyScript').value;
    const sellScript = document.getElementById('sellScript').value;
    const depth = document.getElementById('depth').value;
    const threshold = document.getElementById('threshold').value;
    
    const tbody = document.getElementById('alertsTableBody');
    const row = tbody.insertRow();
    row.id = 'row-' + rowNumber;
    
    const cells = [
      {value: buyScript},
      {value: sellScript},
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
    document.getElementById('depth').value = '';
    document.getElementById('threshold').value = '';
    rowNumber++;
    monitorRow({
        buyScript: buyScript,
        sellScript: sellScript,
        depth: depth,
        threshold: Number(Number(threshold).toFixed(2)),
        rowId: row.id,
        status: 'Yet to Start'
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
  