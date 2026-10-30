// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Deploy with Remix (remix.ethereum.org) on the Base Sepolia TEST network. See README, Part 5.
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// SwitchTix memory stubs (beta). Only the SwitchTix app wallet can mint.
contract SwitchTixStubs is ERC721URIStorage, Ownable {
    uint256 public nextId = 1;

    constructor() ERC721("SwitchTix Memory Stubs (Beta)", "STUB") Ownable(msg.sender) {}

    function mint(address to, string calldata uri) external onlyOwner returns (uint256 id) {
        id = nextId++;
        _safeMint(to, id);
        _setTokenURI(id, uri);
    }
}
