// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import { IPair } from "../../core/interfaces/IPair.sol";

library SafeTransfer {
    using SafeERC20 for IERC20;

    function safeTransfer(IERC20 token, IPair to, uint256 amount) internal {
        token.safeTransfer(address(to), amount);
    }

    // slither-disable-next-line arbitrary-send-erc20
    function safeTransferFrom(IERC20 token, address from, IPair to, uint256 amount) internal {
        token.safeTransferFrom(from, address(to), amount);
    }
}
