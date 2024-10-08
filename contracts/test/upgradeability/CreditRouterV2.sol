// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import { ICreditPositionManager } from "../../tokens/interfaces/ICreditPositionManager.sol";
import { IFactory } from "../../core/interfaces/IFactory.sol";
import { IPair } from "../../core/interfaces/IPair.sol";
import { IBorrow } from "../../periphery/interfaces/IBorrow.sol";
import { IBurn } from "../../periphery/interfaces/IBurn.sol";
import { ILend } from "../../periphery/interfaces/ILend.sol";
import { IMint } from "../../periphery/interfaces/IMint.sol";
import { IPay } from "../../periphery/interfaces/IPay.sol";
import { IWETH } from "../../periphery/interfaces/IWETH.sol";
import { IWithdraw } from "../../periphery/interfaces/IWithdraw.sol";
import { Borrow } from "../../periphery/libraries/Borrow.sol";
import { Burn } from "../../periphery/libraries/Burn.sol";
import { Lend } from "../../periphery/libraries/Lend.sol";
import { Mint } from "../../periphery/libraries/Mint.sol";
import { Pay } from "../../periphery/libraries/Pay.sol";
import { SafeTransfer } from "../../periphery/libraries/SafeTransfer.sol";
import { Withdraw } from "../../periphery/libraries/Withdraw.sol";
import { IRouter } from "../../periphery/interfaces/IRouter.sol";
import { ICreditPayCallback } from "../../core/interfaces/callback/ICreditPayCallback.sol";
import { ICreditBorrowCallback } from "../../core/interfaces/callback/ICreditBorrowCallback.sol";
import { ICreditMintCallback } from "../../core/interfaces/callback/ICreditMintCallback.sol";
import { ICreditLendCallback } from "../../core/interfaces/callback/ICreditLendCallback.sol";

