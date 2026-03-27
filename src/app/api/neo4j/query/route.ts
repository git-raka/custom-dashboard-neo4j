import { NextResponse } from "next/server";
import { withNeo4jSession } from "@/lib/neo4j-connection";
import { serializeResult } from "@/lib/neo4j-serialize";

export const runtime = "nodejs";

export async function POST(request) {
  try {
    const body = await request.json();
    const { credentials, query } = body;

    if (!credentials?.uri || !credentials?.username || !credentials?.password) {
      return NextResponse.json(
        { error: "Credential Neo4j belum lengkap." },
        { status: 400 }
      );
    }

    if (!query || !query.trim()) {
      return NextResponse.json(
        { error: "Cypher query tidak boleh kosong." },
        { status: 400 }
      );
    }

    const payload = await withNeo4jSession(credentials, async ({ session, resolvedUri }) => {
      const result = await session.run(query);
      return {
        ok: true,
        resolvedUri,
        result: serializeResult(result),
      };
    });

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Query execution failed." },
      { status: error.statusCode || 500 }
    );
  }
}
