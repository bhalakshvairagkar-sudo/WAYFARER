/**
 * WAYFARER AI - Dynamic Itinerary Graph Engine (DAG)
 * Manages the sequential flow of stops, travel segments, delay propagation, and substitutions.
 */

/**
 * Parses a time string 'HH:MM' into minutes from midnight.
 * @param {string} timeStr - The time string (e.g., '14:30')
 * @returns {number} Minutes from midnight
 */
export function timeToMinutes(timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converts minutes from midnight back into an 'HH:MM' string.
 * @param {number} totalMins - Minutes from midnight
 * @returns {string} The formatted time string
 */
export function minutesToTime(totalMins) {
  // Handle wrapping around 24 hours just in case
  const wrappedMins = ((totalMins % 1440) + 1440) % 1440;
  const hours = Math.floor(wrappedMins / 60);
  const minutes = wrappedMins % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Adds a given number of minutes to an 'HH:MM' time string.
 * @param {string} timeStr - Original time string
 * @param {number} minutes - Minutes to add
 * @returns {string} The new time string
 */
export function addMinutesToTime(timeStr, minutes) {
  return minutesToTime(timeToMinutes(timeStr) + minutes);
}

/**
 * Converts a linear list of stops and segments into a DAG.
 * @param {Array<Object>} stops - The list of stops
 * @param {Array<Object>} segments - The list of transit segments between stops
 * @returns {Object} Graph object containing nodes map, edges array, and topologicalOrder
 */
export function buildItineraryGraph(stops, segments) {
  const nodes = new Map();
  const edges = [];
  const topologicalOrder = [];

  // Create nodes
  stops.forEach((stop) => {
    const isStrictDeadline = stop.isStrictDeadline || false;
    const node = {
      id: stop.id,
      type: stop.type,
      name: stop.name,
      location: { lat: stop.lat, lng: stop.lng, city: stop.city },
      day: stop.day,
      arrivalTime: stop.arrivalTime,
      departureTime: stop.departureTime,
      durationMin: stop.durationMin,
      minDurationMin: stop.minDurationMin,
      bufferMin: stop.bufferMin,
      cost: stop.cost || { estimated: 0, currency: 'INR' },
      openingHours: stop.openingHours || { open: '00:00', close: '23:59' },
      accessibility: stop.accessibility || {},
      status: 'PLANNED', // 'PLANNED'|'ACTIVE'|'AFFECTED'|'ADJUSTED'|'SUBSTITUTED'|'CANCELLED'
      dependencies: [],
      isStrictDeadline: isStrictDeadline,
      alternatives: []
    };
    nodes.set(node.id, node);
    topologicalOrder.push(node.id); // Since input stops are sequentially ordered
  });

  // Create edges based on segments
  if (segments && segments.length > 0) {
    segments.forEach(segment => {
      edges.push({
        id: `edge-${segment.fromNodeId}-${segment.toNodeId}`,
        fromNodeId: segment.fromNodeId,
        toNodeId: segment.toNodeId,
        segmentId: segment.segmentId,
        transitDurationMin: segment.transitDurationMin,
        candidateRoutes: segment.candidateRoutes || []
      });
      // Link dependency
      const toNode = nodes.get(segment.toNodeId);
      if (toNode) {
        toNode.dependencies.push(segment.fromNodeId);
      }
    });
  } else {
    // If segments aren't fully provided, implicitly link stops in order
    for (let i = 0; i < stops.length - 1; i++) {
      const fromNodeId = stops[i].id;
      const toNodeId = stops[i + 1].id;
      edges.push({
        id: `edge-${fromNodeId}-${toNodeId}`,
        fromNodeId: fromNodeId,
        toNodeId: toNodeId,
        segmentId: `S${i + 1}`,
        transitDurationMin: timeToMinutes(stops[i + 1].arrivalTime) - timeToMinutes(stops[i].departureTime),
        candidateRoutes: []
      });
      const toNode = nodes.get(toNodeId);
      if (toNode) {
        toNode.dependencies.push(fromNodeId);
      }
    }
  }

  return { nodes, edges, topologicalOrder };
}

/**
 * Returns all downstream nodes that come after a specific node in topological order.
 * @param {Object} graph - The graph object
 * @param {string} nodeId - The target node ID
 * @returns {Array<Object>} List of downstream nodes
 */
export function getDownstreamNodes(graph, nodeId) {
  const startIndex = graph.topologicalOrder.indexOf(nodeId);
  if (startIndex === -1) return [];

  const downstream = [];
  for (let i = startIndex + 1; i < graph.topologicalOrder.length; i++) {
    downstream.push(graph.nodes.get(graph.topologicalOrder[i]));
  }
  return downstream;
}

/**
 * Propagates a delay through the DAG downstream, altering arrival and departure times,
 * and checking for constraints (opening hours, strict deadlines, minimum dwell).
 * @param {Object} graph - The graph object
 * @param {string} affectedNodeId - The node where the delay originated
 * @param {number} delayMinutes - The amount of delay in minutes
 * @returns {Object} Result of propagation including affected nodes, conflicts, and repairs
 */
export function propagateDelay(graph, affectedNodeId, delayMinutes) {
  const affectedNodes = [];
  const conflicts = [];
  const repairs = [];
  let currentDelay = delayMinutes;
  
  // First update the originally affected node's departure time to reflect the initial delay
  const startNode = graph.nodes.get(affectedNodeId);
  if (startNode) {
    startNode.departureTime = addMinutesToTime(startNode.departureTime, currentDelay);
    if (startNode.status === 'PLANNED') {
       startNode.status = 'AFFECTED';
    }
  }

  const downstreamNodes = getDownstreamNodes(graph, affectedNodeId);

  for (const node of downstreamNodes) {
    if (currentDelay <= 0) break; // Delay has been fully absorbed

    // Shift arrival time
    node.arrivalTime = addMinutesToTime(node.arrivalTime, currentDelay);
    affectedNodes.push(node.id);
    node.status = 'AFFECTED';

    const arrivalMins = timeToMinutes(node.arrivalTime);
    const closeMins = timeToMinutes(node.openingHours.close);

    // Check if new arrival is after opening hours close
    if (arrivalMins >= closeMins) {
      node.conflict = 'VENUE_CLOSED';
      conflicts.push({ nodeId: node.id, type: 'VENUE_CLOSED', details: `Arriving at ${node.arrivalTime}, closes at ${node.openingHours.close}` });
      // If closed, might not dwell at all, but we keep propagating max delay
      node.departureTime = addMinutesToTime(node.departureTime, currentDelay);
      continue;
    }

    // Check strict deadline
    if (node.isStrictDeadline) {
      node.conflict = 'DEADLINE_BREACH';
      conflicts.push({ nodeId: node.id, type: 'DEADLINE_BREACH', details: `Strict deadline breached by ${currentDelay} minutes.` });
    }

    // Attempt to compress dwell time to absorb delay
    const maxCompressionPossible = node.durationMin - node.minDurationMin;
    if (maxCompressionPossible > 0) {
      const compressionAmount = Math.min(maxCompressionPossible, currentDelay);
      
      const originalMin = node.durationMin;
      node.durationMin -= compressionAmount;
      currentDelay -= compressionAmount;
      
      node.status = 'ADJUSTED';
      node.dwellCompression = { originalMin, adjustedMin: node.durationMin };
      repairs.push({ nodeId: node.id, type: 'DWELL_COMPRESSION', originalMin, adjustedMin: node.durationMin });
      
      const baseDeparture = timeToMinutes(node.arrivalTime) + node.durationMin;
      node.departureTime = minutesToTime(baseDeparture);
    } else {
      // Delay passes through fully
      node.departureTime = addMinutesToTime(node.departureTime, currentDelay);
    }
  }

  return {
    affectedNodes,
    totalCascadeMin: currentDelay,
    conflicts,
    repairs
  };
}

/**
 * Substitutes a cancelled node with an alternative, recalculates graph timing.
 * @param {Object} graph - The graph object
 * @param {string} cancelledNodeId - The node ID to replace
 * @param {Object} alternativeNode - The alternative node data
 * @returns {Object} Updated graph
 */
export function substituteNode(graph, cancelledNodeId, alternativeNode) {
  const node = graph.nodes.get(cancelledNodeId);
  if (!node) return graph;

  const arrivalTime = node.arrivalTime;
  
  const substitute = {
    ...node,
    id: alternativeNode.id,
    name: alternativeNode.name,
    type: alternativeNode.type,
    location: { lat: alternativeNode.lat, lng: alternativeNode.lng, city: alternativeNode.city },
    durationMin: alternativeNode.durationMin,
    minDurationMin: alternativeNode.minDurationMin,
    cost: alternativeNode.cost,
    openingHours: alternativeNode.openingHours,
    accessibility: alternativeNode.accessibility,
    status: 'SUBSTITUTED',
    conflict: null,
    dwellCompression: null
  };

  substitute.departureTime = addMinutesToTime(arrivalTime, substitute.durationMin);

  graph.edges.forEach(edge => {
    if (edge.fromNodeId === cancelledNodeId) edge.fromNodeId = substitute.id;
    if (edge.toNodeId === cancelledNodeId) edge.toNodeId = substitute.id;
  });

  const index = graph.topologicalOrder.indexOf(cancelledNodeId);
  if (index !== -1) {
    graph.topologicalOrder[index] = substitute.id;
  }

  graph.nodes.delete(cancelledNodeId);
  graph.nodes.set(substitute.id, substitute);

  const diffMin = substitute.durationMin - node.durationMin;
  if (diffMin !== 0) {
    propagateDelay(graph, substitute.id, diffMin);
  }

  return graph;
}

/**
 * Returns an ordered array of simplified node data for timeline rendering.
 * @param {Object} graph - The graph object
 * @returns {Array<Object>} Ordered snapshot
 */
export function getTimelineSnapshot(graph) {
  return graph.topologicalOrder.map(nodeId => {
    const node = graph.nodes.get(nodeId);
    return {
      nodeId: node.id,
      name: node.name,
      day: node.day,
      arrivalTime: node.arrivalTime,
      departureTime: node.departureTime,
      status: node.status,
      conflicts: node.conflict ? [node.conflict] : []
    };
  });
}
