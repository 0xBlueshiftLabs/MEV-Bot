// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title WETH9 Interface
interface IWETH is IERC20 {
    /* ===== UPDATE ===== */

    function deposit() external payable;

    function withdraw(uint256 amount) external;
}
