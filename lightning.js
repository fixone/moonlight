const config = require('./config')
const lnPath = config.lnPath || process.env.LN_PATH || require('path').join(require('os').homedir(), '.lightning')
const LightningClient = require('lightning-client')
const lnClient = new LightningClient(lnPath)
lnClient.client.on('connect',_=>console.log("connected to RPC socket"))

exports.client = lnClient