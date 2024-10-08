// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IFactory } from "../../core/interfaces/IFactory.sol";
import { IPair } from "../../core/interfaces/IPair.sol";
import { ICreditPositionManager } from "../../tokens/interfaces/ICreditPositionManager.sol";
import { IRouter } from "../interfaces/IRouter.sol";
import { IWETH } from "../interfaces/IWETH.sol";
import { IWithdraw } from "../interfaces/IWithdraw.sol";
import { ETH } from "./ETH.sol";

library Withdraw {
    function collect(
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IWithdraw.Collect calldata params
    ) external returns (IPair.Tokens memory tokensOut) {
        tokensOut = _collect(
            creditPositionManager,
            IWithdraw._Collect(
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

    function collectETHAsset(
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IWETH weth,
        IWithdraw.CollectETHAsset calldata params
    ) external returns (IPair.Tokens memory tokensOut) {
        tokensOut = _collect(
            creditPositionManager,
            IWithdraw._Collect(
                factory,
                weth,
                params.collateral,
                params.maturity,
                address(this),
                params.collateralTo,
                params.creditPositionId
            )
        );

        if (tokensOut.asset != 0) {
            weth.withdraw(tokensOut.asset);
            ETH.transfer(params.assetTo, tokensOut.asset);
        }
    }

    function collectETHCollateral(
        IFactory factory,
        ICreditPositionManager creditPositionManager,
        IWETH weth,
        IWithdraw.CollectETHCollateral calldata params
    ) external returns (IPair.Tokens memory tokensOut) {
        tokensOut = _collect(
            creditPositionManager,
            IWithdraw._Collect(
                factory,
                params.asset,
                weth,
                params.maturity,
                params.assetTo,
                address(this),
                params.creditPositionId
            )
        );

        if (tokensOut.collateral != 0) {
            weth.withdraw(tokensOut.collateral);
            ETH.transfer(params.collateralTo, tokensOut.collateral);
        }
    }

    function _collect(
        ICreditPositionManager creditPositionManager,
        IWithdraw._Collect memory params
    ) private returns (IPair.Tokens memory tokensOut) {
        IPair pair = params.factory.getPair(params.asset, params.collateral);
        require(address(pair) != address(0), "E501");
        require(creditPositionManager.ownerOf(params.creditPositionId) == msg.sender, "E603");
        require(
            creditPositionManager.getPositionType(params.creditPositionId) ==
                ICreditPositionManager.PositionType.CREDIT,
            "E524"
        );

        (
            uint256 loanPrincipal,
            uint256 loanInterest,
            uint256 coveragePrincipal,
            uint256 coverageInterest
        ) = ICreditPositionManager(creditPositionManager).getCredit(params.creditPositionId);

        // safe to cast to uint112 because CREDIT position is always created with uint112 (see Lend.sol)
        IPair.Claims memory claimsIn = IPair.Claims(
            uint112(loanPrincipal),
            uint112(loanInterest),
            uint112(coveragePrincipal),
            uint112(coverageInterest)
        );

        creditPositionManager.burn(params.creditPositionId);

        tokensOut = pair.withdraw(IPair.WithdrawParam(params.maturity, params.assetTo, params.collateralTo, claimsIn));
    }
}
