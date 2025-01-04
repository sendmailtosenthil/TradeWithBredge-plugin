
let triggers = {
	connect: [],
	tick: [],
};

let WebSocketV2 = function (params) {
	try {
		let { clientcode, jwttoken, apikey, feedtype } = params;
		let self = this;
		let ws = null;
		let headers = {
			'x-client-code': clientcode,
			Authorization: jwttoken,
			'x-api-key': apikey,
			'x-feed-token': feedtype,
		};
		let ping_Interval = CONSTANTS?.Interval;
		let timeStamp;
		let stopInterval;
		let subscribeData = [];
		let reset;
		let open = 1;
		let customErrorHandler = false;
		let reconnectionTime;
		let reconnectionType = null;
		let expMultiplier;
		let isReconnect = false;
        this.isAlreadyConnected = function (){
            return ws?.readyState === open;
        }
		this.connect = function () {
			try {
				return new Promise((resolve, reject) => {
					if (
						headers?.['x-client-code'] === null ||
						headers?.['x-feed-token'] === null ||
						headers?.['x-api-key'] === null ||
						headers?.Authorization === null
					) {
						return 'client_code or jwt_token or api_key or feed_token is missing';
					}
                    let url = `wss://smartapisocket.angelone.in/smart-stream?clientCode=${params.clientcode}&feedToken=${params.feedtype}&apiKey=${params.apikey}`
					ws = new WebSocket(url);

					ws.onopen = function onOpen(evt) {
                        //console.log('Opened....', ws)
						if (subscribeData.length > 0) {
							let reSubscribe = subscribeData;
							subscribeData = [];
							reSubscribe.map((data) => {
								self.fetchData(data);
							});
						}
						reset = setInterval(function () {
							ws.send('ping');
						}, ping_Interval);
						resolve();
					};

                    async function blobToUint8Array(blob) {
                        const arrayBuffer = await blob.arrayBuffer(); // Convert Blob to ArrayBuffer
                        return new Uint8Array(arrayBuffer); // Convert ArrayBuffer to Uint8Array
                      }

					ws.onmessage = function (evt) {
                        if (evt.data instanceof Blob) {
                            blobToUint8Array(evt.data).then((uint8Array) => {
                                let result = evt.data;
                                timeStamp = Math.floor(Date.now() / 1000);
                                //const buf = new Uint8Array(result);
                                const receivedData = setResponse(uint8Array, result);
                                trigger('tick', [receivedData]);
                                resolve(result);
                                //console.log("uint ",receivedData); // Logs Uint8Array [72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]
                            });
                        }
                        
					};

					stopInterval = setInterval(function () {
						let currentTimeStamp = Math.floor(Date.now() / 1000);
						let lastMessageTimeStamp = currentTimeStamp - timeStamp;
						if (lastMessageTimeStamp > 20) {
							if (ws?.readyState === open) {
								ws.close();
							}
							clearInterval(reset);
                			clearInterval(stopInterval);
                			self.connect();
						}
					}, 5000);

					ws.onerror = function (evt) {
                        console.log('Error....')
						if (customErrorHandler) {
							reject(evt);
						}
						else {
							if (evt?.message?.match(/\d{3}/)?.[0] == 401) {
								throw new Error(evt.message);
							}
							try {
								if (ws?.readyState === open) {
									ws.close();
								}
								clearInterval(reset);
							} catch (error) {
								throw new Error(error);
							}
						}
					};
					ws.onclose = function (evt) {
                        console.log('Closed....')
						if (isReconnect) {
							if (reconnectionType === "simple") {
								setTimeout(function () {
									clearInterval(reset);
									clearInterval(stopInterval);
									self.connect();
								}, reconnectionTime);
							} else if (reconnectionType === "exponential") {
								setTimeout(function () {
									clearInterval(reset);
									clearInterval(stopInterval);
									self.connect();
									reconnectionTime *= expMultiplier;
								}, reconnectionTime);
							}
						}
					};
				});
			} catch (error) {
				throw new Error(error);
			}
		};

		this.fetchData = function (json_req) {
			subscribeData.push(json_req);
			const { correlationID, action, mode, exchangeType, tokens } = json_req;
			if (action !== ACTION.Subscribe && action !== ACTION.Unsubscribe) {
				throw new Error('Invalid Action value passed');
			}
			if (
				mode !== MODE.LTP &&
				mode !== MODE.Quote &&
				mode !== MODE.SnapQuote &&
				mode !== MODE.Depth
			) {
				throw new Error("Invalid Mode value passed");
			}

			if (
				exchangeType !== EXCHANGES.bse_cm &&
				exchangeType !== EXCHANGES.bse_fo &&
				exchangeType !== EXCHANGES.cde_fo &&
				exchangeType !== EXCHANGES.mcx_fo &&
				exchangeType !== EXCHANGES.ncx_fo &&
				exchangeType !== EXCHANGES.nse_cm &&
				exchangeType !== EXCHANGES.nse_fo
			) {
				throw new Error('Invalid Exchange type passed');
			}

			if (mode === MODE.Depth) {
				if (tokens.length > 50) {
					throw new Error(
						"Quota exceeded: You can subscribe to a maximum of 50 tokens"
					);
				}
				if (mode === MODE.Depth && exchangeType !== EXCHANGES.nse_cm) {
					throw new Error(
						"Invalid exchange type: Please check the exchange type and try again"
					);
				}
			}

			let reqBody = {
				action,
				params: {
					mode,
					tokenList: [
						{
							exchangeType,
							tokens,
						},
					],
				},
			};
			if (correlationID) {
				reqBody.correlationID = correlationID;
			}
            if (ws?.readyState === open) {
                console.log("Sending Open ",JSON.stringify(reqBody))
				ws.send(JSON.stringify(reqBody));
			}
		};

		this.on = function (e, callback) {
            if (triggers.hasOwnProperty(e)) {
				triggers[e].push(callback);
			}
		};

		this.close = function () {
			isReconnect = false;
			clearInterval(stopInterval);
			ws.close();
		};

		this.customError = function () {
			customErrorHandler = true;
		};

		this.reconnection = function (type, delTime, multiplier) {
			isReconnect = true;
			reconnectionType = type
			if (reconnectionType === 'simple') {
				reconnectionTime = delTime
			}
			if (reconnectionType === 'exponential') {
				reconnectionTime = delTime * multiplier;
				expMultiplier = multiplier
			}
		}
	} catch (error) {
		throw new Error(error);
	}
};

