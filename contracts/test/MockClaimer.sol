// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "../staking/interfaces/ICreditStaking.sol";
import "../distribution/interfaces/IClaimer.sol";

// for use in Distribution.sol tests to mimic staking of tokens
contract MockClaimer is IClaimer, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    uint256 public override totalClaimed;

    IERC20 creditToken;
    ICreditStaking creditStaking;

    function initialize(address _creditToken, address _creditStaking) public initializer {
        require(_creditToken != address(0), "initialize: zero address");
        require(_creditStaking != address(0), "initialize: zero address");

        __Ownable_init();
        __ReentrancyGuard_init();

        creditToken = IERC20(_creditToken);
        creditStaking = ICreditStaking(_creditStaking);
    }

    function stake(uint _amount) public {
        creditToken.approve(address(creditStaking), _amount);
        creditStaking.stake(_amount);
    }
}
