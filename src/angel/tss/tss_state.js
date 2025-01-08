const cache = {};
let tssRowNo = 1

export function getCache() {
    return cache
}

document.addEventListener('add-tss-leg', (event) => {
    const tssLeg = event.detail
    //console.log(tssLeg, event)
    tssLeg.rowId = 'row-tss-' + tssRowNo
    tssRowNo++
    cache[tssLeg.rowId] = tssLeg
    console.log('TSs leg in add cache ', tssLeg)
    const myEvent = new CustomEvent('add-tss-row', {
        "detail": tssLeg
    })
    document.dispatchEvent(myEvent)
});

document.addEventListener('remove-tss-leg', (event) => {
    const rowId = event.detail
    delete cache[rowId]
});