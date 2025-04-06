var ShreyToken = artifacts.require("./ShreyToken.sol");

var ShreyTokenSale = artifacts.require("./ShreyTokenSale.sol");
module.exports = function(deployer) {
  deployer.deploy(ShreyToken, 1000000).then(function() {
    // Token price is 0.001 Ether
    var tokenPrice = 1000000000000000;
    return deployer.deploy(ShreyTokenSale, ShreyToken.address, tokenPrice);
  });
};