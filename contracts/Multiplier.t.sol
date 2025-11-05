// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import {Multiplier} from "./Multiplier.sol";
import {Test} from "forge-std/Test.sol";

contract MockVerifier is Test {
    bool public shouldVerify = true;
    
    function setVerifyResult(bool _result) external {
        shouldVerify = _result;
    }
    
    function verifyProof(
        uint[2] calldata /* _pA */,
        uint[2][2] calldata /* _pB */,
        uint[2] calldata /* _pC */,
        uint[] calldata /* _pubSignals */
    ) external view returns (bool) {
        return shouldVerify;
    }
}

contract MultiplierTest is Test {
    Multiplier multiplier;
    MockVerifier mockVerifier;
    
    function setUp() public {
        mockVerifier = new MockVerifier();
        multiplier = new Multiplier(address(mockVerifier));
    }
    
    function test_CheckWithValidProof() public {
        uint[2] memory pA = [uint(0), uint(0)];
        uint[2][2] memory pB = [[uint(0), uint(0)], [uint(0), uint(0)]];
        uint[2] memory pC = [uint(0), uint(0)];
        uint[] memory pubSignals = new uint[](1);
        pubSignals[0] = 42;
        
        vm.expectEmit(true, true, false, true);
        emit Multiplier.Verified(42, address(this));
        
        bool result = multiplier.check(pA, pB, pC, pubSignals);
        assertTrue(result, "Should return true with valid proof");
    }
    
    function test_CheckWithInvalidProof() public {
        uint[2] memory pA = [uint(0), uint(0)];
        uint[2][2] memory pB = [[uint(0), uint(0)], [uint(0), uint(0)]];
        uint[2] memory pC = [uint(0), uint(0)];
        uint[] memory pubSignals = new uint[](1);
        pubSignals[0] = 42;
        
        mockVerifier.setVerifyResult(false);
        
        vm.expectRevert("invalid proof");
        multiplier.check(pA, pB, pC, pubSignals);
    }
    
    function test_VerifyEventEmitted() public {
        uint[2] memory pA = [uint(0), uint(0)];
        uint[2][2] memory pB = [[uint(0), uint(0)], [uint(0), uint(0)]];
        uint[2] memory pC = [uint(0), uint(0)];
        uint[] memory pubSignals = new uint[](1);
        pubSignals[0] = 100;
        
        vm.expectEmit(true, true, false, true);
        emit Multiplier.Verified(100, address(this));
        
        multiplier.check(pA, pB, pC, pubSignals);
    }
}

