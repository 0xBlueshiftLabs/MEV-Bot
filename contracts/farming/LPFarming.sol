// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/ILPFarming.sol";
import "../tokens/interfaces/ICreditPositionManager.sol";
import "../tokens/interfaces/ICreditToken.sol";
import "../distribution/interfaces/IDistributor.sol";

/**
 * @title LPFarming
 * @notice This contract is used to farm LP tokens
 * @dev This contract is based on the SushiSwap MasterChef contract
 */
contract LPFarming is ILPFarming, UUPSUpgradeable, ERC721Holder, OwnableUpgradeable {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    /*///////////////////////////////////////////////////////////////
                            State variables
    //////////////////////////////////////////////////////////////*/

    ICreditPositionManager public creditPosition;
    IERC20 public creditToken;
    IDistributor public distributor;

    mapping(bytes32 => PoolInfo) public poolInfo; // Info of each pool - Hash of the pool - keccak256(pair, maturity)
    EnumerableSet.Bytes32Set private pools; // set of all pools
    EnumerableSet.Bytes32Set private activePools; // set of active pools

    // Info of each users that stakes LP tokens
    mapping(bytes32 => mapping(address => mapping(uint256 => PositionInfo))) public positionInfo;

    /// @dev Total allocation points. Must be the sum of all allocation points in all pools.
    uint256 public totalAllocPoint;

    /// @dev The precision for the accumulated credit per share
    uint256 private constant ACC_CREDIT_PRECISION = 1e12;

    /*///////////////////////////////////////////////////////////////
                    Constructor + initializer logic
    //////////////////////////////////////////////////////////////*/

    function initialize(IERC20 _creditToken) external initializer {
        require(address(_creditToken) != address(0), "E1201");
        creditToken = _creditToken;
        __Ownable_init();
    }

    function setDistributor(IDistributor _distributor) external onlyOwner {
        require(address(_distributor) != address(0), "E1202");
        distributor = _distributor;
    }

    function setCreditPosition(ICreditPositionManager _creditPosition) external onlyOwner {
        require(address(_creditPosition) != address(0), "E1203");
        creditPosition = _creditPosition;
    }

    /*///////////////////////////////////////////////////////////////
                    Admin functions
    //////////////////////////////////////////////////////////////*/

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address) internal override onlyOwner {}

    /*///////////////////////////////////////////////////////////////
                        View functions
    //////////////////////////////////////////////////////////////*/

    function poolLength() external view returns (uint256) {
        return pools.length();
    }

    function isActivePool(bytes32 _hash) external view returns (bool) {
        return activePools.contains(_hash);
    }

    function emissionRate() public view returns (uint256) {
        return distributor.emissionRate();
    }

    /*///////////////////////////////////////////////////////////////
                        External functions
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ILPFarming
    function addPool(uint256 _allocPoint, address _pair, uint256 _maturity) external override onlyOwner {
        require(_maturity > block.timestamp, "E1204");

        uint256 lastRewardTime = block.timestamp;
        totalAllocPoint += _allocPoint;

        // hash the pair address and maturity
        bytes32 poolHash = keccak256(abi.encodePacked(_pair, _maturity));
        require(pools.add(poolHash) && activePools.add(poolHash), "E1205");

        poolInfo[poolHash] = PoolInfo({
            lastRewardTime: lastRewardTime,
            allocPoint: _allocPoint,
            accCreditPerShare: 0,
            maturity: _maturity,
            lpSupply: 0
        });

        emit LogPoolAddition(poolHash, _allocPoint, _pair, _maturity);
    }

    /// @inheritdoc ILPFarming
    function markPoolInactive(bytes32 _poolHash) external override onlyOwner {
        PoolInfo memory pool = poolInfo[_poolHash];
        require(activePools.contains(_poolHash), "E1206");
        require(block.timestamp > pool.maturity, "E1207");

        _updatePool(_poolHash);

        totalAllocPoint -= poolInfo[_poolHash].allocPoint;
        //slither-disable-next-line unused-return
        activePools.remove(_poolHash);

        emit LogPoolExpiration(_poolHash);
    }

    /// @inheritdoc ILPFarming
    function deposit(bytes32 _poolHash, uint256 _creditPositionId) external override {
        require(activePools.contains(_poolHash), "E1206");

        PoolInfo storage pool = poolInfo[_poolHash];
        PositionInfo storage position = positionInfo[_poolHash][msg.sender][_creditPositionId];

        uint256 amount = creditPosition.getLiquidity(_creditPositionId);
        require(amount > 0, "E1208");

        position.amount = amount;
        position.rewardDebt = int256((amount * pool.accCreditPerShare) / ACC_CREDIT_PRECISION);

        pool.lpSupply += amount;

        ERC721(address(creditPosition)).safeTransferFrom(msg.sender, address(this), _creditPositionId);

        emit Deposit(msg.sender, _poolHash, _creditPositionId, amount);
    }

    /// @inheritdoc ILPFarming
    function withdraw(bytes32 _poolHash, uint256 _creditPositionId) external override {
        _updatePool(_poolHash);

        _withdraw(_poolHash, _creditPositionId);
    }

    /// @inheritdoc ILPFarming
    function withdrawAll(bytes32 _poolHash, uint256[] memory _creditPositionIds) external override {
        _updatePool(_poolHash);

        for (uint256 i = 0; i < _creditPositionIds.length; i++) {
            uint256 creditPositionId = _creditPositionIds[i];
            _withdraw(_poolHash, creditPositionId);
        }
    }

    /// @inheritdoc ILPFarming
    function harvest(bytes32 _poolHash, uint256 _creditPositionId) external override {
        _updatePool(_poolHash);
        _harvest(_poolHash, _creditPositionId);
    }

    /// @inheritdoc ILPFarming
    function harvestAll(bytes32 _poolHash, uint256[] memory _creditPositionIds) external override {
        _updatePool(_poolHash);
        for (uint256 i = 0; i < _creditPositionIds.length; i++) {
            _harvest(_poolHash, _creditPositionIds[i]);
        }
    }

    /// @inheritdoc ILPFarming
    function pendingCredit(
        bytes32 _poolHash,
        address _user,
        uint256 _creditPositionId
    ) external view override returns (uint256) {
        PoolInfo memory pool = poolInfo[_poolHash];
        PositionInfo memory position = positionInfo[_poolHash][_user][_creditPositionId];

        uint256 accCreditPerShare = pool.accCreditPerShare;

        uint256 lpSupply = pool.lpSupply;

        uint256 start = Math.min(pool.maturity, block.timestamp);

        if (start > pool.lastRewardTime && lpSupply != 0) {
            uint256 creditReward = _getCreditReward(start, _poolHash);
            accCreditPerShare = pool.accCreditPerShare + ((creditReward * ACC_CREDIT_PRECISION) / lpSupply);
        }

        int256 accumulatedCredit = int256((position.amount * accCreditPerShare) / ACC_CREDIT_PRECISION);
        uint256 _pendingCredit = uint256(accumulatedCredit - position.rewardDebt);

        return _pendingCredit;
    }

    /// @inheritdoc ILPFarming
    function updatePool(bytes32 _poolHash) external override returns (PoolInfo memory pool) {
        _updatePool(_poolHash);

        return poolInfo[_poolHash];
    }

    /// @inheritdoc ILPFarming
    function massUpdatePools() external override {
        uint256 length = activePools.length();
        for (uint256 i = 0; i < length; ++i) {
            _updatePool(activePools.at(i));
        }
    }

    /// @inheritdoc ILPFarming
    function emergencyWithdraw(bytes32 _poolHash, uint256[] memory _creditPositionIds) external override {
        PoolInfo storage pool = poolInfo[_poolHash];

        uint256 amount;

        for (uint256 i = 0; i < _creditPositionIds.length; i++) {
            uint256 creditPositionId = _creditPositionIds[i];
            PositionInfo storage position = positionInfo[_poolHash][msg.sender][creditPositionId];
            amount += position.amount;
            position.amount = 0;
            position.rewardDebt = 0;
            ERC721(address(creditPosition)).safeTransferFrom(address(this), msg.sender, creditPositionId);
        }

        pool.lpSupply -= amount;

        emit EmergencyWithdraw(msg.sender, _poolHash, amount, _creditPositionIds);
    }

    /*///////////////////////////////////////////////////////////////
                        Internal functions
    //////////////////////////////////////////////////////////////*/

    function _withdraw(bytes32 _poolHash, uint256 _creditPositionId) internal {
        PoolInfo storage pool = poolInfo[_poolHash];
        PositionInfo storage position = positionInfo[_poolHash][msg.sender][_creditPositionId];

        require(_isStaked(_poolHash, msg.sender, _creditPositionId), "E1209");

        uint256 amount = creditPosition.getLiquidity(_creditPositionId);
        require(position.amount >= amount, "E1210");

        /* 
        removing the excess amount from what was really contributed
        rewardDebt = 100 and after the updatePool amount*accCreditPerShare = 120
        user should be eligible to 20, as reward position is int then = -20
        in the harvest method, it will give 0 - (-20) = 20 CREDIT to distribute to the user
        */
        position.rewardDebt = position.rewardDebt - int256((amount * pool.accCreditPerShare) / ACC_CREDIT_PRECISION);
        position.amount = 0;
        pool.lpSupply -= amount;

        ERC721(address(creditPosition)).safeTransferFrom(address(this), msg.sender, _creditPositionId);

        emit Withdraw(msg.sender, _poolHash, _creditPositionId, amount);
    }

    /**
     * @dev Returns the credit reward for a given pool
     *
     * @dev Needs to be called after the pool is updated
     *
     * @param _poolHash The pool hash
     */
    function _harvest(bytes32 _poolHash, uint256 _creditPositionId) internal {
        PoolInfo memory pool = poolInfo[_poolHash];
        PositionInfo storage position = positionInfo[_poolHash][msg.sender][_creditPositionId];

        int256 accumulatedCredit = int256((position.amount * pool.accCreditPerShare) / ACC_CREDIT_PRECISION);
        uint256 _pendingCredit = uint256(accumulatedCredit - position.rewardDebt);
        position.rewardDebt = accumulatedCredit;

        if (_pendingCredit != 0) {
            IERC20(address(creditToken)).safeTransfer(msg.sender, _pendingCredit);
        }

        emit Harvest(msg.sender, _poolHash, _creditPositionId, _pendingCredit);
    }

    function _updatePool(bytes32 _poolHash) internal {
        PoolInfo storage pool = poolInfo[_poolHash];

        uint256 start = Math.min(pool.maturity, block.timestamp);

        if (start <= pool.lastRewardTime) {
            return;
        }

        uint256 lpSupply = pool.lpSupply;

        if (lpSupply == 0) {
            pool.lastRewardTime = block.timestamp;
        } else {
            uint256 creditReward = _getCreditReward(start, _poolHash);
            creditReward = distributor.claimFarmingCredit(creditReward);
            pool.accCreditPerShare = pool.accCreditPerShare + ((creditReward * ACC_CREDIT_PRECISION) / lpSupply);
            pool.lastRewardTime = start;
        }
        emit LogUpdatePool(_poolHash, pool.lastRewardTime, pool.lpSupply, pool.accCreditPerShare);
    }

    function _getCreditReward(uint256 start, bytes32 _poolHash) internal view returns (uint256) {
        PoolInfo memory pool = poolInfo[_poolHash];
        uint256 timeDiff = start - pool.lastRewardTime;
        return timeDiff * emissionRate() * (pool.allocPoint / totalAllocPoint);
    }

    function _isStaked(bytes32 _poolHash, address _user, uint256 _creditPositionId) internal view returns (bool) {
        PositionInfo storage position = positionInfo[_poolHash][_user][_creditPositionId];

        return position.amount > 0;
    }
}
