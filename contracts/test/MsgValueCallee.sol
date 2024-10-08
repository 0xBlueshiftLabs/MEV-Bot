// SPDX-License-Identifier: UNLICENSED

pragma solidity =0.8.20;

import { SafeCast } from "../core/libraries/SafeCast.sol";
import { MsgValue } from "../periphery/libraries/MsgValue.sol";

contract MsgValueCallee {
    function getUint112() public payable {
        MsgValue.getUint112();
    }
}
