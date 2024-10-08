// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IFactory } from "../../core/interfaces/IFactory.sol";
import { IPair } from "../../core/interfaces/IPair.sol";
import { ICreditPositionManager } from "../../tokens/interfaces/ICreditPositionManager.sol";
import { IRouter } from "../interfaces/IRouter.sol";
import { IWETH } from "../interfaces/IWETH.sol";
import { IBorrow } from "../interfaces/IBorrow.sol";
import { BorrowMath } from "./BorrowMath.sol";
import { MsgValue } from "./MsgValue.sol";
import { ETH } from "./ETH.sol";

library Borrow {
    using BorrowMath for IPair;

    function borrowGivenPercent(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IBorrow.BorrowGivenPercent calldata params
    ) external returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut) {
        (assetOut, id, dueOut) = _borrowGivenPercent(
            creditPositionManager,
            IBorrow._BorrowGivenPercent(
                router,
                factory,
                params.asset,
                params.collateral,
                params.maturity,
                msg.sender,
                params.assetTo,
                params.dueTo,
                params.assetOut,
                params.percent,
                params.maxDebt,
                params.maxCollateral,
                params.deadline
            )
        );
    }

    function borrowGivenPercentETHAsset(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IWETH weth,
        IBorrow.BorrowGivenPercentETHAsset calldata params
    ) external returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut) {
        (assetOut, id, dueOut) = _borrowGivenPercent(
            creditPositionManager,
            IBorrow._BorrowGivenPercent(
                router,
                factory,
                weth,
                params.collateral,
                params.maturity,
                msg.sender,
                address(this),
                params.dueTo,
                params.assetOut,
                params.percent,
                params.maxDebt,
                params.maxCollateral,
                params.deadline
            )
        );

        weth.withdraw(assetOut);
        ETH.transfer(params.assetTo, assetOut);
    }

    function borrowGivenPercentETHCollateral(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IWETH weth,
        IBorrow.BorrowGivenPercentETHCollateral calldata params
    ) external returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut) {
        uint112 maxCollateral = MsgValue.getUint112();

        (assetOut, id, dueOut) = _borrowGivenPercent(
            creditPositionManager,
            IBorrow._BorrowGivenPercent(
                router,
                factory,
                params.asset,
                weth,
                params.maturity,
                address(this),
                params.assetTo,
                params.dueTo,
                params.assetOut,
                params.percent,
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

    function _borrowGivenPercent(
        ICreditPositionManager creditPositionManager,
        IBorrow._BorrowGivenPercent memory params
    ) private returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut) {
        require(params.percent <= 0x100000000, "E505");

        IPair pair = params.factory.getPair(params.asset, params.collateral);
        require(address(pair) != address(0), "E501");

        (uint112 xDecrease, uint112 yIncrease, uint112 zIncrease) = pair.givenPercent(
            params.maturity,
            params.assetOut,
            params.percent
        );

        (assetOut, id, dueOut) = _borrow(
            creditPositionManager,
            IBorrow._Borrow(
                params.router,
                pair,
                params.asset,
                params.collateral,
                params.maturity,
                params.from,
                params.assetTo,
                params.dueTo,
                xDecrease,
                yIncrease,
                zIncrease,
                params.deadline
            )
        );

        require(dueOut.debt <= params.maxDebt, "E512");
        require(dueOut.collateral <= params.maxCollateral, "E513");
    }

    function _borrow(
        ICreditPositionManager creditPositionManager,
        IBorrow._Borrow memory params
    ) private returns (uint256 assetOut, uint256 id, IPair.Due memory dueOut) {
        require(params.deadline >= block.timestamp, "E504");
        require(params.maturity > block.timestamp, "E508");

        (assetOut, id, dueOut) = params.pair.borrow(
            IPair.BorrowParam(
                params.maturity,
                params.assetTo,
                address(this),
                params.xDecrease,
                params.yIncrease,
                params.zIncrease,
                bytes(abi.encode(params.asset, params.collateral, params.from))
            )
        );

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = id;

        ICreditPositionManager.MintParams memory mintParams = ICreditPositionManager.MintParams({
            pair: params.pair,
            maturity: params.maturity,
            positionType: ICreditPositionManager.PositionType.DEBT,
            amounts: amounts,
            recipient: params.dueTo
        });

        creditPositionManager.mint(mintParams);
    }
}
