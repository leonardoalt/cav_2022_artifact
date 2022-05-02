contract BinaryMachine {
	uint x = 0;

	function setOne() public {
		x = 1;
	}

	function setZero() public {
		x = 0;
	}

	function invariant() public view {
		assert(x <= 2);
	}
}
