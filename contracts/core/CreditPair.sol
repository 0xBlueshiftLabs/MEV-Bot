// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { BlockNumber } from "./libraries/BlockNumber.sol";
import { Array } from "./libraries/Array.sol";
import { Callback } from "./libraries/Callback.sol";
import { CreditMath } from "./libraries/CreditMath.sol";
import { IFactory } from "./interfaces/IFactory.sol";
import { IPair } from "./interfaces/IPair.sol";

/// @title Credit Pair
contract CreditPair is IPair, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;
    using Array for Due[];

    /*///////////////////////////////////////////////////////////////
                            State variables
    //////////////////////////////////////////////////////////////*/

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

    /*///////////////////////////////////////////////////////////////
                        Getter functions
    //////////////////////////////////////////////////////////////*/

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

    /*///////////////////////////////////////////////////////////////
                    Wrapping / Unwrapping logic
    //////////////////////////////////////////////////////////////*/

    /// @dev Initializes the Pair contract.
    /// @dev Called by the Credit factory contract.
    /// @param _asset The address of the ERC20 being lent and borrowed.
    /// @param _collateral The address of the ERC20 as the collateral.
    /// @param _lpFee The chosen LP fee rate.
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

    /*///////////////////////////////////////////////////////////////
                    Pair logic
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IPair
    function mint(
        MintParam calldata param
    ) external override nonReentrant returns (uint256 assetIn, uint256 liquidityOut, uint256 id, Due memory dueOut) {
        require(block.timestamp < param.maturity, "E202");
        unchecked {
            require(param.maturity - block.timestamp < 0x100000000, "E208");
        }
        require(param.liquidityTo != address(0), "E201");
        require(param.dueTo != address(0), "E201");
        require(param.liquidityTo != address(this), "E204");
        require(param.dueTo != address(this), "E204");
        require(param.xIncrease != 0, "E205");
        require(param.yIncrease != 0, "E205");
        require(param.zIncrease != 0, "E205");

        Pool storage pool = pools[param.maturity];
        State memory state = pool.state;

        uint256 lpFeeStoredIncrease;
        (liquidityOut, dueOut, lpFeeStoredIncrease) = CreditMath.mint(
            param.maturity,
            pool.state,
            param.xIncrease,
            param.yIncrease,
            param.zIncrease
        );

        require(liquidityOut != 0, "E212");
        state.totalLiquidity += liquidityOut;
        pool.liquidities[param.liquidityTo] += liquidityOut;

        state.lpFeeStored += lpFeeStoredIncrease;

        state.reserves.asset += param.xIncrease;
        state.reserves.collateral += dueOut.collateral;

        state.x += param.xIncrease;
        state.y += param.yIncrease;
        state.z += param.zIncrease;

        pool.state = state;

        assetIn = param.xIncrease;
        assetIn += lpFeeStoredIncrease;
        Callback.mint(asset, collateral, assetIn, dueOut.collateral, param.data);

        emit Sync(param.maturity, pool.state.x, pool.state.y, pool.state.z);
        emit Mint(
            param.maturity,
            msg.sender,
            param.liquidityTo,
            param.dueTo,
            assetIn,
            liquidityOut,
            id,
            dueOut,
            lpFeeStoredIncrease
        );
    }

    /// @inheritdoc IPair
    function burn(
        BurnParam calldata param
    ) external override nonReentrant returns (uint256 assetOut, uint128 collateralOut) {
        require(block.timestamp >= param.maturity, "E203");
        require(param.assetTo != address(0), "E201");
        require(param.collateralTo != address(0), "E201");
        require(param.assetTo != address(this), "E204");
        require(param.collateralTo != address(this), "E204");
        require(param.liquidityIn != 0, "E205");

        Pool storage pool = pools[param.maturity];
        State memory state = pool.state;
        require(state.totalLiquidity != 0, "E206");

        uint128 _assetOut;
        uint256 feeOut;
        (_assetOut, collateralOut, feeOut) = CreditMath.burn(pool.state, param.liquidityIn);

        state.totalLiquidity -= param.liquidityIn;

        pool.liquidities[msg.sender] -= param.liquidityIn;

        assetOut = _assetOut;
        assetOut += feeOut;

        if (assetOut != 0) {
            state.reserves.asset -= _assetOut;
            state.lpFeeStored -= feeOut;
            asset.safeTransfer(param.assetTo, assetOut);
        }
        if (collateralOut != 0) {
            state.reserves.collateral -= collateralOut;
            collateral.safeTransfer(param.collateralTo, collateralOut);
        }

        pool.state = state;

        emit Burn(
            param.maturity,
            msg.sender,
            param.assetTo,
            param.collateralTo,
            param.liquidityIn,
            assetOut,
            collateralOut,
            feeOut
        );
    }

    /// @inheritdoc IPair
    function lend(
        LendParam calldata param
    ) external override nonReentrant returns (uint256 assetIn, Claims memory claimsOut) {
        require(block.timestamp < param.maturity, "E202");
        require(param.loanTo != address(0), "E201");
        require(param.coverageTo != address(0), "E201");
        require(param.loanTo != address(this), "E204");
        require(param.coverageTo != address(this), "E204");
        require(param.xIncrease != 0, "E205");

        Pool storage pool = pools[param.maturity];
        State memory state = pool.state;
        require(state.totalLiquidity != 0, "E206");

        uint256 lpFeeStoredIncrease;
        uint256 protocolFeeStoredIncrease;
        uint256 stakingFeeStoredIncrease;
        (claimsOut, lpFeeStoredIncrease, protocolFeeStoredIncrease, stakingFeeStoredIncrease) = CreditMath.lend(
            param.maturity,
            pool.state,
            param.xIncrease,
            param.yDecrease,
            param.zDecrease,
            lpFee,
            protocolFee,
            stakingFee
        );

        state.lpFeeStored += lpFeeStoredIncrease;
        protocolFeeStored += protocolFeeStoredIncrease;
        stakingFeeStored += stakingFeeStoredIncrease;

        state.totalClaims.loanPrincipal += claimsOut.loanPrincipal;
        state.totalClaims.loanInterest += claimsOut.loanInterest;
        state.totalClaims.coveragePrincipal += claimsOut.coveragePrincipal;
        state.totalClaims.coverageInterest += claimsOut.coverageInterest;

        pool.claims[param.loanTo].loanPrincipal += claimsOut.loanPrincipal;
        pool.claims[param.loanTo].loanInterest += claimsOut.loanInterest;
        pool.claims[param.coverageTo].coveragePrincipal += claimsOut.coveragePrincipal;
        pool.claims[param.coverageTo].coverageInterest += claimsOut.coverageInterest;

        state.reserves.asset += param.xIncrease;

        state.x += param.xIncrease;
        state.y -= param.yDecrease;
        state.z -= param.zDecrease;

        pool.state = state;

        assetIn = param.xIncrease;
        assetIn += lpFeeStoredIncrease;
        assetIn += protocolFeeStoredIncrease;
        assetIn += stakingFeeStoredIncrease;

        Callback.lend(asset, assetIn, param.data);

        emit Sync(param.maturity, pool.state.x, pool.state.y, pool.state.z);
        emit Lend(
            param.maturity,
            msg.sender,
            param.loanTo,
            param.coverageTo,
            assetIn,
            claimsOut,
            lpFeeStoredIncrease,
            protocolFeeStoredIncrease,
            stakingFeeStoredIncrease
        );
    }

    /// @inheritdoc IPair
    function withdraw(WithdrawParam calldata param) external override nonReentrant returns (Tokens memory tokensOut) {
        require(block.timestamp >= param.maturity, "E203");
        require(param.assetTo != address(0), "E201");
        require(param.collateralTo != address(0), "E201");
        require(param.assetTo != address(this), "E204");
        require(param.collateralTo != address(this), "E204");
        require(
            param.claimsIn.loanPrincipal != 0 ||
                param.claimsIn.loanInterest != 0 ||
                param.claimsIn.coveragePrincipal != 0 ||
                param.claimsIn.coverageInterest != 0,
            "E205"
        );

        Pool storage pool = pools[param.maturity];
        State memory state = pool.state;

        tokensOut = CreditMath.withdraw(pool.state, param.claimsIn);

        state.totalClaims.loanPrincipal -= param.claimsIn.loanPrincipal;
        state.totalClaims.loanInterest -= param.claimsIn.loanInterest;
        state.totalClaims.coveragePrincipal -= param.claimsIn.coveragePrincipal;
        state.totalClaims.coverageInterest -= param.claimsIn.coverageInterest;

        Claims memory sender = pool.claims[msg.sender];

        sender.loanPrincipal -= param.claimsIn.loanPrincipal;
        sender.loanInterest -= param.claimsIn.loanInterest;
        sender.coveragePrincipal -= param.claimsIn.coveragePrincipal;
        sender.coverageInterest -= param.claimsIn.coverageInterest;

        pool.claims[msg.sender] = sender;

        if (tokensOut.asset != 0) {
            state.reserves.asset -= tokensOut.asset;
            asset.safeTransfer(param.assetTo, tokensOut.asset);
        }
        if (tokensOut.collateral != 0) {
            state.reserves.collateral -= tokensOut.collateral;
            collateral.safeTransfer(param.collateralTo, tokensOut.collateral);
        }

        pool.state = state;

        emit Withdraw(param.maturity, msg.sender, param.assetTo, param.collateralTo, param.claimsIn, tokensOut);
    }

    /// @inheritdoc IPair
    function borrow(
        BorrowParam calldata param
    ) external override nonReentrant returns (uint256 assetOut, uint256 id, Due memory dueOut) {
        require(block.timestamp < param.maturity, "E202");
        require(param.assetTo != address(0), "E201");
        require(param.dueTo != address(0), "E201");
        require(param.assetTo != address(this), "E204");
        require(param.dueTo != address(this), "E204");
        require(param.xDecrease != 0, "E205");

        Pool storage pool = pools[param.maturity];
        State memory state = pool.state;
        require(state.totalLiquidity != 0, "E206");

        uint256 lpFeeStoredIncrease;
        uint256 protocolFeeStoredIncrease;
        uint256 stakingFeeStoredIncrease;
        (dueOut, lpFeeStoredIncrease, protocolFeeStoredIncrease, stakingFeeStoredIncrease) = CreditMath.borrow(
            param.maturity,
            pool.state,
            param.xDecrease,
            param.yIncrease,
            param.zIncrease,
            lpFee,
            protocolFee,
            stakingFee
        );

        state.lpFeeStored += lpFeeStoredIncrease;
        protocolFeeStored += protocolFeeStoredIncrease;
        stakingFeeStored += stakingFeeStoredIncrease;

        id = pool.dues[param.dueTo].insert(dueOut);

        state.reserves.asset -= param.xDecrease;
        state.reserves.collateral += dueOut.collateral;
        state.totalDebtCreated += dueOut.debt;

        state.x -= param.xDecrease;
        state.y += param.yIncrease;
        state.z += param.zIncrease;

        pool.state = state;

        assetOut = param.xDecrease;
        assetOut -= lpFeeStoredIncrease;
        assetOut -= protocolFeeStoredIncrease;
        assetOut -= stakingFeeStoredIncrease;

        asset.safeTransfer(param.assetTo, assetOut);

        Callback.borrow(collateral, dueOut.collateral, param.data);

        emit Sync(param.maturity, pool.state.x, pool.state.y, pool.state.z);
        emit Borrow(
            param.maturity,
            msg.sender,
            param.assetTo,
            param.dueTo,
            assetOut,
            id,
            dueOut,
            lpFeeStoredIncrease,
            protocolFeeStoredIncrease,
            stakingFeeStoredIncrease
        );
    }

    /// @inheritdoc IPair
    function pay(
        PayParam calldata param
    ) external override nonReentrant returns (uint128 assetIn, uint128 collateralOut, uint256[] memory duesFullyPaid) {
        require(block.timestamp < param.maturity, "E202");
        require(param.owner != address(0), "E201");
        require(param.to != address(0), "E201");
        require(param.to != address(this), "E204");

        uint256 length = param.ids.length;
        require(length == param.assetsIn.length, "E205");
        require(length == param.collateralsOut.length, "E205");

        Pool storage pool = pools[param.maturity];

        Due[] storage dues = pool.dues[param.owner];
        require(dues.length >= length, "E205");

        uint256[] memory temp = new uint256[](length);

        //slither-disable-next-line uninitialized-local
        uint256 lastFullyPaidDuesIndex;

        for (uint256 i; i < length; ) {
            Due storage due = dues[param.ids[i]];
            require(due.startBlock != BlockNumber.get(), "E207");

            uint112 _assetIn = param.assetsIn[i];
            uint112 _collateralOut = param.collateralsOut[i];

            if (param.owner != msg.sender) require(_collateralOut == 0, "E213");
            require(uint256(_assetIn) * due.collateral >= uint256(_collateralOut) * due.debt, "E303");

            due.debt -= _assetIn;
            due.collateral -= _collateralOut;
            assetIn += _assetIn;
            collateralOut += _collateralOut;

            if (due.debt == 0 && due.collateral == 0) {
                temp[lastFullyPaidDuesIndex] = param.ids[i];
                ++lastFullyPaidDuesIndex;
            }

            ++i;
        }

        duesFullyPaid = new uint256[](lastFullyPaidDuesIndex);
        for (uint256 i; i < lastFullyPaidDuesIndex; ++i) {
            duesFullyPaid[i] = temp[i];
        }

        pool.state.reserves.asset += assetIn;
        pool.state.reserves.collateral -= collateralOut;

        if (collateralOut != 0) collateral.safeTransfer(param.to, collateralOut);
        if (assetIn != 0) Callback.pay(asset, assetIn, param.data);

        emit Pay(param.maturity, msg.sender, param.to, param.owner, duesFullyPaid, assetIn, collateralOut);
    }

    /// @inheritdoc IPair
    function collectProtocolFee(address to) external override nonReentrant returns (uint256 protocolFeeOut) {
        require(msg.sender == factory.protocolFeeCollector(), "E216");
        require(to != address(0), "E201");

        protocolFeeOut = protocolFeeStored;
        protocolFeeStored = 0;

        asset.safeTransfer(to, protocolFeeOut);

        emit CollectProtocolFee(msg.sender, to, protocolFeeOut);
    }

    /// @inheritdoc IPair
    function collectStakingFee(address to) external override nonReentrant returns (uint256 stakingFeeOut) {
        require(msg.sender == factory.stakingFeeCollector(), "E218");
        require(to != address(0), "E201");

        stakingFeeOut = stakingFeeStored;
        stakingFeeStored = 0;

        asset.safeTransfer(to, stakingFeeOut);

        emit CollectStakingFee(msg.sender, to, stakingFeeOut);
    }
}
