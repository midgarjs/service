import { Plugin } from '@midgar/midgar'
import { asyncMap } from '@midgar/utils'

export const MODULE_TYPE_KEY = 'midgar-service'

/**
 * @typedef {Object} Service module
 * @property {string}          name         Service name
 * @property {Array<string>}   dependencies Array of depend service
 * @property {Array<string>}   before       Array of service init after this 
 * @property {Object|function} service      Service class or function
 */

/**
 * Midgar Service plugin
 * @class
 */
class ServicePlugin extends Plugin {
  constructor (...args) {
    super(...args)

    /**
     * Services module type key
     * @type {string}
     */
    this.moduleTypeKey = MODULE_TYPE_KEY

    this._invalidDependendies = {}

    /**
     * Service instance dictionary
     * @type {object}
     */
    this.services = {}
  }

  /**
   * Init plugin
   */
  init () {
    // Add service module types
    this.pm.addModuleType(this.moduleTypeKey, 'services')

    // Listen @midgar/midgar:afterInitPlugins event
    this.mid.on('@midgar/midgar:afterInitPlugins', async () => {
      await this._initServices()
    })
  }

  /**
   * init plugins services
   * @private
   */
  async _initServices () {
    this.mid.debug('Load services...')

    // Get all plugin services
    const { serviceModules, beforeServices } = await this._getServiceModules()
    // Add getService method
    this.mid.getService = (name) => {
      return this.getService(name)
    }

    for (const name in serviceModules) {
      try {
        await this._initService(name, serviceModules, beforeServices)
      } catch (error) {
        this.mid.error(error)
      }
    }

    /**
     * afterLoad event.
     * @event @midgar/service:afterLoad
     */
    await this.mid.emit('@midgar/service:afterLoad')
  }

  /**
   * Return an object with all plugin services
   *
   * @returns {object}
   * @private
   */
  async _getServiceModules () {
    const beforeServices = {}
    const serviceModules = {}

    // Get service files
    const files = await this.mid.pm.importModules(this.moduleTypeKey)
    // List service files
    for (const file of files) {
      const serviceModule = file.export
      try {
        // Check module
        this._checkServiceModule(serviceModule, file)

        // If the service has no name défined
        // Use the camel case file name
        if (!serviceModule.name) {
          let name = file.relativePath
          // Remove file extension
          name = name.replace(/\.[^/.]+$/, '')
          // camelCase
          name = name.replace(/\/([a-z])/g, (x, up) => up.toUpperCase())
          serviceModule.name = file.plugin + ':' + name
        }

        if (serviceModules[serviceModule.name] !== undefined) {
          this.mid.warn(`Service ${file.relativePath} skipped for dipplicate name !`)
          continue
        }

        // Check before
        this._proccessBeforeDef(serviceModule, beforeServices, file)

        serviceModules[serviceModule.name] = serviceModule
      } catch (error) {
        this.mid.error(error)
      }
    }

    return { serviceModules, beforeServices }
  }

  /**
   * Check service module
   *
   * @param {ServiceModule} serviceModule Service Module
   * @param {ModuleFile}    file          Module file from importModules
   */
  _checkServiceModule (serviceModule, file) {
    if (typeof serviceModule !== 'object') throw new TypeError(`Invalid default export type in module: ${file.path} !`)
    if (serviceModule.name !== undefined && typeof serviceModule.name !== 'string') throw new TypeError(`Invalid name type in module: ${file.path} !`)
    if (serviceModule.service === undefined) throw new Error(`No service define in module: ${file.path} !`)
    if (typeof serviceModule.service !== 'function') throw new TypeError(`Invalid service type in module: ${file.path} !`)
    if (serviceModule.before !== undefined && typeof serviceModule.before !== 'string' && !Array.isArray(serviceModule.before)) throw new Error(`Invalid before type in module: ${file.path} !`)
  }

  /**
   * Check in service module if before services exist and map them
   *
   * @param {ServiceModule} serviceModule  Service module
   * @param {Object}        beforeServices Store service before index
   * @param {object}        file           Object file from importModules
   */
  _proccessBeforeDef (serviceModule, beforeServices, file) {
    if (serviceModule.before === undefined) return
    if (typeof serviceModule.before !== 'string' && !Array.isArray(serviceModule.before)) throw new Error(`Invalid before type in file: ${file.path} !`)

    if (typeof serviceModule.before === 'string') {
      if (beforeServices[serviceModule.before] === undefined) beforeServices[serviceModule.before] = []
      beforeServices[serviceModule.before].push(serviceModule.name)
    } else {
      for (const name of serviceModule.before) {
        if (typeof name !== 'string') throw new Error(`Invalid before entry type in file: ${file.path} !`)
        if (beforeServices[name] === undefined) beforeServices[name] = []
        beforeServices[name].push(serviceModule.name)
      }
    }
  }

