// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IERC721Receiver } from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

import { IFactory } from "../core/interfaces/IFactory.sol";
import { IPair } from "../core/interfaces/IPair.sol";
import { ICreditPayCallback } from "../core/interfaces/callback/ICreditPayCallback.sol";
import { ICreditBorrowCallback } from "../core/interfaces/callback/ICreditBorrowCallback.sol";
import { ICreditMintCallback } from "../core/interfaces/callback/ICreditMintCallback.sol";
import { ICreditLendCallback } from "../core/interfaces/callback/ICreditLendCallback.sol";
import { ICreditPositionManager } from "../tokens/interfaces/ICreditPositionManager.sol";
import { IBorrow } from "./interfaces/IBorrow.sol";
import { IBurn } from "./interfaces/IBurn.sol";
import { ILend } from "./interfaces/ILend.sol";
import { IMint } from "./interfaces/IMint.sol";
import { IPay } from "./interfaces/IPay.sol";
import { IWETH } from "./interfaces/IWETH.sol";
import { IWithdraw } from "./interfaces/IWithdraw.sol";
import { IRouter } from "./interfaces/IRouter.sol";
import { Borrow } from "./libraries/Borrow.sol";
import { Burn } from "./libraries/Burn.sol";
import { Lend } from "./libraries/Lend.sol";
import { Mint } from "./libraries/Mint.sol";
import { Pay } from "./libraries/Pay.sol";
import { SafeTransfer } from "./libraries/SafeTransfer.sol";
import { Withdraw } from "./libraries/Withdraw.sol";

/**
 * @title Credit Router
 * @notice This contract provides router functions for users to interact with the Credit protocol.
 */
