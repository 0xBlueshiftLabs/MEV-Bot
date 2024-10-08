// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.20;

import { BlockNumber } from "../../core/libraries/BlockNumber.sol";

library BlockNumberTest {
    function get() external view returns (uint32 blockNumber) {
        return BlockNumber.get();
    }
}
