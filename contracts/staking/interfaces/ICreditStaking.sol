// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

interface ICreditStaking {
    event UserUpdated(address indexed user, uint256 previousBalance, uint256 newBalance, uint256 newTotalAllocation);
    event DividendsCollected(address indexed user, address indexed token, uint256 amount);
    event CycleDividendsPercentUpdated(address indexed token, uint256 previousValue, uint256 newValue);
    event DividendsAddedToPending(address indexed token, uint256 amount);
    event DistributedTokenDisabled(address indexed token);
    event DistributedTokenRemoved(address indexed token);
    event DistributedTokenEnabled(address indexed token);
    event UpdatedCurrentCycleStartTime(uint256);
    event DividendsUpdated(address indexed token, uint256 currentStartTimestamp);

    /**
     * @dev Returns the total amount of CREDIT staked
     */
    function totalAllocation() external view returns (uint256);

    /**
     * @dev Returns duration of an epoch in seconds
     */
    function cycleDurationSeconds() external view returns (uint256);

    /**
     * @dev Returns the number of dividends tokens
     */
    function distributedTokensLength() external view returns (uint256);

    /**
     * @dev Returns the list of dividends tokens
     */
    function distributedTokens() external view returns (address[] memory);

    /**
     * @dev Returns dividends token address from given index
     */
    function distributedToken(uint256 index) external view returns (address);

    /**
     * @dev Returns true if given token is a dividends token
     */
    function isDistributedToken(address token) external view returns (bool);

    /**
     * @dev Returns time at which the next cycle will start
     */
    function nextCycleStartTime() external view returns (uint256);

    /**
     * @dev Returns user's dividends pending amount for a given token
     */
    function pendingDividendsAmount(address token, address userAddress) external view returns (uint256);

    /**
     * @dev Updates the current cycle start time if previous cycle has ended
     */
    function updateCurrentCycleStartTime() external;

    /**
     * @dev Updates dividends info for a given token
     */
    function updateDividendsInfo(address token) external;

    /**
     * @dev Updates all dividendsInfo
     */
    function massUpdateDividendsInfo() external;

    /**
     * @dev Harvests caller's pending dividends of a given token
     * @param token Address of the dividends token
     * @param _receiptToken True if the caller wants to receive ETH or false for WETH
     */
    function harvestDividends(address token, bool _receiptToken) external;

    /**
     * @dev Harvests all caller's pending dividends
     * @param _receiptToken True if the caller wants to receive ETH or false for WETH
     */
    function harvestAllDividends(bool _receiptToken) external;

    /**
     * @dev Transfers the given amount of token from caller to pendingAmount
     *
     * Must only be called by a trustable address
     */
    function addDividendsToPending(address token, uint256 amount) external;

    /**
     * Stake "amount" of CREDIT to the contract
     *
     */
    function stake(uint256 amount) external;

    /**
     * Withdraw without delay "amount" of CREDIT allocation
     *
     * @dev Will include a penalty of the amount
     *
     */
    function unstake(uint256 amount) external;
}
