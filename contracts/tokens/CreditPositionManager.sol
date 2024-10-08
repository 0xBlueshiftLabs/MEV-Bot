// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import { ERC721EnumerableUpgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import { IERC721Upgradeable } from "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import { ReentrancyGuardUpgradeable } from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import { Initializable } from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import { OwnableUpgradeable } from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import { AccessControlUpgradeable } from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import { UUPSUpgradeable } from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import { IERC165Upgradeable } from "@openzeppelin/contracts-upgradeable/utils/introspection/IERC165Upgradeable.sol";

import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import { IPair } from "../core/interfaces/IPair.sol";
import { IRouter } from "../periphery/interfaces/IRouter.sol";
import { ICreditPositionManager } from "./interfaces/ICreditPositionManager.sol";
import { IDue } from "./interfaces/IDue.sol";
import { ICreditPositionManager } from "./interfaces/ICreditPositionManager.sol";
import { NFTTokenURIScaffold } from "./libraries/NFTTokenURIScaffold.sol";

/**
 *  @title      CreditPositionManager
 *  @notice     A contract for managing credit positions.
 */
contract CreditPositionManager is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    ERC721Holder,
    AccessControlUpgradeable,
    ERC721EnumerableUpgradeable,
    ICreditPositionManager
{
    /*///////////////////////////////////////////////////////////////
                            State variables
    //////////////////////////////////////////////////////////////*/

    /// @dev Only MINTER_ROLE holders can mint Credit Position
    bytes32 private constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev The next token ID of the NFT to mint.
    uint256 public nextTokenIdToMint;

    // @dev Router address - used for the debt retrieval
    IRouter public router;

    /// @dev Mapping from positions UID => positions info.
    mapping(uint256 => ICreditPositionManager.CreditPosition) internal positions;

    mapping(uint256 => uint256) internal dueIdToCreditPositionId;

    /*///////////////////////////////////////////////////////////////
                            Initializer logic
    //////////////////////////////////////////////////////////////*/

    /// @dev Initiliazes the contract
    function initialize(string memory _name, string memory _symbol) external initializer {
        // Initialize inherited contracts, most base-like -> most derived.
        __ReentrancyGuard_init();
        __ERC721_init(_name, _symbol);

        // Initialize this contract's state.
        __Ownable_init();
        __AccessControl_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    /// @dev    Grants roles to the specified addresses.
    /// @notice Needs to be executed after router depoyment as
    ///         there is a deadlock in initialization with the router contract.
    function grantRoles(address _minter) external onlyOwner {
        _grantRole(MINTER_ROLE, _minter);
    }

    /// @dev    Sets the router address.
    /// @notice Needs to be executed after router depoyment as
    ///         there is a deadlock in initialization with the router contract.
    function setRouter(address _router) external onlyOwner {
        router = IRouter(_router);
    }

    ///@dev required by the OZ UUPS module
    function _authorizeUpgrade(address) internal override onlyOwner {}

    /*///////////////////////////////////////////////////////////////
                            Modifiers
    //////////////////////////////////////////////////////////////*/

    modifier onlyRoleWithSwitch(bytes32 role) {
        require(hasRole(role, _msgSender()), "E406");
        _;
    }

    /*///////////////////////////////////////////////////////////////
                            Minting logic
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ICreditPositionManager
    function mint(ICreditPositionManager.MintParams calldata params) external onlyRoleWithSwitch(MINTER_ROLE) {
        require(params.amounts.length > 0, "E525");
        require(params.recipient != address(0), "E601");

        uint256 tokenId = nextTokenIdToMint;
        nextTokenIdToMint++;

        if (params.positionType == PositionType.CREDIT) {
            require(params.amounts.length == 4, "E525");
            positions[tokenId] = CreditPosition({
                pair: params.pair,
                maturity: params.maturity,
                positionType: params.positionType,
                slot0: params.amounts[0],
                slot1: params.amounts[1],
                slot2: params.amounts[2],
                slot3: params.amounts[3]
            });
        } else if (params.positionType == PositionType.DEBT) {
            require(params.amounts.length == 1, "E525");
            positions[tokenId] = CreditPosition({
                pair: params.pair,
                maturity: params.maturity,
                positionType: params.positionType,
                slot0: params.amounts[0],
                slot1: 0,
                slot2: 0,
                slot3: 0
            });
            dueIdToCreditPositionId[params.amounts[0]] = tokenId;
        } else if (params.positionType == PositionType.LIQUIDITY) {
            require(params.amounts.length == 1, "E525");
            positions[tokenId] = CreditPosition({
                pair: params.pair,
                maturity: params.maturity,
                positionType: params.positionType,
                slot0: params.amounts[0],
                slot1: 0,
                slot2: 0,
                slot3: 0
            });
        } else {
            revert("E409");
        }

        _mint(params.recipient, tokenId);

        emit CreditPositionCreated(params.pair, params.maturity, params.recipient, tokenId, params.positionType);
    }

    /// @inheritdoc ICreditPositionManager
    function burn(uint256 _tokenId) external override {
        require(_isApprovedOrOwner(_msgSender(), _tokenId), "E403");

        if (getPositionType(_tokenId) == PositionType.DEBT) {
            delete dueIdToCreditPositionId[getDebtId(_tokenId)];
        }

        delete positions[_tokenId];

        _burn(_tokenId);

        emit CreditPositionBurnt(_tokenId);
    }

    /*///////////////////////////////////////////////////////////////
                            Getters
    //////////////////////////////////////////////////////////////*/

    /// @inheritdoc ICreditPositionManager
    function getPositions(
        uint256 _tokenId
    ) external view override returns (ICreditPositionManager.CreditPosition memory) {
        return positions[_tokenId];
    }

    /// @inheritdoc ICreditPositionManager
    function getPositionType(uint256 _tokenId) public view override returns (ICreditPositionManager.PositionType) {
        return positions[_tokenId].positionType;
    }

    /// @inheritdoc ICreditPositionManager
    function getPair(uint256 _tokenId) public view override returns (address) {
        return address(positions[_tokenId].pair);
    }

    /// @inheritdoc ICreditPositionManager
    function getMaturity(uint256 _tokenId) public view override returns (uint256) {
        return positions[_tokenId].maturity;
    }

    /// @inheritdoc ICreditPositionManager
    function getLiquidity(uint256 _tokenId) public view override returns (uint256) {
        require(positions[_tokenId].positionType == ICreditPositionManager.PositionType.LIQUIDITY, "E409");

        return positions[_tokenId].slot0;
    }

    /// @inheritdoc ICreditPositionManager
    function getCredit(uint256 _tokenId) public view override returns (uint256, uint256, uint256, uint256) {
        require(positions[_tokenId].positionType == ICreditPositionManager.PositionType.CREDIT, "E409");

        return (
            positions[_tokenId].slot0,
            positions[_tokenId].slot1,
            positions[_tokenId].slot2,
            positions[_tokenId].slot3
        );
    }

    /// @inheritdoc ICreditPositionManager
    function getDebtId(uint256 _tokenId) public view override returns (uint256) {
        require(positions[_tokenId].positionType == ICreditPositionManager.PositionType.DEBT, "E409");

        return positions[_tokenId].slot0;
    }

    /// @inheritdoc ICreditPositionManager
    function dueOf(uint256 _tokenId) public view override returns (IPair.Due memory) {
        return _dueOf(_tokenId, address(router));
    }

    function creditPositionOf(uint256 _dueId) external view override returns (uint256) {
        return dueIdToCreditPositionId[_dueId];
    }

    function _dueOf(uint256 _tokenId, address debtOwner) internal view returns (IPair.Due memory) {
        require(positions[_tokenId].positionType == ICreditPositionManager.PositionType.DEBT, "E409");

        CreditPosition memory position = positions[_tokenId];
        return position.pair.dueOf(position.maturity, debtOwner, position.slot0);
    }

    /*///////////////////////////////////////////////////////////////
                        ERC 165 / 721 logic
    //////////////////////////////////////////////////////////////*/

    /**
     *  @notice Returns the URI for a given token ID.
     *  @dev Throws if the token type doesn't exist.
     *
     *  @param _tokenId      The id of the wrapped token.
     *  @return string        The URI for the given token ID.
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        ICreditPositionManager.CreditPosition storage position = positions[_tokenId];
        ICreditPositionManager.PositionType positionType = position.positionType;
        IPair pair = position.pair;
        uint256 maturity = position.maturity;

        //slither-disable-next-line uninitialized-local
        NFTTokenURIScaffold.NFTParams memory params;

        if (positionType == ICreditPositionManager.PositionType.LIQUIDITY) {
            uint256 liquidity = getLiquidity(_tokenId);
            params = NFTTokenURIScaffold.NFTParams({
                tokenId: _tokenId,
                pair: pair,
                maturity: maturity,
                positionType: positionType,
                liquidityAmount: liquidity,
                debtRequired: 0,
                collateralLocked: 0,
                loanAmount: 0,
                coverageAmount: 0
            });
        } else if (positionType == ICreditPositionManager.PositionType.CREDIT) {
            (
                uint256 loanPrincipal,
                uint256 loanInterest,
                uint256 coveragePrincipal,
                uint256 coverageInterest
            ) = getCredit(_tokenId);

            params = NFTTokenURIScaffold.NFTParams({
                tokenId: _tokenId,
                pair: pair,
                maturity: maturity,
                positionType: positionType,
                liquidityAmount: 0,
                debtRequired: 0,
                collateralLocked: 0,
                loanAmount: loanPrincipal + loanInterest,
                coverageAmount: coveragePrincipal + coverageInterest
            });
        } else if (positionType == ICreditPositionManager.PositionType.DEBT) {
            IPair.Due memory due = dueOf(_tokenId);

            params = NFTTokenURIScaffold.NFTParams({
                tokenId: _tokenId,
                pair: pair,
                maturity: maturity,
                positionType: positionType,
                liquidityAmount: 0,
                debtRequired: due.debt,
                collateralLocked: due.collateral,
                loanAmount: 0,
                coverageAmount: 0
            });
        } else {
            revert("E409");
        }

        return NFTTokenURIScaffold.tokenURI(params);
    }

    /// @dev See ERC 165
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(AccessControlUpgradeable, ERC721EnumerableUpgradeable, IERC165Upgradeable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId) || interfaceId == type(IERC721Upgradeable).interfaceId;
    }
}
