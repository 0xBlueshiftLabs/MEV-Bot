// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.20;

import { IPair } from "../../core/interfaces/IPair.sol";
import { IFactory } from "../../core/interfaces/IFactory.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { CreditMath } from "../../core/libraries/CreditMath.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Array } from "../../core/libraries/Array.sol";
import { Callback } from "../../core/libraries/Callback.sol";
import { BlockNumber } from "../../core/libraries/BlockNumber.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

/// @title Credit Pair
/// @author Credit Labs
/// @notice It is recommended to use Credit Router to interact with this contract.
/// @notice All error messages are coded and can be found in the documentation.
contract CreditPairV2Storage is IPair, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;
    using Array for Due[];

    /* ===== MODEL ===== */

    /// @inheritdoc IPair
    IFactory public override factory;
    /// @inheritdoc IPair
    IERC20 public override asset;
    /// @inheritdoc IPair
    IERC20 public override collateral;
    /// @inheritdoc IPair
    uint256 public override lpFee;
    /// @inheritdoc IPair
    uint256 public override protocolFee;
    /// @inheritdoc IPair
    uint256 public override stakingFee;

    /// @inheritdoc IPair
    uint256 public override protocolFeeStored;
    /// @inheritdoc IPair
    uint256 public override stakingFeeStored;

    /// @dev Stores the individual states of each Pool.
    mapping(uint256 => Pool) private pools;
    uint256 public newValue;
    bool private upgradedToV2;

    /* ===== VIEW =====*/

    /// @inheritdoc IPair
    function lpFeeStored(uint256 maturity) external view override returns (uint256) {
        return pools[maturity].state.lpFeeStored;
    }

    /// @inheritdoc IPair
    function constantProduct(uint256 maturity) external view override returns (uint112, uint112, uint112) {
        State memory state = pools[maturity].state;
        return (state.x, state.y, state.z);
    }

    /// @inheritdoc IPair
    function totalReserves(uint256 maturity) external view override returns (Tokens memory) {
        return pools[maturity].state.reserves;
    }

    /// @inheritdoc IPair
    function totalLiquidity(uint256 maturity) external view override returns (uint256) {
        return pools[maturity].state.totalLiquidity;
    }

    /// @inheritdoc IPair
    function liquidityOf(uint256 maturity, address owner) external view override returns (uint256) {
        return pools[maturity].liquidities[owner];
    }

    /// @inheritdoc IPair
    function totalClaims(uint256 maturity) external view override returns (Claims memory) {
        return pools[maturity].state.totalClaims;
    }

    /// @inheritdoc IPair
    function claimsOf(uint256 maturity, address owner) external view override returns (Claims memory) {
        return pools[maturity].claims[owner];
    }

    /// @inheritdoc IPair
    function totalDebtCreated(uint256 maturity) external view override returns (uint120) {
        return pools[maturity].state.totalDebtCreated;
    }

    /// @inheritdoc IPair
    function totalDuesOf(uint256 maturity, address owner) external view override returns (uint256) {
        return pools[maturity].dues[owner].length;
    }

    /// @inheritdoc IPair
    function dueOf(uint256 maturity, address owner, uint256 id) external view override returns (Due memory) {
        return pools[maturity].dues[owner][id];
    }

    /* ===== INIT ===== */

    /// @dev Initializes the Pair contract.
    /// @dev Called by the Credit factory contract.
    /// @param _asset The address of the ERC20 being lent and borrowed.
    /// @param _collateral The address of the ERC20 as the collateral.
    /// @param _lpFee The chosen fee rate.
    /// @param _protocolFee The chosen protocol fee rate.
    /// @param _stakingFee The chosen staking fee rate.
    function initialize(
        IERC20 _asset,
        IERC20 _collateral,
        uint16 _lpFee,
        uint16 _protocolFee,
        uint16 _stakingFee
    ) public initializer {
        __ReentrancyGuard_init();
        factory = IFactory(msg.sender);
        asset = _asset;
        collateral = _collateral;
        lpFee = _lpFee;
        protocolFee = _protocolFee;
        stakingFee = _stakingFee;
    }

    function initializeV2(uint256 _newValue) external {
        require(!upgradedToV2, "CreditPairV2Storage: V2 already initialized");
        upgradedToV2 = true;
        newValue = _newValue;
    }

    /* ===== UPDATE ===== */

    /// @inheritdoc IPair
    function mint(
        MintParam calldata
    ) external override nonReentrant returns (uint256 assetIn, uint256 liquidityOut, uint256 id, Due memory dueOut) {}

    /// @inheritdoc IPair
    function burn(
        BurnParam calldata
    ) external override nonReentrant returns (uint256 assetOut, uint128 collateralOut) {}

    /// @inheritdoc IPair
    function lend(
        LendParam calldata
    ) external override nonReentrant returns (uint256 assetIn, Claims memory claimsOut) {}

    /// @inheritdoc IPair
    function withdraw(WithdrawParam calldata) external override nonReentrant returns (Tokens memory tokensOut) {}

    /// @inheritdoc IPair
    function borrow(
        BorrowParam calldata
    ) external override nonReentrant returns (uint256 assetOut, uint256 id, Due memory dueOut) {}

    /// @inheritdoc IPair
    function pay(
        PayParam calldata
    ) external override nonReentrant returns (uint128 assetIn, uint128 collateralOut, uint256[] memory duesFullyPaid) {}

    /// @inheritdoc IPair
    function collectProtocolFee(address) external override nonReentrant returns (uint256 protocolFeeOut) {}

    /// @inheritdoc IPair
    function collectStakingFee(address to) external override nonReentrant returns (uint256 stakingFeeOut) {}

    function newMethod() public pure returns (uint256 value) {
        value = 1;
    }

    function newMethodCallingLib(
        uint256 maturity,
        IPair.State memory state,
        uint112 xIncrease,
        uint112 yIncrease,
        uint112 zIncrease
    ) public view returns (uint256 liquidityOut, IPair.Due memory dueOut, uint256 lpFeeStoredIncrease) {
        return CreditMath.mint(maturity, state, xIncrease, yIncrease, zIncrease);
    }
}
