// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IFactory } from "../../core/interfaces/IFactory.sol";
import { IPair } from "../../core/interfaces/IPair.sol";
import { ICreditPositionManager } from "../../tokens/interfaces/ICreditPositionManager.sol";
import { IDue } from "../../tokens/interfaces/IDue.sol";
import { IRouter } from "../interfaces/IRouter.sol";
import { IWETH } from "../interfaces/IWETH.sol";
import { IPay } from "../interfaces/IPay.sol";
import { MsgValue } from "./MsgValue.sol";
import { ETH } from "./ETH.sol";
import { PayMath } from "./PayMath.sol";

library Pay {
    using PayMath for IPair;

    function pay(
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IPay.Repay memory params
    ) external returns (uint128 assetIn, uint128 collateralOut, uint256[] memory creditPositionFullyPaid) {
        (assetIn, collateralOut, creditPositionFullyPaid) = _pay(
            creditPositionManager,
            IPay._Repay(
                factory,
                params.asset,
                params.collateral,
                params.maturity,
                msg.sender,
                params.collateralTo,
                params.creditPositionIds,
                params.maxAssetsIn,
                params.deadline
            )
        );
    }

    function payETHAsset(
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IWETH weth,
        IPay.RepayETHAsset memory params
    ) external returns (uint128 assetIn, uint128 collateralOut, uint256[] memory creditPositionFullyPaid) {
        uint128 maxAssetIn = MsgValue.getUint112();

        (assetIn, collateralOut, creditPositionFullyPaid) = _pay(
            creditPositionManager,
            IPay._Repay(
                factory,
                weth,
                params.collateral,
                params.maturity,
                address(this),
                params.collateralTo,
                params.creditPositionIds,
                params.maxAssetsIn,
                params.deadline
            )
        );

        if (maxAssetIn > assetIn) {
            uint256 excess = maxAssetIn;
            unchecked {
                excess -= assetIn;
            }
            ETH.transfer(payable(msg.sender), excess);
        }
    }

    function payETHCollateral(
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IWETH weth,
        IPay.RepayETHCollateral memory params
    ) external returns (uint128 assetIn, uint128 collateralOut, uint256[] memory creditPositionFullyPaid) {
        (assetIn, collateralOut, creditPositionFullyPaid) = _pay(
            creditPositionManager,
            IPay._Repay(
                factory,
                params.asset,
                weth,
                params.maturity,
                msg.sender,
                address(this),
                params.creditPositionIds,
                params.maxAssetsIn,
                params.deadline
            )
        );

        if (collateralOut != 0) {
            weth.withdraw(collateralOut);
            ETH.transfer(params.collateralTo, collateralOut);
        }
    }

    function _pay(
        ICreditPositionManager creditPositionManager,
        IPay._Repay memory params
    ) private returns (uint128 assetIn, uint128 collateralOut, uint256[] memory creditPositionFullyPaid) {
        require(params.deadline >= block.timestamp, "E504");
        require(params.maturity > block.timestamp, "E508");

        IPair pair = params.factory.getPair(params.asset, params.collateral);
        require(address(pair) != address(0), "E501");

        (uint256[] memory ids, uint112[] memory assetsIn, uint112[] memory collateralsOut) = pair.givenMaxAssetsIn(
            params.maturity,
            creditPositionManager,
            params.creditPositionIds,
            params.maxAssetsIn
        );

        uint256[] memory duesFullyPaid;
        (assetIn, collateralOut, duesFullyPaid) = pair.pay(
            IPair.PayParam(
                params.maturity,
                params.collateralTo,
                address(this),
                ids,
                assetsIn,
                collateralsOut,
                bytes(abi.encode(params.asset, params.collateral, params.from, params.maturity))
            )
        );

        creditPositionFullyPaid = new uint256[](duesFullyPaid.length);

        for (uint256 i = 0; i < duesFullyPaid.length; i++) {
            creditPositionFullyPaid[i] = creditPositionManager.creditPositionOf(duesFullyPaid[i]);
        }

        for (uint256 i = 0; i < creditPositionFullyPaid.length; i++) {
            creditPositionManager.burn(creditPositionFullyPaid[i]);
        }
    }
}
