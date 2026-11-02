import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { runInNewContext } from "node:vm";

const balanceClientSource = await readFile(new URL("../balance-client.js", import.meta.url), "utf8");

test("slots use the shared persisted casino balance", async () => {
  const storedValues = new Map();
  const balanceElement = { textContent: "" };
  const window = {};
  const context = {
    window,
    document: { getElementById: () => balanceElement },
    localStorage: {
      getItem: (key) => storedValues.get(key) ?? null,
      setItem: (key, value) => storedValues.set(key, value),
    },
  };

  runInNewContext(balanceClientSource, context);

  assert.equal(await window.initBalanceDisplay("balance", 1000), 1000);
  assert.equal(balanceElement.textContent, 1000);
  assert.equal(await window.adjustBalance(-25), 975);
  assert.equal(storedValues.get("casinoBalance"), "975");
  assert.equal(await window.initBalanceDisplay("balance", 1000), 975);

  try {
    window.adjustBalance(-1000);
    assert.fail("Expected insufficient credits to reject the debit.");
  } catch (error) {
    assert.equal(error.message, "Insufficient funds");
    assert.equal(error.balance, 975);
  }
});
