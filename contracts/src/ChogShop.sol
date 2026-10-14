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

/// Uniswap V3 SwapRouter02 style single-hop swap (no deadline field; the shop checks the deadline itself).
interface ISwapRouterV3 {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
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

    // MON payment path (disabled while router == address(0))
    address public router;
    address public wmon;
    uint24 public poolFee;

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
    event PaidWithMon(address indexed buyer, uint256 monIn, uint256 chogReceived, uint256 chogRefunded);
    event Tip(address indexed from, address indexed to, uint256 indexed venueId, uint256 amount);
    event TeamSet(address team);
    event RouterSet(address router, address wmon, uint24 poolFee);
    event CapsSet(uint256 total, uint256 perWallet);

    error Soulbound();
    error ItemInactive();
    error BadQty();
    error WalletLimit();
    error DailyCapTotal();
    error DailyCapWallet();
    error NoRouter();
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

    /// Set router = address(0) to disable the MON path.
    function setRouter(address router_, address wmon_, uint24 poolFee_) external onlyOwner {
        router = router_;
        wmon = wmon_;
        poolFee = poolFee_;
        emit RouterSet(router_, wmon_, poolFee_);
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
        if (router == address(0)) revert NoRouter();
        if (block.timestamp > deadline) revert Expired();
        uint256 cost = _checkPurchase(msg.sender, id, qty);

        uint256 before = chog.balanceOf(address(this));
        IWMON(wmon).deposit{value: msg.value}();
        IERC20(wmon).forceApprove(router, msg.value);
        ISwapRouterV3(router).exactInputSingle(
            ISwapRouterV3.ExactInputSingleParams({
                tokenIn: wmon,
                tokenOut: address(chog),
                fee: poolFee,
                recipient: address(this),
                amountIn: msg.value,
                amountOutMinimum: minChogOut > cost ? minChogOut : cost,
                sqrtPriceLimitX96: 0
            })
        );
        IERC20(wmon).forceApprove(router, 0);

        uint256 received = chog.balanceOf(address(this)) - before;
        if (received < cost || received < minChogOut) revert Slippage();

        uint256 surplus = received - cost;
        if (surplus > 0) chog.safeTransfer(msg.sender, surplus);
        emit PaidWithMon(msg.sender, msg.value, received, surplus);
        _settle(msg.sender, id, qty, cost);
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
