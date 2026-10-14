// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ChogShop} from "../src/ChogShop.sol";
import {MockChog, MockWMON, MockRouter} from "./Mocks.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract ChogShopTest is Test {
    MockChog chog;
    MockWMON wmon;
    MockRouter router;
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
        router = new MockRouter(chog, 1000, 1); // 1 MON -> 1000 CHOG
        shop = new ChogShop(address(chog), team, "https://x/{id}.json", admin);
        vm.startPrank(admin);
        shop.setItem(1, P, true, 0, 0);
        shop.setItem(2, 3 ether + 7, true, 3, 2); // odd price for dust, max 2 per wallet
        shop.setRouter(address(router), address(wmon), 10000);
        vm.stopPrank();
        chog.mint(bob, START);
        vm.prank(bob);
        chog.approve(address(shop), type(uint256).max);
        vm.deal(bob, 100 ether);
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

    function test_mon_path_refund() public {
        // 2 x 500 = 1000 CHOG; 1.5 MON gives 1500 CHOG; 500 refunded
        uint256 balBefore = chog.balanceOf(bob);
        vm.prank(bob);
        shop.buyWithMon{value: 1.5 ether}(1, 2, 1000 ether, block.timestamp + 60);
        assertEq(shop.balanceOf(bob, 1), 2);
        assertEq(chog.balanceOf(bob) - balBefore, 500 ether);
        assertEq(chog.balanceOf(team), 100 ether);
        assertEq(chog.totalSupply(), START + 1500 ether - 900 ether);
        assertEq(chog.balanceOf(address(shop)), 0);
        assertEq(address(shop).balance, 0);
    }

    function test_mon_slippage_reverts() public {
        vm.prank(bob);
        vm.expectRevert(); // 0.4 MON = 400 CHOG < price 500
        shop.buyWithMon{value: 0.4 ether}(1, 1, 0, block.timestamp + 60);
        vm.prank(bob);
        vm.expectRevert(); // below the buyer's own minChogOut
        shop.buyWithMon{value: 1 ether}(1, 1, 1001 ether, block.timestamp + 60);
        router.setRate(400, 1); // price moved against the buyer after the quote
        vm.prank(bob);
        vm.expectRevert();
        shop.buyWithMon{value: 1 ether}(1, 1, 500 ether, block.timestamp + 60);
    }

    function test_mon_deadline_and_no_router() public {
        vm.prank(bob);
        vm.expectRevert(ChogShop.Expired.selector);
        shop.buyWithMon{value: 1 ether}(1, 1, 0, block.timestamp - 1);
        vm.prank(admin);
        shop.setRouter(address(0), address(0), 0);
        vm.prank(bob);
        vm.expectRevert(ChogShop.NoRouter.selector);
        shop.buyWithMon{value: 1 ether}(1, 1, 0, block.timestamp + 60);
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
