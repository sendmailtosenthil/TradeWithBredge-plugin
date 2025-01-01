function placeCalendarOrder(sellOrder, buyOrder, callback) {
    // Make parallel API calls for buyOrder and sellOrder
    Promise.all([placeOrder(buyOrder), placeOrder(sellOrder)])
    .then(async ([buyResponse, sellResponse]) => {
        let buildResponse = ''
        // Process the results of both orders
        console.log('Buy Order Response:', buyResponse);
        console.log('Sell Order Response:', sellResponse);

        let orders = []
        // Additional processing can be done here
        if (buyResponse.status == "success"){
            orders.push(buyResponse.data.order_id);
            buildResponse = buildResponse + "Buy :"+orders[0]+" "
        } else {
            buildResponse = buildResponse + "Buy Failed "
        } 
        if(sellResponse.status == "success") {
            orders.push(sellResponse.data.order_id);
            buildResponse = buildResponse + "Sell :"+orders[1]+" "
        } else {
            buildResponse = buildResponse + "Sell Failed "
        }
        buildResponse = buildResponse + (await orderInfoByIds(orders))
        callback(buildResponse)
    })
    .catch(error => {
        // Handle any errors that occurred during the API calls
        callback('Error placing orders:'+error);
    });
}

async function orderInfoByIds(orders) {
    let result = ''
    let response = await getOrders()
    const fetchedOrders = response.data;
    const executedOrders = fetchedOrders.filter(order => orders.includes(order.order_id));
    executedOrders.forEach(o => result = result + `[${o.transaction_type} - ${o.status}] @ ${o.price}`)
    return result
}

function getOrders(){
    const url = 'https://kite.zerodha.com/oms/orders'
    return fetch(url, {
        method: 'GET',
        headers:{
            'Authorization': cookie_info.authorization,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Kite-Version': '3.0.0',
            'X-Kite-Userid': cookie_info.user_id
        }
    })

}
function placeOrder(order) {
    const url = 'https://kite.zerodha.com/oms/orders/regular';

    const payload = {
        variety: 'regular',
        exchange: 'NFO',
        tradingsymbol: order.tardingsymbol,
        transaction_type: order.transactiontype,
        order_type: 'LIMIT',
        price: 1000,
        quantity: order.quantity,
        product: 'NRML',
        validity: 'DAY',
        user_id: cookie_info.user_id
    };

    return fetch(url, {
        method: 'POST',
        headers:{
            'Authorization': cookie_info.authorization,
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Kite-Version': '3.0.0',
            'X-Kite-Userid': cookie_info.user_id
        },
        body: JSON.stringify(payload)
    })

}
