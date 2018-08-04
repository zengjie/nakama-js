/**
 * Copyright 2018 The Nakama Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const fs = require("fs");
const TIMEOUT = 5000;

// util to generate a random id.
const generateid = () => {
  return [...Array(30)].map(() => Math.random().toString(36)[3]).join('');
};

describe('Link / Unlink Tests', () => {
  let page;

  beforeAll(async () => {
    page = await global.__BROWSER__.newPage();

    page.on("console", msg => console.log("PAGE LOG:", msg.text()));
    page.on("error", err => console.log("PAGE LOG ERROR:", err));
    page.on("pageerror", err => console.log("PAGE LOG ERROR:", err));

    const nakamaJsLib = fs.readFileSync(__dirname + "/../dist/nakama-js.umd.js", "utf8");
    await page.evaluateOnNewDocument(nakamaJsLib);
    await page.goto("about:blank");
  }, TIMEOUT);

  it('should link device ID', async () => {
    const customid = generateid();
    const deviceid = generateid();

    const account = await page.evaluate(async (customid, deviceid) => {
      const client = new nakamajs.Client();
      const session = await client.authenticateCustom({ id: customid })
      await client.linkDevice(session, { id: deviceid });
      return await client.getAccount(session);
    }, customid, deviceid);

    expect(account).not.toBeNull();
    expect(account.custom_id).not.toBeNull();
    expect(account.devices[0]).not.toBeNull();
  });

  it('should unlink device ID', async () => {
    const customid = generateid();
    const deviceid = generateid();

    const account = await page.evaluate(async (customid, deviceid) => {
      const client = new nakamajs.Client();
      const session = await client.authenticateCustom({ id: customid });
      await client.linkDevice(session, { id: deviceid });
      await client.unlinkDevice(session, {id: deviceid });
      return await client.getAccount(session);
    }, customid, deviceid);

    expect(account).not.toBeNull();
    expect(account.custom_id).not.toBeNull();
    expect(account.hasOwnProperty("devices")).toBe(false);
  });

}, TIMEOUT);
