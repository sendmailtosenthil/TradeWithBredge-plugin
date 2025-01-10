import { PLUGIN } from '../../lib/constant.js'
import { capitalizeFirstLetter } from '../../lib/util.js'
import { getCache } from '../angel_state.js';
const indexes = {
    monitoring: 7,
    status: 8,
    action: 9
}

function copyToForm(group){
    // Publish event with dynamic name based on strategy
    const copyEventName = `copy-row-${group.algo}`;
    const copyEvent = new CustomEvent(copyEventName, {
        detail: {
            rowId: group.rowId,
            group: group // Pass the entire leg data
        }
    });
    document.dispatchEvent(copyEvent);
    console.log(`Published event: ${copyEventName}`, tssLeg);
}

function createActionCell(tssLeg) {
    const actionCell = document.createElement('div');
    actionCell.className = 'action-cell';

    // Define action icons and their handlers
    const actions = [
        {
            icon: '⛔',
            tooltip: 'Stop',
            handler: () => cancelRow(tssLeg.rowId)
        },
        {
            icon: '✘',
            tooltip: 'Remove',
            handler: () => {
                cancelRow(tssLeg.rowId);
                const row = document.getElementById(tssLeg.rowId);
                row?.remove();
            }
        },
        // {
        //     icon: '📋',
        //     tooltip: 'Copy',
        //     handler: () => copyToForm(tssLeg)
        // }
    ];

    // Create clickable action icons with tooltips
    actions.forEach(action => {
        const actionWrapper = document.createElement('span');
        actionWrapper.className = 'action-icon-wrapper';

        const actionIcon = document.createElement('span');
        actionIcon.textContent = action.icon;
        actionIcon.className = 'action-icon';

        // Create tooltip element
        const tooltip = document.createElement('span');
        tooltip.textContent = action.tooltip;
        tooltip.className = 'action-tooltip';

        actionIcon.addEventListener('click', action.handler);

        actionWrapper.appendChild(actionIcon);
        actionWrapper.appendChild(tooltip);
        actionCell.appendChild(actionWrapper);
    });

    return actionCell;
}

function cancelRow(rowId) {
    const row = document.getElementById(rowId);
    console.log('Cancel Row', row, getCache(), rowId)
    if (row && getCache()[rowId]) {
        row.cells[indexes['status']].textContent = '🛑';
        row.style.backgroundColor = '#FFFFC5';
        //row.cells[indexes['action']].textContent = '';
        const myEvent = new CustomEvent('remove-monitoring-leg', {
            "detail": rowId
        })
        document.dispatchEvent(myEvent)
    }
}

function buildLegs(group) {
    let legs = []
    for (let i = 1; i <= group.noOfLeg; i++) {
        let leg = group[`leg_${i}`]()
        if (leg?.transactiontype) {
            let tradingsymbol = group.verbose ? leg.tradingsymbol.replace(/([A-Z]+)(\d{2}[A-Z]{3}\d{2})(\d+)([A-Z]{2})/, '$1 $2 $3 $4') : leg.tradingsymbol.replace(/([A-Z]+)(\d{2}[A-Z]{3}\d{2})(\d+)([A-Z]{2})/, '$2 $3 $4')
            legs.push({
                value: {
                    text: `${leg.transactiontype == 'BUY' ? '👜' : '💳'} ${capitalizeFirstLetter(tradingsymbol)} ${group.verbose ? (leg.quantity ? ' of ' + leg.quantity + ' units': ''):''}  ${leg.price? ' @ ' + leg.price : ''}`,
                    class: 'leg-text'
                }
            })
        }
    }
    for (let i = group.noOfLeg + 1; i <= 4; i++) {
        legs.push({
            value: {
                text: '-',
                class: 'leg-text'
            }
        })
    }
    //console.log('Build Legs', legs)
    return legs
}

function strategyIcon(algo){
    switch(algo){
        case 'tss':
            return '🎯'
        case 'css':
            return '📅'
        default:
            return ''
    }
}
function handleRowAddition(event) {
    const tssLeg = event.detail
    console.log('Row Addition', tssLeg)
    // Create table row
    const tssTableBody = document.getElementById('tssTableBody');
    const row = tssTableBody.insertRow();
    row.id = tssLeg.rowId;
    const strat = strategyIcon(tssLeg.algo)
    const cells = [
        { value: `${strat} ${tssLeg['action'] == 'order' ? '🚚' : '🔔'}` },
        { value: `${PLUGIN.depths[tssLeg['depth']]}` },
        { value: capitalizeFirstLetter(tssLeg['orderType']) },
        ...buildLegs(tssLeg),
        { value:tssLeg.updateMonitorTag({}) },
      { value: '⭕' }
    ];

    cells.forEach(({ value }) => {
        const cell = row.insertCell();
        if (typeof value === 'string') {
            cell.textContent = value;
        } else {
            cell.innerHTML = value.text;
            cell.className = value.class;
        }
    });
    //updateMonitoringText(row, cells[indexes['monitoring']].innerHTML)

    // Add action cell with multiple icons
    const actionCell = row.insertCell();
    const actionIcons = createActionCell(tssLeg);
    actionCell.appendChild(actionIcons);

    // Add a Cancel button
    // const cancelCell = row.insertCell();
    // const cancelButton = document.createElement('button');
    // cancelButton.textContent = '✘';
    // cancelButton.addEventListener('click', () => cancelRow(tssLeg.rowId));
    // cancelCell.appendChild(cancelButton);

    // Clear form inputs
    // clearForm()
}

function handleTriggered(rowId){
    const row = document.getElementById(rowId);
    row.cells[indexes['status']].textContent = '✅'
    //row.cells[indexes['action']].textContent = ''
    row.style.backgroundColor = '#D2F8D2';
    document.dispatchEvent(new CustomEvent('remove-monitoring-leg', {
        'detail': rowId
    }))
    document.getElementById('alertSound').play()
}

function updateMonitoringText(row, text){
    const wrappedText = text.split(/<br\s*\/?>/).map(part => 
        `<span>${part}</span>`
    ).join('');
    row.cells[indexes['monitoring']].innerHTML = wrappedText;
}

function updatePrices(event) {
    const rowId = event.detail.rowId
    const text = event.detail.text
    const triggered = event.detail.triggered
    //console.log('Update Prices', event.detail)
    const row = document.getElementById(rowId);
    if (row && getCache()[rowId]) {
        // Wrap the text in spans
        updateMonitoringText(row, text)
        row.cells[indexes['status']].textContent = '🏃';
    }
    if(triggered){
        handleTriggered(rowId)
    }
}

function handleOrderUpdate(event) {
    const rowId = event.detail.rowId
    const text = event.detail.msg
    console.log('Order Update', event.detail)
    const row = document.getElementById(rowId);
    if (row && event.detail.success) {
        row.cells[indexes['status']].textContent = '✅ ' + text;
        row.style.backgroundColor = '#D2F8D2';
    } else {
        row.cells[indexes['status']].textContent = '❌ ' + text;
        row.style.backgroundColor = '#F8DEDE';
        document.getElementById('errorSound').play()
    }
}

document.addEventListener('add-row', handleRowAddition)
document.addEventListener('update-price-tag', updatePrices)
document.addEventListener('order-success', handleOrderUpdate)
document.addEventListener('order-error', handleOrderUpdate)