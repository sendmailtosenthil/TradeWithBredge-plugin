const ANGEL_API = {
	root: 'https://apiconnect.angelone.in',
	login: 'https://smartapi.angelone.in/publisher-login',
	debug: false,
	timeout: 7000,

	user_login: '/rest/auth/angelbroking/user/v1/loginByPassword',
	generate_token: '/rest/auth/angelbroking/jwt/v1/generateTokens',
	get_profile: '/rest/secure/angelbroking/user/v1/getProfile',
	logout: '/rest/secure/angelbroking/user/v1/logout',

	order_place: '/rest/secure/angelbroking/order/v1/placeOrder',
	// "order_status": "/order-service/rest/secure/angelbroking/order/v1/orderStatus",
	order_get_book: '/rest/secure/angelbroking/order/v1/getOrderBook',
	order_modify: '/rest/secure/angelbroking/order/v1/modifyOrder',
	order_cancel: '/rest/secure/angelbroking/order/v1/cancelOrder',

	get_tradebook: '/rest/secure/angelbroking/order/v1/getTradeBook',
	get_rms: '/rest/secure/angelbroking/user/v1/getRMS',
	get_holding: '/rest/secure/angelbroking/portfolio/v1/getHolding',
	get_position: '/rest/secure/angelbroking/order/v1/getPosition',
	convert_position: '/rest/secure/angelbroking/order/v1/convertPosition',

	create_rule: '/rest/secure/angelbroking/gtt/v1/createRule',
	modify_rule: '/rest/secure/angelbroking/gtt/v1/modifyRule',
	cancel_rule: '/rest/secure/angelbroking/gtt/v1/cancelRule',
	rule_details: '/rest/secure/angelbroking/gtt/v1/ruleDetails',
	rule_list: '/rest/secure/angelbroking/gtt/v1/ruleList',

	candle_data: '/rest/secure/angelbroking/historical/v1/getCandleData',
  oi_data: '/rest/secure/angelbroking/historical/v1/getOIData',
	market_data : '/rest/secure/angelbroking/market/v1/quote',
	search_scrip : '/rest/secure/angelbroking/order/v1/searchScrip',
  	get_all_holding : '/rest/secure/angelbroking/portfolio/v1/getAllHolding',
  	ind_order_details: '/rest/secure/angelbroking/order/v1/details',
	margin_api : 'rest/secure/angelbroking/margin/v1/batch',
	estimateCharges : 'rest/secure/angelbroking/brokerage/v1/estimateCharges',
	verifyDis : 'rest/secure/angelbroking/edis/v1/verifyDis',
	generateTPIN : 'rest/secure/angelbroking/edis/v1/generateTPIN',
	getTranStatus : 'rest/secure/angelbroking/edis/v1/getTranStatus',
	optionGreek : 'rest/secure/angelbroking/marketData/v1/optionGreek',
	gainersLosers : 'rest/secure/angelbroking/marketData/v1/gainersLosers',
	putCallRatio : 'rest/secure/angelbroking/marketData/v1/putCallRatio',
  nseIntraday : 'rest/secure/angelbroking/marketData/v1/nseIntraday',
  bseIntraday : 'rest/secure/angelbroking/marketData/v1/bseIntraday',
	OIBuildup : 'rest/secure/angelbroking/marketData/v1/OIBuildup',
	// "api.token": "/session/token",
	// "api.token.invalidate": "/session/token",
	// "api.token.renew": "/session/refresh_token",

	// "user.margins": "/user/margins",
	// "user.margins.segment": "/user/margins/{segment}",

	// "orders": "/orders",
	// "trades": "/trades",
	// "order.info": "/orders/{order_id}",
	// "order.place": "/orders/{variety}",
	// "order.modify": "/orders/{variety}/{order_id}",
	// "order.cancel": "/orders/{variety}/{order_id}",
	// "order.trades": "/orders/{order_id}/trades",
};
module.exports = {
	ANGEL_API: ANGEL_API
}