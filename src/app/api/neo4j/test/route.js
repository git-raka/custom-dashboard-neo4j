import { NextResponse } from "next/server";
import { withNeo4jSession } from "@/lib/neo4j-connection";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      uri,
      username,
      password,
      database = "neo4j",
      connectionMode = "auto",
    } = body;

    if (!uri || !username || !password) {
      return NextResponse.json(
        { error: "URI, username, dan password wajib diisi." },
        { status: 400 }
      );
    }

    const payload = await withNeo4jSession(
      { uri, username, password, database, connectionMode },
      async ({ session, resolvedUri, resolvedMode }) => {
        const result = await session.run("RETURN 1 AS ok");
        return {
          ok: true,
          database: result.summary.database?.name || database,
          username,
          resolvedUri,
          resolvedMode,
        };
      }
    );

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Neo4j connection failed." },
      { status: 500 }
    );
  }
}
