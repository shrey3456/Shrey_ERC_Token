pragma solidity ^0.4.2;

contract ShreyToken {

    string public name= "SHrey Token";
    string public symbol="SHREY";
    string public standard ="SHrey Token v1.0";
    uint256 public totalSupply;

     event Transfer(
        address indexed _from,
        address indexed _to,
        uint256 _value
    );

    event Approval(
        address indexed _owner,
        address indexed _spender,
        uint256 _value
    );

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    
    function ShreyToken(uint256 _initialSupply)public{
        balanceOf[msg.sender] = _initialSupply;
        totalSupply = _initialSupply;
        //allocate inital supply

    }
    //Transfer
    //Exception if account doesn't have enough
        function transfer(address _to, uint256 _value) public returns (bool success) {
        require(balanceOf[msg.sender] >= _value);

        balanceOf[msg.sender] -= _value;
        balanceOf[_to] += _value;

        Transfer(msg.sender, _to, _value);

        return true;
    }

       function approve(address _spender, uint256 _value) public returns (bool success) {
        
        allowance[msg.sender][_spender] = _value;

        Approval(msg.sender, _spender, _value);

        return true;
    }

    function transferFrom(address _from, address _to, uint256 _value) public returns (bool success) {
        require(_value <= balanceOf[_from]);
        require(_value <= allowance[_from][msg.sender]);

        balanceOf[_from] -= _value;
        balanceOf[_to] += _value;

        allowance[_from][msg.sender] -= _value;

        Transfer(_from, _to, _value);

        return true;
    }

    // Add new functions for token management
    function mint(uint256 _amount) public returns (bool) {
        balanceOf[msg.sender] += _amount;
        totalSupply += _amount;
        Transfer(0x0, msg.sender, _amount);
        return true;
    }

    function addTokensToSale(address _saleContract, uint256 _amount) public returns (bool) {
        require(balanceOf[msg.sender] >= _amount);
        
        // Transfer tokens to sale contract
        balanceOf[msg.sender] -= _amount;
        balanceOf[_saleContract] += _amount;
        Transfer(msg.sender, _saleContract, _amount);
        return true;
    }

}

