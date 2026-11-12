const WebSocket = require('ws');
const { dohLookup } = require('./neonDns');

// WebSocket client for Neon's serverless driver. Uses a DNS-over-HTTPS lookup
// so connections still work when the local resolver refuses *.neon.tech zones.
class NeonWebSocket extends WebSocket {
  constructor(address, protocols, options) {
    let protos = protocols;
    let opts = options;
    if (typeof protocols === 'object' && protocols !== null) {
      opts = protocols;
      protos = undefined;
    }
    super(address, protos === undefined ? [] : protos, { ...(opts || {}), lookup: dohLookup });
  }
}

module.exports = { NeonWebSocket };
