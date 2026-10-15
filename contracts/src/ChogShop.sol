// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable, Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IBurnable {
    function burn(uint256 amount) external;
}

interface IWMON {
    function deposit() external payable;
}

interface IUniswapV3Pool {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1);
}

interface IUniswapV3Factory {
    function getPool(address a, address b, uint24 fee) external view returns (address);
}

/// @title ChogShop
/// @notice Chog Hotel official shop. Soulbound ERC-1155 items bought with $CHOG (or MON swapped to $CHOG).
///         Every spend: 90 % burned, 10 % to the team wallet. Tips: 100 % to the venue owner.
///         Tier requirements (minTier) are enforced by the game, not on chain.
contract ChogShop is ERC1155, Ownable2Step, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint256 public constant TEAM_BPS = 1000; // 10 %
    uint256 public constant BPS = 10_000;

    struct Item {
        uint256 priceChog; // in token base units (18 decimals)
        bool active;
        uint8 minTier; // 0..4, read by the game server / shop UI only
        uint32 maxPerWallet; // 0 = unlimited
    }

    IERC20 public immutable chog;
    address public team;

    // MON payment path: swaps WMON -> $CHOG directly against one Uniswap V3 style pool. Disabled while pool == address(0).
    address public pool;
    address public wmon;
    uint24 public poolFee;
    bool public zeroForOne; // true when WMON is the pool's token0

    uint160 internal constant MIN_SQRT_RATIO = 4295128739;
    uint160 internal constant MAX_SQRT_RATIO = 1461446703485210103287273052203988822378723970342;
    /// WMON the current buyWithMon is allowed to pay into the pool. Non-zero only during that swap.
    uint256 private _swapBudget;

    // Daily caps in $CHOG base units of item price volume. 0 = unlimited.
    uint256 public dailyCapTotal;
    uint256 public dailyCapPerWallet;
    mapping(uint256 day => uint256) public dailyTotal;
    mapping(uint256 day => mapping(address => uint256)) public dailyWallet;

    mapping(uint256 id => Item) public items;

    event ItemSet(uint256 indexed id, uint256 priceChog, bool active, uint8 minTier, uint32 maxPerWallet);
    event Purchase(
        address indexed buyer, uint256 indexed id, uint256 qty, uint256 chogPaid, uint256 burned, uint256 toTeam
    );
    event PaidWithMon(
        address indexed buyer, uint256 monIn, uint256 chogReceived, uint256 chogRefunded, uint256 wmonRefunded
    );
    event Tip(address indexed from, address indexed to, uint256 indexed venueId, uint256 amount);
    event TeamSet(address team);
    event PoolSet(address pool, address wmon, uint24 poolFee, bool zeroForOne);
    event CapsSet(uint256 total, uint256 perWallet);

    error Soulbound();
    error ItemInactive();
    error BadQty();
    error WalletLimit();
    error DailyCapTotal();
    error DailyCapWallet();
    error NoPool();
    error BadPool();
    error BadCallback();
    error Overcharged();
    error Expired();
    error Slippage();
    error ZeroAddress();
    error BadAmount();
    error TransferShort();
    error LengthMismatch();

    constructor(address chog_, address team_, string memory uri_, address admin) ERC1155(uri_) Ownable(admin) {
        if (chog_ == address(0) || team_ == address(0)) revert ZeroAddress();
        chog = IERC20(chog_);
        team = team_;
        emit TeamSet(team_);
    }

    // ------------------------------------------------------------ admin

    function setItem(uint256 id, uint256 priceChog, bool active, uint8 minTier, uint32 maxPerWallet)
        external
        onlyOwner
    {
        items[id] = Item(priceChog, active, minTier, maxPerWallet);
        emit ItemSet(id, priceChog, active, minTier, maxPerWallet);
    }

    function setItems(
        uint256[] calldata ids,
        uint256[] calldata prices,
        bool[] calldata actives,
        uint8[] calldata minTiers,
        uint32[] calldata maxes
    ) external onlyOwner {
        uint256 n = ids.length;
        if (prices.length != n || actives.length != n || minTiers.length != n || maxes.length != n) {
            revert LengthMismatch();
        }
        for (uint256 i; i < n; ++i) {
            items[ids[i]] = Item(prices[i], actives[i], minTiers[i], maxes[i]);
            emit ItemSet(ids[i], prices[i], actives[i], minTiers[i], maxes[i]);
        }
    }

    function setURI(string calldata newUri) external onlyOwner {
        _setURI(newUri);
    }

    function setTeam(address team_) external onlyOwner {
        if (team_ == address(0)) revert ZeroAddress();
        team = team_;
        emit TeamSet(team_);
    }

    /// Point the MON path at one V3 style pool. pool = address(0) disables it.
    /// The pool must hold exactly {wmon, chog}. If `factory` is non-zero, factory.getPool(wmon, chog, fee) must equal the pool.
    function setPool(address pool_, address wmon_, address factory_, uint24 fee_) external onlyOwner {
        if (pool_ == address(0)) {
            pool = address(0);
            wmon = address(0);
            poolFee = 0;
            zeroForOne = false;
            emit PoolSet(address(0), address(0), 0, false);
            return;
        }
        if (wmon_ == address(0)) revert ZeroAddress();
        address t0 = IUniswapV3Pool(pool_).token0();
        address t1 = IUniswapV3Pool(pool_).token1();
        bool z = t0 == wmon_;
        if (!((z && t1 == address(chog)) || (t1 == wmon_ && t0 == address(chog)))) revert BadPool();
        if (factory_ != address(0) && IUniswapV3Factory(factory_).getPool(wmon_, address(chog), fee_) != pool_) {
            revert BadPool();
        }
        pool = pool_;
        wmon = wmon_;
        poolFee = fee_;
        zeroForOne = z;
        emit PoolSet(pool_, wmon_, fee_, z);
    }

    function setCaps(uint256 total, uint256 perWallet) external onlyOwner {
        dailyCapTotal = total;
        dailyCapPerWallet = perWallet;
        emit CapsSet(total, perWallet);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /// The shop never holds user funds between transactions, so anything stuck here is stray.
    function rescueToken(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    function rescueMon(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        (bool ok,) = to.call{value: amount}("");
        require(ok, "send");
    }

    // ------------------------------------------------------------ buying

    function buyWithChog(uint256 id, uint256 qty) external nonReentrant whenNotPaused {
        uint256 cost = _checkPurchase(msg.sender, id, qty);
        uint256 before = chog.balanceOf(address(this));
        chog.safeTransferFrom(msg.sender, address(this), cost);
        if (chog.balanceOf(address(this)) - before != cost) revert TransferShort();
        _settle(msg.sender, id, qty, cost);
    }

    function buyWithMon(uint256 id, uint256 qty, uint256 minChogOut, uint256 deadline)
        external
        payable
        nonReentrant
        whenNotPaused
    {
        address pool_ = pool;
        if (pool_ == address(0)) revert NoPool();
        if (block.timestamp > deadline) revert Expired();
        if (msg.value == 0 || msg.value > uint256(type(int256).max)) revert BadAmount();
        uint256 cost = _checkPurchase(msg.sender, id, qty);

        IERC20 w = IERC20(wmon);
        uint256 chogBefore = chog.balanceOf(address(this));
        uint256 wmonBefore = w.balanceOf(address(this));
        IWMON(address(w)).deposit{value: msg.value}();

        bool z = zeroForOne;
        _swapBudget = msg.value;
        IUniswapV3Pool(pool_).swap(address(this), z, int256(msg.value), z ? MIN_SQRT_RATIO + 1 : MAX_SQRT_RATIO - 1, "");
        _swapBudget = 0;

        uint256 received = chog.balanceOf(address(this)) - chogBefore;
        if (received < cost || received < minChogOut) revert Slippage();

        uint256 surplus = received - cost;
        if (surplus > 0) chog.safeTransfer(msg.sender, surplus);
        // the pool stopped at its price limit and did not take all WMON: hand the rest back as WMON
        uint256 wmonLeft = w.balanceOf(address(this)) - wmonBefore;
        if (wmonLeft > 0) w.safeTransfer(msg.sender, wmonLeft);
        emit PaidWithMon(msg.sender, msg.value, received, surplus, wmonLeft);
        _settle(msg.sender, id, qty, cost);
    }

    /// Uniswap V3 swap callback: pays the WMON the pool asks for. Only the configured pool, only during buyWithMon,
    /// only up to the MON the buyer sent, and only once per swap.
    function uniswapV3SwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata) external {
        _payPool(amount0Delta, amount1Delta);
    }

    /// Capricorn CL pools (the $CHOG/WMON pool on Monad) call this name instead of the Uniswap one (found on a mainnet fork, 2026-10-15).
    function capricornCLSwapCallback(int256 amount0Delta, int256 amount1Delta, bytes calldata) external {
        _payPool(amount0Delta, amount1Delta);
    }

    function _payPool(int256 amount0Delta, int256 amount1Delta) internal {
        uint256 budget = _swapBudget;
        if (msg.sender != pool || budget == 0) revert BadCallback();
        _swapBudget = 0;
        int256 delta = zeroForOne ? amount0Delta : amount1Delta;
        if (delta <= 0) revert BadCallback();
        if (uint256(delta) > budget) revert Overcharged();
        IERC20(wmon).safeTransfer(msg.sender, uint256(delta));
    }

    function tip(address to, uint256 venueId, uint256 amount) external nonReentrant whenNotPaused {
        if (to == address(0) || to == address(this)) revert ZeroAddress();
        if (amount == 0) revert BadAmount();
        chog.safeTransferFrom(msg.sender, to, amount);
        emit Tip(msg.sender, to, venueId, amount);
    }

    // ------------------------------------------------------------ internals

    function _checkPurchase(address buyer, uint256 id, uint256 qty) internal returns (uint256 cost) {
        Item memory it = items[id];
        if (!it.active || it.priceChog == 0) revert ItemInactive();
        if (qty == 0 || qty > 1000) revert BadQty();
        if (it.maxPerWallet != 0 && balanceOf(buyer, id) + qty > it.maxPerWallet) revert WalletLimit();
        cost = it.priceChog * qty;

        uint256 day = block.timestamp / 1 days;
        uint256 t = dailyTotal[day] + cost;
        uint256 w = dailyWallet[day][buyer] + cost;
        if (dailyCapTotal != 0 && t > dailyCapTotal) revert DailyCapTotal();
        if (dailyCapPerWallet != 0 && w > dailyCapPerWallet) revert DailyCapWallet();
        dailyTotal[day] = t;
        dailyWallet[day][buyer] = w;
    }

    /// Contract already holds `cost` $CHOG. Team gets floor(10 %), the rest (incl. dust) is burned.
    function _settle(address buyer, uint256 id, uint256 qty, uint256 cost) internal {
        uint256 toTeam = (cost * TEAM_BPS) / BPS;
        uint256 burned = cost - toTeam;
        if (toTeam > 0) chog.safeTransfer(team, toTeam);
        IBurnable(address(chog)).burn(burned);
        _mint(buyer, id, qty, "");
        emit Purchase(buyer, id, qty, cost, burned, toTeam);
    }

    /// Soulbound: only minting is allowed.
    function _update(address from, address to, uint256[] memory ids, uint256[] memory values) internal override {
        if (from != address(0)) revert Soulbound();
        super._update(from, to, ids, values);
    }

    receive() external payable {}
}
