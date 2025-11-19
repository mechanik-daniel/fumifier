/*
Copyright (c) 2025 Outburn Ltd.
Project: Fumifier (part of the FUME open-source initiative)

License: See the LICENSE file included with this package for the terms that apply to this distribution.
*/

import { VERSION } from '../version.js';

/**
 * @typedef CacheInterface
 * @property {(identity: Object) => Promise<any>} get - Retrieve a value from the cache using identity object
 * @property {(identity: Object, value: any) => Promise<void>} set - Store a value in the cache using identity object
 */

/**
 * Creates an expression identity object for cache keys
 * @param {string} source - The raw source string of the expression
 * @param {object} navigator - Optional FHIR structure navigator
 * @returns {object} Expression identity object
 */
export function createExpressionIdentity(source, navigator) {
  const identity = {
    source: source,
    version: VERSION
  };

  // Extract normalized root package context if navigator is available
  if (navigator && typeof navigator.getNormalizedRootPackages === 'function') {
    try {
      const rootPackages = navigator.getNormalizedRootPackages();
      identity.rootPackages = rootPackages;
    } catch (error) {
      // If extraction fails, proceed without root packages
      // This means the expression might not be fully cache-compatible with different navigators
    }
  }

  return identity;
}

/**
 * Cache interface that wraps different cache implementations
 */
export class CacheInterface {
  /**
   * Create a cache interface
   * @param {object} implementation - The cache implementation with get/set methods
   */
  constructor(implementation) {
    this.impl = implementation;
    // Each cache instance has its own inflight tracking
    this.inflightPromises = new Map();
  }

  /**
   * Get a cached AST by expression identity
   * @param {object} identity - Expression identity object
   * @returns {Promise<object|undefined>} The cached AST or undefined if not found
   */
  async get(identity) {
    if (!this.impl || typeof this.impl.get !== 'function') {
      return undefined;
    }
    return await this.impl.get(identity);
  }

  /**
   * Set a cached AST by expression identity
   * @param {object} identity - Expression identity object
   * @param {object} ast - The AST to cache
   * @returns {Promise<void>} Promise that resolves when the cache is set
   */
  async set(identity, ast) {
    if (!this.impl || typeof this.impl.set !== 'function') {
      return;
    }
    await this.impl.set(identity, ast);
  }

  /**
   * Create or get an inflight promise for parsing with deduplication
   * @param {string} key - The cache key for the expression
   * @param {Function} parseFunction - Function that returns a promise for parsing
   * @returns {Promise<any>} Promise that resolves to the parsed AST
   */
  async getOrCreateInflight(key, parseFunction) {
    // Check if there's already an inflight promise for this key
    if (this.inflightPromises.has(key)) {
      return await this.inflightPromises.get(key);
    }

    // Create new inflight promise
    const promise = parseFunction().finally(() => {
      // Clean up the inflight promise when it completes (success or failure)
      this.inflightPromises.delete(key);
    });

    // Store the promise in the inflight map
    this.inflightPromises.set(key, promise);

    return await promise;
  }

  /**
   * Get inflight statistics for this cache instance
   * @returns {object} Inflight statistics
   */
  getInflightStats() {
    return {
      activeInflightRequests: this.inflightPromises.size
    };
  }
}

/**
 * Estimate memory usage of an object in bytes
 * This is a rough estimation for cache size management
 * @param {any} obj - The object to estimate
 * @returns {number} Estimated memory usage in bytes
 */
export function estimateMemoryUsage(obj) {
  if (obj === null || obj === undefined) {
    return 8; // Rough estimate for null/undefined
  }

  const type = typeof obj;

  switch (type) {
    case 'boolean':
      return 4;
    case 'number':
      return 8;
    case 'string':
      return obj.length * 2 + 24; // UTF-16 encoding + object overhead
    case 'object':
      if (Array.isArray(obj)) {
        let size = 24; // Array overhead
        for (const item of obj) {
          size += estimateMemoryUsage(item);
        }
        return size;
      } else {
        let size = 24; // Object overhead
        for (const key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            size += key.length * 2 + 8; // Key string + property overhead
            size += estimateMemoryUsage(obj[key]);
          }
        }
        return size;
      }
    default:
      return 24; // Default object overhead
  }
}