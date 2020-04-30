import { Plugin } from '@midgar/midgar'
import { timer } from '@midgar/utils'

export const MODULE_TYPE_KEY = 'midgar-service'

/**
 * @typedef {Object} ServiceModule
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
  constructor(...args) {
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
  init() {
    // Add service module types
    this.pm.addModuleType(this.moduleTypeKey, 'services')

    // Listen @midgar/midgar:afterInitPlugins event
    this.mid.on('@midgar/midgar:afterInitPlugins', () => this._initServices())
  }

  /**
   * init plugins services
   *
   * @return {Promise<void>}
   * @private
   */
  async _initServices() {
    this.mid.debug('@midgar/service: Load services...')

    timer.start('midgar-service-load')
    // Get all plugin services
    const serviceModules = await this._getServiceModules()

    this._proccessBeforeDef(serviceModules)
    // Add getService method
    this.mid.getService = (name) => {
      return this.getService(name)
    }

    const globalDependencies = {}
    for (const name in serviceModules) {
      await this._initService(name, serviceModules, globalDependencies)
    }

    const time = timer.getTime('midgar-service-load')
    this.mid.debug(`@midgar:service: Services loaded in ${time} ms.`)
    /**
     * afterInit event.
     * @event @midgar/service:afterInit
     */
    await this.mid.emit('@midgar/service:afterInit')
  }

  /**
   * Return an object with all plugin services modules and before service mapping
   *
   * @return {Promise<object>}
   * @private
   */
  async _getServiceModules() {
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
          this.mid.warn(`@midgar/service: Service ${file.relativePath} skipped for dipplicate name !`)
          continue
        }

        serviceModules[serviceModule.name] = serviceModule
      } catch (error) {
        this.mid.error(error)
      }
    }

    return serviceModules
  }

  /**
   * Check service module
   *
   * @param {ServiceModule} serviceModule Service Module
   * @param {ModuleFile}    file          Module file from importModules
   * @private
   */
  _checkServiceModule(serviceModule, file) {
    if (typeof serviceModule !== 'object') throw new TypeError(`Invalid default export type in module: ${file.path} !`)
    if (serviceModule.name !== undefined && typeof serviceModule.name !== 'string')
      throw new TypeError(`Invalid name type in module: ${file.path} !`)
    if (serviceModule.service === undefined) throw new Error(`No service define in module: ${file.path} !`)
    if (typeof serviceModule.service !== 'function') throw new TypeError(`Invalid service type in module: ${file.path} !`)
    if (
      serviceModule.before !== undefined &&
      typeof serviceModule.before !== 'string' &&
      !Array.isArray(serviceModule.before)
    )
      throw new Error(`Invalid before type in module: ${file.path} !`)
  }

  /**
   * Check in service module if before services exist and map them
   *
   * @param {ServiceModule} serviceModule  Service module
   * @param {Object}        beforeServices Store service before index
   * @param {object}        file           Object file from importModules
   *
   * @return {Promise<void>}
   * @private
   */
  _proccessBeforeDef(serviceModules) {
    for (const name in serviceModules) {
      const serviceModule = serviceModules[name]

      if (serviceModule.before === undefined) continue

      if (typeof serviceModule.before !== 'string' && !Array.isArray(serviceModule.before))
        throw new Error(`Invalid before type in service: ${serviceModule.name} !`)

      if (typeof serviceModule.before === 'string') {
        if (serviceModules[serviceModule.before] === undefined)
          throw new Error(`Unknow before service ${serviceModule.before} defined in ${serviceModule.name} `)

        // Before service def
        const beforeServiceModule = serviceModules[serviceModule.before]

        if (beforeServiceModule.beforeDependencies === undefined) beforeServiceModule.beforeDependencies = []

        // Add before dependency
        beforeServiceModule.beforeDependencies.push(name)
      } else {
        for (const beforeName of serviceModule.before) {
          if (typeof beforeName !== 'string')
            throw new Error(`Invalid before entry type in service: ${serviceModule.name} !`)

          if (serviceModules[beforeName] === undefined)
            throw new Error(`Unknow before service ${beforeName} defined in ${serviceModule.name} `)

          const beforeServiceModule = serviceModules[beforeName]
          if (beforeServiceModule.beforeDependencies === undefined) beforeServiceModule.beforeDependencies = []

          // Add before dependency
          beforeServiceModule.beforeDependencies.push(name)
        }
      }
    }
  }

  /***
   * Create service instance
   *
   * @param {string} name Service Service name
   * @param {object} serviceModules Service modules
   * @param {object} globalDependencies Contain dependencies trace
   * @param {Array<String>} depends      Parent depending service
   *
   * @return {Promise<void>}
   * @private
   */
  async _initService(name, serviceModules, globalDependencies, depends = []) {
    // This method can be called multiple time for same service
    if (this.services[name]) return

    const args = [this.mid]

    // Add parent depeendency
    depends.push(name)
    const services = await this._initDependenciesServices(name, serviceModules, globalDependencies, depends)
    args.push(...services)

    if (this.services[name]) return
    // Create service instance
    await this._createInstance(name, serviceModules[name], args)
  }

  /**
   * Init dependencies serices and return an array
   * with service instances
   *
   * @param {string} name                Service Service name
   * @param {object} serviceModules      Service modules dictionary
   * @param {object} globalDependencies Contain dependencies trace
   * @param {Array<String>} depends      Parent depending service
   *
   * @return {Promise<Array<Service>>}
   * @private
   */
  async _initDependenciesServices(name, serviceModules, globalDependencies, depends) {
    const serviceModule = serviceModules[name]

    const depependencies = []

    if (serviceModule.beforeDependencies && serviceModule.beforeDependencies.length) {
      for (const dependency of serviceModule.beforeDependencies) {
        // Init service async
        if (!serviceModules[dependency]) throw new Error(`Unknow service before (${dependency}) in service (${name}) !`)
        await this._initService(dependency, serviceModules, globalDependencies, depends)
      }
    }

    // Inject dependencies in the args
    if (serviceModule.dependencies && serviceModule.dependencies.length) {
      // Init service async

      for (const dependency of serviceModule.dependencies) {
        // Loop on service dependencies
        if (!serviceModules[dependency]) throw new Error(`Unknow service dependency (${dependency}) in service (${name}) !`)

        // Check if service not depend of himself
        if (dependency === name) {
          throw new Error(`Invalid service dependency (${dependency}) in service (${name}) !`)
        }

        // Check circular dependencies
        if (globalDependencies[dependency] !== undefined && globalDependencies[dependency].indexOf(name) !== -1) {
          throw new Error(
            `Invalid service dependency ${dependency} in service ${name}, ${dependency} already depend on ${name} !`
          )
        }

        // Trace dependency to check circular dependencies
        if (globalDependencies[name] === undefined) globalDependencies[name] = []
        if (globalDependencies[name].indexOf(dependency) === -1) {
          globalDependencies[name].push(dependency)
        }

        for (const dep of depends) {
          if (globalDependencies[dep] === undefined) globalDependencies[dep] = []
          if (globalDependencies[dep].indexOf(dependency) === -1) {
            globalDependencies[dep].push(dependency)
          }
        }

        await this._initService(dependency, serviceModules, globalDependencies, [...depends])
        depependencies.push(this.getService(dependency))
      }
    }

    return depependencies
  }

  /**
   * Create the service instance
   *
   * @param {string}        name          Service name
   * @param {ServiceModule} serviceModule Service module
   * @param {Array}         args          Service constructor args
   *
   * @return {Promise<void>}
   * @private
   */
  async _createInstance(name, serviceModule, args) {
    timer.start('midgar-service-' + name + '-init')
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

    const time = timer.getTime('midgar-service-' + name + '-init')
    this.mid.debug(`@midgar/service: Create service instance ${name} in ${time} ms.`)
  }

  /**
   * Return a service instance
   *
   * @param {string} name Service name
   * @returns {object}
   */
  getService(name) {
    if (!this.services[name]) throw new Error(`Unknow service: ${name} !`)
    return this.services[name]
  }
}

export default ServicePlugin
