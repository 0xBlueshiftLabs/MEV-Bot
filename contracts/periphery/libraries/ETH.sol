// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

library ETH {
    function transfer(address payable to, uint256 amount) internal {
        //slither-disable-next-line unchecked-lowlevel
        (bool success, ) = to.call{ value: amount }("");
        require(success, "E521");
    }
}
