'use strict';

var SmartApi = function(params) {
	var self = this;

	self.totp = params.totp;
	self.api_key = params.api_key;
	self.client_code = params.client_code || null;
	self.root = params.root || ANGEL_API.root;
	self.timeout = params.timeout || ANGEL_API.timeout;
	self.debug = params.debug || ANGEL_API.debug;
	self.access_token = params.access_token || null;
	self.refresh_token = params.refresh_token || null;
	self.default_login_uri = ANGEL_API.login;
	self.session_expiry_hook = null;

	// Browser compatible values
	self.local_ip = '127.0.0.1';
	self.mac_addr = 'XX:XX:XX:XX:XX:XX';
	self.public_ip = null;

	fetch('https://api.ipify.org?format=json')
		.then(response => response.json())
		.then(data => {
			self.public_ip = data.ip;
		});

	var requestInstance = axios.create({
		baseURL: self.root,
		timeout: self.timeout,
		headers: {
			'X-ClientLocalIP': self.local_ip,
			'X-ClientPublicIP': self.public_ip,
			'X-MACAddress': self.mac_addr,
			'Content-Type': 'application/json'
		}
	});

	requestInstance.interceptors.request.use(function(request) {
		if (self.debug) console.log(request);
		return request;
	});

	requestInstance.interceptors.response.use(
		function(response) {
			if (self.debug) console.log(response);
			if (response?.status === 200) {
				if (response?.data?.success || response?.data?.status) {
					return response.data;
				}
				if (response?.data?.errorCode === 'AG8001' && self.session_expiry_hook) {
					self.session_expiry_hook();
				}
				return response?.data;
			}
			return response?.data;
		},
		function(error) {
			let errorObj = {};
			if (error?.response?.status) {
				errorObj.status = error.response.status;
				errorObj.message = error.response.statusText;
			} else {
				errorObj.status = 500;
				errorObj.message = 'Error';
			}
			return errorObj;
		}
	);

	function request_util(route, method, params) {
		let url = ANGEL_API[route];
		let payload = method !== 'GET' ? params : null;

		let options = {
			method: method,
			url: url,
			data: JSON.stringify(payload),
			headers: {
				'Content-Type': 'application/json',
				'Accept': 'application/json',
				'X-UserType': 'USER',
				'X-SourceID': 'WEB',
				'X-PrivateKey': self.api_key
			}
		};

		if (self.access_token) {
			options.headers['Authorization'] = 'Bearer ' + self.access_token;
		}

		return requestInstance.request(options);
	}

	self.setAccessToken = function(access_token) {
		self.access_token = access_token;
	};

	self.setPublicToken = function(refresh_token) {
		self.refresh_token = refresh_token;
	};

	self.setClientCode = function(client_code) {
		self.client_code = client_code;
	};

	self.setSessionExpiryHook = function(cb) {
		self.session_expiry_hook = cb;
	};

	self.generateSession = function(client_code, password, totp) {
		let params = {
			clientcode: client_code,
			password: password,
			totp: totp
		};
		let token_data = request_util('user_login', 'POST', params);

		token_data
			.then((response) => {
				if (response.status) {
					self.setClientCode(client_code);
					if(response.data){
						if(response.data.jwtToken){
							self.setAccessToken(response.data.jwtToken);
						}
						if(response.data.refreshToken){
							self.setPublicToken(response.data.refreshToken);
						}
					}
				}
			})
			.catch(function (err) {
				throw err;
			});

		return token_data;
	};

	self.getLoginURL = function() {
		return self.default_login_uri + '?api_key=' + self.api_key;
	};

	self.generateToken = function(refresh_token) {
		let token_data = request_util('generate_token', 'POST', {
			refreshToken: refresh_token,
		});

		token_data.then((response) => {
			if (response.status) {
				self.setAccessToken(response.data.jwtToken);
				self.setPublicToken(response.data.refreshToken);
			}
		});

		return token_data;
	};

	self.logout = function(client_code) {
		if (client_code != null)
			return request_util('logout', 'POST', { clientcode: client_code });
		else
			return {
				status: 500,
				message: 'Client Code is required.',
			};
	};

	self.getProfile = function() {
		return request_util('get_profile', 'GET');
	};

	self.placeOrder = function(params) {
		return request_util('order_place', 'POST', params);
	};

	self.modifyOrder = function(params) {
		return request_util('order_modify', 'POST', params);
	};

	self.cancelOrder = function(params) {
		return request_util('order_cancel', 'POST', params);
	};

	self.getOrderBook = function() {
		return request_util('order_get_book', 'GET');
	};

	self.getTradeBook = function() {
		return request_util('get_tradebook', 'GET');
	};

	self.getRMS = function() {
		return request_util('get_rms', 'GET');
	};

	self.getHolding = function() {
		return request_util('get_holding', 'GET');
	};

	self.getPosition = function() {
		return request_util('get_position', 'GET');
	};

	self.convertPosition = function(params) {
		return request_util('convert_position', 'POST', params);
	};

	self.createRule = function(params) {
		return request_util('create_rule', 'POST', params);
	};

	self.modifyRule = function(params) {
		return request_util('modify_rule', 'POST', params);
	};

	self.cancelRule = function(params) {
		return request_util('cancel_rule', 'POST', params);
	};

	self.ruleDetails = function(params) {
		return request_util('rule_details', 'POST', params);
	};

	self.ruleList = function(params) {
		if (Array.isArray(params.status)) return request_util('rule_list', 'POST', params);
		else
			return {
				status: 500,
				message:
					'Invalid status. Please refer Smart API documentation for more details.',
			};
	};

	self.marketData = function(params) {
		return request_util('market_data', 'POST', params);
	};

	self.searchScrip = function(params) {
		return request_util('search_scrip', 'POST', params)
			.then((data) => {
				if (data?.status === true && data?.data?.length > 0) {
					const tradingSymbols = data.data.map((item, index) => {
						return `${index + 1}. exchange: ${item.exchange}, tradingsymbol: ${item.tradingsymbol}, symboltoken: ${item.symboltoken}`;
					});
					const searchData = `Search successful. Found ${data.data.length} trading symbols for the given query:\n${tradingSymbols.join('\n')}`;
					console.log(searchData);
					return data.data;
				} else if (data?.status === true && data?.data?.length === 0) {
					console.log("Search successful. No matching trading symbols found for the given query.");
					return data.data
				} else {
					return data;
				}
			})
			.catch((error) => {
				return error;
			});
	};

	self.getAllHolding = function() {
		return request_util('get_all_holding', 'GET');
	};

	self.indOrderDetails = function(qParams) {
		return request_util('ind_order_details', 'GET', qParams);
	};

	self.marginApi = function(params) {
		return request_util('margin_api', 'POST', params);
	};

	self.getCandleData = function(params) {
		return request_util('candle_data', 'POST', params);
	};

	self.getOIData = function(params) {
		return request_util('oi_data', 'POST', params);
	};

	self.estimateCharges = function(params) {
		return request_util('estimateCharges', 'POST', params);
	};

	self.verifyDis = function(params) {
		return request_util('verifyDis', 'POST', params);
	};

	self.generateTPIN = function(params) {
		return request_util('generateTPIN', 'POST', params);
	};

	self.getTranStatus = function(params) {
		return request_util('getTranStatus', 'POST', params);
	};

	self.optionGreek = function(params) {
		return request_util('optionGreek', 'POST', params);
	};

	self.gainersLosers = function(params) {
		return request_util('gainersLosers', 'POST', params);
	};

	self.putCallRatio = function() {
		return request_util('putCallRatio', 'GET');
	};

	self.nseIntraday = function() {
		return request_util('nseIntraday', 'GET');
	};

	self.bseIntraday = function() {
		return request_util('bseIntraday', 'GET');
	};

	self.oIBuildup = function(params) {
		return request_util('OIBuildup', 'POST', params);
	};
};
