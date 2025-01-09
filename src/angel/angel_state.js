import { baseTicker } from "../app/base_ticker.js";
let ticker = baseTicker()

const cache = {};
const rowNo = {
    'tss': 1,
    'css': 1
}

const tokenCounter = {}

const tokenPriceCache = {}

const strategyTokens = {
    tss: new Set(),
    css: new Set()
}

export function getCache() {
    return cache
}

export function getTokenPriceCache() {
    return tokenPriceCache
}

document.addEventListener('new-price-arrived', (event) => {
    const ticks = event.detail
    let tokens = []
    //console.log('Ticks', ticks)
    ticks?.forEach(tick => {
        const instrumentToken = Number(tick.symboltoken);
        tokens.push(instrumentToken)
        if (tick?.buy_5?.length > 0) {
            tokenPriceCache[instrumentToken] = {
                buyPrices: tick.buy_5,
                sellPrices: tick.sell_5,
                ltp: tick.ltp
            }
        }
    })
    
    const tssEvent = new CustomEvent('recalculate', {detail: tokens})
    document.dispatchEvent(tssEvent)
    
})

document.addEventListener('add-monitoring-leg', (event) => {
    const group = event.detail
    //console.log(tssLeg, event)
    group.rowId = `row-${group.algo}-` + rowNo[group.algo]
    rowNo[group.algo]++
    cache[group.rowId] = group
    console.log('Add monitoring leg in add cache ', group)
    let tokens = []
    for(let i=1; i<=group.noOfLeg; i++){
        let actLeg = group[`leg_${i}`]()
        const instrumentToken = Number(actLeg.symboltoken)
        strategyTokens[group.algo].add(instrumentToken)
        tokenCounter[instrumentToken] = ((tokenCounter[instrumentToken] || 0) + 1)
        if(tokenCounter[instrumentToken] == 1){
            tokens.push(instrumentToken)
        }
    }
    if(tokens.length > 0){
        ticker.subscribe(tokens)
    }
    const myEvent = new CustomEvent(`add-row`, {
        "detail": group
    })
    document.dispatchEvent(myEvent)
});

document.addEventListener('remove-monitoring-leg', (event) => {
    const rowId = event.detail
    const group = cache[rowId]
    delete cache[rowId]
    let tokens = []
    for(let i=1; i<=group.noOfLeg; i++){
        let actLeg = group[`leg_${i}`]()
        const instrumentToken = Number(actLeg.symboltoken)
        tokenCounter[instrumentToken] = tokenCounter[instrumentToken] - 1
        if(tokenCounter[instrumentToken] <= 0){
            tokens.push(instrumentToken)
            removeStrategyToken(instrumentToken)
        }
    }
    console.log('Token Counter ', tokenCounter, 'Strategy Tokens ', strategyTokens)
    if(tokens.length > 0){
        ticker.unsubscribe(tokens)
    }
});

document.addEventListener('remove-all-leg', () => {
    let tokens = []
    Object.keys(cache).forEach(rowId => {
        delete cache[rowId]
    })
    Object.keys(tokenCounter).forEach(key => {
        delete tokenCounter[key]
        tokens.push(Number(key))
    })
    Object.keys(tokenPriceCache).forEach(key => {
        delete tokenPriceCache[key]
    })
    Object.keys(strategyTokens).forEach(key => {
        strategyTokens[key] = new Set()
    })
    ticker.unsubscribe(tokens)
});

document.addEventListener('ticker-connected', ()=>{
    console.log("New Connected....");
    const allTokens = new Set()
    Object.keys(cache).forEach(key => {
        //console.log('Working on all keys :', cache[key])
        for(let i=1; i<=cache[key].noOfLeg; i++){
            allTokens.add(Number(cache[key][`leg_${i}`]().symboltoken))
            //console.log('Added token :', cache[key][`leg_${i}`]().symboltoken)
        }
    })
    ticker.subscribe([...allTokens])
})

function removeStrategyToken(instrumentToken){
    Object.keys(strategyTokens).forEach(key =>{
        strategyTokens[key].delete(instrumentToken)
    })
}