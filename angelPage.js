let credentials = {}

const cache = {
    buy: null,
    sell: null
};
  
let threshold = 200
let previousTokens = []

let smart_api = null

let totp 

function getAngelCredentials() {
    ANGEL_USERNAME = localStorage.getItem('ANGEL_USERNAME');
    ANGEL_PASSWORD = localStorage.getItem('ANGEL_PASSWORD');
    ANGEL_API_KEY = localStorage.getItem('ANGEL_API_KEY');
    ANGEL_TOTP_SECRET = localStorage.getItem('ANGEL_TOTP_SECRET');
    const calendarForm = document.getElementById('calendar-form');

    if (!ANGEL_USERNAME || !ANGEL_PASSWORD || !ANGEL_API_KEY || !ANGEL_TOTP_SECRET) {
        calendarForm.style.display = 'none';
        document.getElementById('status').innerHTML = `
            <div id="connect-form">
                <input type="text" id="username" placeholder="Angel Username" />
                <input type="password" id="password" placeholder="Angel Password" />
                <input type="password" id="apiKey" placeholder="Angel API Key" />
                <input type="password" id="totpSecret" placeholder="TOTP KEY" />
                <button id="connect">Connect</button>
            </div>
        `;
        document.getElementById('connect').addEventListener('click', saveCredentials)
    } else {
        calendarForm.style.display = 'block';
        const existingForm = document.getElementById('credentials-form');
        totp = new OTPAuth.TOTP({
            issuer: "ACME",
            label: "AngelOne",
            algorithm: "SHA1",
            digits: 6,
            period: 30,
            secret: ANGEL_TOTP_SECRET,
          });
        loadUser()
        if (existingForm) {
            existingForm.remove();
        }
    }

    return {
        ANGEL_USERNAME,
        ANGEL_PASSWORD,
        ANGEL_API_KEY,
        ANGEL_TOTP_SECRET
    };
}

function saveCredentials() {
    ANGEL_USERNAME = document.getElementById('username').value;
    ANGEL_PASSWORD = document.getElementById('password').value;
    ANGEL_API_KEY = document.getElementById('apiKey').value;
    ANGEL_TOTP_SECRET = document.getElementById('totpSecret').value;

    localStorage.setItem('ANGEL_USERNAME', ANGEL_USERNAME);
    localStorage.setItem('ANGEL_PASSWORD', ANGEL_PASSWORD);
    localStorage.setItem('ANGEL_API_KEY', ANGEL_API_KEY);
    localStorage.setItem('ANGEL_TOTP_SECRET', ANGEL_TOTP_SECRET);

    totp = new OTPAuth.TOTP({
        issuer: "ACME",
        label: "AngelOne",
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: ANGEL_TOTP_SECRET,
      });
    //document.getElementById('status').textContent = 'Credentials saved successfully';
    loadUser();
}

function showCalendar(data){
    const calendarForm = document.getElementById('calendar-form');
    calendarForm.style.display = 'block';
    document.getElementById('status').textContent = 'Logged in as :' + data.data.clientcode;
}
function loadUser() {
    const today = new Date();
    const todayEightAM = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0, 0);
    let credentials = localStorage.getItem('angelCredentials');
    let lastTokenTime = localStorage.getItem('lastTokenTime');

    if (credentials && lastTokenTime && new Date(lastTokenTime) > todayEightAM && Object.keys(JSON.parse(credentials)).length > 0) {
        // Use existing credentials if they were generated after 8 AM today
        credentials = JSON.parse(credentials);
        ticker = new WebSocketV2({
            clientcode: ANGEL_USERNAME,
            jwttoken: credentials.jwtToken,
            apikey: ANGEL_API_KEY,
            feedtype: credentials.feedToken
        });
        console.log("Using toekns from cache - Angel")
        smart_api = new SmartApi({
            api_key: ANGEL_API_KEY,
            refresh_token: credentials.refreshToken,
            client_code: ANGEL_USERNAME,
            //totp: totp.generate(),
            access_token: credentials.jwtToken,
        });
        smart_api.getProfile()
            .then((data) => {
                //console.log(data);
                showCalendar(data)
            })
            .catch((ex) => {
                document.getElementById('status').textContent = 'Reach to Telegram User @TradeWithBredge Error : ' + ex;
            });
    } else {
        console.log("New token - Angel")
        // Generate new session if no credentials or generated before 8 AM
        let totp_code = totp.generate();
        console.log(ANGEL_USERNAME, ANGEL_API_KEY, totp_code)
        smart_api = new SmartApi({
            api_key: ANGEL_API_KEY
        });
        smart_api
            .generateSession(ANGEL_USERNAME, ANGEL_PASSWORD, totp_code)
            .then((data) => {
                credentials = {...data.data};
                // Store credentials and timestamp
                localStorage.setItem('angelCredentials', JSON.stringify(credentials));
                localStorage.setItem('lastTokenTime', new Date().toISOString());
                
                ticker = new WebSocketV2({
                    clientcode: ANGEL_USERNAME,
                    jwttoken: credentials.jwtToken,
                    apikey: ANGEL_API_KEY,
                    feedtype: credentials.feedToken
                });
                return smart_api.getProfile();
            })
            .then((data) => {
                console.log(data)
                showCalendar(data)
            })
            .catch((ex) => {
                console.log(ex);
                document.getElementById('status').textContent = 'Reach to Telegram User @TradeWithBredge Error : ' + ex;
            });
    }
}

