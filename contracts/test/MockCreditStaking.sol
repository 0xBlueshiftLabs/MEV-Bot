// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../periphery/interfaces/IWETH.sol";

/**
 * @title MockCreditStaking
 */
contract MockCreditStaking {
    using SafeERC20 for IERC20;
    using EnumerableSet for EnumerableSet.AddressSet;

    struct DividendsInfo {
        uint256 currentDistributionAmount; // total amount to distribute during the current cycle
        uint256 currentCycleDistributedAmount; // amount already distributed for the current cycle (times 1e2)
        uint256 pendingAmount; // total amount in the pending slot, not distributed yet
        uint256 distributedAmount; // total amount that has been distributed since initialization
        uint256 accDividendsPerShare; // accumulated dividends per share (times 1e18)
        uint256 lastUpdateTime; // last time the dividends distribution occurred
        bool distributionDisabled; // deactivate a token distribution (for temporary dividends)
    }

    // dividends info for every dividends token
    mapping(address => DividendsInfo) public dividendsInfo;

    // actively distributed tokens
    address[3] _distributedTokens;

    uint256 public totalAllocation;

    address treasury;
    address creditToken;

    constructor(address _treasury, address _credit, address _weth, address _tkn) {
        treasury = _treasury;
        creditToken = _credit;
        _distributedTokens = [_credit, _weth, _tkn];
    }

    function distributedTokens() external view returns (address[] memory) {
        address[] memory result = new address[](3);
        for (uint256 index = 0; index < 3; index++) {
            result[index] = _distributedTokens[index];
        }
        return result;
    }

    function stake(uint256 amount) external {
        totalAllocation += amount;

        IERC20(creditToken).safeTransferFrom(msg.sender, address(this), amount);
    }

    function unstake(uint256 amount) external {
        totalAllocation -= amount;
        uint256 fees = 0;

        IERC20(creditToken).safeTransfer(msg.sender, amount - fees);
    }

    function addDividendsToPending(address token, uint256 amount) external {
        uint256 prevTokenBalance = IERC20(token).balanceOf(address(this));
        DividendsInfo storage dividendsInfo_ = dividendsInfo[token];

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // handle tokens with transfer tax
        uint256 receivedAmount = IERC20(token).balanceOf(address(this)) - prevTokenBalance;
        dividendsInfo_.pendingAmount += receivedAmount;
    }

    function harvestAllDividends(bool _receiptToken) external {
        uint256 length = _distributedTokens.length;
        for (uint256 index = 0; index < length; ++index) {
            _harvestDividends(_distributedTokens[index], 100, _receiptToken);
        }
    }

    function _harvestDividends(address token, uint256 pending, bool _receiptToken) internal {
        if (_receiptToken) {
            IWETH(token).withdraw(pending);
            payable(msg.sender).transfer(pending);
        } else {
            IERC20(token).safeTransfer(payable(msg.sender), pending);
        }
    }
}
