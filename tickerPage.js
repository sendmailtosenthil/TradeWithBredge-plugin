let cookie_info = {
}
let ticker = null

// Cache for storing the third depth prices
const cache = {
  buy: null,
  sell: null
};

let threshold = 200
let previousTokens = []

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

document.addEventListener('DOMContentLoaded', loadUser)

document.getElementById('myButton').addEventListener('click', function() {
  threshold = parseFloat(document.getElementById('priceDiff').value);
  cache.buy = null;
  cache.sell = null;

  const buyScript = document.getElementById('buyScript').value;
  const sellScript = document.getElementById('sellScript').value;
  const depth = document.getElementById('depth').value;
  if(!(Number(depth) >= 1 && Number(depth) <= 5)) {
    alert('Depth should be between 1 to 5')
    return false;
  }
  
  const buyToken = buyScript.split('/')[1];
  const sellToken = sellScript.split('/')[1];
  
  
  const tokens = [Number(buyToken), Number(sellToken)];
  if(ticker == null || !ticker.isAlreadyConnected()){
    ticker.connect();
  } else {
    connected();
  }
  ticker.on('connect', function() {
    connected();
  });

  ticker.on("ticks", onTicks);
  ticker.on("error", function(e) {
    console.log("Error", e);
  });

  function connected(){
    if(previousTokens.length > 0){
      console.log("Unsubscribing :", previousTokens);
      ticker.unsubscribe(previousTokens);
    }
    console.log("Connected :", tokens.length);
    if(tokens.length == 2) {
      console.log(`Subscribed to Tokens ${tokens}`);
      ticker.subscribe(tokens);
      ticker.setMode(ticker.modeFull, tokens)
      previousTokens = tokens;
    }
  }
  function onTicks(ticks) {
    //console.log("Ticks", ticks, tokens);
    handleTicks(ticks, tokens);
  }

  
  // Assuming this function is called whenever new tick data is received
  function handleTicks(ticks, tokens) {
    //console.log("Ticks length", ticks.length);

    ticks.forEach(tick => {
        //console.log("Tick", tick);
        const instrumentToken = tick.instrument_token;
        if(tick?.depth?.buy){
          const buyDepth = tick.depth.buy;
          const sellDepth = tick.depth.sell;
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
                ticker.unsubscribe(tokens);
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
    });
  }

});

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
