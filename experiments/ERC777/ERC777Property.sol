import "./contracts/token/ERC777/ERC777.sol";

contract ERC777Property is ERC777 {
	constructor(
		address[] memory defaultOperators_,
		uint amt_
	) ERC777("ERC777", "E7", defaultOperators_) {
		_mint(msg.sender, amt_, "", "");	
	}

	function transfer(address recipient, uint256 amount) public override returns (bool) {
		uint prevSupply = totalSupply();
		bool result = ERC777.transfer(recipient, amount);
		uint postSupply = totalSupply();

		assert(prevSupply == postSupply);

		return result;
	}
}
