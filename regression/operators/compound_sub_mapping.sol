contract C
{
	mapping (uint => uint) map;
	function f(uint x, uint p) public {
		require(x < 100);
		map[p] = 200;
		map[p] -= map[p] - x;
		assert(map[p] >= 0);
		assert(map[p] < 90);
	}
}
// ====
// SMTEngine: all
// SMTIgnoreCex: yes
// ----
// Warning 6328: (164-183): CHC: Assertion violation happens here.
