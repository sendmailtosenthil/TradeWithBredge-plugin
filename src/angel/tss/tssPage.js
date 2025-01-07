let selectedPositions = [];

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
            selectedPositionsDiv.innerHTML = selectedPositionsDiv.innerHTML + `${position.transactiontype} ${position.tradingsymbol} of ${position.quantity} @ ${position.price} || `;
        });
    } else {
        // Hide the form if no positions
        targetStoplossForm.style.display = 'none';
    }
}

// Add event listener for the Add Leg button
document.getElementById('add-target-stoploss-group')?.addEventListener('click', () => {
    const targetPrice = document.getElementById('target-price').value;
    const stoplossPrice = document.getElementById('stoploss-price').value;
    
    // Here you can add logic to process the target and stoploss
    console.log('Target Stoploss Leg:', {
        positions: selectedPositions,
        targetPrice,
        stoplossPrice
    });

    // Optional: You might want to dispatch an event or call a function to handle the leg addition
});

document.addEventListener('selected-positions', handleSelectedPositions)