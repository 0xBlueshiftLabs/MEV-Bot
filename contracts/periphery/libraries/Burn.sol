// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IFactory } from "../../core/interfaces/IFactory.sol";
import { IPair } from "../../core/interfaces/IPair.sol";
import { IRouter } from "../interfaces/IRouter.sol";
import { ICreditPositionManager } from "../../tokens/interfaces/ICreditPositionManager.sol";
import { IWETH } from "../interfaces/IWETH.sol";
import { IBurn } from "../interfaces/IBurn.sol";
import { ETH } from "./ETH.sol";

library Burn {
    function removeLiquidity(
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IBurn.RemoveLiquidity calldata params
    ) external returns (uint256 assetOut, uint128 collateralOut) {
        (assetOut, collateralOut) = _removeLiquidity(
            creditPositionManager,
            IBurn._RemoveLiquidity(
                factory,
                params.asset,
                params.collateral,
                params.maturity,
                params.assetTo,
                params.collateralTo,
                params.creditPositionId
            )
        );
    }

    function removeLiquidityETHAsset(
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IWETH weth,
        IBurn.RemoveLiquidityETHAsset calldata params
    ) external returns (uint256 assetOut, uint128 collateralOut) {
        (assetOut, collateralOut) = _removeLiquidity(
            creditPositionManager,
            IBurn._RemoveLiquidity(
                factory,
                weth,
                params.collateral,
                params.maturity,
                address(this),
                params.collateralTo,
                params.creditPositionId
            )
        );

        if (assetOut != 0) {
            weth.withdraw(assetOut);
            ETH.transfer(params.assetTo, assetOut);
        }
    }

    function removeLiquidityETHCollateral(
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IWETH weth,
        IBurn.RemoveLiquidityETHCollateral calldata params
    ) external returns (uint256 assetOut, uint128 collateralOut) {
        (assetOut, collateralOut) = _removeLiquidity(
            creditPositionManager,
            IBurn._RemoveLiquidity(
                factory,
                params.asset,
                weth,
                params.maturity,
                params.assetTo,
                address(this),
                params.creditPositionId
            )
        );

        if (collateralOut != 0) {
            weth.withdraw(collateralOut);
            ETH.transfer(params.collateralTo, collateralOut);
        }
    }

    function _removeLiquidity(
        ICreditPositionManager creditPositionManager,
        IBurn._RemoveLiquidity memory params
    ) private returns (uint256 assetOut, uint128 collateralOut) {
        IPair pair = params.factory.getPair(params.asset, params.collateral);
        require(address(pair) != address(0), "E501");
        require(creditPositionManager.ownerOf(params.creditPositionId) == msg.sender, "E603");
        require(
            creditPositionManager.getPositionType(params.creditPositionId) ==
                ICreditPositionManager.PositionType.LIQUIDITY,
            "E524"
        );

        uint256 liquidityIn = ICreditPositionManager(creditPositionManager).getLiquidity(params.creditPositionId);

        creditPositionManager.burn(params.creditPositionId);

        (assetOut, collateralOut) = pair.burn(
            IPair.BurnParam(params.maturity, params.assetTo, params.collateralTo, liquidityIn)
        );
    }
}
