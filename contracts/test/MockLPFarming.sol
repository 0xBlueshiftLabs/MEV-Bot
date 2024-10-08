// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import "../tokens/interfaces/ICreditToken.sol";
import "../distribution/interfaces/IDistributor.sol";

/**
 * @title LPFarming
 * @notice This contract is used to farm LP tokens
 * @dev This contract is based on the SushiSwap MasterChef contract
 */
contract MockLPFarming is ERC721Holder, OwnableUpgradeable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    struct PoolInfo {
        uint256 allocPoint; // How many allocation points assigned to this pool. CREDIT to distribute per block
        uint256 lastRewardTime; // Last block number that CREDIT distribution occurs
        uint256 accCreditPerShare; // Accumulated CREDIT per share, times 1e12
        uint256 maturity; // The maturity of the pool
        uint256 lpSupply; // The total amount of LP tokens farmed
    }

    //ICreditPosition public creditPosition;
    IERC20 public creditToken;
    IDistributor public distributor;

    mapping(bytes32 => PoolInfo) public poolInfo; // Info of each pool - Hash of the pool - keccak256(pair, maturity)
    EnumerableSet.Bytes32Set private pools; // set of all pools
    EnumerableSet.Bytes32Set private activePools; // set of active pools

    /// @dev Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint;

    /// @dev The precision for the accumulated credit per share
    uint256 private constant ACC_CREDIT_PRECISION = 1e12;

    function initialize(
        //ICreditPosition _creditPosition,
        IERC20 _creditToken,
        IDistributor _distributor
    ) external initializer {
        //creditPosition = _creditPosition;
        creditToken = _creditToken;
        distributor = _distributor;

        __Ownable_init();
    }

    function emissionRate() public view returns (uint256) {
        return distributor.emissionRate();
    }

    function addPool(uint256 _allocPoint, address _pair, uint256 _maturity) external onlyOwner {
        uint256 lastRewardTime = block.timestamp;
        totalAllocPoint += _allocPoint;

        // hash the pair address and maturity
        bytes32 poolHash = keccak256(abi.encodePacked(_pair, _maturity));
        pools.add(poolHash);
        activePools.add(poolHash);

        poolInfo[poolHash] = PoolInfo({
            lastRewardTime: lastRewardTime,
            allocPoint: _allocPoint,
            accCreditPerShare: 0,
            maturity: _maturity,
            lpSupply: 0
        });
    }

    function massUpdatePools() external {
        uint256 length = activePools.length();
        for (uint256 i = 0; i < length; ++i) {
            _updatePool(activePools.at(i));
        }
    }

    function _updatePool(bytes32) internal {
        uint256 creditReward = 10; //_getCreditReward(start, _poolHash);
        creditReward = distributor.claimFarmingCredit(creditReward);
    }
}
