// SPDX-License-Identifier: UNLICENSED

pragma solidity =0.8.20;

import { BorrowMath } from "../periphery/libraries/BorrowMath.sol";
import { IPair } from "../core/interfaces/IPair.sol";

contract BorrowMathCallee {
    function givenPercent(
        IPair pair,
        uint256 maturity,
        uint112 assetOut,
        uint40 percent
    ) public view returns (uint256, uint112, uint112) {
        return BorrowMath.givenPercent(pair, maturity, assetOut, percent);
    }
}
