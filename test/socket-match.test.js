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

describe('Match Tests', () => {
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

  it('should create match', async () => {
    const customid = generateid();

    const response = await page.evaluate(async (customid) => {
      const client = new nakamajs.Client();
      const socket = client.createSocket(false, false);

      const session = await client.authenticateCustom({ id: customid });
      await socket.connect(session);
      return await socket.send({ match_create: {} });
    }, customid);

    expect(response).not.toBeNull();
    expect(response.cid).not.toBeNull();
    expect(response.match).not.toBeNull();
    expect(response.match.match_id).not.toBeNull();
    expect(response.match.self).not.toBeNull();
    expect(response.match.self.session_id).not.toBeNull();
    expect(response.match.self.user_id).not.toBeNull();
    expect(response.match.self.username).not.toBeNull();
  });

  it('should join a match', async () => {
    const customid = generateid();

    const response = await page.evaluate(async (customid) => {
      const client = new nakamajs.Client();
      const socket = client.createSocket(false, false);

      const session = await client.authenticateCustom({ id: customid });
      await socket.connect(session);
      const match = await socket.send({ match_create: {} });
      return await socket.send({ match_join: {match_id: match.match.match_id}});
    }, customid);

    expect(response).not.toBeNull();
    expect(response.cid).not.toBeNull();
    expect(response.match).not.toBeNull();
    expect(response.match.match_id).not.toBeNull();
    expect(response.match.presences).toHaveLength(1);
    expect(response.match.self).not.toBeNull();
    expect(response.match.self.session_id).not.toBeNull();
    expect(response.match.self.user_id).not.toBeNull();
    expect(response.match.self.username).not.toBeNull();
  });

  it('should join a match, then leave it', async () => {
    const customid = generateid();

    const response = await page.evaluate(async (customid) => {
      const client = new nakamajs.Client();
      const socket = client.createSocket(false, false);

      const session = await client.authenticateCustom({ id: customid });
      await socket.connect(session);
      const match = await socket.send({ match_create: {} });
      await socket.send({ match_join: {match_id: match.match.match_id}});
      return await socket.send({ match_leave: {match_id: match.match.match_id}});
    }, customid);

    expect(response).not.toBeNull();
    expect(response.cid).not.toBeNull();
  });

  it('should join a match, then send data, receive data', async () => {
    const customid1 = generateid();
    const customid2 = generateid();
    const PAYLOAD = { "hello": "world" };

    const response = await page.evaluate(async (customid1, customid2, payload) => {
      const client1 = new nakamajs.Client();
      const client2 = new nakamajs.Client();
      const socket1 = client1.createSocket(false, false);
      const socket2 = client2.createSocket(false, false);

      var promise1 = new Promise((resolve, reject) => {
        socket2.onmatchdata = (matchdata) => {
          resolve(matchdata);
        }
      });

      const session1 = await client1.authenticateCustom({ id: customid1 });
      await socket1.connect(session1);
      const match = await socket1.send({ match_create: {} });
      const session2 = await client2.authenticateCustom({ id: customid2 });
      await socket2.connect(session2);
      await socket2.send({ match_join: {match_id: match.match.match_id}});
      await socket1.send({ match_data_send: {match_id: match.match.match_id, op_code: 20, data: payload}});
      var promise2 = new Promise((resolve, reject) => {
        setTimeout(reject, 5000, "did not receive match data - timed out.")
      });

      return Promise.race([promise1, promise2]);
    }, customid1, customid2, PAYLOAD);

    expect(response).not.toBeNull();
    expect(response.data).toEqual(PAYLOAD);
  });

  it('should create authoritative match, list matches', async () => {
    const customid = generateid();
    const ID = "clientrpc.create_authoritative_match";

    const response = await page.evaluate(async (customid, id) => {
      const client = new nakamajs.Client();
      const socket = client.createSocket(false, false);

      const session = await client.authenticateCustom({ id: customid });
      await socket.connect(session);
      await socket.send({ rpc: { id: id } });
      return await client.listMatches(session, 1, true)
    }, customid, ID);

    expect(response).not.toBeNull();
    expect(response.matches).not.toBeNull();
    expect(response.matches).toHaveLength(1);
    expect(response.matches[0].match_id).not.toBeNull();
    expect(response.matches[0].authoritative).toBe(true);
  });

}, TIMEOUT);
