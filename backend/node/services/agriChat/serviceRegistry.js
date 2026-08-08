/**
 * Service Registry Pattern implementation.
 * Allows independent registration, swapping, and retrieval of advisory service modules.
 */
class ServiceRegistry {
  constructor() {
    this.services = new Map();
  }

  /**
   * Register a module provider under a service key.
   * @param {string} key - e.g. 'market_price', 'pesticide', 'gov_scheme', 'language', 'speech'
   * @param {Object} instance - Service implementation instance
   */
  register(key, instance) {
    if (!key || typeof key !== 'string') {
      throw new Error('Service key must be a non-empty string');
    }
    this.services.set(key, instance);
    console.log(`[ServiceRegistry] Registered service module: '${key}'`);
  }

  /**
   * Get a registered service module.
   * @param {string} key
   * @returns {Object} Service instance
   */
  get(key) {
    const service = this.services.get(key);
    if (!service) {
      throw new Error(`[ServiceRegistry] Service module '${key}' is not registered.`);
    }
    return service;
  }

  /**
   * Check if a service module is registered.
   * @param {string} key
   * @returns {boolean}
   */
  has(key) {
    return this.services.has(key);
  }

  /**
   * Unregister a service module.
   * @param {string} key
   */
  unregister(key) {
    this.services.delete(key);
    console.log(`[ServiceRegistry] Unregistered service module: '${key}'`);
  }
}

export const registry = new ServiceRegistry();
export default registry;
