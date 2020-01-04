import { Plugin } from '@midgar/midgar'
import utils from '@midgar/utils'

export const DIR_KEY = 'midgar-services'

/**
 * Midgar Service plugin
 * @class
 */
class ServicePlugin extends Plugin {
  constructor (...args) {
    super(...args)

    /**
     * Services dir key
     * @type {String}
     */
    this.dirKey = DIR_KEY

    /**
     * Service instance object
     * @type {Object}
     */
    this._services = {}
  }

  /**
   * Init plugin
   */
  init () {
    // Add services plugin dir
    this.pm.addPluginDir(this.dirKey, 'services')

    // Listen @midgar/midgar:afterInit event
    this.mid.on('@midgar/midgar:afterLoadPlugins', async () => {
      await this._loadServices()
    })
  }

  /**
   * Load plugins services
   * @private
   */
  async _loadServices () {
    this.mid.debug('@midgar/service: Load services...')

    // Get all plugin services
    const { serviceDefs, beforeServices } = await this._getServiceDefs()
    // Add getService method
    this.mid.getService = (name) => {
      return this.getService(name)
    }

    for (const name of Object.keys(serviceDefs)) {
      try {
        await this._initService(name, serviceDefs, beforeServices)
      } catch (error) {
        this.mid.error(error)
      }
    }
  }

  /**
   * Return an object with all plugin services
   * @returns {Object}
   */
  async _getServiceDefs () {
    const beforeServices = {}
    const serviceDefs = {}

    // Get service files
    const files = await this.mid.pm.importDir(this.dirKey)

    // List service files
    for (const file of files) {
      const serviceDef = file.export
      try {
        // Check file
        this._checkServiceDef(serviceDef, file)

        // If the service has no name défined
        // Use the camel case file name
        if (!serviceDef.name) {
          let name = file.relativePath
          // Remove file extension
          name = name.replace(/\.[^/.]+$/, '')
          // camelCase
          name = name.replace(/\/([a-z])/g, (x, up) => up.toUpperCase())
          serviceDef.name = file.plugin + ':' + name
        }

        if (serviceDefs[serviceDef.name] !== undefined) {
          this.mid.war(`@midgar/service: Service ${file.relativePath} skipped for dipplicate name !`)
          continue
        }

        // Check before
        this._proccessBeforeDef(serviceDef, beforeServices, file)

        serviceDefs[serviceDef.name] = serviceDef
      } catch (error) {
        this.mid.error(error)
      }
    }

    return { serviceDefs, beforeServices }
  }

  /**
   * Check service Object def
   *
   * @param {Obejct} serviceDef Service Object def
   * @param {Object} file       Object file from pm.importDir
   */
  _checkServiceDef (serviceDef, file) {
    if (typeof serviceDef !== 'object') throw new TypeError(`@midgar/service: Invalid default export type in file: ${file.path} !`)
    if (serviceDef.name !== undefined && typeof serviceDef.name !== 'string') throw new TypeError(`@midgar/service: Invalid name type in file: ${file.path} !`)
    if (serviceDef.service === undefined) throw new Error(`@midgar/service: No service define in file: ${file.path} !`)
    if (serviceDef.service !== undefined && typeof serviceDef.service !== 'function') throw new TypeError(`@midgar/service: Invalid service type in file: ${file.path} !`)
    if (serviceDef.before !== undefined && typeof serviceDef.before !== 'string' && !Array.isArray(serviceDef.before)) throw new Error(`@midgar/service: Invalid before type in file: ${file.path} !`)
  }

  /**
   *
   * @param {*} serviceDef
   * @param {*} beforeServices Store service before index
   */
  _proccessBeforeDef (serviceDef, beforeServices, file) {
    if (serviceDef.before === undefined) return
    if (typeof serviceDef.before !== 'string' && !Array.isArray(serviceDef.before)) throw new Error(`@midgar/service: Invalid before type in file: ${file.path} !`)

    if (typeof serviceDef.before === 'string') {
      if (beforeServices[serviceDef.before] === undefined) beforeServices[serviceDef.before] = []
      beforeServices[serviceDef.before].push(serviceDef.name)
    } else {
      for (const name of serviceDef.before) {
        if (typeof name !== 'string') throw new Error(`@midgar/service: Invalid before entry type in file: ${file.path} !`)
        if (beforeServices[name] === undefined) beforeServices[name] = []
        beforeServices[name].push(serviceDef.name)
      }
    }
  }

  /***
   * Créate a service instance
   *
   * @param {Object} serviceDef Service name
   * @return {Any}
   * @private
   */
  async _initService (name, serviceDefs, beforeServices) {
    // This method can be called multiple time for same service
    if (!this._services[name]) {
      // Args for the service instance
      if (beforeServices[name]) {
        for (const beforeService of beforeServices) {
          if (!serviceDefs[beforeService]) throw new Error(`@midgar/service: Unknow before service (${beforeService}) in service (${name}) !`)
          await this._initService(beforeService, serviceDefs, beforeServices)
        }
      }
      const args = [
        this.mid
      ]

      const serviceDef = serviceDefs[name]

      // Inject dependencies in the args
      if (serviceDef.dependencies && serviceDef.dependencies.length) {
        for (const dependency of serviceDef.dependencies) {
          if (!serviceDefs[dependency]) throw new Error(`@midgar/service: Unknow service dependency (${dependency}) in service (${name}) !`)
          await this._initService(dependency, serviceDefs, beforeServices)
          args.push(this.getService(dependency))
        }
      }

      // Create service instance
      await this._createInstance(name, serviceDef, args)
    }
  }

  /**
   * Create the service instance
   *
   * @param {String} name       Service name
   * @param {Object} serviceDef Service definition
   * @param {Array}  args       Service constructor args
   * @private
   */
  async _createInstance (name, serviceDef, args) {
    this.mid.debug(`@midgar/service: create service instance (${name})`)
    if (typeof serviceDef.service === 'function') {
      // If the service is a class
      if (/^class\s/.test(Function.prototype.toString.call(serviceDef.service))) {
        const Class = serviceDef.service
        this._services[name] = new Class(...args)

        if (typeof this._services[name].init === 'function') {
          await this._services[name].init()
        }
      // The service is a function
      } else {
        this._services[name] = await serviceDef.service(...args)
      }
    } else {
      throw new Error('@midgar/service: Invvalid service type (' + name + ') !')
    }
  }

  /**
   * Return a service instance
   *
   * @param {String} name Service name
   * @returns {Object}
   */
  getService (name) {
    if (!this._services[name]) throw new Error(`@midgar/service: Unknow service: ${name} !`)
    return this._services[name]
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
