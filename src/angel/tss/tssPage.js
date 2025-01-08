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
        return;
    }
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
    document.getElementById('tssTable').style.display = 'block';
    const targetPrice = document.getElementById('target-price').value;
    const stoplossPrice = document.getElementById('stoploss-price').value;
    const action = document.getElementById('tss-action').value;
    const orderType = document.getElementById('tss-orderType').value;
    const depth = document.getElementById('tss-depth').value;

    let positions = selectedPositions.map((p,i) => {
        let obj = {}
        obj[`leg-${i+1}`] = p
        return obj
    })
    let msgBody = {
        ...Object.assign({}, ...positions),
        targetPrice,
        stoplossPrice,
        action,
        orderType,
        depth
    }
    // Here you can add logic to process the target and stoploss
    const myEvent = new CustomEvent('add-tss-leg', {
        "detail": msgBody
    });
    console.log('msgBody ', msgBody)
    document.dispatchEvent(myEvent);
});

document.getElementById('tss-action').addEventListener('change', onActionChange);
document.addEventListener('selected-positions', handleSelectedPositions)