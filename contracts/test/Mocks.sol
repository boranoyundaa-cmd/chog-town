// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ISwapRouterV3} from "../src/ChogShop.sol";

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

/// Fixed rate router: out = in * rateNum / rateDen. Mints the output.
contract MockRouter {
    MockChog public chog;
    uint256 public rateNum;
    uint256 public rateDen;

    constructor(MockChog c, uint256 n, uint256 d) {
        chog = c;
        rateNum = n;
        rateDen = d;
    }

    function setRate(uint256 n, uint256 d) external {
        rateNum = n;
        rateDen = d;
    }

    function exactInputSingle(ISwapRouterV3.ExactInputSingleParams calldata p) external payable returns (uint256 out) {
        out = p.amountIn * rateNum / rateDen;
        require(out >= p.amountOutMinimum, "Too little received");
        ERC20(p.tokenIn).transferFrom(msg.sender, address(this), p.amountIn);
        chog.mint(p.recipient, out);
    }
}
