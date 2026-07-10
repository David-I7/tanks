import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { resolve } from "node:path";

import { onlineGameplayProtocolExamples } from "../src/api/ws/dto/gameplay/onlineGameplayProtocol";

const sharedExamples = JSON.parse(
  readFileSync(resolve(process.cwd(), "../docs/contracts/online-gameplay-protocol-examples.json"), "utf8"),
);

assert.deepEqual(onlineGameplayProtocolExamples, sharedExamples);