function trigger(e, args) {
	if (!triggers[e]) return;
	for (var n = 0; n < triggers[e].length; n++) {
		triggers[e][n].apply(triggers[e][n], args ? args : []);
	}
}

function divisor(num, denom = 1){
    return Number((Number(num)/Number(denom)).toFixed(2))
}
function LTP(buf) {
    const parser = new BinaryParser();
    const data = parser.parse(buf);
    
    return {
        subscription_mode: data.uint8(formatter=Number),
        exchange_type: data.uint8(formatter=Number),
        token: data.token(new Uint8Array(buf.slice(2, 27))),
        sequence_number: data.uint64(formatter=Number),
        exchange_timestamp: data.uint64(formatter=Number),
        last_traded_price: divisor(data.uint32(formatter=Number), 100)
    };
}

function QUOTE(buf) {
    const parser = new BinaryParser();
    const data = parser.parse(buf);
    
    return {
        subscription_mode: data.uint8(formatter=Number),
        exchange_type: data.uint8(formatter=Number),
        token: data.token(new Uint8Array(buf.slice(2, 27))),
        sequence_number: data.uint64(formatter=Number),
        exchange_timestamp: data.uint64(formatter=Number),
        last_traded_price: divisor(data.uint64(formatter=Number), 100),
        last_traded_quantity: data.uint64(formatter=Number),
        avg_traded_price: divisor(data.uint64(formatter=Number),100),
        vol_traded: data.uint64(formatter=Number),
        total_buy_quantity: data.double(formatter=Number),
        total_sell_quantity: data.double(formatter=Number), 
        open_price_day: divisor(data.uint64(formatter=Number),100),
        high_price_day: divisor(data.uint64(formatter=Number),100),
        low_price_day: divisor(data.uint64(formatter=Number),100),
        close_price: divisor(data.uint64(formatter=Number),100)
    };
}


