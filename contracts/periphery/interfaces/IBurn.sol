// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IFactory } from "../../core/interfaces/IFactory.sol";

/// @title Burn interface
interface IBurn {
    struct RemoveLiquidity {
        IERC20 asset;
        IERC20 collateral;
        uint256 maturity;
        address assetTo;
        address collateralTo;
        uint256 creditPositionId;
    }

    struct RemoveLiquidityETHAsset {
        IERC20 collateral;
        uint256 maturity;
        address payable assetTo;
        address collateralTo;
        uint256 creditPositionId;
    }

    struct RemoveLiquidityETHCollateral {
        IERC20 asset;
        uint256 maturity;
        address assetTo;
        address payable collateralTo;
        uint256 creditPositionId;
    }

    struct _RemoveLiquidity {
        IFactory factory;
        IERC20 asset;
        IERC20 collateral;
        uint256 maturity;
        address assetTo;
        address collateralTo;
        uint256 creditPositionId;
    }
}
