// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { BeaconProxy } from "@openzeppelin/contracts/proxy/beacon/BeaconProxy.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import { IFactory } from "./interfaces/IFactory.sol";
import { IPair } from "./interfaces/IPair.sol";
import { CreditPair } from "./CreditPair.sol";

/**
 * @title Credit Factory
 * @notice It is recommended to use Credit Router to interact with this contract.
 * @notice All error messages are coded and can be found in the documentation.
 */
contract CreditFactory is IFactory, Initializable, OwnableUpgradeable, UUPSUpgradeable {
    /*///////////////////////////////////////////////////////////////
                            State variables
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IFactory
    uint256 public override lpFee;
    /// @inheritdoc IFactory
    uint256 public override protocolFee;
    /// @inheritdoc IFactory
    uint256 public override stakingFee;
    /// @inheritdoc IFactory
    address public override beacon;
    /// @inheritdoc IFactory
    address public override stakingFeeCollector;
    /// @inheritdoc IFactory
    address public override protocolFeeCollector;

    /// @inheritdoc IFactory
    mapping(IERC20 => mapping(IERC20 => IPair)) public override getPair;

    /*///////////////////////////////////////////////////////////////
                        Init
    //////////////////////////////////////////////////////////////*/

    /// @param _protocolFeeCollector The chosen protocol fee collector.
    /// @param _stakingFeeCollector The address that receives the staking fee.
    /// @param _beacon The beacon address of pair contract.
    /// @param _lpFee The chosen lpFee rate.
    /// @param _protocolFee The chosen protocol fee rate.
    /// @param _stakingFee The chosen staking fee rate.
    function initialize(
        address _protocolFeeCollector,
        address _stakingFeeCollector,
        address _beacon,
        uint16 _lpFee,
        uint16 _protocolFee,
        uint16 _stakingFee
    ) external initializer {
        require(_protocolFeeCollector != address(0), "E101");
        require(_lpFee != 0);
        require(_protocolFee != 0);
        require(_stakingFee != 0);
        require(_beacon != address(0), "E101");
        require(_stakingFeeCollector != address(0), "E101");

        __Ownable_init();

        protocolFeeCollector = _protocolFeeCollector;
        stakingFeeCollector = _stakingFeeCollector;
        beacon = _beacon;
        lpFee = _lpFee;
        protocolFee = _protocolFee;
        stakingFee = _stakingFee;
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address) internal override onlyOwner {}

    /*///////////////////////////////////////////////////////////////
                            Factory logic
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc IFactory
    function createPair(IERC20 asset, IERC20 collateral) external override returns (IPair pair) {
        require(asset != collateral, "E103");
        require(asset != IERC20(address(0)), "E101");
        require(collateral != IERC20(address(0)), "E101");
        require(getPair[asset][collateral] == IPair(address(0)), "E104");

        BeaconProxy beaconProxy = new BeaconProxy{ salt: keccak256(abi.encode(asset, collateral)) }(
            beacon,
            abi.encodeWithSignature(
                "initialize(address,address,uint16,uint16,uint16)",
                asset,
                collateral,
                lpFee,
                protocolFee,
                stakingFee
            )
        );

        pair = IPair(address(beaconProxy));

        getPair[asset][collateral] = pair;

        emit CreatePair(asset, collateral, pair);
    }

    /// @inheritdoc IFactory
    function setStakingFeeCollector(address _stakingFeeCollector) external override onlyOwner {
        require(_stakingFeeCollector != address(0), "E101");
        stakingFeeCollector = _stakingFeeCollector;

        emit SetStakingFeeCollector(_stakingFeeCollector);
    }

    function setProtocolFeeCollector(address _protocolFeeCollector) external override onlyOwner {
        require(_protocolFeeCollector != address(0), "E101");
        protocolFeeCollector = _protocolFeeCollector;

        emit SetProtocolFeeCollector(_protocolFeeCollector);
    }
}
