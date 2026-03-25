"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const GROUP_COLORS = {
  Team: "#72d3ff",
  Person: "#ffb86a",
  Project: "#9af09f",
  Task: "#f59fbd",
  Dashboard: "#7cd7c6",
  Metric: "#ffd479",
  Node: "#c6d1ff",
};

function propertyRows(properties = {}) {
  return Object.entries(properties);
}

function buildElements(graph) {
  const nodes = (graph?.nodes || []).map((node) => ({
    data: {
      id: node.id,
      label: node.label,
      group: node.group,
      properties: node.properties || {},
      color: GROUP_COLORS[node.group] || GROUP_COLORS.Node,
    },
  }));

  const edges = (graph?.edges || []).map((edge) => ({
    data: {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      label: edge.label,
      type: edge.type,
      properties: edge.properties || {},
    },
  }));

  return [...nodes, ...edges];
}

export default function GraphWidget({ graph }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [selection, setSelection] = useState(null);

  const graphStats = useMemo(
    () => ({
      nodes: graph?.nodes?.length || 0,
      edges: graph?.edges?.length || 0,
    }),
    [graph]
  );

  const elements = useMemo(() => buildElements(graph), [graph]);

  useEffect(() => {
    let disposed = false;
    let resizeObserver = null;

    async function buildGraph() {
      if (!containerRef.current || !graph?.nodes?.length) {
        return;
      }

      const cytoscape = (await import("cytoscape")).default;
      if (disposed) {
        return;
      }

      cyRef.current?.destroy();

      const cy = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: "core",
            style: {
              "active-bg-opacity": 0,
              "selection-box-opacity": 0.12,
              "selection-box-color": "#7cd1ff",
              "selection-box-border-color": "#7cd1ff",
            },
          },
          {
            selector: "node",
            style: {
              label: "data(label)",
              width: 36,
              height: 36,
              color: "#eef7ff",
              "font-size": 12,
              "font-family": "Manrope",
              "text-wrap": "wrap",
              "text-max-width": 120,
              "text-valign": "bottom",
              "text-margin-y": 10,
              "background-color": "data(color)",
              "border-width": 2,
              "border-color": "#ecf8ff",
              "overlay-opacity": 0,
              "shadow-blur": 18,
              "shadow-color": "rgba(7, 16, 24, 0.35)",
              "shadow-offset-x": 0,
              "shadow-offset-y": 10,
            },
          },
          {
            selector: "edge",
            style: {
              label: "data(label)",
              width: 1.8,
              color: "#d7e5ee",
              "font-size": 10,
              "font-family": "Manrope",
              "curve-style": "bezier",
              "line-color": "rgba(123, 157, 181, 0.5)",
              "target-arrow-shape": "triangle",
              "target-arrow-color": "rgba(123, 157, 181, 0.82)",
              "arrow-scale": 0.9,
              "text-rotation": "autorotate",
              "text-background-color": "rgba(10, 16, 22, 0.86)",
              "text-background-opacity": 1,
              "text-background-padding": 3,
              "overlay-opacity": 0,
            },
          },
          {
            selector: "node:selected",
            style: {
              "border-width": 4,
              "border-color": "#ffb37b",
            },
          },
          {
            selector: "edge:selected",
            style: {
              "line-color": "#ff9f63",
              "target-arrow-color": "#ff9f63",
              width: 2.6,
            },
          },
        ],
        layout: {
          name: "cose",
          animate: true,
          fit: true,
          padding: 28,
          nodeRepulsion: 160000,
          idealEdgeLength: 160,
          edgeElasticity: 120,
          gravity: 0.42,
          numIter: 1200,
          initialTemp: 180,
          coolingFactor: 0.96,
        },
      });

      cy.on("tap", "node", (event) => {
        const data = event.target.data();
        setSelection({
          kind: "node",
          id: data.id,
          label: data.label,
          group: data.group,
          properties: data.properties || {},
        });
      });

      cy.on("tap", "edge", (event) => {
        const data = event.target.data();
        setSelection({
          kind: "edge",
          id: data.id,
          from: data.source,
          to: data.target,
          type: data.type,
          properties: data.properties || {},
        });
      });

      cy.on("tap", (event) => {
        if (event.target === cy) {
          setSelection(null);
        }
      });

      resizeObserver = new ResizeObserver(() => {
        cy.resize();
        cy.fit(undefined, 28);
      });
      resizeObserver.observe(containerRef.current);

      cyRef.current = cy;
    }

    buildGraph();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      cyRef.current?.destroy();
      cyRef.current = null;
    };
  }, [elements, graph]);

  if (!graph?.nodes?.length) {
    return (
      <div className="graph-empty">
        Query ini belum mengembalikan node atau relationship.
      </div>
    );
  }

  return (
    <div className="graph-stage">
      <div className="graph-toolbar">
        <span>{graphStats.nodes} nodes</span>
        <span>{graphStats.edges} rels</span>
      </div>
      <div className="graph-canvas" ref={containerRef} />
      <div className="graph-inspector">
        {selection ? (
          <>
            <div className="inspector-title">
              {selection.kind === "node" ? selection.group : selection.type}
            </div>
            <div className="inspector-main">
              {selection.kind === "node"
                ? selection.label
                : `${selection.from} -> ${selection.to}`}
            </div>
            <div className="inspector-properties">
              {propertyRows(selection.properties).length ? (
                propertyRows(selection.properties).map(([key, value]) => (
                  <div key={key} className="property-row">
                    <span>{key}</span>
                    <strong>{String(value)}</strong>
                  </div>
                ))
              ) : (
                <div className="property-empty">Tidak ada properti tambahan.</div>
              )}
            </div>
          </>
        ) : (
          <div className="property-empty">
            Klik node atau edge untuk melihat detail seperti di explorer graph.
          </div>
        )}
      </div>
    </div>
  );
}
