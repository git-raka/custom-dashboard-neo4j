import neo4j from "neo4j-driver";

type NeoDeckError = Error & { statusCode?: number };

const DIRECT_SCHEME_MAP = {
  "neo4j://": "bolt://",
  "neo4j+s://": "bolt+s://",
  "neo4j+ssc://": "bolt+ssc://",
};

const ROUTED_SCHEME_MAP = {
  "bolt://": "neo4j://",
  "bolt+s://": "neo4j+s://",
  "bolt+ssc://": "neo4j+ssc://",
};

function swapScheme(uri, schemeMap) {
  const trimmed = uri.trim();
  const match = Object.entries(schemeMap).find(([from]) => trimmed.startsWith(from));
  if (!match) {
    return trimmed;
  }

  const [from, to] = match;
  return `${to}${trimmed.slice(from.length)}`;
}

function toDirectUri(uri) {
  return swapScheme(uri, DIRECT_SCHEME_MAP);
}

function toRoutedUri(uri) {
  return swapScheme(uri, ROUTED_SCHEME_MAP);
}

function buildCandidateUris(credentials) {
  const mode = credentials.connectionMode || "auto";
  const requestedUri = credentials.uri.trim();

  if (mode === "direct") {
    return [toDirectUri(requestedUri)];
  }

  if (mode === "routing") {
    return [toRoutedUri(requestedUri)];
  }

  const directCandidate = toDirectUri(requestedUri);
  if (directCandidate === requestedUri) {
    return [requestedUri];
  }

  return [requestedUri, directCandidate];
}

function isRoutingError(error) {
  const message = error?.message || "";
  return (
    /routing table/i.test(message) ||
    /routing information/i.test(message) ||
    /No routing servers available/i.test(message) ||
    /Could not perform discovery/i.test(message)
  );
}

function isAuthError(error) {
  const message = error?.message || "";
  return (
    /unauthorized/i.test(message) ||
    /authentication failure/i.test(message) ||
    /invalid principal or credentials/i.test(message) ||
    /permission denied/i.test(message) ||
    /42NFF|42NFD/i.test(message)
  );
}

function enforceAllowList(uri) {
  const rawAllowList = process.env.NEODECK_ALLOWED_HOSTS;
  if (!rawAllowList) {
    return;
  }

  const allowedHosts = rawAllowList
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  const hostname = new URL(uri).hostname;
  if (!allowedHosts.includes(hostname)) {
    throw new Error(
      `Host ${hostname} tidak diizinkan. Tambahkan ke NEODECK_ALLOWED_HOSTS jika memang harus diakses dari deployment public.`
    );
  }
}

function enrichError(error, requestedUri, mode) {
  const message = error?.message || "Neo4j connection failed.";
  if (isAuthError(error)) {
    const authError = new Error("Username atau password invalid.") as NeoDeckError;
    authError.statusCode = 401;
    return authError;
  }

  if (isRoutingError(error)) {
    return new Error(
      `${message} Untuk single instance atau IP langsung seperti ${requestedUri.replace(/^neo4j(\+s|\+ssc)?:\/\//, "bolt$1://")}, gunakan Direct mode atau skema bolt://. Gunakan Routed mode hanya jika server Neo4j Anda benar-benar menyalakan routing/cluster discovery.`
    );
  }

  if (/ECONNREFUSED|ENOTFOUND|SERVICE_UNAVAILABLE/i.test(message)) {
    return new Error(
      `${message} Pastikan server Next.js ini memang bisa reach host Neo4j tujuan. Untuk deployment public, koneksi dilakukan dari backend server, bukan dari browser user.`
    );
  }

  return new Error(message);
}

export function inferConnectionMode(uri) {
  return uri.trim().startsWith("neo4j") ? "routing" : "direct";
}

export async function withNeo4jSession(credentials, executor) {
  const candidates = buildCandidateUris(credentials);
  let lastError;

  for (let index = 0; index < candidates.length; index += 1) {
    const resolvedUri = candidates[index];
    let driver;
    let session;

    try {
      enforceAllowList(resolvedUri);

      driver = neo4j.driver(
        resolvedUri,
        neo4j.auth.basic(credentials.username, credentials.password)
      );

      await driver.verifyConnectivity();
      session = driver.session({ database: credentials.database || "neo4j" });

      return await executor({
        driver,
        session,
        resolvedUri,
        resolvedMode: inferConnectionMode(resolvedUri),
      });
    } catch (error) {
      lastError = error;
      const shouldRetry =
        index < candidates.length - 1 &&
        (credentials.connectionMode || "auto") === "auto" &&
        isRoutingError(error);

      if (!shouldRetry) {
        throw enrichError(error, credentials.uri, credentials.connectionMode || "auto");
      }
    } finally {
      await session?.close();
      await driver?.close();
    }
  }

  throw enrichError(lastError, credentials.uri, credentials.connectionMode || "auto");
}

