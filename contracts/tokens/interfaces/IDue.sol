// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IPair } from "../../core/interfaces/IPair.sol";
import { IERC721Permit } from "./IERC721Permit.sol";
import { IRouter } from "../../periphery/interfaces/IRouter.sol";

/// @title Due interface
interface IDue is IERC721Permit {
    function router() external view returns (IRouter);

    function pair() external view returns (IPair);

    function maturity() external view returns (uint256);

    function dueOf(uint256 id) external view returns (IPair.Due memory);

    function mint(address to, uint256 id) external;
}
