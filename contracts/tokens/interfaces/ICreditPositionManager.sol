// SPDX-License-Identifier: BUSL-1.1

pragma solidity =0.8.20;

import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";

import { IPair } from "../../core/interfaces/IPair.sol";

interface ICreditPositionManager is IERC721Upgradeable {
    /// @param pair Pair Address
    /// @param maturity Maturity of the position
    /// @param positionType Type of position (see enum PositionType)
    /// @param slot0 Slot 0 of the position
    /// @param slot1 Slot 1 of the position
    /// @param slot2 Slot 2 of the position
    /// @param slot3 Slot 3 of the position
    struct CreditPosition {
        IPair pair;
        uint256 maturity;
        PositionType positionType;
        uint256 slot0;
        uint256 slot1;
        uint256 slot2;
        uint256 slot3;
    }

    /// @param pair Pair Address
    /// @param maturity Maturity of the position
    /// @param positionType Type of position (see enum PositionType)
    /// @param amounts Amounts of the position (array of max length 4)
    /// @param recipient Recipient of the position
    struct MintParams {
        IPair pair;
        uint256 maturity;
        PositionType positionType;
        uint256[] amounts;
        address recipient;
    }

    /// @notice The type of position, i.e. liquidity, credit or debt.
    enum PositionType {
        LIQUIDITY,
        CREDIT,
        DEBT
    }

    event CreditPositionCreated(
        IPair pair,
        uint256 maturity,
        address indexed recipient,
        uint256 indexed tokenId,
        ICreditPositionManager.PositionType positionType
    );

    event CreditPositionBurnt(uint256 indexed tokenId);

    /**
     *  @notice Mint a Credit Position.
     *
     *  @param params          The parameters of the Credit Position.
     */
    function mint(ICreditPositionManager.MintParams calldata params) external;

    /**
     *  @notice Burn a Credit Position.
     *
     *  @param _tokenId        The id of the wrapped token.
     */
    function burn(uint256 _tokenId) external;

    /**
     *  @notice Get the Credit Position Info.
     *
     *  @param _tokenId        The id of the wrapped token.
     *  @return CreditPosition The Credit Position of the wrapped token.
     */
    function getPositions(uint256 _tokenId) external view returns (ICreditPositionManager.CreditPosition memory);

    /**
     *  @notice Get the position type of a Credit Position.
     *
     *  @param _tokenId        The id of the wrapped token.
     *  @return PositionType   The position type of the Credit Position.
     */
    function getPositionType(uint256 _tokenId) external view returns (PositionType);

    /**
     *  @notice Get the pair of a Credit Position.
     *
     *  @param _tokenId        The id of the wrapped token.
     *  @return address        The pair of the Credit Position.
     */
    function getPair(uint256 _tokenId) external view returns (address);

    /**
     *  @notice Get the maturity of a Credit Position.
     *
     *  @param _tokenId        The id of the wrapped token.
     *  @return uint256        The maturity of the Credit Position.
     */
    function getMaturity(uint256 _tokenId) external view returns (uint256);

    /**
     *  @notice Get the liquidity of a Credit Position.
     *
     *  @param _tokenId        The id of the wrapped token.
     *  @return Token          The liquidity of the Credit Position.
     */
    function getLiquidity(uint256 _tokenId) external view returns (uint256);

    /**
     *  @notice Get the credit of a Credit Position.
     *
     *  @param _tokenId        The id of the wrapped token.
     *  @return Token          The credit of the Credit Position.
     */
    function getCredit(uint256 _tokenId) external view returns (uint256, uint256, uint256, uint256);

    /**
     *  @notice Get the debt if of a Credit Position.
     *
     *  @param _tokenId        The id of the wrapped token.
     *  @return Token          The debt of the Credit Position.
     */
    function getDebtId(uint256 _tokenId) external view returns (uint256);

    /**
     *  @notice Get the due (from the Pair) of a Credit Position.
     *
     *  @param _tokenId        The id of the wrapped token.
     *  @return Due            The due of the Credit Position.
     */
    function dueOf(uint256 _tokenId) external view returns (IPair.Due memory);

    /**
     *  @notice Get the credit position id of a due.
     *
     *  @param _dueId          The id of the due.
     *  @return uint256        The credit position id of the due.
     */
    function creditPositionOf(uint256 _dueId) external view returns (uint256);
}