function SNAP_QUOTE(buf) {
    const parser = new BinaryParser();
    const data = parser.parse(buf);
    
    // Parse best 5 buy/sell data
    const parseBestFiveData = (offset) => {
        const bestFiveArray = [];
        for(let i = 0; i < 5; i++) {
            bestFiveArray.push({
                flag: data.uint16(formatter=Number),
                quantity: data.uint64(formatter=Number),
                price: divisor(data.uint64(formatter=Number),100),
                no_of_orders: data.uint16(formatter=Number)
            });
        }
        return bestFiveArray;
    };

    let res = {
        subscription_mode: data.uint8(formatter=Number),
        exchange_type: data.uint8(formatter=Number),
        token: data.token(new Uint8Array(buf.slice(2, 27))),
        sequence_number: data.uint64(formatter=Number),
        exchange_timestamp: data.uint64(formatter=Number),
        last_traded_price: divisor(data.uint64(formatter=Number),100),
        last_traded_quantity: data.uint64(formatter=Number),
        avg_traded_price: divisor(data.uint64(formatter=Number),100),
        vol_traded: data.uint64(formatter=Number),
        total_buy_quantity: data.double(),
        total_sell_quantity: data.double(),
        open_price_day: divisor(data.uint64(formatter=Number),100),
        high_price_day: divisor(data.uint64(formatter=Number),100),
        low_price_day: divisor(data.uint64(formatter=Number),100),
        close_price: divisor(data.uint64(formatter=Number),100),
        last_traded_timestamp: data.uint64(formatter=Number),
        open_interest: data.uint64(formatter=Number),
        open_interest_change: data.double(),
        best_5_buy_data: parseBestFiveData(),
        best_5_sell_data: parseBestFiveData(),
        upper_circuit: divisor(data.uint64(formatter=Number),100),
        lower_circuit: divisor(data.uint64(formatter=Number),100),
        fiftytwo_week_high: divisor(data.uint64(formatter=Number),100),
        fiftytwo_week_low: divisor(data.uint64(formatter=Number),100)
    };
    return res
}

function DEPTH(buf) {
    const parser = new BinaryParser();
    const data = parser.parse(buf);
    
    // Parse depth twenty data
    const parseDepthTwentyData = () => {
        const depthArray = [];
        for(let i = 0; i < 20; i++) {
            depthArray.push({
                quantity: data.uint32(formatter=Number),
                price: divisor(data.uint32(formatter=Number),100),
                no_of_orders: data.uint16(formatter=Number)
            });
        }
        return depthArray;
    };

    return {
        subscription_mode: data.uint8(formatter=Number),
        exchange_type: data.uint8(formatter=Number),
        token: data.token(new Uint8Array(buf.slice(2, 27))),
        exchange_timestamp: data.uint64(formatter=Number),
        packet_received_time: data.uint64(formatter=Number),
        depth_twenty_buy_data: parseDepthTwentyData(),
        depth_twenty_sell_data: parseDepthTwentyData()
    };
}

function toNumber(number) {
	return number.toString();
}

function setResponse(buf, result) {
    const subscription_mode = buf[0];
    //console.log("subscription_mode ", subscription_mode)
    switch (subscription_mode) {
        case MODE.LTP:
            return LTP(buf);
        case MODE.Quote:
            return QUOTE(buf);
        case MODE.SnapQuote:
            return SNAP_QUOTE(buf);
        case MODE.Depth:
            return DEPTH(buf);
        default:
            return result;
    }
}

let angel_credentials = {}
function populateTokens(){
    
    let smart_api = new SmartAPI({
        api_key: ANGEL_API_KEY
    });    
}
