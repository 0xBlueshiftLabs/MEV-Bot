// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../../periphery/interfaces/IWETH.sol";
import "../../staking/interfaces/ICreditStaking.sol";
import "./IAlphaPool.sol";

interface IAlphaPoolFactory {
    /*///////////////////////////////////////////////////////////////
                            Structs
    //////////////////////////////////////////////////////////////*/

    struct AlphaPoolInfo {
        IAlphaPool alphaPool; // The alpha pool
        uint256 allocPoint; // How many allocation points assigned to this pool. CREDIT to distribute per block
        uint256 maturity; // The maturity of the pool
    }

    /*///////////////////////////////////////////////////////////////
                            Events
    //////////////////////////////////////////////////////////////*/

    event AlphaPoolCreated(
        address tokenA,
        address tokenB,
        address alphaPool,
        uint256 maturity,
        uint256 allocationPoint
    );
    event Stake(uint256 amount);
    event Unstake(uint256 amount);
    event AllocationPointChanged(uint256 indexed pid, uint256 newAllocationPoint);
    event CreditTransferred(uint256 indexed pid, uint256 amount);
    event Harvest();

    /*///////////////////////////////////////////////////////////////
                            Interface methods
    //////////////////////////////////////////////////////////////*/

    /**
     *
     * @param _depositStart Timestamp of when the deposit is possible
     * @param _loanStart Timestamp of when the loan start (funds can be withdrawn by the borrower)
     * @param _beacon Beacon address of the Alpha Pool
     * @param _treasury Treasury address
     * @param _poolOwner Pool owner address
     * @param _weth Weth address
     */
    function initialize(
        uint256 _depositStart,
        uint256 _loanStart,
        address _beacon,
        address _treasury,
        address _poolOwner,
        IWETH _weth
    ) external;

    /**
     * @notice Set the credit token address
     * @param _credit Credit token address
     */
    function setCreditToken(address _credit) external;

    /**
     * @notice Set the credit staking address
     * @param _creditStaking Credit staking address
     */
    function setCreditStaking(address _creditStaking) external;

    /**
     *
     * @param _tokenA Address of the asset token
     * @param _tokenB Address of the collateral token
     * @param _maturity Alpha pool marturity
     * @param _allocationPoint Allocation point of the alpha pool
     * @param _tokensToDistritbute Array of tokens to distribute
     */
    function createAlphaPool(
        address _tokenA,
        address _tokenB,
        uint256 _maturity,
        uint256 _allocationPoint,
        IERC20[] calldata _tokensToDistritbute
    ) external;

    /**
     * @notice Stake CREDIT tokens
     * @param _amount Amount to stake
     */
    function stake(uint256 _amount) external;

    /**
     * @notice Unstake CREDIT tokens
     * @param _amount Amount to unstake
     */
    function unstake(uint256 _amount) external;

    /**
     * @notice How many CREDIT tokens that have been unstaked.
     */
    function amountUnstaked() external view returns (uint256);

    /**
     * @notice Harvest CREDIT tokens
     */
    function harvestAndDistribute() external;

    /**
     * @notice Change the allocation point of a specific pool
     * @param _poolId Pool id
     * @param _allocationPoint New allocation point
     */
    function changeAllocationPoint(uint256 _poolId, uint256 _allocationPoint) external;

    /**
     * @notice Set the treasury address
     * @param _treasury Treasury address
     */
    function setTreasury(address _treasury) external;
}
