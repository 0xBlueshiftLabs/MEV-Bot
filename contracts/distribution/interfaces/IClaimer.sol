// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

interface IClaimer {
    function totalClaimed() external view returns (uint);
}
