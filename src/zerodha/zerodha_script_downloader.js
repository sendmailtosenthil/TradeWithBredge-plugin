let niftyExpiry = null;
let bankniftyExpiry = null;
let niftySymbols = null;
let bankniftySymbols = null;

const convertDate = (dateString) => {
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const [year, month, day] = dateString.split("-");
    return `${day}${months[parseInt(month, 10) - 1]}${year}`;
};

function loadScripMasterData() {
    const today = new Date().toDateString();
    const savedData = localStorage.getItem('zerodhaScripMasterData');
    const lastSavedDate = localStorage.getItem('zerodhaScripMasterLastUpdate');
    
    if (savedData && lastSavedDate === today) {
        console.log('Using saved data');
        const data = JSON.parse(savedData);
        niftyExpiry = [...data.expiry.NIFTY];
        bankniftyExpiry = [...data.expiry.BANKNIFTY];
        niftySymbols = data.symbols.NIFTY;
        bankniftySymbols = data.symbols.BANKNIFTY;
        return;
    }

    console.log('Fetching data from Kite server');
    fetch('https://api.kite.trade/instruments/NFO')
        .then(response => response.text())
        .then(csvText => {
            // Convert CSV to JSON
            const lines = csvText.split('\n');
            const headers = lines[0].split(',');
            const data = lines.slice(1).map(line => {
                const values = line.split(',');
                return headers.reduce((obj, header, index) => {
                    obj[header.trim()] = values[index] ? values[index].trim().replaceAll('"','') : '';
                    return obj;
                }, {});
            });
            
            const processedData = data.reduce((acc, item) => {
                // Filter for NIFTY and BANKNIFTY Options
                if ((item.name === 'NIFTY' || item.name === 'BANKNIFTY') ) {
                    
                    // Initialize expiry arrays
                    acc.expiry[item.name] = acc.expiry[item.name] || [];
                    
                    let expiry = convertDate(item.expiry)
                    // Add unique expiry dates
                    if (expiry && !acc.expiry[item.name].includes(expiry)) {
                        acc.expiry[item.name].push(expiry);
                    }
                    
                    // Create symbols mapping
                    acc.symbols[item.name] = acc.symbols[item.name] || {};
                    acc.symbols[item.name][item.tradingsymbol] = item.instrument_token;
                }
                return acc;
            }, {
                expiry: {},
                symbols: {}
            });
            //console.log(processedData['expiry']);
            // Sort expiry arrays by date
            Object.keys(processedData.expiry).forEach(key => {
                processedData.expiry[key].sort((a, b) => {
                    const dateA = new Date(a.replace(/([0-9]{2})([A-Z]{3})([0-9]{2})/, '$2 $1 20$3'));
                    const dateB = new Date(b.replace(/([0-9]{2})([A-Z]{3})([0-9]{2})/, '$2 $1 20$3'));
                    return dateA - dateB;
                });
            });

            //console.log('Processed Data', processedData);
            localStorage.setItem('zerodhaScripMasterData', JSON.stringify(processedData));
            localStorage.setItem('zerodhaScripMasterLastUpdate', today);

            niftyExpiry = [...processedData.expiry.NIFTY];
            bankniftyExpiry = [...processedData.expiry.BANKNIFTY];
            niftySymbols = processedData.symbols.NIFTY;
            bankniftySymbols = processedData.symbols.BANKNIFTY;
        })
        .catch(error => {
            console.error('Error fetching script master data:', error);
        });
}

loadScripMasterData();

export const getNiftyExpiry = () => niftyExpiry
export const getBankNiftyExpiry = () => bankniftyExpiry
export const getNiftySymbols = () => niftySymbols
export const getBankNiftySymbols = () => bankniftySymbols