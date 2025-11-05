import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Circuit } from "../utils/Circuit.js";

describe("Multiplier2 Circuit", async function () {
  it("Should generate a valid proof for a = 3, b = 11", async function () {
    const multiplier = new Circuit("multiplier2");
    const input = { a: "3", b: "11" };
    
    const { offchain } = await multiplier.generateProof(input);
    const { proof, publicSignals } = offchain;

    assert.equal(publicSignals[0], "33", "c should equal a * b (3 * 11 = 33)");
    
    assert.ok(proof.pi_a, "Proof should have pi_a");
    assert.ok(proof.pi_b, "Proof should have pi_b");
    assert.ok(proof.pi_c, "Proof should have pi_c");

    const verified = await multiplier.verifyProof(proof, publicSignals);
    assert.equal(verified, true, "Proof should verify correctly");
  });

  it("Should generate a valid proof for a = 5, b = 7", async function () {
    const multiplier = new Circuit("multiplier2");
    const input = { a: "5", b: "7" };
    
    const { offchain } = await multiplier.generateProof(input);
    const { proof, publicSignals } = offchain;

    assert.equal(publicSignals[0], "35", "c should equal a * b (5 * 7 = 35)");
    
    const verified = await multiplier.verifyProof(proof, publicSignals);
    assert.equal(verified, true, "Proof should verify correctly");
  });

  it("Should generate a valid proof for a = 0, b = 100", async function () {
    const multiplier = new Circuit("multiplier2");
    const input = { a: "0", b: "100" };
    
    const { offchain } = await multiplier.generateProof(input);
    const { proof, publicSignals } = offchain;

    assert.equal(publicSignals[0], "0", "c should equal a * b (0 * 100 = 0)");
    
    const verified = await multiplier.verifyProof(proof, publicSignals);
    assert.equal(verified, true, "Proof should verify correctly");
  });

  it("Should generate a valid proof for a = 42, b = 42", async function () {
    const multiplier = new Circuit("multiplier2");
    const input = { a: "42", b: "42" };
    
    const { offchain } = await multiplier.generateProof(input);
    const { proof, publicSignals } = offchain;

    assert.equal(publicSignals[0], "1764", "c should equal a * b (42 * 42 = 1764)");
    
    const verified = await multiplier.verifyProof(proof, publicSignals);
    assert.equal(verified, true, "Proof should verify correctly");
  });

  it("Should not verify proof with incorrect public signals", async function () {
    const multiplier = new Circuit("multiplier2");
    const input = { a: "2", b: "3" };
    
    const { offchain } = await multiplier.generateProof(input);
    const { proof } = offchain;

    const corruptedPublicSignals = ["7"];

    const verified = await multiplier.verifyProof(proof, corruptedPublicSignals);
    assert.equal(verified, false, "Proof should fail with incorrect public signals");
  });

  it("Should generate both offchain and onchain proof formats", async function () {
    const multiplier = new Circuit("multiplier2");
    const input = { a: "10", b: "20" };
    
    const { offchain, onchain } = await multiplier.generateProof(input);

    assert.ok(offchain.proof.pi_a, "Offchain proof should have pi_a");
    assert.ok(offchain.proof.pi_b, "Offchain proof should have pi_b");
    assert.ok(offchain.proof.pi_c, "Offchain proof should have pi_c");

    assert.equal(onchain.proof.a.length, 2, "Onchain proof should have a with 2 elements");
    assert.equal(onchain.proof.b.length, 2, "Onchain proof should have b with 2 elements");
    assert.equal(onchain.proof.c.length, 2, "Onchain proof should have c with 2 elements");
    assert.equal(onchain.publicSignals[0], "200", "Public signal should be 200");
  });
});
