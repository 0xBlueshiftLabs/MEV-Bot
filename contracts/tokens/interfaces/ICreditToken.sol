// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";

interface ICreditToken is IERC20Upgradeable {
    /**
     * @notice Mint new tokens for the given address
     */
    function mint(address _to, uint256 _amount) external;

    /**
     * @notice Initializes name & symbol of the token
     */
    function initialize(string memory name, string memory symbol) external;
}
