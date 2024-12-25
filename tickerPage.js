let cookie_info = {
}
let ticker = null

// Cache for storing the third depth prices
const cache = {
  buy: null,
  sell: null
};

let threshold = 200

document.getElementById('myButton').addEventListener('click', function() {
  threshold = parseFloat(document.getElementById('priceDiff').value);
  cache.buy = null;
  cache.sell = null;

  const buyScript = document.getElementById('buyScript').value;
  const sellScript = document.getElementById('sellScript').value;
  
  const buyToken = buyScript.split('/')[1];
  const sellToken = sellScript.split('/')[1];
  
  const tokens = [buyToken, sellToken];
  
  ticker.connect();
  ticker.on('connect', function() {
    console.log(`Subscribed to Tokens ${tokens}`);
    ticker.subscribe(tokens);
    ticker.setMode(ticker.modeFull, tokens)
  });

  ticker.on("ticks", onTicks);
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
        const buyDepth = tick.depth.buy;
        const sellDepth = tick.depth.sell;
        // console.log("Buy Depth", buyDepth);
        // console.log("Sel Depth", sellDepth);
        // Get the third element price for buy and sell
        const thirdBuyPrice = buyDepth[2]?.price || 0;
        const thirdSellPrice = sellDepth[2]?.price || 0;

        // Update cache based on instrument token
        //console.log("Instrument Token", instrumentToken, tokens[0], tokens[1]);
        if (instrumentToken == tokens[0]) {
            cache.buy = thirdBuyPrice;
        } else if (instrumentToken == tokens[1]) {
            cache.sell = thirdSellPrice;
        }

        //console.log("Cache", JSON.stringify(cache));
        // Check if both buy and sell prices are available and more than 0
        if (cache.buy > 0 && cache.sell > 0) {
            const difference = Math.abs(cache.buy - cache.sell);

            document.getElementById('status').textContent = `Difference: ${difference.toFixed(2)} Threshold: ${threshold}`;
            // Alert if the difference is less than the threshold
            if (difference <= threshold) {
              ticker.unsubscribe(tokens);
              ticker.disconnect();
              // Play the alert sound
              const alertSound = document.getElementById('alertSound');
              alertSound.play();
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
    ticker = new KiteTicker({
      api_key: "your_api_key",
      url: "wss://ws.zerodha.com/?api_key=kitefront&user_id=" + user_id + "&enctoken=" + encodeURIComponent(enctoken)
    });
    //ticker = new MockTicker({})
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