/// @title Credit Router
/// @author Credit Labs
/// @notice It is recommnded to use this contract to interact with Credit Core contract.
/// @notice All error messages are abbreviated and can be found in the documentation.
contract CreditRouterV2 is IRouter, IERC721Receiver, Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeTransfer for IERC20;

    /* ===== MODEL ===== */

    /// @inheritdoc IRouter
    IFactory public override factory;
    /// @inheritdoc IRouter
    IWETH public override weth;
    /// @inheritdoc IRouter
    ICreditPositionManager public override creditPositionManager;

    uint256 public newValue;
    bool public initializedV2;

    /* ===== INIT ===== */

    /// @dev Initializes the Router contract.
    /// @param _factory The address of factory contract used by this contract.
    /// @param _weth The address of the Wrapped ETH contract.
    /// @param _creditPositionManager The address of the Credit Position contract.
    function initialize(
        IFactory _factory,
        IWETH _weth,
        ICreditPositionManager _creditPositionManager
    ) public initializer {
        require(address(_factory) != address(0), "E601");
        require(address(_weth) != address(0), "E601");
        require(address(_creditPositionManager) != address(0), "E601");
        require(address(_factory) != address(_weth), "E612");

        __Ownable_init();

        factory = _factory;
        weth = _weth;
        creditPositionManager = _creditPositionManager;
    }

    function initializeV2(uint _newValue) public {
        require(!initializedV2, "CreditRouterV2: V2 already initialized");
        initializedV2 = true;
        newValue = _newValue;
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address) internal override onlyOwner {}

    /* ===== UPDATE ===== */

    function newMethod() public pure returns (string memory) {
        return "hello I am new";
    }

    receive() external payable {
        require(msg.sender == address(weth), "E615");
    }

    /// @inheritdoc IRouter
    function deployPair(DeployPair calldata params) external override {
        factory.createPair(params.asset, params.collateral);
    }

    /// @inheritdoc IRouter
    function newLiquidity(
        IMint.NewLiquidity calldata
    ) external override returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {}

    /// @inheritdoc IRouter
    function newLiquidityETHAsset(
        IMint.NewLiquidityETHAsset calldata
    ) external payable override returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {}

    /// @inheritdoc IRouter
    function newLiquidityETHCollateral(
        IMint.NewLiquidityETHCollateral calldata
    ) external payable override returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {}

    /// @inheritdoc IRouter
    function liquidityGivenAsset(
        IMint.LiquidityGivenAsset calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {}

    /// @inheritdoc IRouter
    function liquidityGivenAssetETHAsset(
        IMint.LiquidityGivenAssetETHAsset calldata,
        bytes32[] calldata _merkleProof
    ) external payable override returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {}

    /// @inheritdoc IRouter
    function liquidityGivenAssetETHCollateral(
        IMint.LiquidityGivenAssetETHCollateral calldata,
        bytes32[] calldata _merkleProof
    ) external payable override returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {}

    /// @inheritdoc IRouter
    function liquidityGivenCollateral(
        IMint.LiquidityGivenCollateral calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {}

    /// @inheritdoc IRouter
    function liquidityGivenCollateralETHAsset(
        IMint.LiquidityGivenCollateralETHAsset calldata,
        bytes32[] calldata _merkleProof
    ) external payable override returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {}

    /// @inheritdoc IRouter
    function liquidityGivenCollateralETHCollateral(
        IMint.LiquidityGivenCollateralETHCollateral calldata,
        bytes32[] calldata _merkleProof
    ) external payable override returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {}

    /// @inheritdoc IRouter
    function removeLiquidity(
        IBurn.RemoveLiquidity calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (uint256 assetOut, uint128 collateralOut) {}

    /// @inheritdoc IRouter
    function removeLiquidityETHAsset(
        IBurn.RemoveLiquidityETHAsset calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (uint256 assetOut, uint128 collateralOut) {}

    /// @inheritdoc IRouter
    function removeLiquidityETHCollateral(
        IBurn.RemoveLiquidityETHCollateral calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (uint256 assetOut, uint128 collateralOut) {}

    /// @inheritdoc IRouter
    function lendGivenPercent(
        ILend.LendGivenPercent calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (uint256 assetIn, IPair.Claims memory claimsOut) {}

    /// @inheritdoc IRouter
    function lendGivenPercentETHAsset(
        ILend.LendGivenPercentETHAsset calldata,
        bytes32[] calldata _merkleProof
    ) external payable override returns (uint256 assetIn, IPair.Claims memory claimsOut) {}

    /// @inheritdoc IRouter
    function lendGivenPercentETHCollateral(
        ILend.LendGivenPercentETHCollateral calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (uint256 assetIn, IPair.Claims memory claimsOut) {}

    /// @inheritdoc IRouter
    function collect(
        IWithdraw.Collect calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (IPair.Tokens memory tokensOut) {}

    /// @inheritdoc IRouter
    function collectETHAsset(
        IWithdraw.CollectETHAsset calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (IPair.Tokens memory tokensOut) {}

    /// @inheritdoc IRouter
    function collectETHCollateral(
        IWithdraw.CollectETHCollateral calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (IPair.Tokens memory tokensOut) {}

    /// @inheritdoc IRouter
    function borrowGivenPercent(
        IBorrow.BorrowGivenPercent calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut) {}

    /// @inheritdoc IRouter
    function borrowGivenPercentETHAsset(
        IBorrow.BorrowGivenPercentETHAsset calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut) {}

    /// @inheritdoc IRouter
    function borrowGivenPercentETHCollateral(
        IBorrow.BorrowGivenPercentETHCollateral calldata,
        bytes32[] calldata _merkleProof
    ) external payable override returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut) {}

    /// @inheritdoc IRouter
    function repay(
        IPay.Repay calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (uint128 assetIn, uint128 collateralOut, uint256[] memory duesFullyPaid) {}

    /// @inheritdoc IRouter
    function repayETHAsset(
        IPay.RepayETHAsset calldata,
        bytes32[] calldata _merkleProof
    ) external payable override returns (uint128 assetIn, uint128 collateralOut, uint256[] memory duesFullyPaid) {}

    /// @inheritdoc IRouter
    function repayETHCollateral(
        IPay.RepayETHCollateral calldata,
        bytes32[] calldata _merkleProof
    ) external override returns (uint128 assetIn, uint128 collateralOut, uint256[] memory duesFullyPaid) {}

    /// @inheritdoc ICreditMintCallback
    function creditMintCallback(uint256, uint112, bytes calldata) external override {}

    /// @inheritdoc ICreditLendCallback
    function creditLendCallback(uint256, bytes calldata) external override {}

    /// @inheritdoc ICreditBorrowCallback
    function creditBorrowCallback(uint112, bytes calldata) external override {}

    /// @inheritdoc ICreditPayCallback
    function creditPayCallback(uint128, bytes calldata) external override {}

    function getPairAndVerify(IERC20, IERC20) private view returns (IPair pair) {}

    function callbackTransfer(IERC20, address, IPair, uint256) private {}

    /*///////////////////////////////////////////////////////////////
                        IERC 721 logic
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IERC721Receiver
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
