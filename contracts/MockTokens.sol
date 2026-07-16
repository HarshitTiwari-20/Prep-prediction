// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDT
 * @dev Mock USDT token with mint functionality for testing.
 */
contract MockUSDT is ERC20 {
    constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title MockUSDC
 * @dev Mock USDC token with mint functionality for testing.
 */
contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title MockSOL
 * @dev Mock SOL token (wrapped SOL for EVM) with mint functionality for testing.
 */
contract MockSOL is ERC20 {
    constructor() ERC20("Mock Wrapped SOL", "wSOL") {
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title MockTON
 * @dev Mock TON token (wrapped TON for EVM) with mint functionality for testing.
 */
contract MockTON is ERC20 {
    constructor() ERC20("Mock Wrapped TON", "wTON") {
        _mint(msg.sender, 1000000 * 10**decimals());
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