contract CreditRouter is IRouter, IERC721Receiver, Initializable, UUPSUpgradeable, OwnableUpgradeable {
    using SafeTransfer for IERC20;

    /*///////////////////////////////////////////////////////////////
                        State variables
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IRouter
    IFactory public override factory;
    /// @inheritdoc IRouter
    IWETH public override weth;
    /// @inheritdoc IRouter
    ICreditPositionManager public override creditPositionManager;

    bytes32 public merkleRoot;

    /*///////////////////////////////////////////////////////////////
                        Init
    //////////////////////////////////////////////////////////////*/

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

    function setMerkleRoot(bytes32 _merkleRoot) external onlyOwner {
        merkleRoot = _merkleRoot;
    }

    modifier onlyWhitelist(bytes32[] calldata _merkleProof) {
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(msg.sender))));
        require(MerkleProof.verify(_merkleProof, merkleRoot, leaf), "Faucet: Not part of the whitelist");
        _;
    }

    /*///////////////////////////////////////////////////////////////
                        Owner functions
    //////////////////////////////////////////////////////////////*/

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address) internal override onlyOwner {}

    /*///////////////////////////////////////////////////////////////
                        Core logic
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IRouter
    function deployPair(DeployPair calldata params) external override {
        //slither-disable-next-line unused-return
        factory.createPair(params.asset, params.collateral);
    }

    /// @inheritdoc IRouter
    function newLiquidity(
        IMint.NewLiquidity calldata params
    ) external override onlyOwner returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        (assetIn, liquidityOut, id, dueOut) = Mint.newLiquidity(this, factory, creditPositionManager, params);
    }

    /// @inheritdoc IRouter
    function newLiquidityETHAsset(
        IMint.NewLiquidityETHAsset calldata params
    )
        external
        payable
        override
        onlyOwner
        returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut)
    {
        (assetIn, liquidityOut, id, dueOut) = Mint.newLiquidityETHAsset(
            this,
            factory,
            creditPositionManager,
            weth,
            params
        );
    }

    /// @inheritdoc IRouter
    function newLiquidityETHCollateral(
        IMint.NewLiquidityETHCollateral calldata params
    )
        external
        payable
        override
        onlyOwner
        returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut)
    {
        (assetIn, liquidityOut, id, dueOut) = Mint.newLiquidityETHCollateral(
            this,
            factory,
            creditPositionManager,
            weth,
            params
        );
    }

    receive() external payable {
        require(msg.sender == address(weth), "E615");
    }

    /// @inheritdoc IRouter
    function liquidityGivenAsset(
        IMint.LiquidityGivenAsset calldata params,
        bytes32[] calldata _merkleProof
    )
        external
        override
        onlyWhitelist(_merkleProof)
        returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut)
    {
        (assetIn, liquidityOut, id, dueOut) = Mint.liquidityGivenAsset(this, factory, creditPositionManager, params);
    }

    /// @inheritdoc IRouter
    function liquidityGivenAssetETHAsset(
        IMint.LiquidityGivenAssetETHAsset calldata params,
        bytes32[] calldata _merkleProof
    )
        external
        payable
        override
        onlyWhitelist(_merkleProof)
        returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut)
    {
        (assetIn, liquidityOut, id, dueOut) = Mint.liquidityGivenAssetETHAsset(
            this,
            factory,
            creditPositionManager,
            weth,
            params
        );
    }

    /// @inheritdoc IRouter
    function liquidityGivenAssetETHCollateral(
        IMint.LiquidityGivenAssetETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    )
        external
        payable
        override
        onlyWhitelist(_merkleProof)
        returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut)
    {
        (assetIn, liquidityOut, id, dueOut) = Mint.liquidityGivenAssetETHCollateral(
            this,
            factory,
            creditPositionManager,
            weth,
            params
        );
    }

    /// @inheritdoc IRouter
    function liquidityGivenCollateral(
        IMint.LiquidityGivenCollateral calldata params,
        bytes32[] calldata _merkleProof
    )
        external
        override
        onlyWhitelist(_merkleProof)
        returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut)
    {
        (assetIn, liquidityOut, id, dueOut) = Mint.liquidityGivenCollateral(
            this,
            factory,
            creditPositionManager,
            params
        );
    }

    /// @inheritdoc IRouter
    function liquidityGivenCollateralETHAsset(
        IMint.LiquidityGivenCollateralETHAsset calldata params,
        bytes32[] calldata _merkleProof
    )
        external
        payable
        override
        onlyWhitelist(_merkleProof)
        returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut)
    {
        (assetIn, liquidityOut, id, dueOut) = Mint.liquidityGivenCollateralETHAsset(
            this,
            factory,
            creditPositionManager,
            weth,
            params
        );
    }

    /// @inheritdoc IRouter
    function liquidityGivenCollateralETHCollateral(
        IMint.LiquidityGivenCollateralETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    )
        external
        payable
        override
        onlyWhitelist(_merkleProof)
        returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut)
    {
        (assetIn, liquidityOut, id, dueOut) = Mint.liquidityGivenCollateralETHCollateral(
            this,
            factory,
            creditPositionManager,
            weth,
            params
        );
    }

    /// @inheritdoc IRouter
    function removeLiquidity(
        IBurn.RemoveLiquidity calldata params,
        bytes32[] calldata _merkleProof
    ) external override onlyWhitelist(_merkleProof) returns (uint256 assetOut, uint128 collateralOut) {
        (assetOut, collateralOut) = Burn.removeLiquidity(factory, creditPositionManager, params);
    }

    /// @inheritdoc IRouter
    function removeLiquidityETHAsset(
        IBurn.RemoveLiquidityETHAsset calldata params,
        bytes32[] calldata _merkleProof
    ) external override onlyWhitelist(_merkleProof) returns (uint256 assetOut, uint128 collateralOut) {
        (assetOut, collateralOut) = Burn.removeLiquidityETHAsset(factory, creditPositionManager, weth, params);
    }

    /// @inheritdoc IRouter
    function removeLiquidityETHCollateral(
        IBurn.RemoveLiquidityETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    ) external override onlyWhitelist(_merkleProof) returns (uint256 assetOut, uint128 collateralOut) {
        (assetOut, collateralOut) = Burn.removeLiquidityETHCollateral(factory, creditPositionManager, weth, params);
    }

    /// @inheritdoc IRouter
    function lendGivenPercent(
        ILend.LendGivenPercent calldata params,
        bytes32[] calldata _merkleProof
    ) external override onlyWhitelist(_merkleProof) returns (uint256 assetIn, IPair.Claims memory claimsOut) {
        (assetIn, claimsOut) = Lend.lendGivenPercent(this, factory, creditPositionManager, params);
    }

    /// @inheritdoc IRouter
    function lendGivenPercentETHAsset(
        ILend.LendGivenPercentETHAsset calldata params,
        bytes32[] calldata _merkleProof
    ) external payable override onlyWhitelist(_merkleProof) returns (uint256 assetIn, IPair.Claims memory claimsOut) {
        (assetIn, claimsOut) = Lend.lendGivenPercentETHAsset(this, factory, creditPositionManager, weth, params);
    }

    /// @inheritdoc IRouter
    function lendGivenPercentETHCollateral(
        ILend.LendGivenPercentETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    ) external override onlyWhitelist(_merkleProof) returns (uint256 assetIn, IPair.Claims memory claimsOut) {
        (assetIn, claimsOut) = Lend.lendGivenPercentETHCollateral(this, factory, creditPositionManager, weth, params);
    }

    /// @inheritdoc IRouter
    function collect(
        IWithdraw.Collect calldata params,
        bytes32[] calldata _merkleProof
    ) external override onlyWhitelist(_merkleProof) returns (IPair.Tokens memory tokensOut) {
        tokensOut = Withdraw.collect(factory, creditPositionManager, params);
    }

    /// @inheritdoc IRouter
    function collectETHAsset(
        IWithdraw.CollectETHAsset calldata params,
        bytes32[] calldata _merkleProof
    ) external override onlyWhitelist(_merkleProof) returns (IPair.Tokens memory tokensOut) {
        tokensOut = Withdraw.collectETHAsset(factory, creditPositionManager, weth, params);
    }

    /// @inheritdoc IRouter
    function collectETHCollateral(
        IWithdraw.CollectETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    ) external override onlyWhitelist(_merkleProof) returns (IPair.Tokens memory tokensOut) {
        tokensOut = Withdraw.collectETHCollateral(factory, creditPositionManager, weth, params);
    }

    /// @inheritdoc IRouter
    function borrowGivenPercent(
        IBorrow.BorrowGivenPercent calldata params,
        bytes32[] calldata _merkleProof
    ) external override onlyWhitelist(_merkleProof) returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut) {
        (assetOut, id, dueOut) = Borrow.borrowGivenPercent(this, factory, creditPositionManager, params);
    }

    /// @inheritdoc IRouter
    function borrowGivenPercentETHAsset(
        IBorrow.BorrowGivenPercentETHAsset calldata params,
        bytes32[] calldata _merkleProof
    ) external override onlyWhitelist(_merkleProof) returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut) {
        (assetOut, id, dueOut) = Borrow.borrowGivenPercentETHAsset(this, factory, creditPositionManager, weth, params);
    }

    /// @inheritdoc IRouter
    function borrowGivenPercentETHCollateral(
        IBorrow.BorrowGivenPercentETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    )
        external
        payable
        override
        onlyWhitelist(_merkleProof)
        returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut)
    {
        (assetOut, id, dueOut) = Borrow.borrowGivenPercentETHCollateral(
            this,
            factory,
            creditPositionManager,
            weth,
            params
        );
    }

    /// @inheritdoc IRouter
    function repay(
        IPay.Repay calldata params,
        bytes32[] calldata _merkleProof
    )
        external
        override
        onlyWhitelist(_merkleProof)
        returns (uint128 assetIn, uint128 collateralOut, uint256[] memory creditPositionFullyPaid)
    {
        (assetIn, collateralOut, creditPositionFullyPaid) = Pay.pay(factory, creditPositionManager, params);
    }

    /// @inheritdoc IRouter
    function repayETHAsset(
        IPay.RepayETHAsset calldata params,
        bytes32[] calldata _merkleProof
    )
        external
        payable
        override
        onlyWhitelist(_merkleProof)
        returns (uint128 assetIn, uint128 collateralOut, uint256[] memory creditPositionFullyPaid)
    {
        (assetIn, collateralOut, creditPositionFullyPaid) = Pay.payETHAsset(
            factory,
            creditPositionManager,
            weth,
            params
        );
    }

    /// @inheritdoc IRouter
    function repayETHCollateral(
        IPay.RepayETHCollateral calldata params,
        bytes32[] calldata _merkleProof
    )
        external
        override
        onlyWhitelist(_merkleProof)
        returns (uint128 assetIn, uint128 collateralOut, uint256[] memory creditPositionFullyPaid)
    {
        (assetIn, collateralOut, creditPositionFullyPaid) = Pay.payETHCollateral(
            factory,
            creditPositionManager,
            weth,
            params
        );
    }

    /*///////////////////////////////////////////////////////////////
                        Callback
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ICreditMintCallback
    function creditMintCallback(uint256 assetIn, uint112 collateralIn, bytes calldata data) external override {
        (IERC20 asset, IERC20 collateral, address assetFrom, address collateralFrom) = abi.decode(
            data,
            (IERC20, IERC20, address, address)
        );
        IPair pair = getPairAndVerify(asset, collateral);
        callbackTransfer(asset, assetFrom, pair, assetIn);
        callbackTransfer(collateral, collateralFrom, pair, collateralIn);
    }

    /// @inheritdoc ICreditLendCallback
    function creditLendCallback(uint256 assetIn, bytes calldata data) external override {
        (IERC20 asset, IERC20 collateral, address from) = abi.decode(data, (IERC20, IERC20, address));
        IPair pair = getPairAndVerify(asset, collateral);
        callbackTransfer(asset, from, pair, assetIn);
    }

    /// @inheritdoc ICreditBorrowCallback
    function creditBorrowCallback(uint112 collateralIn, bytes calldata data) external override {
        (IERC20 asset, IERC20 collateral, address from) = abi.decode(data, (IERC20, IERC20, address));
        IPair pair = getPairAndVerify(asset, collateral);
        callbackTransfer(collateral, from, pair, collateralIn);
    }

    /// @inheritdoc ICreditPayCallback
    function creditPayCallback(uint128 assetIn, bytes calldata data) external override {
        (IERC20 asset, IERC20 collateral, address from) = abi.decode(data, (IERC20, IERC20, address));
        IPair pair = getPairAndVerify(asset, collateral);
        callbackTransfer(asset, from, pair, assetIn);
    }

    function getPairAndVerify(IERC20 asset, IERC20 collateral) private view returns (IPair pair) {
        pair = factory.getPair(asset, collateral);
        require(msg.sender == address(pair), "E701");
    }

    function callbackTransfer(IERC20 token, address from, IPair pair, uint256 tokenIn) private {
        if (from == address(this)) {
            // slither-disable-next-line arbitrary-send-eth
            weth.deposit{ value: tokenIn }();
            // slither-disable-next-line arbitrary-send-erc20
            token.safeTransfer(pair, tokenIn);
        } else {
            // slither-disable-next-line arbitrary-send-erc20
            token.safeTransferFrom(from, pair, tokenIn);
        }
    }

    /*///////////////////////////////////////////////////////////////
                        IERC 721 logic
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IERC721Receiver
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}
