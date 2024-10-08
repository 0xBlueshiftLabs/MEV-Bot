// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

interface ILPFarming {
    /*///////////////////////////////////////////////////////////////
                            Structs
    //////////////////////////////////////////////////////////////*/
    struct PositionInfo {
        uint256 amount; // How many LP tokens the user has provided
        int256 rewardDebt; // The amount of CREDIT entitled to the user
    }

    struct PoolInfo {
        uint256 allocPoint; // How many allocation points assigned to this pool. CREDIT to distribute per block
        uint256 lastRewardTime; // Last block number that CREDIT distribution occurs
        uint256 accCreditPerShare; // Accumulated CREDIT per share, times 1e12
        uint256 maturity; // The maturity of the pool
        uint256 lpSupply; // The total amount of LP tokens farmed
    }

    /*///////////////////////////////////////////////////////////////
                            Events
    //////////////////////////////////////////////////////////////*/

    event Deposit(address indexed user, bytes32 indexed poolHash, uint256 indexed collateralPositionId, uint256 amount);
    event Withdraw(
        address indexed user,
        bytes32 indexed poolHash,
        uint256 indexed collateralPositionId,
        uint256 amount
    );
    event Harvest(address indexed user, bytes32 indexed poolHash, uint256 creditPositionId, uint256 amount);
    event LogUpdatePool(bytes32 indexed poolHash, uint256 lastRewardTime, uint256 lpSupply, uint256 accCreditPerShare);
    event LogPoolAddition(bytes32 indexed poolHash, uint256 allocPoint, address pair, uint256 maturity);
    event LogPoolExpiration(bytes32 indexed poolHash);
    event EmergencyWithdraw(address indexed user, bytes32 indexed poolHash, uint256 amount, uint[] creditPositionIds);

    /*///////////////////////////////////////////////////////////////
                            Interfaces
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Add pool to the farming contract.
     *
     * @param _allocPoint The allocation point for the pool.
     * @param _pair The address of the pair.
     * @param _maturity The maturity of the pool.
     *
     */
    function addPool(uint256 _allocPoint, address _pair, uint256 _maturity) external;

    /**
     * @dev Update pool by marking it inactive.
     *
     * @param _poolHash The hash of the pool.
     *
     */
    function markPoolInactive(bytes32 _poolHash) external;

    /**
     * @dev Deposit CP id to the farming contract.
     *
     * @param _poolHash The hash of the pool.
     * @param _creditPositionId The id of the credit position.
     *
     */
    function deposit(bytes32 _poolHash, uint256 _creditPositionId) external;

    /**
     * @dev Withdraw CP id from a pool.
     *
     * @param _poolHash The hash of the pool.
     * @param _creditPositionId The id of the credit position.
     *
     */
    function withdraw(bytes32 _poolHash, uint256 _creditPositionId) external;

    /**
     * @dev Withdraw all CP id from a pool
     *
     * @param _poolHash The hash of the pool.
     *
     */
    function withdrawAll(bytes32 _poolHash, uint256[] memory _creditPositionIds) external;

    /**
     * @dev Harvest rewards from a pool for a CP id.
     *
     * @param _poolHash The hash of the pool.
     * @param _creditPositionId The id of the credit position.
     *
     */
    function harvest(bytes32 _poolHash, uint256 _creditPositionId) external;

    /**
     * @dev Harvest rewards from specified CP id.
     *
     * @param _poolHash The hash of the pool.
     * @param _creditPositionIds The ids of the credit positions.
     *
     */
    function harvestAll(bytes32 _poolHash, uint256[] memory _creditPositionIds) external;

    /**
     * @dev Get pending credit for a user.
     *
     * @param _poolHash The hash of the pool.
     * @param _user The address of the user.
     * @param _creditPositionId The id of the credit position.
     *
     */
    function pendingCredit(bytes32 _poolHash, address _user, uint256 _creditPositionId) external view returns (uint256);

    /**
     * @dev Update pool.
     *
     * @param _poolHash The hash of the pool.
     *
     */
    function updatePool(bytes32 _poolHash) external returns (PoolInfo memory pool);

    /**
     * @dev Update all pools.
     *
     */
    function massUpdatePools() external;

    /**
     * @dev Emergency withdraw.
     *
     * @param _poolHash The hash of the pool.
     * @param _creditPositionIds The ids of the credit positions.
     *
     */
    function emergencyWithdraw(bytes32 _poolHash, uint256[] memory _creditPositionIds) external;
}
