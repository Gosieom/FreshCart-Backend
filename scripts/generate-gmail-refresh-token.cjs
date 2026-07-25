const fs = require("fs");
const http = require("http");
const crypto = require("crypto");
const path = require("path");
const { exec } = require("child_process");

const credentialsPath =
  process.argv[2] ||
  path.resolve(process.cwd(), "gmail-oauth-client.json");

if (!fs.existsSync(credentialsPath)) {
  console.error(
    `OAuth JSON file not found:\n${credentialsPath}\n\n` +
      "Copy the downloaded Desktop OAuth JSON file into the backend root " +
      "and rename it to gmail-oauth-client.json."
  );
  process.exit(1);
}

let credentials;

try {
  credentials = JSON.parse(
    fs.readFileSync(credentialsPath, "utf8")
  );
} catch (error) {
  console.error(
    "Could not read the OAuth JSON:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
}

const client = credentials.installed || credentials.web;

if (!client?.client_id || !client?.client_secret) {
  console.error(
    "The JSON does not contain a valid OAuth client ID and client secret."
  );
  process.exit(1);
}

const PORT = 53682;
const REDIRECT_URI = `http://127.0.0.1:${PORT}`;
const SCOPE = "https://www.googleapis.com/auth/gmail.send";

const base64Url = (value) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const codeVerifier = base64Url(crypto.randomBytes(64));

const codeChallenge = base64Url(
  crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest()
);

const state = base64Url(crypto.randomBytes(24));

const authorizationUrl = new URL(
  client.auth_uri ||
    "https://accounts.google.com/o/oauth2/v2/auth"
);

authorizationUrl.searchParams.set("client_id", client.client_id);
authorizationUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authorizationUrl.searchParams.set("response_type", "code");
authorizationUrl.searchParams.set("scope", SCOPE);
authorizationUrl.searchParams.set("access_type", "offline");
authorizationUrl.searchParams.set("prompt", "consent");
authorizationUrl.searchParams.set("state", state);
authorizationUrl.searchParams.set("code_challenge", codeChallenge);
authorizationUrl.searchParams.set(
  "code_challenge_method",
  "S256"
);

const server = http.createServer(async (request, response) => {
  try {
    const callbackUrl = new URL(
      request.url || "/",
      REDIRECT_URI
    );

    if (callbackUrl.searchParams.get("state") !== state) {
      throw new Error("Invalid OAuth state.");
    }

    const oauthError = callbackUrl.searchParams.get("error");

    if (oauthError) {
      throw new Error(
        `Google authorization failed: ${oauthError}`
      );
    }

    const code = callbackUrl.searchParams.get("code");

    if (!code) {
      throw new Error(
        "Google did not return an authorization code."
      );
    }

    const tokenResponse = await fetch(
      client.token_uri ||
        "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: client.client_id,
          client_secret: client.client_secret,
          code,
          code_verifier: codeVerifier,
          grant_type: "authorization_code",
          redirect_uri: REDIRECT_URI,
        }),
      }
    );

    const tokens = await tokenResponse.json();

    if (!tokenResponse.ok) {
      throw new Error(
        tokens.error_description ||
          tokens.error ||
          "Token exchange failed"
      );
    }

    if (!tokens.refresh_token) {
      throw new Error(
        "Google did not return a refresh token. Remove FreshCart Email " +
          "from your Google Account permissions and run this script again."
      );
    }

    console.log("\nSUCCESS — copy these values into Render:\n");
    console.log(`GMAIL_CLIENT_ID=${client.client_id}`);
    console.log(`GMAIL_CLIENT_SECRET=${client.client_secret}`);
    console.log(
      `GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`
    );
    console.log(
      "Keep all three values private and never commit them."
    );

    response.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
    });

    response.end(`
      <html>
        <body style="font-family:Arial;padding:40px">
          <h2>FreshCart Gmail authorization completed</h2>
          <p>Return to PowerShell and copy the three private values.</p>
          <p>You may close this tab.</p>
        </body>
      </html>
    `);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error("\nTOKEN GENERATION ERROR:", message);

    response.writeHead(500, {
      "Content-Type": "text/plain",
    });

    response.end(message);
  } finally {
    setTimeout(() => server.close(), 500);
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `Waiting for Google OAuth at ${REDIRECT_URI}`
  );

  console.log("\nAuthorization URL:\n");
  console.log(authorizationUrl.toString());

  if (process.platform === "win32") {
    exec(
      `start "" "${authorizationUrl.toString()}"`,
      () => {}
    );
  }
});
