// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ChogShop} from "../src/ChogShop.sol";

/// Mainnet fork check of both payment paths against the real $CHOG token and the Capricorn pool. Sends nothing.
/// Run: forge test --match-contract ForkTest --fork-url https://rpc.monad.xyz   (skipped without a fork)
contract ForkTest is Test {
    address constant CHOG = 0x350035555E10d9AfAF1566AaebfCeD5BA6C27777;
    address constant WMON = 0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A;
    address constant POOL = 0x116e7D070f1888B81E1E0324F56d6746B2D7d8f1;
    address constant FACTORY = 0x6B5F564339DbAD6b780249827f2198a841FEB7F3;
    address constant TEAM = 0xb36Dd9f235eF6a5DC3B193C493D2Ce2b7874454F;

    ChogShop shop;
    address buyer = address(0xB0B);

    function setUp() public {
        if (block.chainid != 143) return;
        shop = new ChogShop(CHOG, TEAM, "", address(this));
        shop.setPool(POOL, WMON, FACTORY, 10000);
        shop.setItem(1, 500 ether, true, 0, 0);
    }

    function testMonPathBurnsAndPays() public {
        if (block.chainid != 143) return;
        uint256 supply0 = IERC20(CHOG).totalSupply();
        uint256 team0 = IERC20(CHOG).balanceOf(TEAM);
        vm.deal(buyer, 300 ether);
        vm.prank(buyer);
        shop.buyWithMon{value: 60 ether}(1, 1, 500 ether, block.timestamp + 60);
        assertEq(shop.balanceOf(buyer, 1), 1);
        assertEq(IERC20(CHOG).balanceOf(TEAM) - team0, 50 ether);
        assertEq(supply0 - IERC20(CHOG).totalSupply(), 450 ether);
        assertEq(IERC20(CHOG).balanceOf(address(shop)), 0);
    }

    function testChogPathBurnsAndPays() public {
        if (block.chainid != 143) return;
        vm.deal(buyer, 300 ether);
        vm.prank(buyer);
        shop.buyWithMon{value: 120 ether}(1, 1, 500 ether, block.timestamp + 60); // the refund leaves the buyer holding $CHOG
        uint256 bal = IERC20(CHOG).balanceOf(buyer);
        assertGt(bal, 500 ether);
        uint256 supply0 = IERC20(CHOG).totalSupply();
        vm.startPrank(buyer);
        IERC20(CHOG).approve(address(shop), 500 ether);
        shop.buyWithChog(1, 1);
        vm.stopPrank();
        assertEq(shop.balanceOf(buyer, 1), 2);
        assertEq(supply0 - IERC20(CHOG).totalSupply(), 450 ether);
    }
}
