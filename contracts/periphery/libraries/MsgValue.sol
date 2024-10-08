// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.20;

import { SafeCast } from "../../core/libraries/SafeCast.sol";
import { ETH } from "./ETH.sol";

library MsgValue {
    using SafeCast for uint256;

    function getUint112() internal returns (uint112 value) {
        value = msg.value.truncateUint112();
        unchecked {
            if (msg.value > value) ETH.transfer(payable(msg.sender), msg.value - value);
        }
    }
}
