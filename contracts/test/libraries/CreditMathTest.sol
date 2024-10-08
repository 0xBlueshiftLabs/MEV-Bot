// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.20;

import { CreditMath } from "../../core/libraries/CreditMath.sol";
import { IPair } from "../../core/interfaces/IPair.sol";

contract CreditMathTest {
    function mint(
        uint256 maturity,
        IPair.State memory state,
        uint112 xIncrease,
        uint112 yIncrease,
        uint112 zIncrease
    ) external view returns (uint256 liquidityOut, IPair.Due memory dueOut, uint256 feeStoredIncrease) {
        return CreditMath.mint(maturity, state, xIncrease, yIncrease, zIncrease);
    }

    function burn(
        IPair.State memory state,
        uint256 liquidityIn
    ) external pure returns (uint128 assetOut, uint128 collateralOut, uint256 feeOut) {
        return CreditMath.burn(state, liquidityIn);
    }

    function lend(
        uint256 maturity,
        IPair.State memory state,
        uint112 xIncrease,
        uint112 yDecrease,
        uint112 zDecrease,
        uint256 fee,
        uint256 protocolFee,
        uint256 stakingFee
    )
        external
        view
        returns (
            IPair.Claims memory claimsOut,
            uint256 feeStoredIncrease,
            uint256 protocolFeeStoredIncrease,
            uint256 stakingFeeStoredIncrease
        )
    {
        return CreditMath.lend(maturity, state, xIncrease, yDecrease, zDecrease, fee, protocolFee, stakingFee);
    }

    function withdraw(
        IPair.State memory state,
        IPair.Claims memory claimsIn
    ) external pure returns (IPair.Tokens memory tokensOut) {
        return CreditMath.withdraw(state, claimsIn);
    }

    function borrow(
        uint256 maturity,
        IPair.State memory state,
        uint112 xDecrease,
        uint112 yIncrease,
        uint112 zIncrease,
        uint256 fee,
        uint256 protocolFee,
        uint256 stakingFee
    )
        external
        view
        returns (
            IPair.Due memory dueOut,
            uint256 feeStoredIncrease,
            uint256 protocolFeeStoredIncrease,
            uint256 stakingFeeStoredIncrease
        )
    {
        return CreditMath.borrow(maturity, state, xDecrease, yIncrease, zIncrease, fee, protocolFee, stakingFee);
    }
}
