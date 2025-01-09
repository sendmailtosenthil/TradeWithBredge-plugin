
import { getNiftyExpiry, getBankNiftyExpiry, getBankNiftySymbols, getNiftySymbols } from './angel_script_downloader.js';
import {placeOrders} from './angel_connect_wrapper.js'

const quantities = {
    'NIFTY': [75, 150, 225],
    'BANKNIFTY': [30, 60, 90]
}
  
let maxOrder = 2;
let orderNumber = 0;

function monitorRow(row){
    const myEvent = new CustomEvent('add-monitoring-leg', {"detail": {
            leg_1 : function(){
                return {
                    symboltoken:Number(row.buyToken),
                    transactiontype:'BUY',
                    tradingsymbol: row.buyScript,
                    quantity: row.quantity || 1,
                    ordertype: row.orderType
                }
            },
            leg_2: function(){
                return {
                    symboltoken:Number(row.sellToken),
                    transactiontype:'SELL',
                    tradingsymbol: row.sellScript,
                    quantity: row.quantity || 1,
                    ordertype: row.orderType
                }
            },
            evalCriteria: function(tokenPrices){
                const buyLeg = this.leg_1()
                const sellLeg = this.leg_2()
                
                let buyPrice = (tokenPrices[buyLeg.symboltoken]?.sellPrices[row.depth]?.price || 0)
                let sellPrice = (tokenPrices[sellLeg.symboltoken]?.buyPrices[row.depth]?.price || 0)
                const diff = Number(Math.abs(buyPrice - sellPrice).toFixed(2))
                const result = {
                    criteriaMet: false,
                    diff: diff,
                    leg_1_price: buyPrice,
                    leg_2_price: sellPrice,
                };
                if(buyPrice > 0 && sellPrice > 0){
                    //console.log('buyPrice', buyPrice, 'sellPrice', sellPrice, 'diff', diff)
                    result['criteriaMet'] = row.premiumLess ? diff <= row.threshold : diff >= row.threshold
                } 
                return result
            },
            placeOrder: function (prices, rowId){
                if(row.orderFlag){
                    placeOrders([{
                        ...this.leg_1(),
                        price:prices.leg_1_price
                    }, {
                        ...this.leg_2(),
                        price:prices.leg_2_price
                    }], rowId)
                }
            },
            updateMonitorTag: function(criteriaResult){
                const buyPrice = criteriaResult.leg_1_price || 0
                const sellPrice = criteriaResult.leg_2_price || 0
                const diff = criteriaResult.diff || 0
                return `(${buyPrice}-${sellPrice}) ➛ ${diff} ${row.premiumLess ? '<=' : '>='} ${row.threshold}`
            },
            noOfLeg: 2,
            algo:'css',
            depth:row.depth,
            orderFlag: row.orderFlag,
            orderType: row.orderType,
            premiumLess: row.premiumLess,
            threshold: row.threshold,
            tokens: [Number(row.buyToken), Number(row.sellToken)]
        }
    })
    document.dispatchEvent(myEvent)
}

