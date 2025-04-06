pragma solidity ^0.4.2;

import "./ShreyToken.sol";

contract ShreyTokenSale {
    address admin;
    ShreyToken public tokenContract;
    uint256 public tokenPrice;
    uint256 public tokensSold;

    event Sell(address _buyer, uint256 _amount);

    function multiply(uint x, uint y) internal pure returns (uint z) {
        require(y == 0 || (z = x * y) / y == x);
    }

    function ShreyTokenSale(ShreyToken _tokenContract, uint256 _tokenPrice) public {
        admin = msg.sender;
        tokenContract = _tokenContract;
        tokenPrice = _tokenPrice;
    }

    function buyTokens(uint256 _numberOfTokens) public payable {
        require(msg.value == multiply(_numberOfTokens, tokenPrice));
        require(tokenContract.balanceOf(this) >= _numberOfTokens);
        require(tokenContract.transfer(msg.sender, _numberOfTokens));

        tokensSold += _numberOfTokens;

        Sell(msg.sender, _numberOfTokens);
    }

    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }

    function endSale() public onlyAdmin {
        // Transfer remaining tokens back to admin
        require(tokenContract.transfer(admin, tokenContract.balanceOf(address(this))));
        
        // Transfer ETH balance to admin and destroy contract
        selfdestruct(admin);
    }
}