const web3 = require("./web3");
const Verify = require("./Verify.json");
const verify = new web3.eth.Contract(
  Verify.abi,
  "0xE1c63cB3D7DAAe0B6237CF08FC18832BC9FE270D" //mainnet new
  // "0x7ea41757c5a858C458d3C317A05040c558F1d7b4" //testnet
);

module.exports = verify;
