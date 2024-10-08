// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { ICreditBorrowCallback } from "../../core/interfaces/callback/ICreditBorrowCallback.sol";
import { ICreditMintCallback } from "../../core/interfaces/callback/ICreditMintCallback.sol";
import { ICreditLendCallback } from "../../core/interfaces/callback/ICreditLendCallback.sol";
import { ICreditPayCallback } from "../../core/interfaces/callback/ICreditPayCallback.sol";
import { IFactory } from "../../core/interfaces/IFactory.sol";
import { IPair } from "../../core/interfaces/IPair.sol";
import { IBorrow } from "./IBorrow.sol";
import { IBurn } from "./IBurn.sol";
import { IClaim } from "../../tokens/interfaces/IClaim.sol";
import { ICreditPositionManager } from "../../tokens/interfaces/ICreditPositionManager.sol";
import { IDeployPair } from "./IDeployPair.sol";
import { IDue } from "../../tokens/interfaces/IDue.sol";
import { ILend } from "./ILend.sol";
import { ILiquidity } from "../../tokens/interfaces/ILiquidity.sol";
import { IMint } from "./IMint.sol";
import { IPay } from "./IPay.sol";
import { IWETH } from "./IWETH.sol";
import { IWithdraw } from "./IWithdraw.sol";

/// @title Credit Router Interface
interface IRouter is ICreditMintCallback, ICreditLendCallback, ICreditBorrowCallback, ICreditPayCallback, IDeployPair {
    struct Receipt {
        ILiquidity liquidity;
        IClaim loanInterest;
        IClaim loanPrincipal;
        IClaim coverageInterest;
        IClaim coveragePrincipal;
        IDue lockedDebt;
    }

    /* ===== VIEW ===== */

    /// @dev Return the address of the factory contract used by this contract.
    /// @return The address of the factory contract.
    function factory() external returns (IFactory);

    /// @dev Return the address of the Wrapped ETH contract.
    /// @return The address of WETH.
    function weth() external returns (IWETH);

    /// @dev Return the address of the CreditPosition contract.
    /// @return The address of CreditPosition.
    function creditPositionManager() external returns (ICreditPositionManager);

    /// @dev Create pair contracts.
    /// @param params The parameters for this function found in IDeployPair interface.
    function deployPair(IDeployPair.DeployPair calldata params) external;

