const Web3 = require("web3");
let web3;
const provider = new Web3.providers.HttpProvider("https://polygon-rpc.com/"); //mainnet
// const provider = new Web3.providers.HttpProvider(
//   "https://rpc-mumbai.matic.today"
// ); //testnet
web3 = new Web3(provider);

module.exports = web3;
