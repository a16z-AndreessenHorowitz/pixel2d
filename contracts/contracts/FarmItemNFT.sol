// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./PixelFarmToken.sol";

/**
 * @title FarmItemNFT
 * @dev ERC-721 NFT for Pixel2D GameFi equipment.
 * Features 1-Click Minting (burns $PIXEL without separate approve)
 * and fast getOwnedItems() batch view for the React->Phaser buff bridge.
 */
contract FarmItemNFT is ERC721, Ownable, ReentrancyGuard {
    using Strings for uint256;

    PixelFarmToken public pixelToken;
    uint256 public nextTokenId = 1;

    // Item Types:
    // 0: Gold Sickle (Lưỡi liềm vàng)
    // 1: Gold Watering Can (Bình tưới vàng)
    // 2: Gold Hoe (Cuốc đất vàng)
    // 3: Golden Fish (Cá vàng thần tài)
    uint256 public constant TOTAL_ITEM_TYPES = 4;

    uint256[4] public itemPrices = [
        50 * 10 ** 18,   // Type 0: 50 $PIXEL
        100 * 10 ** 18,  // Type 1: 100 $PIXEL
        75 * 10 ** 18,   // Type 2: 75 $PIXEL
        150 * 10 ** 18   // Type 3: 150 $PIXEL
    ];

    string[4] public itemNames = [
        "Gold Sickle",
        "Gold Watering Can",
        "Gold Hoe",
        "Golden Fish"
    ];

    // Tracking ownership per item type to prevent duplicate purchases per wallet
    mapping(address => mapping(uint256 => bool)) public hasItem;

    // Mapping from tokenId to item type (0..3)
    mapping(uint256 => uint256) public tokenItemType;

    string private _baseTokenURI;

    // Events
    event ItemMinted(
        address indexed player,
        uint256 indexed tokenId,
        uint256 indexed itemType,
        uint256 price
    );
    event PriceUpdated(uint256 indexed itemType, uint256 oldPrice, uint256 newPrice);
    event BaseURIUpdated(string newBaseURI);

    constructor(
        address initialOwner,
        address _pixelTokenAddress,
        string memory baseURI
    ) ERC721("Pixel Farm Item NFT", "PFARM") Ownable(initialOwner) {
        require(_pixelTokenAddress != address(0), "Token address cannot be zero");
        pixelToken = PixelFarmToken(_pixelTokenAddress);
        _baseTokenURI = baseURI;
    }

    /**
     * @notice 1-Click Mint an NFT item by burning $PIXEL tokens directly.
     * Does NOT require an approve() transaction because this contract has BURNER_ROLE.
     * @param itemType Index of the item to mint (0..3)
     */
    function mintWithToken(uint256 itemType) external nonReentrant returns (uint256) {
        require(itemType < TOTAL_ITEM_TYPES, "Invalid item type (must be 0..3)");
        require(!hasItem[msg.sender][itemType], "You already own this item type");

        uint256 price = itemPrices[itemType];

        // 1. Burn $PIXEL directly from player via BURNER_ROLE (1-Click Mint!)
        pixelToken.burnFromPlayer(msg.sender, price);

        // 2. Mint the NFT
        uint256 tokenId = nextTokenId++;
        _safeMint(msg.sender, tokenId);

        // 3. Record state
        hasItem[msg.sender][itemType] = true;
        tokenItemType[tokenId] = itemType;

        emit ItemMinted(msg.sender, tokenId, itemType, price);
        return tokenId;
    }

    /**
     * @notice Batch view function for React Frontend to read which buffs the player owns.
     * Returns a fixed 4-element bool array: [hasGoldSickle, hasGoldWateringCan, hasGoldHoe, hasGoldenFish].
     */
    function getOwnedItems(address user) external view returns (bool[4] memory) {
        return [
            hasItem[user][0],
            hasItem[user][1],
            hasItem[user][2],
            hasItem[user][3]
        ];
    }

    /**
     * @notice Returns details of an item type.
     */
    function getItemDetails(uint256 itemType) external view returns (string memory name, uint256 price) {
        require(itemType < TOTAL_ITEM_TYPES, "Invalid item type");
        return (itemNames[itemType], itemPrices[itemType]);
    }

    function _baseURI() internal view virtual override returns (string memory) {
        return _baseTokenURI;
    }

    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        _requireOwned(tokenId);
        uint256 itemType = tokenItemType[tokenId];
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0
            ? string(abi.encodePacked(baseURI, itemType.toString(), ".json"))
            : "";
    }

    // --- Admin Configuration ---

    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }

    function setItemPrice(uint256 itemType, uint256 newPrice) external onlyOwner {
        require(itemType < TOTAL_ITEM_TYPES, "Invalid item type");
        uint256 oldPrice = itemPrices[itemType];
        itemPrices[itemType] = newPrice;
        emit PriceUpdated(itemType, oldPrice, newPrice);
    }

    function setPixelToken(address _newToken) external onlyOwner {
        require(_newToken != address(0), "Token address cannot be zero");
        pixelToken = PixelFarmToken(_newToken);
    }
}
