// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IAlphaPool {
    /*///////////////////////////////////////////////////////////////
                            Events
    //////////////////////////////////////////////////////////////*/

    event SettlementOn();
    event AddEthToReimburse(uint256 amount);
    event AddTokenInterest(address indexed token, uint256 amount);
    event WithdrawAdmin(address indexed user, uint256 amount);
    event Pledge(address indexed user, uint256 amount);
    event Unpledge(address indexed user, uint256 amount);
    event Harvest(address indexed user, address indexed token, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);

    /*///////////////////////////////////////////////////////////////
                            Interface methods
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Owner can add eth that phase be used to reimburse the depositors
     * @dev Can only happen at loan period
     */
    function addEthToReimburse() external payable;

    /**
     * @notice Owner can add tokens (interest) that will be distributed to the depositors
     * @dev Can only happen at loan phase
     */
    function addTokenInterest(address _token, uint256 _amount) external;

    /**
     * @notice Get the ratio of the user's pledge
     * @dev The ratio is calculated as the ratio of the user's pledge to the total pledge
     * @param _user The user's address
     * @return The ratio of the user's pledge
     */
    function getUserRatio(address _user) external view returns (uint256);

    /**
     * @notice Allow user to pledge ETH to the pool
     * @dev Only possible in deposit phase
     */
    function pledge() external payable;

    /**
     * @notice Allow user to withdraw all ETH from the pool
     * @dev Only possible in settlement phase and callable only once
     */
    function withdraw() external;

    /**
     * @notice Allow user to all harvested amount for a token from the pool
     * @param _token The token to harvest
     * @dev Only possible in settlement phase and callable only once
     */
    function harvest(address _token) external;

    /**
     * @notice Allow user to all harvested harvest all tokens from the pool
     * @dev Only possible in settlement phase
     * @dev Can only be called when harvest was never called before
     */
    function harvestAll() external;

    /**
     * @notice Allow user to withdraw ETH and harvest all tokens from the pool
     * @dev Only possible in settlement phase
     * @dev Can only be called when withdraw and harvest were never called before
     */
    function withdrawAndHarvestAll() external;
}
