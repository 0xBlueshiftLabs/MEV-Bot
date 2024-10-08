// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.20;

import { ConstantProductLib } from "../../core/libraries/ConstantProductLib.sol";
import { IPair } from "../../core/interfaces/IPair.sol";

contract ConstantProductTest {
    using ConstantProductLib for IPair.State;

    function checkConstantProduct(
        IPair.State memory state,
        uint112 xReserve,
        uint128 yAdjusted,
        uint128 zAdjusted
    ) external pure returns (bool) {
        state.checkConstantProduct(xReserve, yAdjusted, zAdjusted);
        return true;
    }
}
