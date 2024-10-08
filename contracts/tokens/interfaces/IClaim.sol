// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IPair } from "../../core/interfaces/IPair.sol";
import { IERC20Permit } from "./IERC20Permit.sol";
import { IRouter } from "../../periphery/interfaces/IRouter.sol";

/// @title Claim interface
interface IClaim is IERC20Permit {
    function router() external returns (IRouter);

    function pair() external returns (IPair);

    function maturity() external returns (uint256);

    function mint(address to, uint128 amount) external;

    function burn(address from, uint128 amount) external;
}
