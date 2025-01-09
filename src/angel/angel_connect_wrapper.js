import {getConnector} from './angel_login.js'

function placeOrder(order){
    const finalOrder = {
        "variety":"NORMAL",
        "tradingsymbol":order.tradingsymbol,
        "symboltoken":String(order.symboltoken),
        "transactiontype":order.transactiontype,
        "exchange":"NFO",
        "ordertype":order.ordertype,
        "producttype":"CARRYFORWARD",
        "duration":"DAY",
        "price":order.price,
        "quantity": String(order.quantity)
    }
    console.log('Final Order', finalOrder)
    return getConnector().placeOrder(finalOrder)
}

function parseResponse(orderResponses){
    let result = {
        success: true,
        order_ids: [],
        msg: ''
    }
    orderResponses.forEach(resp => {
        let angelResp = resp.value
        console.log('Parse Resp Inside', angelResp)
        if(angelResp.message == 'SUCCESS'){
            if(angelResp.status && angelResp.data?.orderid){
                result.order_ids.push(angelResp.data.orderid)
            } else {
                result.success = false
            }
        } else {
            result.msg += angelResp.message + ' ' + angelResp.errorcode + ' '
            result.success = false
        }
    });
    return result
}

export async function placeOrders(orders, rowId){
    let reponses = await Promise.allSettled(orders.map(order => placeOrder(order)))
            .catch(ex => {
                console.log("Orders failed ", ex)
                document.dispatchEvent(new CustomEvent("order-error", {detail: {msg: ex.message, success: false}}))   
                return {rowId, msg: ex.message, success: false}
            })
    console.log("Response ", reponses)
    let result = parseResponse(reponses) 
    let finalResult = await getOrderBook(result.order_ids, result)
    console.log("Final Result after get order ", finalResult)
    document.dispatchEvent(new CustomEvent("order-success", {detail: {...finalResult, rowId}}))
    return {...finalResult, rowId}
}

async function getOrderBook(orders, result){
    //console.log("Given orders ", orders)
    let fetchedOrders = await getConnector().getOrderBook().catch(err => {
        return {
            msg:result.msg + ' Unable to get Order book '+err, 
            success: false
        }
    })
    //console.log("Fetched orders ", fetchedOrders)
    let executedOrders = fetchedOrders?.data?.filter(o => orders.includes(o.orderid)) || []
    if(orders.length != executedOrders.length){
        result.msg = result.msg + ' Missing orders '+ orders + ' ' + executedOrders + ' '
        result.success = false
    }
    executedOrders.forEach(o => {
        if(o.orderstatus == 'rejected' || o.orderstatus == 'cancelled'){
            result.msg = result.msg + `[${o.transactiontype} Status] :`+ o.status + ' ' + o.text + ' '
            result.success = false
        } else {
            result.msg = result.msg +  o.transactiontype + '::'+ o.tradingsymbol + '::@' +o.price +' '+o.text + ' '
        }
    })
    return result;
}

