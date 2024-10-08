// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.20;

library SquareRoot {
    // babylonian method (https://en.wikipedia.org/wiki/Methods_of_computing_square_roots#Babylonian_method)
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) >> 1;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) >> 1;
        }
    }

    function sqrtUp(uint256 x) internal pure returns (uint256 y) {
        y = sqrt(x);
        if (x % y != 0) y++;
    }
}
