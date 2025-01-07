
class MarketDataFeederV3 {
  // Required enums
  static Mode = Object.freeze({
    LTPC: "ltpc",
    FULL: "full",
    OPTION: "option_greeks"
  });

  static Method = Object.freeze({
    SUBSCRIBE: "sub",
    CHANGE_METHOD: "change_mode",
    UNSUBSCRIBE: "unsub",
  });

  constructor(token, instrumentKeys = [], mode = MarketDataFeederV3.Mode.FULL) {
    this.ws = null;
    this.instrumentKeys = instrumentKeys;
    this.mode = mode;
    this.token = token;
    this.userClosedWebSocket = false;
    this.closingCode = -1;
    this.protobufRoot = null;

    // Use CDN or browser-compatible protobuf library
    this.initProtobuf();
  }

  async connect() {
    // Skip if already connected
    if (
      this.ws &&
      (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)
    )
      return;

    this.ws = await this.connectWebSocket(
      `wss://api.upstox.com/v3/feed/market-data-feed`
    );

    this.ws.onopen = () => this.onOpen();
    this.ws.onmessage = (event) => this.onMessage(event);
    this.ws.onclose = (event) => this.onClose(event);
    this.ws.onerror = (error) => this.onError(error);
  }

  connectWebSocket(wsUrl) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl);
        ws.onopen = () => {
          ws.send(JSON.stringify({
            type: 'authorize',
            data: { token: this.token }
          }));
          resolve(ws);
        };
      ws.onerror = (error) => {console.log(error) 
        reject(error);
      }
    });
  }

  onOpen() {
    console.log('WebSocket connection opened');
  }

  onMessage(event) {
    try {
      // Assuming browser-compatible protobuf decoding
      const decodedData = this.decodeProtobuf(event.data);
      console.log('Decoded message:', decodedData);
    } catch (error) {
      console.error('Error decoding message:', error);
    }
  }

  onClose(event) {
    this.closingCode = event.code;
    if (event.code === 1000) {
      this.userClosedWebSocket = true;
    }
    console.log('WebSocket connection closed');
  }

  onError(error) {
    console.error('WebSocket error:', error);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close(1000);
    }
  }

  subscribe(instrumentKeys, mode) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        this.buildRequest(instrumentKeys, MarketDataFeederV3.Method.SUBSCRIBE, mode)
      );
    } else {
      throw new Error("Failed to subscribe: WebSocket is not open.");
    }
  }

  unsubscribe(instrumentKeys) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        this.buildRequest(instrumentKeys, MarketDataFeederV3.Method.UNSUBSCRIBE)
      );
    }
  }

  changeMode(instrumentKeys, newMode) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        this.buildRequest(instrumentKeys, MarketDataFeederV3.Method.SUBSCRIBE, newMode)
      );
    } else {
      throw new Error("Failed to changeMode: WebSocket is not open.");
    }
  }

  // Simplified protobuf initialization for browser
  async initProtobuf() {
    // In browser, you might want to load protobuf.js from a CDN
    // Example: https://unpkg.com/protobufjs@6.11.2/dist/protobuf.min.js
    if (typeof protobuf !== 'undefined') {
      try {
        // Assuming protobuf is loaded globally
        const root = protobuf.loadSync('./proto/MarketDataFeedV3.proto');
        this.protobufRoot = root;
      } catch (error) {
        console.error('Error loading proto file:', error);
      }
    }
  }

  decodeProtobuf(buffer) {
    if (!this.protobufRoot) {
      console.warn("Protobuf not initialized!");
      return null;
    }

    const FeedResponse = this.protobufRoot.lookupType(
      "plugin.rpc.proto.FeedResponse"
    );
    return FeedResponse.decode(buffer);
  }

  buildRequest(instrumentKeys, method, mode) {
    const requestObj = {
      guid: this.generateUUID(),
      method,
      data: {
        instrumentKeys,
      },
    };

    if (mode !== undefined) {
      requestObj.data.mode = mode;
    }

    return JSON.stringify(requestObj);
  }

  // Simple UUID generation for browser
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

export { MarketDataFeederV3 };

