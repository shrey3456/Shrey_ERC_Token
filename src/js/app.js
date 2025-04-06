console.log("TruffleContract Loaded:", window.TruffleContract);
App = {
    web3Provider: null,
    contracts: {},
    account: '0x0',
    loading: false,
    tokenPrice: 1000000000000000n, // Using BigInt
    tokensSold: 0n,
    tokensAvailable: 750000n,

    init: async function () {
        console.log("App initialized...");
        return await App.initWeb3();
    },

    initWeb3: async function () {
        try {
            // Modern dapp browsers...
            if (window.ethereum) {
                App.web3Provider = window.ethereum;
                web3 = new Web3(window.ethereum);
                try {
                    // Request account access and set App.account
                    const accounts = await window.ethereum.request({ 
                        method: 'eth_requestAccounts' 
                    });
                    App.account = accounts[0]; // Set the first account
                    console.log('Connected account:', App.account);

                    // Listen for account changes
                    window.ethereum.on('accountsChanged', function (accounts) {
                        App.account = accounts[0];
                        console.log('Account changed to:', App.account);
                        App.render();
                    });

                } catch (error) {
                    console.error("User denied account access");
                    throw error;
                }
            }
            // Legacy dapp browsers...
            else {
                App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
                web3 = new Web3(App.web3Provider);
                
                // Get account for legacy browsers
                const accounts = await web3.eth.getAccounts();
                App.account = accounts[0];
                console.log('Legacy connection account:', App.account);
            }

            // Verify account is set
            if (!App.account || App.account === '0x0') {
                throw new Error('No account detected. Please check MetaMask connection.');
            }

            return App.initContracts();
        } catch (error) {
            console.error("Web3 initialization failed:", error);
            throw error;
        }
    },

    initContracts: async function () {
        if (typeof TruffleContract === "undefined") {
            console.error("TruffleContract is not defined. Make sure to include truffle-contract.min.js in your index.html.");
            return;
        }

        const shreyTokenSale = await $.getJSON("ShreyTokenSale.json");
        App.contracts.ShreyTokenSale = TruffleContract(shreyTokenSale);
        App.contracts.ShreyTokenSale.setProvider(App.web3Provider);

        const shreyTokenSaleInstance = await App.contracts.ShreyTokenSale.deployed();
        console.log("Shrey Token Sale Address:", shreyTokenSaleInstance.address);

        const shreyToken = await $.getJSON("ShreyToken.json");
        App.contracts.ShreyToken = TruffleContract(shreyToken);
        App.contracts.ShreyToken.setProvider(App.web3Provider);

        const shreyTokenInstance = await App.contracts.ShreyToken.deployed();
        console.log("Shrey Token Address:", shreyTokenInstance.address);

        App.listenForEvents();
        return App.render();
    },

    listenForEvents: function () {
        App.contracts.ShreyTokenSale.deployed().then(function (instance) {
            instance.Sell().on("data", function (event) {
                console.log("Event triggered", event);
                App.render();
            }).on("error", console.error);
        });
    },

    render: async function () {
        if (App.loading) return;
        App.loading = true;

        const loader = $('#loader');
        const content = $('#content');

        loader.show();
        content.hide();

        $('#accountAddress').html("Your Account: " + App.account);

        const shreyTokenSaleInstance = await App.contracts.ShreyTokenSale.deployed();
        App.tokenPrice = web3.utils.toBN(await shreyTokenSaleInstance.tokenPrice()); // ✅ Fixed
        $('.token-price').html(web3.utils.fromWei(App.tokenPrice.toString(), "ether"));

        App.tokensSold = web3.utils.toBN(await shreyTokenSaleInstance.tokensSold()).toString(); // ✅ Fixed
        $('.tokens-sold').html(App.tokensSold);

        // ✅ Fixed `tokensAvailable` Calculation
        try {
            const shreyTokenInstance = await App.contracts.ShreyToken.deployed();
            const totalSupply = web3.utils.toBN(await shreyTokenInstance.totalSupply());
            const tokensSold = web3.utils.toBN(await shreyTokenSaleInstance.tokensSold());
            App.tokensAvailable = totalSupply.sub(tokensSold).toString();
            $('.tokens-available').html(App.tokensAvailable);
        } catch (error) {
            console.log("tokensAvailable not defined in contract. Setting manually.");
            App.tokensAvailable = "750000"; // Fallback value
            $('.tokens-available').html(App.tokensAvailable);
        }

        const progressPercent = (parseInt(App.tokensSold) / parseInt(App.tokensAvailable)) * 100;
        $('#progress').css('width', progressPercent + '%');

        const shreyTokenInstance = await App.contracts.ShreyToken.deployed();
        const balance = web3.utils.toBN(await shreyTokenInstance.balanceOf(App.account)).toString();
        $('.shrey-balance').html(balance);

        App.loading = false;
        loader.hide();
        content.show();
    },

    buyTokens: async function () {
        $('#content').hide();
        $('#loader').show();
        
        try {
            // Get and validate input
            const numberOfTokens = $('#numberOfTokens').val();
            if (!numberOfTokens || numberOfTokens <= 0) {
                throw new Error('Please enter a valid number of tokens');
            }

            // Get contract instances
            const saleInstance = await App.contracts.ShreyTokenSale.deployed();
            const tokenInstance = await App.contracts.ShreyToken.deployed();

            // Calculate cost in wei
            const totalCost = web3.utils.toBN(numberOfTokens).mul(App.tokenPrice);

            // Perform pre-transaction checks
            const [saleBalance, buyerBalance, estimatedGas] = await Promise.all([
                tokenInstance.balanceOf(saleInstance.address),
                web3.eth.getBalance(App.account),
                saleInstance.buyTokens.estimateGas(numberOfTokens, {
                    from: App.account,
                    value: totalCost.toString()
                }).catch(() => 500000) // Fallback gas limit if estimation fails
            ]);

            // Verify balances
            if (web3.utils.toBN(saleBalance).lt(web3.utils.toBN(numberOfTokens))) {
                throw new Error('Token sale contract does not have enough tokens');
            }

            if (web3.utils.toBN(buyerBalance).lt(totalCost)) {
                throw new Error('Insufficient ETH balance for purchase');
            }

            // Get current gas price
            const gasPrice = await web3.eth.getGasPrice();
            const gasCost = web3.utils.toBN(gasPrice).mul(web3.utils.toBN(estimatedGas));
            
            // Check if user has enough ETH for gas
            if (web3.utils.toBN(buyerBalance).lt(totalCost.add(gasCost))) {
                throw new Error('Insufficient ETH balance for purchase and gas fees');
            }

            console.log('Transaction Details:', {
                numberOfTokens,
                totalCost: web3.utils.fromWei(totalCost.toString(), 'ether'),
                estimatedGas,
                gasPrice: web3.utils.fromWei(gasPrice, 'gwei') + ' gwei',
                gasCost: web3.utils.fromWei(gasCost.toString(), 'ether')
            });

            // Execute purchase with estimated gas
            const result = await saleInstance.buyTokens(numberOfTokens, {
                from: App.account,
                value: totalCost.toString(),
                gas: Math.floor(estimatedGas * 1.5), // Add 50% buffer to estimated gas
                gasPrice: gasPrice
            });

            console.log("Transaction successful:", result.tx);
            
            // Reset form and update UI
            $('form').trigger('reset');
            await App.render();

        } catch (error) {
            console.error("Error buying tokens:", error);
            let errorMessage = 'Transaction failed. ';
            
            if (error.code === -32603) {
                errorMessage += '\nPlease check:\n';
                errorMessage += '1. You have enough ETH for tokens and gas\n';
                errorMessage += '2. The token sale contract has enough tokens\n';
                errorMessage += '3. MetaMask is connected to the correct network\n';
                errorMessage += '4. The transaction is properly signed';
            } else if (error.message.includes('gas')) {
                errorMessage += 'Transaction requires more gas than provided. Try increasing gas limit.';
            } else {
                errorMessage += error.message;
            }
            
            alert(errorMessage);
        } finally {
            $('#loader').hide();
            $('#content').show();
        }
    },

    checkContractState: async function() {
        try {
            const saleInstance = await App.contracts.ShreyTokenSale.deployed();
            const tokenInstance = await App.contracts.ShreyToken.deployed();
            
            // Check all relevant balances
            const [saleBalance, buyerBalance, ownerBalance] = await Promise.all([
                tokenInstance.balanceOf(saleInstance.address),
                tokenInstance.balanceOf(App.account),
                web3.eth.getBalance(App.account)
            ]);
            
            const state = {
                saleContractBalance: web3.utils.fromWei(saleBalance.toString(), 'ether'),
                buyerTokenBalance: web3.utils.fromWei(buyerBalance.toString(), 'ether'),
                buyerEthBalance: web3.utils.fromWei(ownerBalance, 'ether'),
                tokenPrice: web3.utils.fromWei(App.tokenPrice.toString(), 'ether'),
                saleContractAddress: saleInstance.address,
                buyerAddress: App.account
            };
            
            console.log('Contract State:', state);
            return state;
        } catch (error) {
            console.error('Contract state check failed:', error);
            throw error;
        }
    },

    setupTokenSale: async function() {
        try {
            const tokenInstance = await App.contracts.ShreyToken.deployed();
            const saleInstance = await App.contracts.ShreyTokenSale.deployed();
            
            console.log('Starting token sale setup...');
            
            // Use 75% of available tokens (750,000)
            const tokensForSale = web3.utils.toWei('750000', 'ether');
            
            // Transaction options
            const txOptions = {
                from: '0x5976faf09e10fb7ad94ccfb5708ea551cf3f74e9', // Explicitly use deployer account
                gas: 200000,
                gasPrice: await web3.eth.getGasPrice()
            };
            
            console.log('Transferring tokens to sale contract...');
            const transferTx = await tokenInstance.transfer(
                saleInstance.address,
                tokensForSale,
                txOptions
            );
            
            console.log('Transfer complete:', transferTx.tx);
            
            // Verify the transfer
            const saleBalance = await tokenInstance.balanceOf(saleInstance.address);
            console.log('Sale contract balance:', web3.utils.fromWei(saleBalance.toString(), 'ether'), 'SHREY');
            
            return true;
        } catch (error) {
            console.error('Setup failed:', error);
            alert('Failed to setup token sale: ' + error.message);
            return false;
        }
    },

    setupContractWithTokens: async function() {
        try {
            const tokenInstance = await App.contracts.ShreyToken.deployed();
            const saleInstance = await App.contracts.ShreyTokenSale.deployed();
            
            console.log('Starting setup - checking balances...');
            
            // Use a smaller amount for testing first
            const tokensForSale = '1000000000000000000000'; // 1000 tokens with 18 decimals
            
            // Check current balances
            const ownerBalance = await tokenInstance.balanceOf(App.account);
            console.log('Initial Balances:', {
                owner: web3.utils.fromWei(ownerBalance.toString(), 'ether'),
                account: App.account,
                saleContract: saleInstance.address
            });

            // Transaction options with explicit gas and value settings
            const txOptions = {
                from: App.account,
                gas: 200000,
                gasPrice: await web3.eth.getGasPrice()
            };
            
            try {
                console.log('Attempting transfer...');
                const transferTx = await tokenInstance.transfer(
                    saleInstance.address,
                    tokensForSale,
                    txOptions
                );
                
                // Wait for mining and get receipt
                const receipt = await web3.eth.getTransactionReceipt(transferTx.tx);
                console.log('Transfer receipt:', receipt);
                
                // Verify the transfer
                const finalBalance = await tokenInstance.balanceOf(saleInstance.address);
                console.log('Final sale contract balance:', web3.utils.fromWei(finalBalance.toString(), 'ether'));
                
                if (finalBalance.toString() === '0') {
                    throw new Error('Transfer failed - sale contract balance is still 0');
                }
                
            } catch (txError) {
                console.error('Transfer failed:', txError);
                throw new Error(`Transfer failed: ${txError.message}`);
            }
            
            return true;
            
        } catch (error) {
            console.error('Setup failed:', error);
            alert(`Failed to setup token sale: ${error.message}\n\nMake sure:\n1. You are using the deployer account\n2. You have enough tokens\n3. MetaMask is connected to localhost:7545`);
            return false;
        }
    },

    verifySetup: async function() {
        try {
            const tokenInstance = await App.contracts.ShreyToken.deployed();
            const saleInstance = await App.contracts.ShreyTokenSale.deployed();
            
            console.log('=== Deployment Verification ===');
            
            // 1. Check current account and network
            const networkId = await web3.eth.net.getId();
            const accounts = await web3.eth.getAccounts();
            console.log('Current Network ID:', networkId);
            console.log('Current Account:', App.account);
            console.log('All Available Accounts:', accounts);
            
            // 2. Check if current account is deployer
            const tokenOwner = await tokenInstance.owner();
            const isDeployer = tokenOwner.toLowerCase() === App.account.toLowerCase();
            console.log('Token Owner Address:', tokenOwner);
            console.log('Is Current Account Deployer?', isDeployer);
            
            // 3. Check token balances
            const accountBalance = await tokenInstance.balanceOf(App.account);
            const saleBalance = await tokenInstance.balanceOf(saleInstance.address);
            console.log('Your Token Balance:', accountBalance.toString());
            console.log('Sale Contract Token Balance:', saleBalance.toString());
            
            // 4. Check ETH balance
            const ethBalance = await web3.eth.getBalance(App.account);
            console.log('Your ETH Balance:', web3.utils.fromWei(ethBalance, 'ether'), 'ETH');
            
            // Summary
            console.log('\n=== Setup Status ===');
            console.log('✓ Network:', networkId === 5777 ? 'Connected to localhost:7545' : 'Wrong network!');
            console.log('✓ Deployer:', isDeployer ? 'Using deployer account' : 'Not using deployer account!');
            console.log('✓ Tokens:', accountBalance > 0 ? 'Has tokens' : 'No tokens!');
            console.log('✓ ETH:', ethBalance > web3.utils.toWei('0.1', 'ether') ? 'Sufficient ETH' : 'Low ETH!');
            
            return {
                correctNetwork: networkId === 5777,
                isDeployer,
                hasTokens: accountBalance > 0,
                hasEth: ethBalance > web3.utils.toWei('0.1', 'ether')
            };
            
        } catch (error) {
            console.error('Verification failed:', error);
            return false;
        }
    },

    addTokensToContract: async function(amount) {
        try {
            const tokenInstance = await App.contracts.ShreyToken.deployed();
            const saleInstance = await App.contracts.ShreyTokenSale.deployed();
            
            console.log('Adding tokens to sale contract...');
            const tokensToAdd = web3.utils.toWei(amount.toString(), 'ether');
            
            // Then transfer to sale contract
            await tokenInstance.transfer(
                saleInstance.address,
                tokensToAdd,
                {
                    from: App.account,
                    gas: 200000
                }
            );
            
            await App.checkContractState();
            return true;
        } catch (error) {
            console.error('Failed to add tokens:', error);
            alert('Failed to add tokens: ' + error.message);
            return false;
        }
    },

    checkMetaMaskSetup: async function() {
        try {
            console.log('=== MetaMask Account Verification ===');
            
            // Check if MetaMask is installed
            if (!window.ethereum) {
                throw new Error('MetaMask is not installed!');
            }
            
            // Check if user is connected
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            console.log('Connected accounts:', accounts);
            if (accounts.length === 0) {
                throw new Error('No accounts connected. Please unlock MetaMask and connect an account.');
            }
            
            // Get network details
            const chainId = await window.ethereum.request({ method: 'eth_chainId' });
            const networkId = await web3.eth.net.getId();
            
            // Get account balances
            const ethBalance = await web3.eth.getBalance(accounts[0]);
            const tokenInstance = await App.contracts.ShreyToken.deployed();
            const tokenBalance = await tokenInstance.balanceOf(accounts[0]);
            
            console.log('Account Status:', {
                currentAccount: accounts[0],
                networkId: networkId,
                chainId: chainId,
                ethBalance: web3.utils.fromWei(ethBalance, 'ether') + ' ETH',
                tokenBalance: tokenBalance.toString() + ' SHREY'
            });
            
            // Check if connected to local network
            if (networkId !== 5777) {
                console.warn('Warning: Not connected to local network (Ganache)');
            }

            return true;
        } catch (error) {
            console.error('MetaMask check failed:', error);
            alert('MetaMask check failed: ' + error.message);
            return false;
        }
    },

    transferToSaleContract: async function() {
        try {
            const tokenAddress = '0x6e78Ed57Dc92d429d2e076C06ea806a7fbc2cF49';
            const saleAddress = '0x21c649fa6E6D04C989f18f55b3AC2C5Fb85454FA';
            
            const tokenInstance = await App.contracts.ShreyToken.deployed();
            const saleInstance = await App.contracts.ShreyTokenSale.deployed();
            
            // Verify contract addresses
            if (tokenInstance.address !== tokenAddress || saleInstance.address !== saleAddress) {
                throw new Error('Contract addresses do not match deployment');
            }
            
            // Check current state
            const state = await App.checkContractState();
            console.log('Initial state:', state);
            
            // Amount to transfer (750,000 tokens)
            const tokensToTransfer = web3.utils.toWei('750000', 'ether');
            
            // Transaction options
            const txOptions = {
                from: App.account,
                gas: 200000,
                gasPrice: await web3.eth.getGasPrice()
            };
            
            // Verify token balance before transfer
            const balance = await tokenInstance.balanceOf(App.account);
            console.log('Your token balance:', web3.utils.fromWei(balance.toString(), 'ether'));
            
            if (web3.utils.toBN(balance).lt(web3.utils.toBN(tokensToTransfer))) {
                throw new Error('Insufficient token balance for transfer');
            }
            
            console.log('Transferring tokens to sale contract...');
            const transferTx = await tokenInstance.transfer(
                saleAddress,
                tokensToTransfer,
                txOptions
            );
            
            console.log('Transfer transaction:', transferTx.tx);
            
            // Verify the transfer
            const finalBalance = await tokenInstance.balanceOf(saleAddress);
            console.log('Final sale contract balance:', web3.utils.fromWei(finalBalance.toString(), 'ether'));
            
            return true;
        } catch (error) {
            console.error('Transfer failed:', error);
            alert(`Transfer failed: ${error.message}`);
            return false;
        }
    },

    mintTokens: async function() {
        try {
            const tokenInstance = await App.contracts.ShreyToken.deployed();
            
            // Mint 1 million tokens
            const tokensToMint = web3.utils.toWei('1000000', 'ether');
            
            const txOptions = {
                from: App.account,
                gas: 200000
            };
            
            // Check if contract has mint function
            if (typeof tokenInstance.mint === 'function') {
                await tokenInstance.mint(tokensToMint, txOptions);
            } else {
                throw new Error('Mint function not available - check token contract');
            }
            
            // Verify new balance
            const balance = await tokenInstance.balanceOf(App.account);
            console.log('New balance:', web3.utils.fromWei(balance.toString(), 'ether'));
            
            return true;
        } catch (error) {
            console.error('Minting failed:', error);
            alert('Failed to mint tokens: ' + error.message);
            return false;
        }
    }
};

$(function () {
    $(window).on("load", function () {
        App.init();
    });
});







