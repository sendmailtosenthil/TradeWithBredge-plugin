import { placeOrder } from "./position.js";

let selectedPositions = [];
let orderNumber = 0;
const maxOrder = 2;

function handleSelectedPositions(event) {
    document.getElementById('openPositionsDiv').style.display = 'none';
    selectedPositions = event.detail.positions;
    console.log('selected-positions', event.detail.positions);
    const targetStoplossForm = document.getElementById('target-stoploss-form');
    const selectedPositionsDiv = document.getElementById('selected-positions');

    // Clear previous positions
    selectedPositionsDiv.innerHTML = '';
    if (event.detail.positions && event.detail.positions.length > 0) {
        // Show the form if there are positions
        targetStoplossForm.style.display = 'block';

        event.detail.positions.forEach((position, index) => {
            // Add color styling based on transaction type
            const color = position.transactiontype.toLowerCase() === 'sell' ? 'red' : 'blue';
            selectedPositionsDiv.innerHTML += `<span style="color: ${color};">${position.transactiontype} ${position.tradingsymbol} of ${Math.abs(position.quantity)} @ ${position.price}</span> || `;
        });
    } else {
        // Hide the form if no positions
        targetStoplossForm.style.display = 'none';
    }
}

function onActionChange(event) {
    const selectedOption = event.target.value;
    if (selectedOption === 'alert') {
        document.getElementById('tss-action-order').style.display = 'none';
    } else {
        document.getElementById('tss-action-order').style.display = 'block';
    }

}

function doValidation(){
    if (orderNumber >= maxOrder) {
        alert('Maximum order limit reached');
        return true;
    }
    const action = document.getElementById('tss-action').value;
    if (action == '') {
        alert('Please select an action');
        return true;
    }
    if (selectedPositions.length === 0) {
        alert('Please select at least one position');
        return true;
    }
    const orderType = document.getElementById('tss-orderType').value;
    if (action == 'order' && orderType == '') {
        alert('Please select an order type');
        return true;
    }
    const depth = document.getElementById('tss-depth').value;
    if (depth == '') {
        alert('Please enter depth');
        return true;
    }
    const target = document.getElementById('tss-target').value;
    if (target == '') {
        alert('Please enter target');
        return true;
    }
    const stoploss = document.getElementById('tss-stoploss').value;
    if (stoploss == '') {
        alert('Please enter stoploss');
        return true;
    }
    if(Number(stoploss) >= Number(target)) {
        alert('Stoploss should be less than target');
        return true;
    }
    if(Number(stoploss) >= 0) {
        return confirm('Ideally SL are negative, Are you sure you want to set stoploss more than 0?');
    }
    return false;
}

document.getElementById('clear-group')?.addEventListener('click', () => {
    selectedPositions = [];
    const selectedPositionsDiv = document.getElementById('selected-positions');
    selectedPositionsDiv.innerHTML = '';
    const targetStoplossForm = document.getElementById('target-stoploss-form');
    targetStoplossForm.style.display = 'none';
    document.getElementById('openPositionsDiv').style.display = 'block';
});

// Add event listener for the Add Leg button
document.getElementById('add-target-stoploss-group')?.addEventListener('click', () => {
    if (doValidation()) {
        return;
    }
    //document.getElementById('tssTable').style.display = 'block';
    const targetPrice = document.getElementById('tss-target').value;
    const stoplossPrice = document.getElementById('tss-stoploss').value;
    const action = document.getElementById('tss-action').value;
    const orderType = document.getElementById('tss-orderType').value;
    const depth = document.getElementById('tss-depth').value;
    const verbose = document.getElementById('tss-verbose').checked;

    let tokens = []
    let positions = selectedPositions.map((p,i) => {
        let obj = {}
        tokens.push(Number(p.symboltoken))
        obj[`leg_${i+1}`] = function(){
            return {
                transactiontype: p.transactiontype,
                tradingsymbol: p.tradingsymbol,
                quantity: p.quantity,
                price: p.price,
                symboltoken: Number(p.symboltoken)
            }
        }
        return obj
    }).reduce((acc, curr) => ({...acc, ...curr}), {});

    let msgBody = {
        ...positions,
        evalCriteria: function(tokenPrices){
            let result = {criteriaMet: false, prices: [], pnl: 0};
            let waitingForPrice = false
            for(let i=1; i<= this.noOfLeg; i++){
                const leg = this[`leg_${i}`]()
                const allPrices = tokenPrices[leg.symboltoken]
                let perPrice = 0
                let currentValue = 0
                let detailTxt = ''
                //console.log('Working leg', leg, allPrices)
                if(leg.transactiontype == 'BUY'){
                    perPrice = allPrices?.sellPrices[depth]?.price || 0
                    currentValue = (Number(leg.price) - Number(perPrice)) * Number(leg.quantity)
                    detailTxt = `(${Number(leg.price).toFixed(2)} - ${Number(perPrice).toFixed(2)}) * ${leg.quantity} = ${currentValue.toFixed(2)}`
                } else {
                    perPrice = allPrices?.buyPrices[depth]?.price || 0
                    currentValue = (Number(perPrice) - Number(leg.price)) * Number(leg.quantity)
                    detailTxt = `(${Number(perPrice).toFixed(2)} - ${Number(leg.price).toFixed(2)}) * ${leg.quantity} = ${currentValue.toFixed(2)}`
                }
                //console.log('perPrice', perPrice, currentValue)
                if(perPrice == 0){
                    result = {criteriaMet:false, prices:[], pnl:0}
                    waitingForPrice = true
                    break;
                }
                result.prices.push({detailTxt, perPrice})
                result.pnl = result.pnl + currentValue
            }
            
            if(waitingForPrice){
                console.log('Waiting for price for ', this.tokens)
                return result
            }
            if(result.pnl >= targetPrice){
                result.criteriaMet = true
                result.trigger = 'target'
            }
            if(result.pnl <= stoplossPrice){
                result.criteriaMet = true
                result.trigger = 'stoploss'
            }
            return result
        },
        placeOrder: function (result, rowId){
            if(this.orderFlag){
                console.log('Order Yet to be implemented for '+rowId, result)
            }
        },
        updateMonitorTag: function(criteriaResult){
            //console.log('Update monitor tag for ', criteriaResult)
            if(Object.keys(criteriaResult).length == 0){
                return `${Number(stoplossPrice).toFixed(2)} <= 0 <= ${Number(targetPrice).toFixed(2)}`
            }
            let displayStr = ''
            criteriaResult.prices.forEach(p => {
                displayStr += `${p.detailTxt}<br>`
            })
            const pnl = criteriaResult.pnl
            if(this.verbose){
                return `${displayStr}${Number(stoplossPrice).toFixed(2)} <= ${Number(pnl).toFixed(2)} <= ${Number(targetPrice).toFixed(2)}`
            } else {
                return `${Number(stoplossPrice).toFixed(2)} <= ${Number(pnl).toFixed(2)} <= ${Number(targetPrice).toFixed(2)}`
            }
        },
        noOfLeg: tokens.length,
        depth:depth,
        orderFlag: action == 'order',
        orderType: orderType,
        targetPrice: targetPrice,
        stoplossPrice: stoplossPrice,
        algo: 'tss',
        tokens: tokens,
        verbose: verbose,
    }
    // Here you can add logic to process the target and stoploss
    const myEvent = new CustomEvent('add-monitoring-leg', {
        "detail": msgBody
    });
    console.log('msgBody ', msgBody)
    document.dispatchEvent(myEvent);
});

document.getElementById('tss-action').addEventListener('change', onActionChange);
document.addEventListener('selected-positions', handleSelectedPositions)