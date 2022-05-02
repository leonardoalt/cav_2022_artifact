contract Smoke {
	function f(uint x) public pure {
		assert(x >= 0);
	}
}
