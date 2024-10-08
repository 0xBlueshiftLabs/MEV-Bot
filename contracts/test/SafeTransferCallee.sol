// SPDX-License-Identifier: UNLICENSED

pragma solidity =0.8.20;

import { IPair } from "../core/interfaces/IPair.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeTransfer } from "../periphery/libraries/SafeTransfer.sol";

contract SafeTransferCallee {
    function safeTransfer(IERC20 token, IPair to, uint256 amount) public {
        return SafeTransfer.safeTransfer(token, to, amount);
    }

    function safeTransferFrom(IERC20 token, address from, IPair to, uint256 amount) public {
        return SafeTransfer.safeTransferFrom(token, from, to, amount);
    }
}
