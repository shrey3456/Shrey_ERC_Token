var ShreyTokenSale = artifacts.require('./ShreyTokenSale.sol');
var ShreyToken = artifacts.require('./ShreyToken.sol');

contract('ShreyTokenSale', function(accounts) {
    var tokenSaleInstance;
    var tokenInstance;
    var admin = accounts[0];
    var buyer = accounts[1];
    var tokenPrice = 1000000000000000; // in wei
    var tokensAvailable = 750000;
    var numberOfTokens;

    it('initializes the contract with the correct values', function() {
        return ShreyTokenSale.deployed().then(function(instance) {
            tokenSaleInstance = instance;
            return tokenSaleInstance.address;
        }).then(function(address) {
            assert.notEqual(address, 0x0, 'has contract address');
            return tokenSaleInstance.tokenContract();
        }).then(function(address) {
            assert.notEqual(address, 0x0, 'has token contract address');
            return tokenSaleInstance.tokenPrice();
        }).then(function(price) {
            assert.equal(price, tokenPrice, 'token price is correct');
        });
    });

    it('facilitates token buying', function() {
        return ShreyToken.deployed().then(function(instance) {
            // Grab token instance first
            tokenInstance = instance;
            return ShreyTokenSale.deployed();
        }).then(function(instance) {
            // Then grab token sale instance;
            tokenSaleInstance = instance;
            // Provision 75% of all tokens to the token sale
            return tokenInstance.transfer(tokenSaleInstance.address, tokensAvailable, { from: admin });
        }).then(function(receipt) {
            numberOfTokens = 10;
            return tokenSaleInstance.buyTokens(numberOfTokens, { from: buyer, value: numberOfTokens * tokenPrice });
        }).then(function(receipt) {
            assert.equal(receipt.logs.length, 1, 'triggers one event');
            assert.equal(receipt.logs[0].event, 'Sell', 'should be the "Sell" event');
            assert.equal(receipt.logs[0].args._buyer, buyer, 'logs the account that purchased the tokens');
            assert.equal(receipt.logs[0].args._amount, numberOfTokens, 'logs the number of tokens purchased');
            return tokenSaleInstance.tokensSold();
        }).then(function(amount) {
            assert.equal(amount.toNumber(), numberOfTokens, 'increments the number of tokens sold');
            return tokenInstance.balanceOf(buyer);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), numberOfTokens);
            return tokenInstance.balanceOf(tokenSaleInstance.address);
        }).then(function(balance) {
            assert.equal(balance.toNumber(), tokensAvailable - numberOfTokens);
            // Try to buy tokens different from the ether value
            return tokenSaleInstance.buyTokens(numberOfTokens, { from: buyer, value: 1 });
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, 'msg.value must equal number of tokens in wei');
            return tokenSaleInstance.buyTokens(800000, { from: buyer, value: numberOfTokens * tokenPrice });
        }).then(assert.fail).catch(function(error) {
            assert(error.message.indexOf('revert') >= 0, 'cannot purchase more tokens than available');
        });
    });

    it('ends token sale', async function() {
        try {
            // Get instances
            tokenInstance = await ShreyToken.deployed();
            tokenSaleInstance = await ShreyTokenSale.deployed();
            
            // Try to end sale from account other than admin
            try {
                await tokenSaleInstance.endSale({ from: buyer });
                assert.fail('Non-admin was able to end sale');
            } catch (error) {
                assert(error.message.indexOf('revert') >= 0, 'must be admin to end sale');
            }

            // End sale as admin
            const receipt = await tokenSaleInstance.endSale({ 
                from: admin,
                gas: 1000000 // Increase gas limit for contract destruction
            });
            
            // Verify admin received tokens back
            const adminBalance = await tokenInstance.balanceOf(admin);
            assert.equal(
                adminBalance.toNumber(), 
                999990, 
                'returns all unsold ShreyToken to admin'
            );

            // Check contract balance is 0
            const contractBalance = await tokenInstance.balanceOf(tokenSaleInstance.address);
            assert.equal(
                contractBalance.toNumber(),
                0,
                'token sale contract has no balance'
            );

            // Check if contract was destroyed
            const code = await web3.eth.getCode(tokenSaleInstance.address);
            assert(
                code === '0x' || code === '0x0', 
                'token sale contract should be destroyed'
            );

        } catch (error) {
            console.error('Test failed:', error);
            throw error;
        }
    });

});
