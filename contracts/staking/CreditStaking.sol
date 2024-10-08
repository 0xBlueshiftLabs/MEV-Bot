// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "../periphery/interfaces/IWETH.sol";
import "./interfaces/ICreditStaking.sol";

/**
 * @title CreditStaking
 * @notice Contract to stake Credit tokens and receive protocol fees rewards in CREDIT and USDC
 *
 * @dev This contract is based on the SushiSwap MasterChef contract
 * @dev This contract deals with the WETH to ETH conversion for transfering. It can only receive ETH from the WETH contract
 */
contract CreditStaking is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    ICreditStaking
{
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    /*///////////////////////////////////////////////////////////////
                            Structs
    //////////////////////////////////////////////////////////////*/

    struct UserInfo {
        uint256 pendingDividends;
        uint256 rewardDebt;
    }

    struct DividendsInfo {
        uint256 currentDistributionAmount; // total amount to distribute during the current cycle
        uint256 currentCycleDistributedAmount; // amount already distributed for the current cycle (times 1e2)
        uint256 pendingAmount; // total amount in the pending slot, not distributed yet
        uint256 distributedAmount; // total amount that has been distributed since initialization
        uint256 accDividendsPerShare; // accumulated dividends per share (times 1e18)
        uint256 lastUpdateTime; // last time the dividends distribution occurred
        bool distributionDisabled; // deactivate a token distribution (for temporary dividends)
    }

    /*///////////////////////////////////////////////////////////////
                            State variables
    //////////////////////////////////////////////////////////////*/

    // actively distributed tokens
    EnumerableSet.AddressSet private _distributedTokens;
    uint256 public constant MAX_DISTRIBUTED_TOKENS = 10;

    // dividends info for every dividends token
    mapping(address => DividendsInfo) public dividendsInfo;
    mapping(address => mapping(address => UserInfo)) public users;

    address public creditToken; // creditToken contract
    IWETH public weth; // address of the WETH contract

    mapping(address => uint256) public usersAllocation; // User's CREDIT allocation
    uint256 public override totalAllocation; // Contract's total CREDIT allocation

    // dividends will be added to the currentDistributionAmount on each new cycle
    uint256 public override cycleDurationSeconds;
    uint256 public currentCycleStartTime;

    uint256[] public unstakingPenalties; // penalty for unstaking before the end of the current epoch (base 10000)
    address private treasury; // address of the treasury
    address private distributor; // address of the distributor

    /*///////////////////////////////////////////////////////////////
                    Constructor + initializer logic
    //////////////////////////////////////////////////////////////*/

    function initialize(
        address creditToken_,
        uint256 startTime_,
        uint256 cycleDurationSeconds_,
        uint256[] calldata unstakingPenalties_,
        address treasury_,
        IWETH weth_
    ) external initializer {
        require(creditToken_ != address(0), "E1301");
        require(treasury_ != address(0), "E1301");
        require(address(weth_) != address(0), "E1301");
        require(unstakingPenalties_.length == 4, "E1302");
        require(cycleDurationSeconds_ > 0, "E1303");

        __ReentrancyGuard_init();
        __Ownable_init();

        creditToken = creditToken_;
        currentCycleStartTime = startTime_;
        cycleDurationSeconds = cycleDurationSeconds_;
        unstakingPenalties = unstakingPenalties_;
        treasury = treasury_;
        weth = weth_;
    }

    /*///////////////////////////////////////////////////////////////
                            Modifiers
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Checks if an index exists
     */
    modifier validateDistributedTokensIndex(uint256 index) {
        require(index < _distributedTokens.length(), "E1304");
        _;
    }

    /**
     * @dev Checks if token exists
     */
    modifier validateDistributedToken(address token) {
        require(_distributedTokens.contains(token), "E1305");
        _;
    }

    modifier isDistributorOrOwner() {
        require(msg.sender == owner() || msg.sender == distributor, "E1306");
        _;
    }

    /*///////////////////////////////////////////////////////////////
                        View functions
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ICreditStaking
    function distributedTokensLength() external view override returns (uint256) {
        return _distributedTokens.length();
    }

    /// @inheritdoc ICreditStaking
    function distributedTokens() external view override returns (address[] memory) {
        return _distributedTokens.values();
    }

    /// @inheritdoc ICreditStaking
    function distributedToken(
        uint256 index
    ) external view override validateDistributedTokensIndex(index) returns (address) {
        return address(_distributedTokens.at(index));
    }

    /// @inheritdoc ICreditStaking
    function isDistributedToken(address token) external view override returns (bool) {
        return _distributedTokens.contains(token);
    }

    /// @inheritdoc ICreditStaking
    function nextCycleStartTime() public view override returns (uint256) {
        return currentCycleStartTime + cycleDurationSeconds;
    }

    /// @inheritdoc ICreditStaking
    function pendingDividendsAmount(address token, address userAddress) external view override returns (uint256) {
        if (totalAllocation == 0) {
            return 0;
        }

        DividendsInfo storage dividendsInfo_ = dividendsInfo[token];

        uint256 accDividendsPerShare = dividendsInfo_.accDividendsPerShare;
        uint256 lastUpdateTime = dividendsInfo_.lastUpdateTime;
        uint256 dividendAmountPerSecond_ = _dividendsAmountPerSecond(token);

        // check if the current cycle has changed since last update
        if (_currentBlockTimestamp() > nextCycleStartTime()) {
            // get remaining rewards from last cycle
            accDividendsPerShare =
                accDividendsPerShare +
                (((nextCycleStartTime() - lastUpdateTime) * dividendAmountPerSecond_ * 1e16) / totalAllocation);
            lastUpdateTime = nextCycleStartTime();
            dividendAmountPerSecond_ = dividendsInfo_.pendingAmount / cycleDurationSeconds;
        }

        // get pending rewards from current cycle
        accDividendsPerShare =
            accDividendsPerShare +
            (((_currentBlockTimestamp() - lastUpdateTime) * dividendAmountPerSecond_ * 1e16) / totalAllocation);

        return
            ((usersAllocation[userAddress] * accDividendsPerShare) / 1e18) -
            users[token][userAddress].rewardDebt +
            users[token][userAddress].pendingDividends;
    }

    /*///////////////////////////////////////////////////////////////
                        External functions
    //////////////////////////////////////////////////////////////*/

    receive() external payable {
        require(msg.sender == address(weth), "E1307");
    }

    function setDistributor(address distributor_) external onlyOwner {
        require(distributor_ != address(0), "E1308");
        distributor = distributor_;
    }

    function setUnstakingPenalties(uint256[] calldata unstakingPenalties_) external onlyOwner {
        require(unstakingPenalties_.length == 4, "E1302");
        unstakingPenalties = unstakingPenalties_;
    }

    /// @inheritdoc ICreditStaking
    function updateCurrentCycleStartTime() public override {
        uint256 nextCycleStartTime_ = nextCycleStartTime();

        if (_currentBlockTimestamp() >= nextCycleStartTime_) {
            currentCycleStartTime = nextCycleStartTime_;
            emit UpdatedCurrentCycleStartTime(currentCycleStartTime);
        }
    }

    /// @inheritdoc ICreditStaking
    function updateDividendsInfo(address token) external override validateDistributedToken(token) {
        _updateDividendsInfo(token);
    }

    /// @inheritdoc ICreditStaking
    function massUpdateDividendsInfo() external override {
        uint256 length = _distributedTokens.length();
        for (uint256 index = 0; index < length; ++index) {
            _updateDividendsInfo(_distributedTokens.at(index));
        }
    }

    /// @inheritdoc ICreditStaking
    function harvestDividends(address token, bool _receiptToken) external override nonReentrant {
        if (!_distributedTokens.contains(token)) {
            require(dividendsInfo[token].distributedAmount > 0, "E1309");
        }

        _harvestDividends(token, _receiptToken);
    }

    /// @inheritdoc ICreditStaking
    function harvestAllDividends(bool _receiptToken) external override nonReentrant {
        uint256 length = _distributedTokens.length();
        for (uint256 index = 0; index < length; ++index) {
            _harvestDividends(_distributedTokens.at(index), _receiptToken);
        }
    }

    /// @inheritdoc ICreditStaking
    function addDividendsToPending(address token, uint256 amount) external override isDistributorOrOwner nonReentrant {
        uint256 prevTokenBalance = IERC20(token).balanceOf(address(this));
        DividendsInfo storage dividendsInfo_ = dividendsInfo[token];

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // handle tokens with transfer tax
        uint256 receivedAmount = IERC20(token).balanceOf(address(this)) - prevTokenBalance;
        dividendsInfo_.pendingAmount += receivedAmount;

        emit DividendsAddedToPending(token, receivedAmount);
    }

    /// @inheritdoc ICreditStaking
    function stake(uint256 amount) external override nonReentrant {
        uint256 newUserAllocation = usersAllocation[msg.sender] + amount;
        uint256 newTotalAllocation = totalAllocation + amount;

        IERC20(creditToken).safeTransferFrom(msg.sender, address(this), amount);

        _updateUser(msg.sender, newUserAllocation, newTotalAllocation);
    }

    /// @inheritdoc ICreditStaking
    function unstake(uint256 amount) external override nonReentrant {
        uint256 newUserAllocation = usersAllocation[msg.sender] - amount;
        uint256 newTotalAllocation = totalAllocation - amount;

        uint256 unstakingPenalty = _unstakingPenalty();

        uint256 fees = (amount * unstakingPenalty) / 10000;

        IERC20(creditToken).safeTransfer(msg.sender, amount - fees);
        IERC20(creditToken).safeTransfer(treasury, fees);

        _updateUser(msg.sender, newUserAllocation, newTotalAllocation);
    }

    /*///////////////////////////////////////////////////////////////
                        Owner functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emergency withdraw token's balance on the contract
     */
    function emergencyWithdraw(IERC20 token) public nonReentrant onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "E1310");
        _safeTokenTransfer(token, payable(msg.sender), balance, false);
    }

    /**
     * @dev Emergency withdraw all dividend tokens' balances on the contract
     */
    function emergencyWithdrawAll() public nonReentrant onlyOwner {
        for (uint256 index = 0; index < _distributedTokens.length(); ++index) {
            emergencyWithdraw(IERC20(_distributedTokens.at(index)));
        }
    }

    /**
     * @dev Enables a given token to be distributed as dividends
     *
     * Effective from the next cycle
     */
    function enableDistributedToken(address token) public onlyOwner {
        DividendsInfo storage dividendsInfo_ = dividendsInfo[token];

        require(dividendsInfo_.lastUpdateTime == 0 || dividendsInfo_.distributionDisabled, "E1311");

        require(_distributedTokens.length() < MAX_DISTRIBUTED_TOKENS, "E1312");

        // initialize lastUpdateTime if never set before
        if (dividendsInfo_.lastUpdateTime == 0) {
            dividendsInfo_.lastUpdateTime = _currentBlockTimestamp();
        }

        dividendsInfo_.distributionDisabled = false;

        //slither-disable-next-line unused-return
        _distributedTokens.add(token);
        emit DistributedTokenEnabled(token);
    }

    /**
     * @dev Disables distribution of a given token as dividends
     *
     * Effective from the next cycle
     */
    function disableDistributedToken(address token) public onlyOwner {
        DividendsInfo storage dividendsInfo_ = dividendsInfo[token];
        require(dividendsInfo_.lastUpdateTime > 0 && !dividendsInfo_.distributionDisabled, "E1313");
        dividendsInfo_.distributionDisabled = true;
        emit DistributedTokenDisabled(token);
    }

    /**
     * @dev remove an address from _distributedTokens
     *
     * Can only be valid for a disabled dividends token and if the distribution has ended
     */
    function removeTokenFromDistributedTokens(address tokenToRemove) public onlyOwner {
        DividendsInfo storage _dividendsInfo = dividendsInfo[tokenToRemove];
        require(_dividendsInfo.distributionDisabled && _dividendsInfo.currentDistributionAmount == 0, "E1314");
        //slither-disable-next-line unused-return
        _distributedTokens.remove(tokenToRemove);
        emit DistributedTokenRemoved(tokenToRemove);
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address) internal override onlyOwner {}

    /*///////////////////////////////////////////////////////////////
                        Internal functions
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Returns the amount of dividends token distributed every second (times 1e2)
     */
    function _dividendsAmountPerSecond(address token) internal view returns (uint256) {
        if (!_distributedTokens.contains(token)) return 0;
        return (dividendsInfo[token].currentDistributionAmount * 1e2) / cycleDurationSeconds;
    }

    /**
     * @dev Updates every user's rewards allocation for each distributed token
     */
    function _updateDividendsInfo(address token) internal {
        uint256 currentBlockTimestamp = _currentBlockTimestamp();
        DividendsInfo storage dividendsInfo_ = dividendsInfo[token];

        updateCurrentCycleStartTime();

        uint256 lastUpdateTime = dividendsInfo_.lastUpdateTime;
        uint256 accDividendsPerShare = dividendsInfo_.accDividendsPerShare;

        if (currentBlockTimestamp <= lastUpdateTime) {
            return;
        }

        // if no CREDIT is allocated or initial distribution has not started yet
        if (totalAllocation == 0 || currentBlockTimestamp < currentCycleStartTime) {
            dividendsInfo_.lastUpdateTime = currentBlockTimestamp;
        } else {
            uint256 currentDistributionAmount = dividendsInfo_.currentDistributionAmount; // gas saving
            uint256 currentCycleDistributedAmount = dividendsInfo_.currentCycleDistributedAmount; // gas saving

            // check if the current cycle has changed since last update
            if (lastUpdateTime < currentCycleStartTime) {
                // update accDividendPerShare by adding the remaining leftover
                accDividendsPerShare =
                    accDividendsPerShare +
                    ((((currentDistributionAmount * 1e2) - currentCycleDistributedAmount) * 1e16) / totalAllocation);

                // check if distribution is enabled
                if (!dividendsInfo_.distributionDisabled) {
                    // transfer the tokens from the pending slot to the distribution slot
                    dividendsInfo_.distributedAmount += currentDistributionAmount;

                    currentDistributionAmount = dividendsInfo_.pendingAmount;
                    dividendsInfo_.currentDistributionAmount = currentDistributionAmount;
                    dividendsInfo_.pendingAmount = 0;
                } else {
                    // stop the token's distribution on next cycle
                    dividendsInfo_.distributedAmount += currentDistributionAmount;
                    currentDistributionAmount = 0;
                    dividendsInfo_.currentDistributionAmount = 0;
                }

                currentCycleDistributedAmount = 0;
                lastUpdateTime = currentCycleStartTime;
            }

            uint256 toDistribute = (currentBlockTimestamp - lastUpdateTime) * _dividendsAmountPerSecond(token);
            // ensure that we can't distribute more than currentDistributionAmount (for instance w/ a > 24h service interruption)
            if (currentCycleDistributedAmount + toDistribute > currentDistributionAmount * 1e2) {
                toDistribute = (currentDistributionAmount * 1e2) - currentCycleDistributedAmount;
            }

            dividendsInfo_.currentCycleDistributedAmount = currentCycleDistributedAmount + toDistribute;
            dividendsInfo_.accDividendsPerShare = accDividendsPerShare + ((toDistribute * 1e16) / totalAllocation);
            dividendsInfo_.lastUpdateTime = currentBlockTimestamp;
        }

        emit DividendsUpdated(token, currentBlockTimestamp);
    }

    /**
     * Updates "userAddress" user's and total allocations for each distributed token
     */
    function _updateUser(address userAddress, uint256 newUserAllocation, uint256 newTotalAllocation) internal {
        uint256 previousUserAllocation = usersAllocation[userAddress];

        // for each distributedToken
        uint256 length = _distributedTokens.length();
        for (uint256 index = 0; index < length; ++index) {
            address token = _distributedTokens.at(index);
            _updateDividendsInfo(token);

            UserInfo storage user = users[token][userAddress];
            uint256 accDividendsPerShare = dividendsInfo[token].accDividendsPerShare;

            uint256 pending = ((previousUserAllocation * accDividendsPerShare) / 1e18) - user.rewardDebt;
            user.pendingDividends += pending;
            user.rewardDebt = (newUserAllocation * accDividendsPerShare) / 1e18;
        }

        usersAllocation[userAddress] = newUserAllocation;
        totalAllocation = newTotalAllocation;

        emit UserUpdated(userAddress, previousUserAllocation, newUserAllocation, newTotalAllocation);
    }

    /**
     * @dev Harvests msg.sender's pending dividends of a given token
     */
    function _harvestDividends(address token, bool _receiptToken) internal {
        _updateDividendsInfo(token);

        UserInfo storage user = users[token][msg.sender];
        uint256 accDividendsPerShare = dividendsInfo[token].accDividendsPerShare;

        uint256 userCreditAllocation = usersAllocation[msg.sender];
        uint256 pending = user.pendingDividends +
            (((userCreditAllocation * accDividendsPerShare) / 1e18) - user.rewardDebt);

        user.pendingDividends = 0;
        user.rewardDebt = (userCreditAllocation * accDividendsPerShare) / 1e18;

        _safeTokenTransfer(IERC20(token), payable(msg.sender), pending, _receiptToken);
        emit DividendsCollected(msg.sender, token, pending);
    }

    /**
     * @dev Safe token transfer function, in case rounding error causes pool to not have enough tokens and deal with ETH
     */
    // slither-disable-next-line arbitrary-send-eth
    function _safeTokenTransfer(IERC20 token, address payable to, uint256 amount, bool _receiptToken) internal {
        if (_receiptToken) {
            require(address(token) == address(weth), "E1315");
        }

        if (amount > 0) {
            uint256 tokenBal = token.balanceOf(address(this));

            uint256 amountToTransfer = amount;
            if (amountToTransfer > tokenBal) {
                amountToTransfer = tokenBal;
            }

            if (address(token) == address(weth) && _receiptToken) {
                IWETH(weth).withdraw(amountToTransfer);
                //slither-disable-next-line unchecked-lowlevel
                (bool success, ) = payable(to).call{ value: amountToTransfer }("");
                require(success, "E1316");
            } else {
                token.safeTransfer(to, amountToTransfer);
            }
        }
    }

    /**
     * @dev Get the penalty level for unstaking based on the current week in the epoch
     */
    function _unstakingPenalty() internal view returns (uint256) {
        if (_currentBlockTimestamp() >= currentCycleStartTime + 3 weeks) {
            return unstakingPenalties[0];
        } else if (_currentBlockTimestamp() >= currentCycleStartTime + 2 weeks) {
            return unstakingPenalties[1];
        } else if (_currentBlockTimestamp() >= currentCycleStartTime + 1 weeks) {
            return unstakingPenalties[2];
        } else {
            return unstakingPenalties[3];
        }
    }

    /**
     * @dev Utility function to get the current block timestamp
     */
    function _currentBlockTimestamp() internal view virtual returns (uint256) {
        /* solhint-disable not-rely-on-time */
        return block.timestamp;
    }
}
