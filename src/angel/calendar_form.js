function baseInstrumentChange(event){
    const selectedInstrument = document.getElementById(`baseInstrument`).value
    const expiryValues = selectedInstrument === 'NIFTY' ? getNiftyExpiry() : getBankNiftyExpiry();
    const buyExpirySelect = document.getElementById(`buyExpiry`)
    const sellExpirySelect = document.getElementById(`sellExpiry`)
    const quantitySelect = document.getElementById(`quantity`)
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
}

function actionChange(event){
    const action = document.getElementById(`action`).value
    if(action =='alert' || action ==''){
        document.getElementById(`action-depth`).style.display = 'none'
        document.getElementById(`qunatity-section`).style.display = 'none'
    } else {
        document.getElementById(`action-depth`).style.display = 'block'
        document.getElementById(`qunatity-section`).style.display = 'block'
    }   
}

function doValidation(){
    const action = document.getElementById(`action`).value;
    if(orderNumber >= maxOrder && action == 'order') {
        alert('You cannot make more than 2 running 🏃 orders at same time')
        return false;
    }
    const baseInstrument = document.getElementById(`baseInstrument`).value;
    if(baseInstrument == '') {
        alert('Please enter base instrument')
        return false;
    }
    const strike = document.getElementById(`strike`).value;
    if(strike == '') {
        alert('Please enter strike value')
        return false;
    }
    const optionType = document.getElementById(`optionType`).value;
    if(optionType == '') {
        alert('Please select option type')
        return false;
    }
    const quantity = document.getElementById(`quantity`)?.value;
    if(action == 'order' && quantity == '') {
        alert('Please select Quantity')
        return false;
    }

    let buyExpiry = document.getElementById(`buyExpiry`).value;
    if(buyExpiry == '') {
        alert('Please enter Buy Expiry')
        return false;
    }
    let sellExpiry = document.getElementById(`sellExpiry`).value;
    if(sellExpiry == '') {
        alert('Please enter Sell Expiry')
        return false;
    }
    const premiumLess = document.getElementById(`premiumLess`).value;
    if(premiumLess == '') {
        alert('Please enter Less Than or More Than premium')
        return false;
    }

    const depth = document.getElementById(`depth`).value;
    if(depth == '') {
        alert('Please select correct depth')
        return false;
    }
    const threshold = document.getElementById(`threshold`).value;
    if(threshold == '') {
        alert('Please enter premium difference')
        return false;
    }
    const orderType = document.getElementById(`orderType`)?.value;
    if(action == 'order' && orderType == '') {
        alert('Please select appropriate order type')
        return false;
    }
    return true;
}

function addNewRow() {
    if(!doValidation()){
        return
    }
    const orderFlag = document.getElementById(`action`).value == `order`;
    const baseInstrument = document.getElementById(`baseInstrument`).value;
    const strike = document.getElementById(`strike`).value;
    const optionType = document.getElementById(`optionType`).value;
    const quantity = document.getElementById(`quantity`)?.value;
    let sellExpiry = document.getElementById(`sellExpiry`).value;
    sellExpiry = sellExpiry.substring(0, 5) + sellExpiry.substring(7)
    let buyExpiry = document.getElementById(`buyExpiry`).value;
    buyExpiry = buyExpiry.substring(0, 5) + buyExpiry.substring(7)
    const premiumLess = document.getElementById(`premiumLess`).value;
    const threshold = document.getElementById(`threshold`).value;
    const depth = document.getElementById(`depth`).value;
    const orderType = document.getElementById(`orderType`)?.value;
    const buyScript = `${strike}${optionType}`;
    const sellScript = buyScript

    const myEvent = new CustomEvent("new-row-added", {"detail":{
        action: orderFlag,
        baseInstrument,
        legs: 2,
        transactionType_1_1:'SELL',
        strike_1_1:strike,
        optionType_1_1:optionType,
        quantity_1_1:quantity,
        expiry_1_1:sellExpiry,
        transactionType_1_2:'BUY',
        strike_1_2:strike,
        optionType_1_2:optionType,
        quantity_1_2:quantity,
        expiry_1_2:buyExpiry,
    }});
    document.dispatchEvent(myEvent)   
}

export const Calendar = {
    baseInstrumentChange,
    actionChange,
    addNewRow
}
