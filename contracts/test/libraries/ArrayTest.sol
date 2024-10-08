// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.8.20;

import { Array } from "../../core/libraries/Array.sol";
import { IPair } from "../../core/interfaces/IPair.sol";

contract ArrayTest {
    using Array for IPair.Due[];

    IPair.Due[] public duesStorage;

    function insert(IPair.Due[] calldata dues, IPair.Due memory dueOut) external returns (uint256 id) {
        uint256 sdLength = duesStorage.length;
        uint256 dLength = dues.length;
        for (uint256 i; i < sdLength; i++) duesStorage.pop;

        for (uint256 i; i < dLength; i++) {
            duesStorage.push(dues[i]);
        }

        return duesStorage.insert(dueOut);
    }
}