  /***
   * Create service instance
   *
   * @param {string} name Service Service name
   * @param {object} serviceModules Service modules
   * @param {object} beforeServices Before services maping
   * @param {object} invalidDependencies Contain dependencies cannot be require
   * @private
   */
  async _initService (name, serviceModules, beforeServices, invalidDependencies = {}) {
    // This method can be called multiple time for same service
    if (this.services[name]) return
    await this._initBeforeServices(name, serviceModules, beforeServices, invalidDependencies)

    const args = [
      this.mid
    ]

    const services = await this._initDependenciesServices(name, serviceModules, beforeServices, invalidDependencies)
    args.push(...services)

    if (this.services[name]) return
    // Create service instance
    await this._createInstance(name, serviceModules[name], args)
  }

  /**
   * Init before service
   *
   * @param {string} name                Service Service name
   * @param {object} serviceModules      Service modules
   * @param {object} beforeServices      Before services maping
   * @param {object} invalidDependencies Contain dependencies cannot be require
   * @private
   */
  async _initBeforeServices (name, serviceModules, beforeServices, invalidDependencies) {
    if (beforeServices[name]) {
      // Init service async
      await asyncMap(beforeServices[name], (beforeService) => {
        // Check service name
        if (serviceModules[beforeService] === name) throw new Error(`Invalid before service (${serviceModules[beforeService]}) in service (${name}) !`)
        if (!serviceModules[beforeService]) throw new Error(`Unknow before service (${beforeService}) in service (${name}) !`)

        // Flag this service to protect from circular dependency
        invalidDependencies[beforeService] = serviceModules[name]

        // Create service instance
        return this._initService(beforeService, serviceModules, beforeServices, invalidDependencies)
      })
    }
  }

  /**
   * Init dependencies serices and return an array
   * with service instances
   *
   * @param {string} name                Service Service name
   * @param {object} serviceModules      Service modules dictionary
   * @param {object} beforeServices      Before services maping
   * @param {object} invalidDependencies Contain dependencies cannot be require
   *
   * @return {Array}
   * @private
   */
  async _initDependenciesServices (name, serviceModules, beforeServices, invalidDependencies) {
    const serviceModule = serviceModules[name]
    // Inject dependencies in the args
    if (serviceModule.dependencies && serviceModule.dependencies.length) {
      // Init service async
      return asyncMap(serviceModule.dependencies, async (dependency) => {
        if (!serviceModules[dependency]) throw new Error(`Unknow service dependency (${dependency}) in service (${name}) !`)

        if (dependency === name) throw new Error(`Invalid service dependency (${dependency}) in service (${name}) !`)
        if (dependency === name) throw new Error(`Invalid service dependency (${dependency}) in service (${name}) !`)
        if (invalidDependencies[dependency] !== undefined) throw new Error(`Invalid service dependency (${dependency}) in service (${name}), ${invalidDependencies[dependency]} already depend on ${dependency} !`)

        invalidDependencies[name] = dependency
        await this._initService(dependency, serviceModules, beforeServices, invalidDependencies)
        return this.getService(dependency)
      })
    }

    return []
  }

  /**
   * Create the service instance
   *
   * @param {string}        name          Service name
   * @param {ServiceModule} serviceModule Service module
   * @param {Array}         args          Service constructor args
   * @private
   */
  async _createInstance (name, serviceModule, args) {
    this.mid.debug(`Create service instance ${name}.`)
    if (typeof serviceModule.service === 'function') {
      // If the service is a class
      if (/^class\s/.test(Function.prototype.toString.call(serviceModule.service))) {
        const Class = serviceModule.service
        this.services[name] = new Class(...args)

        if (typeof this.services[name].init === 'function') {
          await this.services[name].init()
        }
      // if service is a function
      } else {
        this.services[name] = await serviceModule.service(...args)
      }
    } else {
      throw new Error(`Invvalid service type: ${name} !`)
    }
  }

  /**
   * Return a service instance
   *
   * @param {string} name Service name
   * @returns {object}
   */
  getService (name) {
    if (!this.services[name]) throw new Error(`Unknow service: ${name} !`)
    return this.services[name]
  }

  /**
   * Test if func is a class
   * @param {Any} func Arg to test
   * @private
   */
  _isClass (func) {
    return typeof func === 'function' &&
    /^class\s/.test(Function.prototype.toString.call(func))
  }
}

export default ServicePlugin
