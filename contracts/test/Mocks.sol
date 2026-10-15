// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockChog is ERC20 {
    constructor() ERC20("Chog", "CHOG") {}

    function mint(address to, uint256 a) external {
        _mint(to, a);
    }

    function burn(uint256 a) external {
        _burn(msg.sender, a);
    }
}

contract MockWMON is ERC20 {
    constructor() ERC20("Wrapped MON", "WMON") {}

    function deposit() external payable {
        _mint(msg.sender, msg.value);
    }
}

interface ICallback {
    function uniswapV3SwapCallback(int256 a0, int256 a1, bytes calldata d) external;
}

/// Scripted V3 pool: mints `chogOut` to the recipient, then calls back asking for `wmonOwed` (token order configurable).
contract MockPool {
    address public token0;
    address public token1;
    MockChog public chog;
    uint256 public chogOut;
    uint256 public wmonOwed;
    uint24 public fee = 10000;
    bool public lastZeroForOne;
    uint160 public lastLimit;
    int256 public lastAmount;

    constructor(address t0, address t1, MockChog c) {
        token0 = t0;
        token1 = t1;
        chog = c;
    }

    function script(uint256 out, uint256 owed) external {
        chogOut = out;
        wmonOwed = owed;
    }

    function swap(address recipient, bool zeroForOne, int256 amount, uint160 limit, bytes calldata)
        external
        returns (int256 a0, int256 a1)
    {
        lastZeroForOne = zeroForOne;
        lastLimit = limit;
        lastAmount = amount;
        address wm = zeroForOne ? token0 : token1;
        uint256 before = ERC20(wm).balanceOf(address(this));
        chog.mint(recipient, chogOut);
        a0 = zeroForOne ? int256(wmonOwed) : -int256(chogOut);
        a1 = zeroForOne ? -int256(chogOut) : int256(wmonOwed);
        ICallback(msg.sender).uniswapV3SwapCallback(a0, a1, "");
        require(ERC20(wm).balanceOf(address(this)) >= before + wmonOwed, "IIA");
    }
}

contract MockFactory {
    address public p;

    constructor(address p_) {
        p = p_;
    }

    function getPool(address, address, uint24) external view returns (address) {
        return p;
    }
}
