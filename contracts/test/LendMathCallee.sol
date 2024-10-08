// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.20;

import { LendMath } from "../periphery/libraries/LendMath.sol";
import { IPair } from "../core/interfaces/IPair.sol";

contract LendMathCallee {
    function givenPercent(
        IPair pair,
        uint256 maturity,
        uint112 assetIn,
        uint40 percent
    ) public view returns (uint256, uint112, uint112) {
        return LendMath.givenPercent(pair, maturity, assetIn, percent);
    }
}
