/**
 * Point d'entrée pour tous les types TypeScript partagés
 * SimuMarty - Types basés sur MartyPy (Marty V2)
 */

// Core Marty types (replaces the old robot.types)
export * from './marty.types';

// API (REST / WebSocket) types
export * from './api.types';

// Sensors and add-ons types
export * from './sensors.types';

// Simulator-specific types (environments, camera, physics)
export * from './simulator.types';
