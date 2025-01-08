import {PLUGIN} from '../../lib/constant.js'
import { capitalizeFirstLetter } from '../../lib/util.js'
import { getCache } from './tss_state.js';
const indexes = {
    status: 8,
    action: 9
}
function cancelRow(rowId) {
    const row = document.getElementById(rowId);
    console.log('Cancel Row', row, getCache(), rowId)
    if (row && getCache()[rowId]) {
        row.cells[indexes['status']].textContent = '🛑';
        row.style.backgroundColor = '#FFFFC5';
        row.cells[indexes['action']].textContent = '';
    }
    const myEvent = new CustomEvent('remove-tss-leg', {
        "detail": rowId
    })
    document.dispatchEvent(myEvent)
}

function buildLeg(leg){
    if(leg?.transactiontype){
        let tradingsymbol = leg.tradingsymbol.replace(/([A-Z]+)(\d{2}[A-Z]{3}\d{2})(\d+)([A-Z]{2})/, '$1 $2 $3 $4')
        return { 
            text: `${leg.transactiontype == 'BUY' ? '👜' : '💳'} ${tradingsymbol} ${leg.quantity} @ ${leg.price}`,
            class: 'leg-text'
        }
    }
    return "-"
}

function handleRowAddition(event) {
    const tssLeg = event.detail
    console.log('Row Addition', tssLeg)
    // Create table row
    const tssTableBody = document.getElementById('tssTableBody');
    const row = tssTableBody.insertRow();
    row.id = tssLeg.rowId;

    const cells = [
      {value: `${tssLeg['action'] == 'order' ? '🚚' : '🔔'}`},
      {value: `${PLUGIN.depths[tssLeg['depth']]}`},
      {value: capitalizeFirstLetter(tssLeg['orderType'])},
      {value: buildLeg(tssLeg['leg-1'])},
      {value: buildLeg(tssLeg['leg-2'])},
      {value: buildLeg(tssLeg['leg-3'])},
      {value: buildLeg(tssLeg['leg-4'])},
      {value: `-${tssLeg.stoplossPrice} < 0 < ${tssLeg.targetPrice}`},
      {value: '⭕'}
    ];

    cells.forEach(({value}) => {
      const cell = row.insertCell();
      if(typeof value === 'string') {
        cell.textContent = value;
      } else {
        cell.textContent = value.text;
        cell.className = value.class;
      }
      
    });

    // Add a Cancel button
    const cancelCell = row.insertCell();
    const cancelButton = document.createElement('button');
    cancelButton.textContent = '✘';
    cancelButton.addEventListener('click', () => cancelRow(tssLeg.rowId));
    cancelCell.appendChild(cancelButton);

    // Clear form inputs
    // clearForm()
    
    //tssRowNo++;
}

document.addEventListener('add-tss-row', handleRowAddition)