// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IPair } from "../../core/interfaces/IPair.sol";
import { IERC20Permit } from "./IERC20Permit.sol";
import { IRouter } from "../../periphery/interfaces/IRouter.sol";

/// @title Liquidity interface
interface ILiquidity is IERC20Permit {
    // VIEW

    function router() external returns (IRouter);

    function pair() external returns (IPair);

    function maturity() external returns (uint256);

    // UPDATE

    function mint(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;
}
