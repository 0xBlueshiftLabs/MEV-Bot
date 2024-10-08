// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IFactory } from "../../core/interfaces/IFactory.sol";
import { IPair } from "../../core/interfaces/IPair.sol";
import { ICreditPositionManager } from "../../tokens/interfaces/ICreditPositionManager.sol";
import { IRouter } from "../interfaces/IRouter.sol";
import { IWETH } from "../interfaces/IWETH.sol";
import { IMint } from "../interfaces/IMint.sol";
import { MintMath } from "./MintMath.sol";
import { MsgValue } from "./MsgValue.sol";
import { ETH } from "./ETH.sol";

library Mint {
    using MintMath for IPair;

    function newLiquidity(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPosition,
        IMint.NewLiquidity calldata params
    ) external returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        (assetIn, liquidityOut, id, dueOut) = _newLiquidity(
            creditPosition,
            IMint._NewLiquidity(
                router,
                factory,
                params.asset,
                params.collateral,
                params.maturity,
                msg.sender,
                msg.sender,
                params.liquidityTo,
                params.dueTo,
                params.assetIn,
                params.debtIn,
                params.collateralIn,
                params.deadline
            )
        );
    }

    function newLiquidityETHAsset(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPosition,
        IWETH weth,
        IMint.NewLiquidityETHAsset calldata params
    ) external returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        uint112 assetInETH = MsgValue.getUint112();

        (assetIn, liquidityOut, id, dueOut) = _newLiquidity(
            creditPosition,
            IMint._NewLiquidity(
                router,
                factory,
                weth,
                params.collateral,
                params.maturity,
                address(this),
                msg.sender,
                params.liquidityTo,
                params.dueTo,
                assetInETH,
                params.debtIn,
                params.collateralIn,
                params.deadline
            )
        );
    }

    function newLiquidityETHCollateral(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPosition,
        IWETH weth,
        IMint.NewLiquidityETHCollateral calldata params
    ) external returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        uint112 collateralIn = MsgValue.getUint112();

        (assetIn, liquidityOut, id, dueOut) = _newLiquidity(
            creditPosition,
            IMint._NewLiquidity(
                router,
                factory,
                params.asset,
                weth,
                params.maturity,
                msg.sender,
                address(this),
                params.liquidityTo,
                params.dueTo,
                params.assetIn,
                params.debtIn,
                collateralIn,
                params.deadline
            )
        );
    }

    function liquidityGivenAsset(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPosition,
        IMint.LiquidityGivenAsset calldata params
    ) external returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        (assetIn, liquidityOut, id, dueOut) = _liquidityGivenAsset(
            creditPosition,
            IMint._LiquidityGivenAsset(
                router,
                factory,
                params.asset,
                params.collateral,
                params.maturity,
                msg.sender,
                msg.sender,
                params.liquidityTo,
                params.dueTo,
                params.assetIn,
                params.minLiquidity,
                params.maxDebt,
                params.maxCollateral,
                params.deadline
            )
        );
    }

    function liquidityGivenAssetETHAsset(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPosition,
        IWETH weth,
        IMint.LiquidityGivenAssetETHAsset calldata params
    ) external returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        uint112 assetInETH = MsgValue.getUint112();

        (assetIn, liquidityOut, id, dueOut) = _liquidityGivenAsset(
            creditPosition,
            IMint._LiquidityGivenAsset(
                router,
                factory,
                weth,
                params.collateral,
                params.maturity,
                address(this),
                msg.sender,
                params.liquidityTo,
                params.dueTo,
                assetInETH,
                params.minLiquidity,
                params.maxDebt,
                params.maxCollateral,
                params.deadline
            )
        );
    }

    function liquidityGivenAssetETHCollateral(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPosition,
        IWETH weth,
        IMint.LiquidityGivenAssetETHCollateral calldata params
    ) external returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        uint112 maxCollateral = MsgValue.getUint112();

        (assetIn, liquidityOut, id, dueOut) = _liquidityGivenAsset(
            creditPosition,
            IMint._LiquidityGivenAsset(
                router,
                factory,
                params.asset,
                weth,
                params.maturity,
                msg.sender,
                address(this),
                params.liquidityTo,
                params.dueTo,
                params.assetIn,
                params.minLiquidity,
                params.maxDebt,
                maxCollateral,
                params.deadline
            )
        );

        if (maxCollateral > dueOut.collateral) {
            uint256 excess = maxCollateral;
            unchecked {
                excess -= dueOut.collateral;
            }
            ETH.transfer(payable(msg.sender), excess);
        }
    }

    function liquidityGivenCollateral(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPosition,
        IMint.LiquidityGivenCollateral memory params
    ) external returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        (assetIn, liquidityOut, id, dueOut) = _liquidityGivenCollateral(
            creditPosition,
            IMint._LiquidityGivenCollateral(
                router,
                factory,
                params.asset,
                params.collateral,
                params.maturity,
                msg.sender,
                msg.sender,
                params.liquidityTo,
                params.dueTo,
                params.collateralIn,
                params.minLiquidity,
                params.maxAsset,
                params.maxDebt,
                params.deadline
            )
        );
    }

    function liquidityGivenCollateralETHAsset(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPosition,
        IWETH weth,
        IMint.LiquidityGivenCollateralETHAsset memory params
    ) external returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        uint112 maxAsset = MsgValue.getUint112();

        (assetIn, liquidityOut, id, dueOut) = _liquidityGivenCollateral(
            creditPosition,
            IMint._LiquidityGivenCollateral(
                router,
                factory,
                weth,
                params.collateral,
                params.maturity,
                address(this),
                msg.sender,
                params.liquidityTo,
                params.dueTo,
                params.collateralIn,
                params.minLiquidity,
                maxAsset,
                params.maxDebt,
                params.deadline
            )
        );

        if (maxAsset > assetIn) {
            uint256 excess = maxAsset;
            unchecked {
                excess -= assetIn;
            }
            ETH.transfer(payable(msg.sender), excess);
        }
    }

    function liquidityGivenCollateralETHCollateral(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPosition,
        IWETH weth,
        IMint.LiquidityGivenCollateralETHCollateral memory params
    ) external returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        uint112 collateralIn = MsgValue.getUint112();

        (assetIn, liquidityOut, id, dueOut) = _liquidityGivenCollateral(
            creditPosition,
            IMint._LiquidityGivenCollateral(
                router,
                factory,
                params.asset,
                weth,
                params.maturity,
                msg.sender,
                address(this),
                params.liquidityTo,
                params.dueTo,
                collateralIn,
                params.minLiquidity,
                params.maxAsset,
                params.maxDebt,
                params.deadline
            )
        );
    }

    function _newLiquidity(
        ICreditPositionManager creditPosition,
        IMint._NewLiquidity memory params
    ) private returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        require(params.debtIn > params.assetIn, "E516");
        require(params.maturity > block.timestamp, "E508");
        IPair pair = params.factory.getPair(params.asset, params.collateral);
        if (address(pair) == address(0)) pair = params.factory.createPair(params.asset, params.collateral);

        require(pair.totalLiquidity(params.maturity) == 0, "E506");

        (uint112 xIncrease, uint112 yIncrease, uint112 zIncrease) = MintMath.givenNew(
            params.maturity,
            params.assetIn,
            params.debtIn,
            params.collateralIn
        );

        (assetIn, liquidityOut, id, dueOut) = _mint(
            creditPosition,
            IMint._Mint(
                params.router,
                pair,
                params.asset,
                params.collateral,
                params.maturity,
                params.assetFrom,
                params.collateralFrom,
                params.liquidityTo,
                params.dueTo,
                xIncrease,
                yIncrease,
                zIncrease,
                params.deadline
            )
        );
    }

    function _liquidityGivenAsset(
        ICreditPositionManager creditPosition,
        IMint._LiquidityGivenAsset memory params
    ) private returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        IPair pair = params.factory.getPair(params.asset, params.collateral);
        require(address(pair) != address(0), "E501");
        require(pair.totalLiquidity(params.maturity) != 0, "E507");

        (uint112 xIncrease, uint112 yIncrease, uint112 zIncrease) = pair.givenAsset(params.maturity, params.assetIn);

        (assetIn, liquidityOut, id, dueOut) = _mint(
            creditPosition,
            IMint._Mint(
                params.router,
                pair,
                params.asset,
                params.collateral,
                params.maturity,
                params.assetFrom,
                params.collateralFrom,
                params.liquidityTo,
                params.dueTo,
                xIncrease,
                yIncrease,
                zIncrease,
                params.deadline
            )
        );

        require(liquidityOut >= params.minLiquidity, "E511");
        require(dueOut.collateral <= params.maxCollateral, "E513");
    }

    function _liquidityGivenCollateral(
        ICreditPositionManager creditPosition,
        IMint._LiquidityGivenCollateral memory params
    ) private returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        IPair pair = params.factory.getPair(params.asset, params.collateral);
        require(address(pair) != address(0), "E501");
        require(pair.totalLiquidity(params.maturity) != 0, "E507");

        (uint112 xIncrease, uint112 yIncrease, uint112 zIncrease) = pair.givenCollateral(
            params.maturity,
            params.collateralIn
        );
        (assetIn, liquidityOut, id, dueOut) = _mint(
            creditPosition,
            IMint._Mint(
                params.router,
                pair,
                params.asset,
                params.collateral,
                params.maturity,
                params.assetFrom,
                params.collateralFrom,
                params.liquidityTo,
                params.dueTo,
                xIncrease,
                yIncrease,
                zIncrease,
                params.deadline
            )
        );
        require(liquidityOut >= params.minLiquidity, "E511");
        require(xIncrease <= params.maxAsset, "E519");
    }

    function _mint(
        ICreditPositionManager creditPosition,
        IMint._Mint memory params
    ) private returns (uint256 assetIn, uint256 liquidityOut, uint256 id, IPair.Due memory dueOut) {
        require(params.deadline >= block.timestamp, "E504");
        require(params.maturity > block.timestamp, "E508");

        (assetIn, liquidityOut, id, dueOut) = params.pair.mint(
            IPair.MintParam(
                params.maturity,
                address(this),
                address(this),
                params.xIncrease,
                params.yIncrease,
                params.zIncrease,
                bytes(abi.encode(params.asset, params.collateral, params.assetFrom, params.collateralFrom))
            )
        );

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = liquidityOut;

        ICreditPositionManager.MintParams memory mintParams = ICreditPositionManager.MintParams({
            pair: params.pair,
            maturity: params.maturity,
            positionType: ICreditPositionManager.PositionType.LIQUIDITY,
            amounts: amounts,
            recipient: params.liquidityTo
        });

        creditPosition.mint(mintParams);
    }
}