function cancelRow(rowId) {
    const row = document.getElementById(rowId);
    if (row && cache[rowId]) {
        row.cells[indexes['status']].textContent = '🛑';
        row.style.backgroundColor = '#FFFFC5';
        row.cells[indexes['action']].textContent = '';
    }
    const myEvent = CustomEvent('remove-monitoring-leg', {'detail':rowId})
    document.dispatchEvent(myEvent)
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

function onNewRow() {
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
    const buyScript = `${strike}${optionType}`;
    const sellScript = buyScript

    // // Clear form inputs
    // clearForm()
    
    // rowNumber++;
    // if(orderFlag){
    //     orderNumber++
    // }
    monitorRow({
        buyToken: getTokenFromSymbol(baseInstrument, buyExpiry, buyScript),
        sellToken: getTokenFromSymbol(baseInstrument, sellExpiry, sellScript),
        depth: depth,
        threshold: Number(Number(threshold).toFixed(2)),
        //rowId: row.id,
        quantity: quantity,
        orderFlag: orderFlag,
        buyScript: `${baseInstrument}${buyExpiry}${buyScript}`,
        sellScript: `${baseInstrument}${sellExpiry}${sellScript}`,
        premiumLess: premiumLess == 'lt' ? true : false,
        orderType: orderType.toUpperCase(),
    })
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

function postTickerInitialization(){
    document.getElementById('addFormButton').addEventListener('click', onNewRow);
    document.getElementById('monitoring-form').style.display = 'block';
    document.getElementById('tssTable').style.display = 'block';
}

function updatePrices(key, buyPrice, sellPrice, threshold, premiumLess){
    const rowDoc = document.getElementById(key);
    rowDoc.cells[indexes['buyPrice']].textContent = buyPrice;
    rowDoc.cells[indexes['sellPrice']].textContent = sellPrice;
    const difference = Number(Math.abs(buyPrice - sellPrice).toFixed(2));
    rowDoc.cells[indexes['difference']].textContent = `${premiumLess ? threshold +' < ' + difference: threshold +' > ' + difference}`;
    rowDoc.cells[indexes['status']].textContent = '🏃'
}

// function placeOrder(order){
//     return getConnector().placeOrder({
//         "variety":"NORMAL",
//         "tradingsymbol":order.tradingsymbol,
//         "symboltoken":String(order.token),
//         "transactiontype":order.transactiontype,
//         "exchange":"NFO",
//         "ordertype":order.orderType,
//         "producttype":"CARRYFORWARD",
//         "duration":"DAY",
//         "price":order.price,
//         "quantity": String(order.quantity)
//     })
// }

// function parseResponse(resp){
//     let result = resp.result
//     if(resp.status == 'fulfilled'){
//         let angelResp = resp.value
//         console.log('Parse Resp Inside', angelResp)
//         result.msg += resp.ordertype + ' '
//         if(angelResp.message == 'SUCCESS'){
//             result.msg += 'Placed' + ' '
//         } else {
//             result.msg += angelResp.message + ' ' + angelResp.errorcode + ' '
//             result.success = false
//         }

//         if(angelResp.status && angelResp.data?.orderid){
//             resp.orders.push(angelResp.data.orderid)
//         } else {
//             result.success = false
//         }
//     }
//     //console.log('Parse Resp return', result, resp.orders)
//     return {result, orders:resp.orders}
// }

// async function placeCalenderOrder(buyOrder, sellOrder) {
//     console.log('Placing order ', JSON.stringify(buyOrder), JSON.stringify(sellOrder))  
//     let result = {msg : '', success: true}
//     let reponses = await Promise.allSettled([
//         placeOrder(buyOrder),
//         placeOrder(sellOrder),
//     ]).catch(ex => {
//         console.log("Orders failed ", ex)
//         return {msg: ex.message, success: false}
//     })
//     console.log("Response ", reponses)
//     let resp = parseResponse({...reponses[0], ordertype: 'BUY', result:result, orders: []}) 
//     resp = parseResponse({...reponses[1], ordertype: 'SELL', result:resp.result, orders: resp.orders})
       
//     return await getOrderBook(resp.orders, resp.result)
// }

// async function getOrderBook(orders, result){
//     //console.log("Given orders ", orders)
//     let fetchedOrders = await getConnector().getOrderBook().catch(err => {
//         return {
//             msg:result.msg + ' Unable to get Order book '+err, 
//             success: false
//         }
//     })
//     //console.log("Fetched orders ", fetchedOrders)
//     let executedOrders = fetchedOrders.data.filter(o => orders.includes(o.orderid))
//     if(orders.length != executedOrders.length){
//         result.msg = result.msg + ' Missing orders '+ orders + ' ' + executedOrders + ' '
//         result.success = false
//     }
//     executedOrders.forEach(o => {
//         if(o.orderstatus == 'rejected' || o.orderstatus == 'cancelled'){
//             result.msg = result.msg + `[${o.transactiontype} Status] :`+ o.status + ' ' + o.text + ' '
//             result.success = false
//         } else {
//             result.msg = result.msg +  o.transactiontype + '::'+ o.tradingsymbol + '::@' +o.price +' '+o.text + ' '
//         }
//     })
//     return result;
// }

// function isEligible(premiumLess, threshold, difference){
//     difference = Number(difference.toFixed(2))
//     return ((premiumLess && difference <= threshold) || (!premiumLess && difference >= threshold))
// }

// function isThresholdCrossed() {
//     const toBeDeletedKeys = []
//     //console.log(cache.legs)
//     Object.keys(cache).forEach(key => {
//         const leg = cache[key]
//         //console.log("Leg ", leg, "tokenPriceCache ",tokenPriceCache)
//         const buyPrice = tokenPriceCache[leg.buyToken]?.sellPrices[leg.depth]?.price || 0;
//         const sellPrice = tokenPriceCache[leg.sellToken]?.buyPrices[leg.depth]?.price || 0;
//         if(buyPrice > 0 && sellPrice > 0) {
//             const threshold = leg.threshold;
//             updatePrices(key, buyPrice, sellPrice, threshold, leg.premiumLess);
//             const difference = Math.abs(buyPrice - sellPrice);
//             if(isEligible(leg.premiumLess, threshold, difference)) {
//                 console.log("Difference is less than threshold ");
//                 // if(Object.keys(tokenPriceCache).length % 2 == 0) {
                
//                 toBeDeletedKeys.push(key)
//                 const alertSound = document.getElementById(`alertSound`);
//                 alertSound.play();
//                 const rowDoc = document.getElementById(key);
//                 // Add this line to change background color
//                 rowDoc.cells[indexes['status']].textContent = '✔'
//                 rowDoc.style.backgroundColor = '#D2F8D2';

//                 if(leg.orderFlag){
//                     placeCalenderOrder({
//                         tradingsymbol: leg.buyScript,
//                         token: leg.buyToken,
//                         quantity: leg.quantity,
//                         transactiontype: 'BUY',
//                         orderType: leg.orderType,
//                         price: (Number(buyPrice) + 2).toFixed(2),
//                     }, {
//                         tradingsymbol: leg.sellScript,
//                         token: leg.sellToken,
//                         quantity: leg.quantity,
//                         transactiontype: 'SELL',
//                         orderType: leg.orderType,
//                         price: (Number(sellPrice) + 2).toFixed(2),
//                     }).then(result => {
//                         console.log("Order result ", result)
//                         if(result.success){
//                             rowDoc.cells[indexes['status']].textContent = '✔ '+ result.msg 
//                             rowDoc.style.backgroundColor = '#D2F8D2';
//                         } else {
//                             rowDoc.cells[indexes['status']].textContent = '❗'+result.msg
//                             rowDoc.style.backgroundColor = '#FBD9D3';
//                         }
//                     })
//                 }
//             }
//         }
//     })
//     toBeDeletedKeys.forEach(key => {
//         removeCache(key)
//     })  
// }


function getTokenFromSymbol(baseInstrument, expiry, script) {
    //expiry = expiry.substring(0, 5) + expiry.substring(7)
    const symbolKey = `${baseInstrument}${expiry}${script}`;
    return baseInstrument === 'NIFTY' 
        ? Number(getNiftySymbols()[symbolKey]) 
        : Number(getBankNiftySymbols()[symbolKey]);
}

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

document.addEventListener('ticker-available', postTickerInitialization);
//document.addEventListener('add-css-row', addNewRow);