// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import "./interfaces/IVesting.sol";
import "../staking/interfaces/ICreditStaking.sol";

/// @title TeamAllocator
/// @dev Allows team members to claim vested tokens and receive staking rewards.
contract TeamAllocator is UUPSUpgradeable, OwnableUpgradeable {
    using SafeERC20 for IERC20;

    IVesting public vesting;
    ICreditStaking public creditStaking;

    IERC20 public creditToken;

    uint public cliffDuration;
    uint public cliffEnd;
    uint public vestingDuration;
    uint public vestingEnd;
    uint public totalTeamAllocation;

    address[] public rewardTokens;

    bool public unstaked;

    mapping(address => bool) claimed;
    mapping(address => uint) allocationAmount;
    mapping(address => uint256) public rewards;

    /// @dev Initializes the Distrobution contract.
    /// @param _creditToken The address of the ERC20 Credit token.
    /// @param _vesting The address of the contract used to vest team and treasury allocations.
    /// @param _creditStaking The address of the Credit Staking contract.
    function initialize(address _creditToken, address _vesting, address _creditStaking) public initializer {
        require(_creditToken != address(0), "E1001");
        require(_vesting != address(0), "E1001");
        require(_creditStaking != address(0), "E1001");

        __Ownable_init();

        creditToken = IERC20(_creditToken);
        vesting = IVesting(_vesting);
        creditStaking = ICreditStaking(_creditStaking);
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address) internal override onlyOwner {}

    /// @dev Stakes Credit token in CreditStaking contract.
    /// @notice Only callable by contract owner.
    /// @param _cliffDuration Duration (in seconds) of vesting cliff.
    /// @param _totalTeamAllocation Total amount of credit tokens allocated to team.
    function stakeTeamAllocation(uint _cliffDuration, uint _totalTeamAllocation) external onlyOwner {
        require(address(creditToken) != address(0), "E1001");
        require(address(creditStaking) != address(0), "E1001");

        totalTeamAllocation = _totalTeamAllocation;
        cliffDuration = _cliffDuration;
        cliffEnd = block.timestamp + _cliffDuration;

        //slither-disable-next-line unused-return
        creditToken.approve(address(creditStaking), totalTeamAllocation);
        creditStaking.stake(totalTeamAllocation);
    }

    /// @dev Unstakes Credit token from CreditStaking contract, gets rewards, vests.
    /// @notice Only callable by contract owner.
    /// @param _teamAddresses Array of team addresses to receive credit token allocation.
    /// @param _teamAllocations Array of corresponding credit token allocation amounts.
    /// @param _vestingDuration Duration (in seconds) of vesting period, not including cliff period.
    function unstakeAndVestTeamAllocation(
        address[] memory _teamAddresses,
        uint[] memory _teamAllocations,
        uint _vestingDuration
    ) external onlyOwner {
        uint total;
        for (uint i = 0; i < _teamAllocations.length; i++) {
            total += _teamAllocations[i];
        }

        require(total == totalTeamAllocation, "E1002");
        require(_teamAddresses.length == _teamAllocations.length, "E1003");
        require(block.timestamp >= cliffEnd, "E1004");

        vestingDuration = _vestingDuration;
        vestingEnd = block.timestamp + 1 + vestingDuration; // as start must be > block.timestamp (vesting contract)

        uint balanceBefore = creditToken.balanceOf(address(this));
        creditStaking.unstake(totalTeamAllocation);
        uint difference = creditToken.balanceOf(address(this)) - balanceBefore;
        require(difference >= totalTeamAllocation, "E1005");

        rewardTokens = creditStaking.distributedTokens();
        //slither-disable-next-line uninitialized-local
        uint[3] memory balancesBeforeHarvest;
        uint256 rewardsTokensLength = rewardTokens.length;

        for (uint i = 0; i < rewardsTokensLength; i++) {
            balancesBeforeHarvest[i] = IERC20(rewardTokens[i]).balanceOf(address(this));
        }

        creditStaking.harvestAllDividends(false); // not receipt token

        for (uint i = 0; i < rewardsTokensLength; i++) {
            rewards[rewardTokens[i]] = (IERC20(rewardTokens[i]).balanceOf(address(this)) - balancesBeforeHarvest[i]);
        }

        // approves vesting contract to spend tokens
        uint totalAmountToVest = (_vestingDuration * totalTeamAllocation) / (_vestingDuration + cliffDuration);
        //slither-disable-next-line unused-return
        creditToken.approve(address(vesting), totalAmountToVest);

        // vests remainder with zero cliff
        for (uint i = 0; i < _teamAllocations.length; i++) {
            uint amountToVest = (_vestingDuration * _teamAllocations[i]) / (_vestingDuration + cliffDuration);

            vesting.vestTokens(
                _teamAddresses[i],
                amountToVest,
                block.timestamp + 1, // start must be > block.timestamp (vesting contract)
                0, // cliff
                _vestingDuration
            );

            allocationAmount[_teamAddresses[i]] = _teamAllocations[i];
        }

        unstaked = true;
    }

    // --- USER --- //

    /// @dev Claim individual share of staking rewards plus cliff duration credit tokens
    /// @notice Assumes Credit token is one of the staking reward tokens.
    function claim() external {
        require(unstaked, "E1006");
        require(!claimed[msg.sender], "E1007");
        require(allocationAmount[msg.sender] > 0, "E1008");

        claimed[msg.sender] = true;

        for (uint i = 0; i < rewardTokens.length; i++) {
            uint amount = (rewards[rewardTokens[i]] * allocationAmount[msg.sender]) / totalTeamAllocation;

            if (rewardTokens[i] == address(creditToken)) {
                amount += ((cliffDuration * allocationAmount[msg.sender]) / (cliffDuration + vestingDuration));
            }

            IERC20(rewardTokens[i]).safeTransfer(msg.sender, amount);
        }
    }

    // --- VIEW --- //

    /// @dev Returns cliff duration credit tokens if unstaked() has been called
    function totalClaimed() public view returns (uint) {
        if (unstaked) {
            return ((cliffDuration * totalTeamAllocation) / (cliffDuration + vestingDuration));
        } else {
            return 0;
        }
    }
}
