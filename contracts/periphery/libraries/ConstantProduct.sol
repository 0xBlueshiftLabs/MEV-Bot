// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { IPair } from "../../core/interfaces/IPair.sol";

library ConstantProduct {
    struct CP {
        uint112 x;
        uint112 y;
        uint112 z;
    }

    function get(IPair pair, uint256 maturity) internal view returns (CP memory cp) {
        (uint112 x, uint112 y, uint112 z) = pair.constantProduct(maturity);
        cp = CP(x, y, z);
    }
}