    /// @dev Calls the mint function and creates a new pool.
    /// @dev If the pair does not exist, creates a new pair first.
    /// @dev Must have the asset ERC20 approve this contract before calling this function.
    /// @dev Must have the collateral ERC20 approve this contract before calling this function.
    /// @param params The parameters for this function found in IMint interface.
    /// @return assetIn The amount of asset ERC20 deposited.
    /// @return liquidityOut The amount of liquidity balance received by liquidityTo.
    /// @return id The array index of the locked debt received by dueTo.
    /// @return dueOut The locked debt received by dueTo.
    function newLiquidity(
        IMint.NewLiquidity calldata params
    ) external returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut);

    /// @dev Calls the mint function and creates a new pool.
    /// @dev If the pair does not exist, creates a new pair first.
    /// @dev The asset deposited is ETH which will be wrapped as WETH.
    /// @dev Msg.value is the assetIn amount.
    /// @dev Must have the collateral ERC20 approve this contract before calling this function.
    /// @param params The parameters for this function found in IMint interface.
    /// @return assetIn The amount of asset ERC20 deposited.
    /// @return liquidityOut The amount of liquidity balance received by liquidityTo.
    /// @return id The array index of the locked debt received by dueTo.
    /// @return dueOut The locked debt received by dueTo.
    function newLiquidityETHAsset(
        IMint.NewLiquidityETHAsset calldata params
    ) external payable returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut);

    /// @dev Calls the mint function and creates a new pool.
    /// @dev If the pair does not exist, creates a new pair first.
    /// @dev The collateral locked is ETH which will be wrapped as WETH.
    /// @dev Msg.value is the collateralIn amount.
    /// @dev Must have the asset ERC20 approve this contract before calling this function.
    /// @param params The parameters for this function found in IMint interface.
    /// @return assetIn The amount of asset ERC20 deposited.
    /// @return liquidityOut The amount of liquidity balance received by liquidityTo.
    /// @return id The array index of the locked debt received by dueTo.
    /// @return dueOut The locked debt received by dueTo.
    function newLiquidityETHCollateral(
        IMint.NewLiquidityETHCollateral calldata params
    ) external payable returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut);

    /// @dev Calls the mint function and add more liquidity to an existing pool.
    /// @dev Must have the asset ERC20 approve this contract before calling this function.
    /// @dev Must have the collateral ERC20 approve this contract before calling this function.
    /// @param params The parameters for this function found in IMint interface.
    /// @return assetIn The amount of asset ERC20 deposited.
    /// @return liquidityOut The amount of liquidity balance received by liquidityTo.
    /// @return id The array index of the locked debt received by dueTo.
    /// @return dueOut The locked debt received by dueTo.
    function liquidityGivenAsset(
        IMint.LiquidityGivenAsset calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut);

    /// @dev Calls the mint function and add more liquidity to an existing pool.
    /// @dev The asset deposited is ETH which will be wrapped as WETH.
    /// @dev Msg.value is the assetIn amount.
    /// @dev Must have the collateral ERC20 approve this contract before calling this function.
    /// @param params The parameters for this function found in IMint interface.
    /// @return assetIn The amount of asset ERC20 deposited.
    /// @return liquidityOut The amount of liquidity balance received by liquidityTo.
    /// @return id The array index of the locked debt received by dueTo.
    /// @return dueOut The locked debt received by dueTo.
    function liquidityGivenAssetETHAsset(
        IMint.LiquidityGivenAssetETHAsset calldata params,
        bytes32[] calldata _merkleProof
    ) external payable returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut);

    /// @dev Calls the mint function and add more liquidity to an existing pool.
    /// @dev The collateral ERC20 is the WETH contract.
    /// @dev The collateral locked is ETH which will be wrapped as WETH.
    /// @dev Msg.value is the maxCollateral amount. Any excess ETH will be returned to Msg.sender.
    /// @dev Must have the asset ERC20 approve this contract before calling this function.
    /// @param params The parameters for this function found in IMint interface.
    /// @return assetIn The amount of asset ERC20 deposited.
    /// @return liquidityOut The amount of liquidity balance received by liquidityTo.
    /// @return id The array index of the locked debt received by dueTo.
    /// @return dueOut The locked debt received by dueTo.
    function liquidityGivenAssetETHCollateral(
        IMint.LiquidityGivenAssetETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    ) external payable returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut);

    /// @dev Calls the mint function and add more liquidity to an existing pool.
    /// @dev Must have the asset ERC20 approve this contract before calling this function.
    /// @dev Must have the collateral ERC20 approve this contract before calling this function.
    /// @param params The parameters for this function found in IMint interface.
    /// @return assetIn The amount of asset ERC20 deposited.
    /// @return liquidityOut The amount of liquidity balance received by liquidityTo.
    /// @return id The array index of the locked debt received by dueTo.
    /// @return dueOut The locked debt received by dueTo.
    function liquidityGivenCollateral(
        IMint.LiquidityGivenCollateral calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut);

    /// @dev Calls the mint function and add more liquidity to an existing pool.
    /// @dev The asset deposited is ETH which will be wrapped as WETH.
    /// @dev Msg.value is the assetIn amount.
    /// @dev Must have the collateral ERC20 approve this contract before calling this function.
    /// @param params The parameters for this function found in IMint interface.
    /// @return assetIn The amount of asset ERC20 deposited.
    /// @return liquidityOut The amount of liquidity balance received by liquidityTo.
    /// @return id The array index of the locked debt received by dueTo.
    /// @return dueOut The locked debt received by dueTo.
    function liquidityGivenCollateralETHAsset(
        IMint.LiquidityGivenCollateralETHAsset calldata params,
        bytes32[] calldata _merkleProof
    ) external payable returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut);

    /// @dev Calls the mint function and add more liquidity to an existing pool.
    /// @dev The collateral ERC20 is the WETH contract.
    /// @dev The collateral locked is ETH which will be wrapped as WETH.
    /// @dev Msg.value is the maxCollateral amount. Any excess ETH will be returned to Msg.sender.
    /// @dev Must have the asset ERC20 approve this contract before calling this function.
    /// @param params The parameters for this function found in IMint interface.
    /// @return assetIn The amount of asset ERC20 deposited.
    /// @return liquidityOut The amount of liquidity balance received by liquidityTo.
    /// @return id The array index of the locked debt received by dueTo.
    /// @return dueOut The locked debt received by dueTo.
    function liquidityGivenCollateralETHCollateral(
        IMint.LiquidityGivenCollateralETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    ) external payable returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut);

    /// @dev Calls the burn funtion and withdraw liquiidty from a pool.
    /// @param params The parameters for this function found in IBurn interface.
    /// @return assetOut The amount of asset ERC20 received by assetTo.
    /// @return collateralOut The amount of collateral ERC20 received by collateralTo.
    function removeLiquidity(
        IBurn.RemoveLiquidity calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (uint256 assetOut, uint128 collateralOut);

    /// @dev Calls the burn funtion and withdraw liquiidty from a pool.
    /// @dev The asset received is ETH which will be unwrapped from WETH.
    /// @param params The parameters for this function found in IBurn interface.
    /// @return assetOut The amount of asset ERC20 received by assetTo.
    /// @return collateralOut The amount of collateral ERC20 received by collateralTo.
    function removeLiquidityETHAsset(
        IBurn.RemoveLiquidityETHAsset calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (uint256 assetOut, uint128 collateralOut);

    /// @dev Calls the burn funtion and withdraw liquiidty from a pool.
    /// @dev The collateral received is ETH which will be unwrapped from WETH.
    /// @param params The parameters for this function found in IBurn interface.
    /// @return assetOut The amount of asset ERC20 received by assetTo.
    /// @return collateralOut The amount of collateral ERC20 received by collateralTo.
    function removeLiquidityETHCollateral(
        IBurn.RemoveLiquidityETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (uint256 assetOut, uint128 collateralOut);

    /// @dev Calls the lend function and deposit asset into a pool.
    /// @dev Calls given percentage ratio of loan and coverage.
    /// @dev Must have the asset ERC20 approve this contract before calling this function.
    /// @param params The parameters for this function found in ILend interface.
    /// @return assetIn The amount of asset ERC20 deposited.
    /// @return claimsOut The amount of loan ERC20 and coverage ERC20 received by loanTo and coverageTo.
    function lendGivenPercent(
        ILend.LendGivenPercent calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (uint256 assetIn, IPair.Claims memory claimsOut);

    /// @dev Calls the lend function and deposit asset into a pool.
    /// @dev Calls given percentage ratio of loan and coverage.
    /// @dev The asset deposited is ETH which will be wrapped as WETH.
    /// @param params The parameters for this function found in ILend interface.
    /// @return assetIn The amount of asset ERC20 deposited.
    /// @return claimsOut The amount of loan ERC20 and coverage ERC20 received by loanTo and coverageTo.
    function lendGivenPercentETHAsset(
        ILend.LendGivenPercentETHAsset calldata params,
        bytes32[] calldata _merkleProof
    ) external payable returns (uint256 assetIn, IPair.Claims memory claimsOut);

    /// @dev Calls the lend function and deposit asset into a pool.
    /// @dev Calls given percentage ratio of loan and coverage.
    /// @dev Must have the asset ERC20 approve this contract before calling this function.
    /// @param params The parameters for this function found in ILend interface.
    /// @return assetIn The amount of asset ERC20 deposited.
    /// @return claimsOut The amount of loan ERC20 and coverage ERC20 received by loanTo and coverageTo.
    function lendGivenPercentETHCollateral(
        ILend.LendGivenPercentETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (uint256 assetIn, IPair.Claims memory claimsOut);

    /// @dev Calls the withdraw function and withdraw asset and collateral from a pool.
    /// @param params The parameters for this function found in IWithdraw interface.
    /// @return tokensOut The amount of asset ERC20 and collateral ERC20 received by assetTo and collateralTo.
    function collect(
        IWithdraw.Collect calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (IPair.Tokens memory tokensOut);

    /// @dev Calls the withdraw function and withdraw asset and collateral from a pool.
    /// @dev The asset received is ETH which will be unwrapped from WETH.
    /// @param params The parameters for this function found in IWithdraw interface.
    /// @return tokensOut The amount of asset ERC20 and collateral ERC20 received by assetTo and collateralTo.
    function collectETHAsset(
        IWithdraw.CollectETHAsset calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (IPair.Tokens memory tokensOut);

    /// @dev Calls the withdraw function and withdraw asset and collateral from a pool.
    /// @dev The collateral received is ETH which will be unwrapped from WETH.
    /// @param params The parameters for this function found in IWithdraw interface.
    /// @return tokensOut The amount of asset ERC20 and collateral ERC20 received by assetTo and collateralTo.
    function collectETHCollateral(
        IWithdraw.CollectETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (IPair.Tokens memory tokensOut);

    /// @dev Calls the borrow function and borrow asset from a pool and locking collateral into the pool.
    /// @dev Calls given percentage ratio of debt and collateral.
    /// @dev Must have the collateral ERC20 approve this contract before calling this function.
    /// @param params The parameters for this function found in IBorrow interface.
    /// @return assetOut The amount of asset ERC20 received by assetTo.
    /// @return id The token id of locked debt ERC721 received by dueTo.
    /// @return dueOut The locked debt ERC721 received by dueTo.
    function borrowGivenPercent(
        IBorrow.BorrowGivenPercent calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut);

    /// @dev Calls the borrow function and borrow asset from a pool and locking collateral into the pool.
    /// @dev Calls given percentage ratio of debt and collateral.
    /// @dev Must have the collateral ERC20 approve this contract before calling this function.
    /// @param params The parameters for this function found in IBorrow interface.
    /// @return assetOut The amount of asset ERC20 received by assetTo.
    /// @return id The token id of locked debt ERC721 received by dueTo.
    /// @return dueOut The locked debt ERC721 received by dueTo.
    function borrowGivenPercentETHAsset(
        IBorrow.BorrowGivenPercentETHAsset calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut);

    /// @dev Calls the borrow function and borrow asset from a pool and locking collateral into the pool.
    /// @dev Calls given percentage ratio of debt and collateral.
    /// @dev The collateral locked is ETH which will be wrapped as WETH.
    /// @param params The parameters for this function found in IBorrow interface.
    /// @return assetOut The amount of asset ERC20 received by assetTo.
    /// @return id The token id of locked debt ERC721 received by dueTo.
    /// @return dueOut The locked debt ERC721 received by dueTo.
    function borrowGivenPercentETHCollateral(
        IBorrow.BorrowGivenPercentETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    ) external payable returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut);

    /// @dev Calls the pay function and withdraw collateral from a pool given debt is paid or being paid.
    /// @dev If there is debt being paid, must have the asset ERC20 approve this contract before calling this function.
    /// @dev Possible to pay debt of locked debt not owned by msg.sender, which means no collateral is withdraw.
    /// @param params The parameters for this function found in IPay interface.
    /// @return assetIn The total amount of asset ERC20 paid.
    /// @return collateralOut The total amount of collateral ERC20 receceived by to;
    /// @return creditPositionFullyPaid The array of credit position id that is fully paid.
    function repay(
        IPay.Repay calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (uint128 assetIn, uint128 collateralOut, uint256[] memory creditPositionFullyPaid);

    /// @dev Calls the pay function and withdraw collateral from a pool given debt is paid or being paid.
    /// @dev The asset being paid is ETH which will be wrapped as WETH.
    /// @dev Possible to pay debt of locked debt not owned by msg.sender, which means no collateral is withdraw.
    /// @param params The parameters for this function found in IPay interface.
    /// @return assetIn The total amount of asset ERC20 paid.
    /// @return collateralOut The total amount of collateral ERC20 receceived by to;
    /// @return creditPositionFullyPaid The array of credit position id that is fully paid.
    function repayETHAsset(
        IPay.RepayETHAsset calldata params,
        bytes32[] calldata _merkleProof
    ) external payable returns (uint128 assetIn, uint128 collateralOut, uint256[] memory creditPositionFullyPaid);

    /// @dev Calls the pay function and withdraw collateral from a pool given debt is paid or being paid.
    /// @dev The collateral received is ETH which will be unwrapped from WETH.
    /// @dev If there is debt being paid, must have the asset ERC20 approve this contract before calling this function.
    /// @dev Possible to pay debt of locked debt not owned by msg.sender, which means no collateral is withdraw.
    /// @param params The parameters for this function found in IPay interface.
    /// @return assetIn The total amount of asset ERC20 paid.
    /// @return collateralOut The total amount of collateral ERC20 receceived by to;
    /// @return creditPositionFullyPaid The array of credit position id that is fully paid.
    function repayETHCollateral(
        IPay.RepayETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    ) external returns (uint128 assetIn, uint128 collateralOut, uint256[] memory creditPositionFullyPaid);
}
