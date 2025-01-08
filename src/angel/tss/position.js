import { getConnector } from "../angel_login.js";

function runMock(){
    const selectedPositions = [{
        transactiontype: "BUY",
        tradingsymbol: "BANKNIFTY30JAN2550000CE",
        quantity: 30,
        price: 100,
        token: "39510"
    },
    {
        transactiontype: "SELL",
        tradingsymbol: "BANKNIFTY30JAN2549900CE",
        quantity: 30,
        price: 130,
        token: "39508"
    },
    {
        transactiontype: "SELL",
        tradingsymbol: "BANKNIFTY30JAN2552900CE",
        quantity: 60,
        price: 150,
        token: "39583"
    }]
    const myEvent = new CustomEvent("selected-positions", {"detail":{"positions": selectedPositions}});
    document.dispatchEvent(myEvent)
}
document.getElementById('openPositions')?.addEventListener('click', async ()=>{
    return runMock()
    let positions = await getConnector().getPosition()
    let currentPositions = positions?.data?.filter(p => p.exchange == "NFO" && 
        p.producttype == "CARRYFORWARD" && ["NIFTY","BANKNIFTY"].includes(p.symbolname)
        && p.netqty != 0)
    let finalPositions = currentPositions?.map(p => {
        return {
            transactiontype: p.netqty > 0 ? "BUY":"SELL",
            tradingsymbol: p.tradingsymbol,
            quantity: Math.abs(p.netqty),
            price: p.netprice,
            token: symboltoken
        }
    })

    // Create overlay window
    populatePositionsOverlay(finalPositions);
})

function populatePositionsOverlay(positions) {
    const overlay = document.getElementById('positions-overlay');
    const tbody = document.getElementById('positions-tbody');
    const selectAllCheckbox = document.getElementById('select-all');
    const submitButton = document.getElementById('group-positions');
    const closeButton = document.getElementById('close-positions');

    // Clear previous content
    tbody.innerHTML = '';

    // Populate table
    positions?.forEach((position, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" class="position-checkbox" data-index="${index}"></td>
            <td>${position.transactiontype}</td>
            <td>${position.tradingsymbol}</td>
            <td>${position.quantity}</td>
            <td>${position.price}</td>
        `;
        tbody.appendChild(row);
    });

    // Show overlay
    overlay.style.display = 'flex';

    // Select all checkbox event
    selectAllCheckbox.addEventListener('change', (e) => {
        const checkboxes = document.querySelectorAll('.position-checkbox');
        checkboxes.forEach(cb => cb.checked = e.target.checked);
    });

    // Submit button event
    submitButton.onclick = () => {
        const selectedPositions = [];
        const checkboxes = document.querySelectorAll('.position-checkbox:checked');
        if(checkboxes.length === 0) {
            alert('Please select at least one position.');
            return;
        };
        if(checkboxes.length > 4) {
            alert('You can only select up to 4 positions.');
            return;
        }
        checkboxes.forEach(cb => {
            const index = cb.getAttribute('data-index');
            selectedPositions.push(positions[index]);
        });

        console.log('Selected Positions:', selectedPositions);
        const myEvent = new CustomEvent("selected-positions", {"detail":{"positions": selectedPositions}});
        document.dispatchEvent(myEvent)
        overlay.style.display = 'none';
    };

    // Close button event
    closeButton.onclick = () => {
        overlay.style.display = 'none';
    };
}