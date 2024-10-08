// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IPair } from "../../core/interfaces/IPair.sol";
import { IFactory } from "../../core/interfaces/IFactory.sol";
import { ICreditPositionManager } from "../../tokens/interfaces/ICreditPositionManager.sol";
import { IRouter } from "../interfaces/IRouter.sol";
import { IWETH } from "../interfaces/IWETH.sol";
import { ILend } from "../interfaces/ILend.sol";
import { LendMath } from "./LendMath.sol";
import { MsgValue } from "./MsgValue.sol";

library Lend {
    using LendMath for IPair;

    function lendGivenPercent(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        ILend.LendGivenPercent calldata params
    ) external returns (uint256 assetIn, IPair.Claims memory claimsOut) {
        (assetIn, claimsOut) = _lendGivenPercent(
            creditPositionManager,
            ILend._LendGivenPercent(
                router,
                factory,
                params.asset,
                params.collateral,
                params.maturity,
                msg.sender,
                params.to,
                params.assetIn,
                params.percent,
                params.minLoan,
                params.minCoverage,
                params.deadline
            )
        );
    }

    function lendGivenPercentETHAsset(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IWETH weth,
        ILend.LendGivenPercentETHAsset calldata params
    ) external returns (uint256 assetIn, IPair.Claims memory claimsOut) {
        uint112 assetInETH = MsgValue.getUint112();

        (assetIn, claimsOut) = _lendGivenPercent(
            creditPositionManager,
            ILend._LendGivenPercent(
                router,
                factory,
                weth,
                params.collateral,
                params.maturity,
                address(this),
                params.to,
                assetInETH,
                params.percent,
                params.minLoan,
                params.minCoverage,
                params.deadline
            )
        );
    }

    function lendGivenPercentETHCollateral(
        IRouter router,
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IWETH weth,
        ILend.LendGivenPercentETHCollateral calldata params
    ) external returns (uint256 assetIn, IPair.Claims memory claimsOut) {
        (assetIn, claimsOut) = _lendGivenPercent(
            creditPositionManager,
            ILend._LendGivenPercent(
                router,
                factory,
                params.asset,
                weth,
                params.maturity,
                msg.sender,
                params.to,
                params.assetIn,
                params.percent,
                params.minLoan,
                params.minCoverage,
                params.deadline
            )
        );
    }

    function _lendGivenPercent(
        ICreditPositionManager creditPositionManager,
        ILend._LendGivenPercent memory params
    ) private returns (uint256 assetIn, IPair.Claims memory claimsOut) {
        require(params.percent <= 0x100000000, "E505");

        IPair pair = params.factory.getPair(params.asset, params.collateral);
        require(address(pair) != address(0), "E501");

        (uint112 xIncrease, uint112 yDecrease, uint112 zDecrease) = pair.givenPercent(
            params.maturity,
            params.assetIn,
            params.percent
        );

        (assetIn, claimsOut) = _lend(
            creditPositionManager,
            ILend._Lend(
                params.router,
                pair,
                params.asset,
                params.collateral,
                params.maturity,
                params.from,
                params.to,
                xIncrease,
                yDecrease,
                zDecrease,
                params.deadline
            )
        );

        require(uint128(claimsOut.loanInterest) + claimsOut.loanPrincipal >= params.minLoan, "E514");
        require(uint128(claimsOut.coverageInterest) + claimsOut.coveragePrincipal >= params.minCoverage, "E515");
    }

    function _lend(
        ICreditPositionManager creditPositionManager,
        ILend._Lend memory params
    ) private returns (uint256 assetIn, IPair.Claims memory claimsOut) {
        require(params.deadline >= block.timestamp, "E504");
        require(params.maturity > block.timestamp, "E508");

        (assetIn, claimsOut) = params.pair.lend(
            IPair.LendParam(
                params.maturity,
                address(this),
                address(this),
                params.xIncrease,
                params.yDecrease,
                params.zDecrease,
                bytes(abi.encode(params.asset, params.collateral, params.from))
            )
        );

        uint256[] memory amounts = new uint256[](4);
        amounts[0] = claimsOut.loanPrincipal;
        amounts[1] = claimsOut.loanInterest;
        amounts[2] = claimsOut.coveragePrincipal;
        amounts[3] = claimsOut.coverageInterest;

        ICreditPositionManager.MintParams memory mintParams = ICreditPositionManager.MintParams({
            pair: params.pair,
            maturity: params.maturity,
            positionType: ICreditPositionManager.PositionType.CREDIT,
            amounts: amounts,
            recipient: params.to
        });

        creditPositionManager.mint(mintParams);
    }
}
