import neo4j from "neo4j-driver";

const { isInt } = neo4j;

function toPlainNumber(value) {
  if (!isInt(value)) {
    return value;
  }

  return value.inSafeRange() ? value.toNumber() : value.toString();
}

function isNeoNode(value) {
  return Boolean(
    value &&
      Array.isArray(value.labels) &&
      value.properties &&
      Object.prototype.hasOwnProperty.call(value, "elementId")
  );
}

function isNeoRelationship(value) {
  return Boolean(
    value &&
      typeof value.type === "string" &&
      Object.prototype.hasOwnProperty.call(value, "startNodeElementId") &&
      Object.prototype.hasOwnProperty.call(value, "endNodeElementId")
  );
}

function isNeoPath(value) {
  return Boolean(value && Array.isArray(value.segments) && value.start && value.end);
}

function formatNodeLabel(node) {
  const props = node.properties || {};
  return (
    props.name ||
    props.title ||
    props.code ||
    props.id ||
    props.email ||
    node.labels?.[0] ||
    "Node"
  );
}

function serializePrimitive(value) {
  if (isInt(value)) {
    return toPlainNumber(value);
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializePrimitive(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializePrimitive(item)])
    );
  }

  return value;
}

function createGraphStore() {
  return {
    nodes: new Map(),
    edges: new Map(),
  };
}

function addNode(node, graph) {
  const id = node.elementId || String(toPlainNumber(node.identity));
  if (!graph.nodes.has(id)) {
    graph.nodes.set(id, {
      id,
      label: formatNodeLabel(node),
      group: node.labels?.[0] || "Node",
      labels: node.labels || [],
      properties: serializePrimitive(node.properties || {}),
    });
  }
  return id;
}

function addRelationship(relationship, graph) {
  const from =
    relationship.startNodeElementId || String(toPlainNumber(relationship.start));
  const to = relationship.endNodeElementId || String(toPlainNumber(relationship.end));
  const id =
    relationship.elementId || `${from}-${relationship.type}-${to}-${Object.keys(relationship.properties || {}).join("-")}`;

  if (!graph.edges.has(id)) {
    graph.edges.set(id, {
      id,
      from,
      to,
      label: relationship.type,
      type: relationship.type,
      properties: serializePrimitive(relationship.properties || {}),
    });
  }
  return id;
}

function serializeValue(value, graph) {
  if (isInt(value)) {
    return toPlainNumber(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item, graph));
  }

  if (isNeoNode(value)) {
    addNode(value, graph);
    return {
      _kind: "node",
      elementId: value.elementId,
      labels: value.labels,
      properties: serializePrimitive(value.properties || {}),
    };
  }

  if (isNeoRelationship(value)) {
    addRelationship(value, graph);
    return {
      _kind: "relationship",
      elementId: value.elementId,
      type: value.type,
      startNodeElementId: value.startNodeElementId,
      endNodeElementId: value.endNodeElementId,
      properties: serializePrimitive(value.properties || {}),
    };
  }

  if (isNeoPath(value)) {
    addNode(value.start, graph);
    addNode(value.end, graph);
    value.segments.forEach((segment) => {
      addNode(segment.start, graph);
      addNode(segment.end, graph);
      addRelationship(segment.relationship, graph);
    });

    return {
      _kind: "path",
      start: serializeValue(value.start, graph),
      end: serializeValue(value.end, graph),
      length: toPlainNumber(value.length),
    };
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, serializeValue(item, graph)])
    );
  }

  return value;
}

export function serializeResult(result) {
  const graph = createGraphStore();

  const rows = result.records.map((record) =>
    Object.fromEntries(
      record.keys.map((key) => [key, serializeValue(record.get(key), graph)])
    )
  );

  return {
    columns: result.records[0]?.keys || [],
    rows,
    graph: {
      nodes: Array.from(graph.nodes.values()),
      edges: Array.from(graph.edges.values()),
    },
    summary: {
      queryType: result.summary.queryType || "r",
      availableAfterMs: toPlainNumber(result.summary.resultAvailableAfter),
      consumedAfterMs: toPlainNumber(result.summary.resultConsumedAfter),
      database: result.summary.database?.name || null,
      counters: serializePrimitive(result.summary.counters.updates()),
    },
  };
}

