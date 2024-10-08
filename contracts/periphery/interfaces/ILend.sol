// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IPair } from "../../core/interfaces/IPair.sol";
import { IRouter } from "../interfaces/IRouter.sol";
import { IFactory } from "../../core/interfaces/IFactory.sol";

/// @title Lend interface
interface ILend {
    struct LendGivenPercent {
        IERC20 asset;
        IERC20 collateral;
        uint256 maturity;
        address to;
        uint112 assetIn;
        uint40 percent;
        uint128 minLoan;
        uint128 minCoverage;
        uint256 deadline;
    }

    struct LendGivenPercentETHAsset {
        IERC20 collateral;
        uint256 maturity;
        address to;
        uint40 percent;
        uint128 minLoan;
        uint128 minCoverage;
        uint256 deadline;
    }

    struct LendGivenPercentETHCollateral {
        IERC20 asset;
        uint256 maturity;
        address to;
        uint112 assetIn;
        uint40 percent;
        uint128 minLoan;
        uint128 minCoverage;
        uint256 deadline;
    }

    struct _LendGivenPercent {
        IRouter router;
        IFactory factory;
        IERC20 asset;
        IERC20 collateral;
        uint256 maturity;
        address from;
        address to;
        uint112 assetIn;
        uint40 percent;
        uint128 minLoan;
        uint128 minCoverage;
        uint256 deadline;
    }

    struct _Lend {
        IRouter router;
        IPair pair;
        IERC20 asset;
        IERC20 collateral;
        uint256 maturity;
        address from;
        address to;
        uint112 xIncrease;
        uint112 yDecrease;
        uint112 zDecrease;
        uint256 deadline;
    }
}
