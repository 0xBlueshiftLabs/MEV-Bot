// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IFactory } from "../../core/interfaces/IFactory.sol";

/// @title Pay interface
interface IPay {
    struct Repay {
        IERC20 asset;
        IERC20 collateral;
        uint256 maturity;
        address collateralTo;
        uint256[] creditPositionIds;
        uint112[] maxAssetsIn;
        uint256 deadline;
    }

    struct RepayETHAsset {
        IERC20 collateral;
        uint256 maturity;
        address collateralTo;
        uint256[] creditPositionIds;
        uint112[] maxAssetsIn;
        uint256 deadline;
    }

    struct RepayETHCollateral {
        IERC20 asset;
        uint256 maturity;
        address payable collateralTo;
        uint256[] creditPositionIds;
        uint112[] maxAssetsIn;
        uint256 deadline;
    }

    struct _Repay {
        IFactory factory;
        IERC20 asset;
        IERC20 collateral;
        uint256 maturity;
        address from;
        address collateralTo;
        uint256[] creditPositionIds;
        uint112[] maxAssetsIn;
        uint256 deadline;
    }
}
