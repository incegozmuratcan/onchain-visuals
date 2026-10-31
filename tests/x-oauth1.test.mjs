import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

async function loadOAuth1() {
  const source = await readFile(new URL("../lib/x/oauth1.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const dir = await mkdtemp(join(tmpdir(), "x-oauth1-"));
  const file = join(dir, "oauth1.mjs");
  await writeFile(file, js);
  return import(pathToFileURL(file).href);
}

const { oauth1AuthorizationHeader } = await loadOAuth1();

const twitterExampleCredentials = {
  consumerKey: "xvz1evFS4wEEPTGEFPHBog",
  consumerSecret: "kAcSOqF21Fu85e7zjz7ZN2U4ZRhfV3WpwPAoE3Z7kBw",
  accessToken: "370773112-GmHxMAgYyLbNEtIKZeRNFsMKPR9EyMZeS9weJAEb",
  accessTokenSecret: "LswwdoUaIvS8ltyTt5jkRh4J50vUPVVHtR2YPi5kE",
};

test("OAuth 1.0a signature matches the documented Twitter form-post example", () => {
  const header = oauth1AuthorizationHeader(
    "POST",
    "https://api.twitter.com/1.1/statuses/update.json",
    twitterExampleCredentials,
    {
      nonce: "kYjzVBB8Y0ZFabxSWbWovY3uYSQ2pTgmZeNu2VS4cg",
      timestamp: "1318622958",
      bodyParams: {
        include_entities: "true",
        status: "Hello Ladies + Gentlemen, a signed OAuth request!",
      },
    },
  );
  assert.match(header, /oauth_signature="hCtSmYh%2BiHYCEqBWrE7C7hYmtUk%3D"/);
  assert.match(header, /^OAuth /);
});

test("media upload and tweet create sign the request URL only", () => {
  const shared = { nonce: "media-nonce", timestamp: "1700000000" };
  const upload = oauth1AuthorizationHeader(
    "POST",
    "https://api.x.com/2/media/upload",
    twitterExampleCredentials,
    shared,
  );
  const tweet = oauth1AuthorizationHeader(
    "POST",
    "https://api.x.com/2/tweets",
    twitterExampleCredentials,
    shared,
  );
  assert.match(upload, /oauth_signature="lLOe%2BM%2FTV7QN%2FCE7FHvZjpzjEWI%3D"/);
  assert.match(tweet, /oauth_signature="sXZjGLpV39%2FQDy%2FVI5BxNmCoFaE%3D"/);
  assert.doesNotMatch(upload, /Bearer |tweet_image|media_category/);
  const withMultipartField = oauth1AuthorizationHeader(
    "POST",
    "https://api.x.com/2/media/upload",
    twitterExampleCredentials,
    { ...shared, bodyParams: { media_category: "tweet_image" } },
  );
  assert.notEqual(upload, withMultipartField);
});
