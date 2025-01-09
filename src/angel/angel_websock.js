import {WebSocketV2} from './angel_ticker.js'
import { ACTION, MODE, EXCHANGES } from './angel_constants.js';
import { showOverlay } from '../lib/hourlyMessage.js';

let ticker

function handleTicks(tick) {
    //console.log("Ticks length", tick);
    if (typeof tick === 'string') {
        console.log("Recived ", tick)
        return;
    }
    if(tick?.best_5_buy_data?.length > 0){
        const tickEvent = new CustomEvent('new-price-arrived', {"detail":[{
            symboltoken:Number(tick.token),
            buy_5: tick.best_5_buy_data,
            sell_5: tick.best_5_sell_data,
            ltp: tick.last_traded_price,
        }]})
        document.dispatchEvent(tickEvent)
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

export function unsubscribe(tokens){
    console.log("Unsubscribe :", tokens);
    ticker.fetchData({
        "action":ACTION.Unsubscribe, 
        "mode": MODE.SnapQuote, 
        "exchangeType": EXCHANGES.nse_fo, 
        "tokens": tokens
    })
}

export function subscribe(tokens){
    if(!ticker.isAlreadyConnected()){
        ticker.connect().then(data=>{
            const myEvent = new CustomEvent('ticker-connected')
            document.dispatchEvent(myEvent)
        }).catch(err1 => console.log("err1 :", err1));
    } else {
        subscribeInternal(tokens);
    }
}

function subscribeInternal(tokens){
    console.log("Subscribe :", tokens);
    // if(tokens.length == 2) {
    ticker.fetchData({
        "action":ACTION.Subscribe, 
        "mode": MODE.SnapQuote, 
        "exchangeType": EXCHANGES.nse_fo, 
        "tokens": tokens
    })
    //console.log("Subscribed: ",tokens)
    // }
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
        if(ticker != null && ticker.isAlreadyConnected()){
            ticker.disconnect()
        }
        const legEvent = new CustomEvent('remove-all-leg');
        document.dispatchEvent(legEvent)
        showOverlay()
    }, timeUntilTarget);
}

scheduleDisconnectAt345PM()

export const TICKER = () => ticker

document.addEventListener('login-success', (event)=>{
    let credentials = event.detail.credentials
    initTicker(credentials)
    const myEvent = new CustomEvent('ticker-available')
    document.dispatchEvent(myEvent)
})