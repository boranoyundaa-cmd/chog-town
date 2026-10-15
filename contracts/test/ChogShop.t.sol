// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ChogShop} from "../src/ChogShop.sol";
import {MockChog, MockWMON, MockPool, MockFactory} from "./Mocks.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ChogShopTest is Test {
    MockChog chog;
    MockWMON wmon;
    MockPool pool;
    ChogShop shop;
    address admin = address(0xA11CE);
    address team = address(0x7EA4);
    address bob = address(0xB0B);
    address carol = address(0xCA201);
    uint256 constant P = 500 ether;
    uint256 constant START = 1_000_000 ether;

    function setUp() public {
        chog = new MockChog();
        wmon = new MockWMON();
        shop = new ChogShop(address(chog), team, "https://x/{id}.json", admin);
        vm.startPrank(admin);
        shop.setItem(1, P, true, 0, 0);
        shop.setItem(2, 3 ether + 7, true, 3, 2); // odd price for dust, max 2 per wallet
        vm.stopPrank();
        chog.mint(bob, START);
        vm.prank(bob);
        chog.approve(address(shop), type(uint256).max);
        vm.deal(bob, 100 ether);
        _usePool(true);
    }

    /// Deploys a scripted pool in the given token order and points the shop at it. Default script: 1 MON -> 1000 CHOG.
    function _usePool(bool wmonFirst) internal {
        pool = wmonFirst ? new MockPool(address(wmon), address(chog), chog) : new MockPool(address(chog), address(wmon), chog);
        address f = address(new MockFactory(address(pool)));
        vm.prank(admin);
        shop.setPool(address(pool), address(wmon), f, 10000);
    }

    function _buy(uint256 mon, uint256 minOut) internal {
        vm.prank(bob);
        shop.buyWithMon{value: mon}(1, 2, minOut, block.timestamp + 60);
    }

    function test_buyWithChog_split() public {
        vm.prank(bob);
        shop.buyWithChog(1, 3);
        assertEq(shop.balanceOf(bob, 1), 3);
        assertEq(chog.balanceOf(team), 150 ether);
        assertEq(START - chog.totalSupply(), 1350 ether);
        assertEq(chog.balanceOf(address(shop)), 0);
    }

    function test_split_dust_goes_to_burn() public {
        uint256 cost = 3 ether + 7;
        vm.prank(bob);
        shop.buyWithChog(2, 1);
        uint256 toTeam = cost * 1000 / 10000;
        assertEq(chog.balanceOf(team), toTeam);
        assertEq(chog.balanceOf(address(shop)), 0);
        assertEq(START - chog.totalSupply(), cost - toTeam);
    }

    function test_soulbound() public {
        vm.startPrank(bob);
        shop.buyWithChog(1, 1);
        vm.expectRevert(ChogShop.Soulbound.selector);
        shop.safeTransferFrom(bob, carol, 1, 1, "");
        uint256[] memory ids = new uint256[](1);
        ids[0] = 1;
        uint256[] memory v = new uint256[](1);
        v[0] = 1;
        vm.expectRevert(ChogShop.Soulbound.selector);
        shop.safeBatchTransferFrom(bob, carol, ids, v, "");
        vm.stopPrank();
    }

    function test_inactive_qty_and_wallet_limit() public {
        vm.startPrank(bob);
        vm.expectRevert(ChogShop.ItemInactive.selector);
        shop.buyWithChog(99, 1);
        vm.expectRevert(ChogShop.BadQty.selector);
        shop.buyWithChog(1, 0);
        shop.buyWithChog(2, 2);
        vm.expectRevert(ChogShop.WalletLimit.selector);
        shop.buyWithChog(2, 1);
        vm.stopPrank();
        vm.prank(admin);
        shop.setItem(1, P, false, 0, 0);
        vm.prank(bob);
        vm.expectRevert(ChogShop.ItemInactive.selector);
        shop.buyWithChog(1, 1);
    }

    function test_daily_caps() public {
        vm.prank(admin);
        shop.setCaps(2 * P, 1 * P);
        vm.startPrank(bob);
        shop.buyWithChog(1, 1);
        vm.expectRevert(ChogShop.DailyCapWallet.selector);
        shop.buyWithChog(1, 1);
        vm.stopPrank();
        chog.mint(carol, 10_000 ether);
        vm.startPrank(carol);
        chog.approve(address(shop), type(uint256).max);
        shop.buyWithChog(1, 1);
        vm.stopPrank();
        address dave = address(0xDA7E);
        chog.mint(dave, 10_000 ether);
        vm.startPrank(dave);
        chog.approve(address(shop), type(uint256).max);
        vm.expectRevert(ChogShop.DailyCapTotal.selector);
        shop.buyWithChog(1, 1);
        vm.stopPrank();
        vm.warp(block.timestamp + 1 days);
        vm.prank(bob);
        shop.buyWithChog(1, 1);
    }

    function test_pause() public {
        vm.prank(admin);
        shop.pause();
        vm.startPrank(bob);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        shop.buyWithChog(1, 1);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        shop.tip(carol, 1, 1 ether);
        vm.stopPrank();
        vm.prank(admin);
        shop.unpause();
        vm.prank(bob);
        shop.buyWithChog(1, 1);
    }

    function test_onlyOwner() public {
        vm.prank(bob);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, bob));
        shop.setItem(5, 1, true, 0, 0);
    }

    function test_ownable2step() public {
        vm.prank(admin);
        shop.transferOwnership(carol);
        assertEq(shop.owner(), admin);
        vm.prank(carol);
        shop.acceptOwnership();
        assertEq(shop.owner(), carol);
    }

    function _checkFill(bool wmonFirst) internal {
        _usePool(wmonFirst);
        pool.script(1500 ether, 1.5 ether); // 2 x 500 = 1000 CHOG; 1.5 MON gives 1500 CHOG; 500 refunded
        uint256 balBefore = chog.balanceOf(bob);
        _buy(1.5 ether, 1000 ether);
        assertEq(shop.balanceOf(bob, 1), 2);
        assertEq(chog.balanceOf(bob) - balBefore, 500 ether);
        assertEq(chog.balanceOf(team), 100 ether);
        assertEq(chog.totalSupply(), START + 1500 ether - 900 ether);
        assertEq(chog.balanceOf(address(shop)), 0);
        assertEq(wmon.balanceOf(address(shop)), 0);
        assertEq(wmon.balanceOf(address(pool)), 1.5 ether);
        assertEq(address(shop).balance, 0);
        assertEq(pool.lastZeroForOne(), wmonFirst);
        assertEq(pool.lastAmount(), 1.5 ether);
        assertEq(uint256(pool.lastLimit()), wmonFirst ? 4295128740 : 1461446703485210103287273052203988822378723970341);
    }

    function test_mon_fill_wmon_token0() public {
        _checkFill(true);
    }

    function test_mon_fill_wmon_token1() public {
        _checkFill(false);
    }

    function test_mon_slippage_reverts() public {
        pool.script(400 ether, 1 ether); // below the price of 1000
        vm.expectRevert(ChogShop.Slippage.selector);
        _buy(1 ether, 0);
        pool.script(1500 ether, 1 ether);
        vm.expectRevert(ChogShop.Slippage.selector); // below the buyer's own minChogOut
        _buy(1 ether, 1501 ether);
    }

    function test_mon_callback_wrong_sender_reverts() public {
        vm.prank(bob);
        vm.expectRevert(ChogShop.BadCallback.selector);
        shop.uniswapV3SwapCallback(1 ether, -1 ether, "");
    }

    function test_mon_callback_outside_swap_reverts() public {
        vm.prank(address(pool));
        vm.expectRevert(ChogShop.BadCallback.selector);
        shop.uniswapV3SwapCallback(1 ether, -1 ether, "");
    }

    function test_mon_pool_overcharge_reverts() public {
        pool.script(2000 ether, 1.2 ether); // asks for more WMON than the buyer sent
        vm.expectRevert(ChogShop.Overcharged.selector);
        _buy(1 ether, 0);
        assertEq(wmon.balanceOf(address(pool)), 0);
    }

    function test_mon_partial_fill_refunds_wmon() public {
        pool.script(1000 ether, 0.6 ether); // price limit hit: only 0.6 of 1 MON taken, exactly the price paid out
        _buy(1 ether, 1000 ether);
        assertEq(wmon.balanceOf(bob), 0.4 ether);
        assertEq(wmon.balanceOf(address(shop)), 0);
        assertEq(chog.balanceOf(address(shop)), 0);
        assertEq(shop.balanceOf(bob, 1), 2);
    }

    function test_mon_deadline_and_disabled() public {
        pool.script(1000 ether, 1 ether);
        vm.prank(bob);
        vm.expectRevert(ChogShop.Expired.selector);
        shop.buyWithMon{value: 1 ether}(1, 1, 0, block.timestamp - 1);
        vm.prank(admin);
        shop.setPool(address(0), address(0), address(0), 0);
        assertEq(shop.pool(), address(0));
        vm.prank(bob);
        vm.expectRevert(ChogShop.NoPool.selector);
        shop.buyWithMon{value: 1 ether}(1, 1, 0, block.timestamp + 60);
        // a callback from the old pool is dead too
        vm.prank(address(pool));
        vm.expectRevert(ChogShop.BadCallback.selector);
        shop.uniswapV3SwapCallback(1 ether, -1 ether, "");
    }

    function test_setPool_validation() public {
        MockChog other = new MockChog();
        MockPool bad = new MockPool(address(wmon), address(other), other);
        address fBad = address(new MockFactory(address(bad)));
        vm.startPrank(admin);
        vm.expectRevert(ChogShop.BadPool.selector);
        shop.setPool(address(bad), address(wmon), address(0), 10000);
        vm.expectRevert(ChogShop.BadPool.selector); // factory says a different pool
        shop.setPool(address(pool), address(wmon), fBad, 10000);
        vm.stopPrank();
        vm.prank(bob);
        vm.expectRevert();
        shop.setPool(address(pool), address(wmon), address(0), 10000);
    }

    function test_tip() public {
        vm.startPrank(bob);
        vm.expectEmit(true, true, true, true);
        emit ChogShop.Tip(bob, carol, 42, 10 ether);
        shop.tip(carol, 42, 10 ether);
        assertEq(chog.balanceOf(carol), 10 ether);
        vm.expectRevert(ChogShop.BadAmount.selector);
        shop.tip(carol, 42, 0);
        vm.stopPrank();
    }

    function test_rescue() public {
        chog.mint(address(shop), 5 ether);
        vm.prank(admin);
        shop.rescueToken(address(chog), admin, 5 ether);
        assertEq(chog.balanceOf(admin), 5 ether);
        vm.prank(bob);
        vm.expectRevert();
        shop.rescueToken(address(chog), bob, 1);
    }

    function test_setURI() public {
        vm.prank(admin);
        shop.setURI("ipfs://new/{id}.json");
        assertEq(shop.uri(1), "ipfs://new/{id}.json");
    }
}
