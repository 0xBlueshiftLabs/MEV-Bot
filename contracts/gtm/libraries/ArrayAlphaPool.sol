// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.20;

import "../interfaces/IAlphaPoolFactory.sol";

library ArrayAlphaPool {
    function insert(
        IAlphaPoolFactory.AlphaPoolInfo[] storage alphaPools,
        IAlphaPoolFactory.AlphaPoolInfo memory alphaPool
    ) internal returns (uint256 id) {
        id = alphaPools.length;

        alphaPools.push(alphaPool);
    }
}
