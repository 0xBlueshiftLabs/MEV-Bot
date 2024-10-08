// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.20;

import { MintMath } from "../periphery/libraries/MintMath.sol";
import { IPair } from "../core/interfaces/IPair.sol";

contract MintMathCallee {
    function givenNew(
        uint256 maturity,
        uint112 assetIn,
        uint112 debtIn,
        uint112 collateralIn
    ) public view returns (uint256, uint112, uint112) {
        return MintMath.givenNew(maturity, assetIn, debtIn, collateralIn);
    }

    function givenAsset(IPair pair, uint256 maturity, uint112 assetIn) public view returns (uint256, uint112, uint112) {
        return MintMath.givenAsset(pair, maturity, assetIn);
    }

    function givenCollateral(
        IPair pair,
        uint256 maturity,
        uint112 collateralIn
    ) public view returns (uint256, uint112, uint112) {
        return MintMath.givenCollateral(pair, maturity, collateralIn);
    }
}
