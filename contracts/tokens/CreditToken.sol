// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

import "./interfaces/ICreditToken.sol";

contract CreditToken is Initializable, UUPSUpgradeable, ERC20Upgradeable, OwnableUpgradeable, ICreditToken {
    uint256 public constant MAX_SUPPLY = 1_000_000 ether;

    address public distributor;

    modifier onlyDistributor() {
        require(msg.sender == distributor, "Credit: not distributor");
        _;
    }

    function initialize(string memory name, string memory symbol) external override initializer {
        __ERC20_init(name, symbol);
        __Ownable_init();
        distributor = msg.sender;
    }

    function setDistributor(address _distributor) external onlyOwner {
        distributor = _distributor;
    }

    function mint(address _to, uint256 _amount) external override onlyDistributor {
        // mint only up to MAX_SUPPLY without failing
        if (totalSupply() + _amount > MAX_SUPPLY) {
            _amount = MAX_SUPPLY - totalSupply();
        }

        _mint(_to, _amount);
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
