const db = require('./db');

/**
 * Calculates Haversine distance in kilometers between two lat/lon points
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const toRad = (angle) => (angle * Math.PI) / 180;
  const R = 6371; // Earth radius in kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Finds the nearest task to a given team (Haversine distance)
 */
function findNearestTask(teamId) {
  const team = db.getTeamById(teamId);
  if (!team) {
    throw new Error(`Team with ID ${teamId} not found`);
  }

  const tasks = db.getAllTasks();
  if (!tasks || tasks.length === 0) {
    return null;
  }

  let nearestTask = null;
  let minDistance = Infinity;

  for (const task of tasks) {
    // Distance in km
    const dist = haversineDistance(
      team.Latitude,
      team.Longitude,
      task.Latitude,
      task.Longitude
    );

    if (dist < minDistance) {
      minDistance = dist;
      nearestTask = {
        ...task,
        distanceKm: Math.round(dist * 100) / 100
      };
    }
  }

  return {
    team,
    nearestTask,
    distanceKm: nearestTask ? nearestTask.distanceKm : null
  };
}

/**
 * Calls OSRM (or provides fallback) to get optimal route between team and task
 */
async function getRoute(teamId, taskId) {
  const team = db.getTeamById(teamId);
  if (!team) throw new Error(`Team ${teamId} not found`);

  const task = db.getTaskById(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const startLng = team.Longitude;
  const startLat = team.Latitude;
  const endLng = task.Longitude;
  const endLat = task.Latitude;

  // Direct haversine distance for baseline
  const straightDistKm = haversineDistance(startLat, startLng, endLat, endLng);

  const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        return {
          source: 'osrm',
          distanceMeters: route.distance,
          distanceKm: Math.round((route.distance / 1000) * 100) / 100,
          durationSeconds: Math.round(route.duration),
          durationMinutes: Math.round(route.duration / 60),
          geometry: route.geometry, // GeoJSON LineString
          team,
          task
        };
      }
    }
  } catch (err) {
    console.warn(`[OSRM] Project-OSRM request failed/timed out: ${err.message}. Using synthetic geo route fallback.`);
  }

  // Fallback: Generate curved realistic road-like waypoint GeoJSON
  const directCoordinates = [
    [startLng, startLat],
    // midpoint with slight curve
    [(startLng + endLng) / 2 + (startLat - endLat) * 0.05, (startLat + endLat) / 2 + (endLng - startLng) * 0.05],
    [endLng, endLat]
  ];

  const estimatedMeters = Math.round(straightDistKm * 1300); // ~1.3x road factor
  const estimatedSeconds = Math.round((estimatedMeters / 1000 / 40) * 3600); // 40km/h avg speed

  return {
    source: 'fallback',
    distanceMeters: estimatedMeters,
    distanceKm: Math.round((estimatedMeters / 1000) * 100) / 100,
    durationSeconds: estimatedSeconds,
    durationMinutes: Math.round(estimatedSeconds / 60),
    geometry: {
      type: 'LineString',
      coordinates: directCoordinates
    },
    team,
    task
  };
}

module.exports = {
  haversineDistance,
  findNearestTask,
  getRoute
};
