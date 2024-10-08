// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IFactory } from "../../core/interfaces/IFactory.sol";
import { IPair } from "../../core/interfaces/IPair.sol";
import { IRouter } from "../interfaces/IRouter.sol";

/// @title Borrow interface
interface IBorrow {
    struct BorrowGivenPercent {
        IERC20 asset;
        IERC20 collateral;
        uint256 maturity;
        address assetTo;
        address dueTo;
        uint112 assetOut;
        uint40 percent;
        uint112 maxDebt;
        uint112 maxCollateral;
        uint256 deadline;
    }

    struct BorrowGivenPercentETHAsset {
        IERC20 collateral;
        uint256 maturity;
        address payable assetTo;
        address dueTo;
        uint112 assetOut;
        uint40 percent;
        uint112 maxDebt;
        uint112 maxCollateral;
        uint256 deadline;
    }

    struct BorrowGivenPercentETHCollateral {
        IERC20 asset;
        uint256 maturity;
        address assetTo;
        address dueTo;
        uint112 assetOut;
        uint40 percent;
        uint112 maxDebt;
        uint256 deadline;
    }

    struct _BorrowGivenPercent {
        IRouter router;
        IFactory factory;
        IERC20 asset;
        IERC20 collateral;
        uint256 maturity;
        address from;
        address assetTo;
        address dueTo;
        uint112 assetOut;
        uint40 percent;
        uint112 maxDebt;
        uint112 maxCollateral;
        uint256 deadline;
    }

    struct _Borrow {
        IRouter router;
        IPair pair;
        IERC20 asset;
        IERC20 collateral;
        uint256 maturity;
        address from;
        address assetTo;
        address dueTo;
        uint112 xDecrease;
        uint112 yIncrease;
        uint112 zIncrease;
        uint256 deadline;
    }
}
