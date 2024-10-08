// SPDX-License-Identifier: GPL-2.0-or-later

pragma solidity =0.8.20;

import { IERC721Metadata } from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import { IERC721Enumerable } from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";

interface IERC721Extended is IERC721Metadata, IERC721Enumerable {
    function assetDecimals() external view returns (uint8);

    function collateralDecimals() external view returns (uint8);
}