function getTokenFromSymbol(baseInstrument, expiry, script) {
    expiry = expiry.substring(0, 5) + expiry.substring(7)
    const symbolKey = `${baseInstrument}${expiry}${script}`;
    return baseInstrument === 'NIFTY' 
        ? niftySymbols[symbolKey] 
        : bankniftySymbols[symbolKey];
}

document.getElementById('baseInstrument').addEventListener('change', function() {
    const buyExpirySelect = document.getElementById('buyExpiry');
    const sellExpirySelect = document.getElementById('sellExpiry');
    
    // Reset both dropdowns
    buyExpirySelect.innerHTML = '<option value="">Select</option>';
    sellExpirySelect.innerHTML = '<option value="">Select</option>';
    
    const selectedInstrument = this.value;
    let expiryValues = [];
    
    if (selectedInstrument === 'NIFTY') {
        expiryValues = niftyExpiry;
    } else if (selectedInstrument === 'BANKNIFTY') {
        expiryValues = bankniftyExpiry;
    }
    
    // Populate both dropdowns with the same expiry values
    expiryValues.forEach(expiry => {
        // Add to Buy Expiry
        const buyOption = document.createElement('option');
        buyOption.value = expiry;
        buyOption.textContent = expiry;
        buyExpirySelect.appendChild(buyOption);
        
        // Add to Sell Expiry
        const sellOption = document.createElement('option');
        sellOption.value = expiry;
        sellOption.textContent = expiry;
        sellExpirySelect.appendChild(sellOption);
    });
});
  
document.addEventListener('DOMContentLoaded', getAngelCredentials)

document.getElementById('myButton').addEventListener('click', function() {
    threshold = parseFloat(document.getElementById('priceDiff').value);
    cache.buy = null;
    cache.sell = null;
  
    const baseInstrument = document.getElementById('baseInstrument').value;
    const buyExpiry = document.getElementById('buyExpiry').value;
    const sellExpiry = document.getElementById('sellExpiry').value;
    const buyScript = document.getElementById('buyStrike').value;
    const sellScript = document.getElementById('sellStrike').value;
    const depth = document.getElementById('depth').value;

    const buyToken = getTokenFromSymbol(baseInstrument, buyExpiry, buyScript);
    const sellToken = getTokenFromSymbol(baseInstrument, sellExpiry, sellScript);
    
    const tokens = [Number(buyToken), Number(sellToken)];
    //console.log(tokens);
    if(!ticker.isAlreadyConnected()){
      ticker.connect().then(data=>{
        connected()
      }).catch(err1 => console.log("err1 :", err1));
      
    } else {
      connected();
    }
    
  
    ticker.on("tick", onTicks);
    ticker.on("error", function(e) {
      console.log("Error", e);
    });
  
    function connected(){

      if(previousTokens.length > 0){
        console.log("Unsubscribing :", previousTokens);
        ticker.fetchData({
            "correlationID": "Plug1", 
            "action":ACTION.Unsubscribe, 
            "mode": MODE.SnapQuote, 
            "exchangeType": EXCHANGES.nse_fo, 
            "tokens": previousTokens
          })
      }
      console.log("Connected :", tokens.length);
      if(tokens.length == 2) {
        ticker.fetchData({
            "correlationID": "Plug1", 
            "action":ACTION.Subscribe, 
            "mode": MODE.SnapQuote, 
            "exchangeType": EXCHANGES.nse_fo, 
            "tokens": tokens
          })
        console.log("Subscribed: ",tokens)
        previousTokens = tokens;
      }
    }
    function onTicks(tick) {
      //console.log("Ticks", tick, tokens);
      handleTicks(tick, tokens);
    }
  
    
    // Assuming this function is called whenever new tick data is received
    function handleTicks(tick, tokens) {
        //console.log("Ticks length", ticks.length);
        if (typeof tick === 'string') {
            console.log("Recived ", tick)
            return;
        }
        
        // console.log("Tick", tick);
        const instrumentToken = Number(tick.token);
        if(tick?.best_5_buy_data?.length > 0){
            const buyDepth = tick.best_5_buy_data;
            const sellDepth = tick.best_5_sell_data;
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
    }
  
  });
