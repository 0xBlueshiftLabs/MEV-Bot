// SPDX-License-Identifier: BUSL-1.1
pragma solidity =0.8.20;

import { IPair } from "../../core/interfaces/IPair.sol";
import { Math } from "../../core/libraries/Math.sol";
import { FullMath } from "../../core/libraries/FullMath.sol";
import { ConstantProductLib } from "../../core/libraries/ConstantProductLib.sol";
import { SafeCast } from "../../core/libraries/SafeCast.sol";
import { BlockNumber } from "../../core/libraries/BlockNumber.sol";

library CreditMathV2 {
    using Math for uint256;
    using FullMath for uint256;
    using ConstantProductLib for IPair.State;
    using SafeCast for uint256;

    uint256 private constant BASE = 0x10000000000;

    function mint(
        uint256,
        IPair.State memory,
        uint112,
        uint112,
        uint112
    ) external pure returns (uint256 liquidityOut, IPair.Due memory dueOut, uint256 feeStoredIncrease) {
        liquidityOut = 10;
        feeStoredIncrease = 100;
        dueOut.debt = 1;
        dueOut.collateral = 2;
        dueOut.startBlock = 3;
    }

    function burn(
        IPair.State memory,
        uint256
    ) external pure returns (uint128 assetOut, uint128 collateralOut, uint256 feeOut) {}

    function lend(
        uint256,
        IPair.State memory,
        uint112,
        uint112,
        uint112,
        uint256,
        uint256,
        uint256
    )
        external
        view
        returns (
            IPair.Claims memory claimsOut,
            uint256 feeStoredIncrease,
            uint256 protocolFeeStoredIncrease,
            uint256 stakingFeeStoredIncrease
        )
    {}

    function lendCheck(IPair.State memory, uint112, uint112, uint112, uint112) private pure {}

    function getLoanInterest(uint256, uint112) private view returns (uint112 loanInterestOut) {}

    function getCoveragePrincipal(IPair.State memory, uint112) private pure returns (uint112 coveragePrincipalOut) {}

    function getCoverageInterest(uint256, uint112) private view returns (uint112 coverageInterestOut) {}

    function lendGetFees(
        uint256,
        uint112,
        uint256,
        uint256
    ) private view returns (uint256 feeStoredIncrease, uint256 protocolFeeStoredIncrease) {}

    function withdraw(IPair.State memory, IPair.Claims memory) external pure returns (IPair.Tokens memory tokensOut) {}

    function borrow(
        uint256,
        IPair.State memory,
        uint112,
        uint112,
        uint112,
        uint256,
        uint256,
        uint256
    )
        external
        view
        returns (
            IPair.Due memory dueOut,
            uint256 feeStoredIncrease,
            uint256 protocolFeeStoredIncrease,
            uint256 stakingFeeStoredIncrease
        )
    {}

    function borrowCheck(IPair.State memory, uint112, uint112, uint112) private pure {}

    function getDebt(uint256, uint112, uint112) private view returns (uint112 debtIn) {}

    function getCollateral(uint256, IPair.State memory, uint112, uint112) private view returns (uint112 collateralIn) {}

    function borrowGetFees(
        uint256,
        uint112,
        uint256,
        uint256,
        uint256
    )
        private
        view
        returns (uint256 feeStoredIncrease, uint256 protocolFeeStoredIncrease, uint256 stakingFeeStoredIncrease)
    {}
}
