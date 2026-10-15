// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ChogShop} from "../src/ChogShop.sol";

/// Deploys ChogShop to Monad mainnet and loads contracts/items.json.
/// Env: CHOG_TOKEN, TEAM (required); ADMIN, POOL, WMON, FACTORY, POOL_FEE, CAP_TOTAL, CAP_WALLET, ITEM_URI (optional).
/// Never put a private key in a file: pass --interactive, --ledger or --private-key on the command line.
contract Deploy is Script {
    // Field order must be alphabetical: forge decodes JSON objects by sorted key.
    struct JItem {
        bool active;
        uint256 id;
        string kind;
        uint256 maxPerWallet;
        uint256 minTier;
        string name;
        uint256 priceChog;
    }

    function run() external {
        address chog = vm.envAddress("CHOG_TOKEN");
        address team = vm.envAddress("TEAM");
        address admin = vm.envOr("ADMIN", address(0));
        // MON path: swap directly against the Capricorn V3 CHOG/WMON 1 % pool (verified on chain 2026-10-15). POOL=0x0000...0000 skips it.
        address pool = vm.envOr("POOL", address(0x116e7D070f1888B81E1E0324F56d6746B2D7d8f1));
        address wmon = vm.envOr("WMON", address(0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A));
        address factory = vm.envOr("FACTORY", address(0x6B5F564339DbAD6b780249827f2198a841FEB7F3));
        uint256 poolFee = vm.envOr("POOL_FEE", uint256(10000));
        uint256 capTotal = vm.envOr("CAP_TOTAL", uint256(2_000_000)); // whole CHOG per UTC day
        uint256 capWallet = vm.envOr("CAP_WALLET", uint256(20_000)); // whole CHOG per wallet per day
        string memory uri = vm.envOr("ITEM_URI", string("https://chog.town/items/{id}.json"));

        string memory json = vm.readFile("items.json");
        bytes memory raw = vm.parseJson(json, ".items");
        JItem[] memory list = abi.decode(raw, (JItem[]));

        require(block.chainid == 143, "not Monad mainnet");

        vm.startBroadcast();
        address deployer = msg.sender;
        ChogShop shop = new ChogShop(chog, team, uri, deployer);
        for (uint256 i; i < list.length; ++i) {
            JItem memory it = list[i];
            shop.setItem(it.id, it.priceChog * 1e18, it.active, uint8(it.minTier), uint32(it.maxPerWallet));
        }
        shop.setCaps(capTotal * 1e18, capWallet * 1e18);
        if (pool != address(0)) {
            shop.setPool(pool, wmon, factory, uint24(poolFee)); // reverts if the pool tokens are not {WMON, CHOG} or the factory disagrees
        }
        if (admin != address(0) && admin != deployer) {
            shop.transferOwnership(admin); // admin must call acceptOwnership()
        }
        vm.stopBroadcast();

        console.log("ChogShop:", address(shop));
        console.log("items loaded:", list.length);
    }
}
