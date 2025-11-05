// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICircomVerifier {
    function verifyProof(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[] calldata _pubSignals
    ) external view returns (bool);
}

contract Multiplier {

    ICircomVerifier public verifier;

    event Verified(uint256 resultC, address caller);

    constructor(address _verifier) {
        verifier = ICircomVerifier(_verifier);
    }

    function check(
        uint[2] calldata _pA,
        uint[2][2] calldata _pB,
        uint[2] calldata _pC,
        uint[] calldata _pubSignals
    ) external returns (bool) {
        bool ok = verifier.verifyProof(_pA, _pB, _pC, _pubSignals);
        require(ok, "invalid proof");
        emit Verified(_pubSignals[0], msg.sender);
        return true;
    }
}
