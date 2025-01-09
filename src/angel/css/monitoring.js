import { getCache, getTokenPriceCache } from "../angel_state"

function calculate(event){
    let cache = getCache()
    let publishedTokens = new Set(event.detail)
    //console.log('Calculating CSS...', publishedTokens, cache)
    Object.keys(cache).forEach(key => {
        let row = cache[key]
        //console.log('Evaluating ',key)
        if(row.tokens.some(t=>publishedTokens.has(t))){
            const tokenPrices = getTokenPriceCache()
            //console.log('tokenPrices ',tokenPrices)
            let criteriaResults = row.evalCriteria(tokenPrices)
            //console.log('criteriaResults ',criteriaResults)
            const result = {rowId: key, text: row.updateMonitorTag(criteriaResults), triggered:false}
            if(criteriaResults.criteriaMet){
                result['triggered'] = true
                console.log('Criteria Met of '+key)
                row.placeOrder(criteriaResults, key)
            }
            document.dispatchEvent(new CustomEvent('update-price-tag', {detail: result}))
        }
    })
}

document.addEventListener('recalculate', calculate)