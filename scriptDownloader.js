let niftyExpiry = null;
let bankniftyExpiry = null;
let niftySymbols = null;
let bankniftySymbols = null;

function loadScripMasterData() {
    const today = new Date().toDateString();
    const savedData = localStorage.getItem('scripMasterData');
    const lastSavedDate = localStorage.getItem('scripMasterLastUpdate');
    
    if (savedData && lastSavedDate === today) {
        console.log('Using saved data');
        const data = JSON.parse(savedData);
        niftyExpiry = [...data.expiry.NIFTY];
        bankniftyExpiry = [...data.expiry.BANKNIFTY];
        niftySymbols = data.symbols.NIFTY;
        bankniftySymbols = data.symbols.BANKNIFTY;
        return;
    }

    console.log('Fetching data from server');
    fetch('https://margincalculator.angelone.in/OpenAPI_File/files/OpenAPIScripMaster.json')
        .then(response => {
            const reader = response.body.getReader();
            return new ReadableStream({
                start(controller) {
                    return pump();
                    function pump() {
                        return reader.read().then(({done, value}) => {
                            if (done) {
                                controller.close();
                                return;
                            }
                            controller.enqueue(value);
                            return pump();
                        });
                    }
                }
            });
        })
        .then(stream => new Response(stream))
        .then(response => response.json())
        .then(data => {
            const processedData = data.reduce((acc, item) => {
                if ((item.name === 'NIFTY' || item.name === 'BANKNIFTY') && item.instrumenttype === 'OPTIDX') {
                    // Initialize as array if not exists
                    acc.expiry[item.name] = acc.expiry[item.name] || [];
                    
                    // Add expiry if not already exists
                    if (!acc.expiry[item.name].includes(item.expiry)) {
                        acc.expiry[item.name].push(item.expiry);
                    }
                    
                    // Add to symbols dictionary
                    acc.symbols[item.name] = acc.symbols[item.name] || {};
                    acc.symbols[item.name][item.symbol] = item.token;
                }
                return acc;
            }, {
                expiry: {},
                symbols: {}
            });
            // Sort expiry arrays by converting to Date temporarily
            Object.keys(processedData.expiry).forEach(key => {
                processedData.expiry[key].sort((a, b) => {
                    const dateA = new Date(a.replace(/([0-9]{2})([A-Z]{3})([0-9]{2})/, '$2 $1 20$3'));
                    const dateB = new Date(b.replace(/([0-9]{2})([A-Z]{3})([0-9]{2})/, '$2 $1 20$3'));
                    return dateA - dateB;
                });
            });
            console.log('Processed Data', processedData);
            localStorage.setItem('scripMasterData', JSON.stringify(processedData));
            localStorage.setItem('scripMasterLastUpdate', today);

            niftyExpiry = [...processedData.expiry.NIFTY];
            bankniftyExpiry = [...processedData.expiry.BANKNIFTY];
            niftySymbols = processedData.symbols.NIFTY;
            bankniftySymbols = processedData.symbols.BANKNIFTY;
        });
}

loadScripMasterData();