// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @title AreaHustleRegistry — optional on-chain user profiles for Celo
contract AreaHustleRegistry {
    enum Role {
        None,
        Customer,
        Hustler
    }

    struct Profile {
        Role role;
        uint64 registeredAt;
        string displayName;
    }

    mapping(address => Profile) public profiles;

    event UserRegistered(address indexed user, Role role, string displayName);

    function register(Role role, string calldata displayName) external {
        require(profiles[msg.sender].role == Role.None, "Already registered");
        require(role != Role.None, "Invalid role");
        profiles[msg.sender] = Profile(role, uint64(block.timestamp), displayName);
        emit UserRegistered(msg.sender, role, displayName);
    }

    function isRegistered(address user) external view returns (bool) {
        return profiles[user].role != Role.None;
    }

    function getProfile(address user) external view returns (Role role, uint64 registeredAt, string memory displayName) {
        Profile memory profile = profiles[user];
        return (profile.role, profile.registeredAt, profile.displayName);
    }
}
