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
     * Service definition object
     * @type {Object}
     */
    this.servicedefs = {}

    /**
     * Service instance object
     * @type {Object}
     */
    this.serviceInstances = {}
  }

  /**
   * Init plugin
   */
  async init () {
    // Add services plugin dir
    this.pm.addPluginDir(this.dirKey, 'services')

    // Listen @midgar/midgar:afterInit event
    this.mid.on('@midgar/midgar:afterLoadPlugins', async () => {
      await this._loadServices()
      // Add getService method
      this.mid.getService = (name) => {
        return this.getService(name)
      }
      // Create services instances
      await this._initServices()
    })
  }

  /**
   * Load plugins services
   * @private
   */
  async _loadServices () {
    this.mid.debug('@midgar/service: Load services...')

    // Get all plugin services
    const services = await this._getServices()

    // Check services
    this.servicedefs = await utils.asyncMap(Object.keys(services), (serviceName) => {
      const service = services[serviceName]

      if (!service.service) {
        throw new Error('@midgar/service: Invalid service (' + serviceName + ') !')
      }

      // Check service dependencies
      if (service.dependencies && service.dependencies.length) {
        service.dependencies.forEach(dependency => {
          if (!services[dependency]) {
            throw new Error('@midgar/service: Unknown dependency ' + dependency + '  for service ' + serviceName + ' !')
          }
        })
      }

      return { key: serviceName, value: service }
    }, true)
  }

  /**
   * Create and init service instance
   * @private
   */
  async _initServices () {
    for (const name of Object.keys(this.servicedefs)) {
      const service = this.servicedefs[name]

      // Create service instance and init them
      if (!this.serviceInstances[name]) {
        await this._getServiceInstance(name, service)
      }
    }
  }

  /***
   * Créate a service instance
   * @param {String} name Service name
   * @return {Any}
   * @private
   */
  async _getServiceInstance (name) {
    if (!this.serviceInstances[name]) {
      if (!this.servicedefs[name]) {
        throw new Error('@midgar/service: Unknow service: ' + name + ' !')
      }

      // Args for the service instance
      const args = [
        this.mid
      ]

      const serviceDef = this.servicedefs[name]

      // Inject dependencies in the args
      if (serviceDef.dependencies && serviceDef.dependencies.length) {
        for (const dependency of serviceDef.dependencies) {
          args.push(await this._getServiceInstance(dependency))
        }
      }

      // Create service instance
      await this._createServiceInstance(name, serviceDef, args)
    }

    return this.serviceInstances[name]
  }

  /**
   * Create the service instance
   *
   * @param {String} name       Service name
   * @param {Object} serviceDef Service definition
   * @param {Array}  args       Service constructor args
   * @private
   */
  async _createServiceInstance (name, serviceDef, args) {
    this.mid.debug(`@midgar/service: create service instance (${name})`)
    if (typeof serviceDef.service === 'function') {
      // If the service is a class
      if (/^class\s/.test(Function.prototype.toString.call(serviceDef.service))) {
        const Class = serviceDef.service
        this.serviceInstances[name] = new Class(...args)

        if (typeof this.serviceInstances[name].init === 'function') {
          await this.serviceInstances[name].init()
        }
      // The service is a function
      } else {
        this.serviceInstances[name] = await serviceDef.service(...args)
      }
    } else {
      throw new Error('@midgar/service: Invvalid service type (' + name + ') !')
    }
  }

  /**
   * Return an object with all plugin services
   * @returns {Object}
   */
  async _getServices () {
    const names = {}

    // Get service files
    const files = await this.mid.pm.importDir(this.dirKey)
    // List service files
    return utils.asyncMap(files, (file) => {
      const service = file.export
      // If the service has no name défined
      // Use the camel case file name
      if (!service.name) {
        let name = file.relativePath
        // Remove file extension
        name = name.replace(/\.[^/.]+$/, '')
        // camelCase
        name = name.replace(/\/([a-z])/g, (x, up) => up.toUpperCase())
        service.name = name
      }

      if (names[service.name] !== undefined) {
        this.mid.war('@midgar/service: Service ' + file.relativePath + ' skipped for dipplicate name !')
        return
      }

      names[service.name] = 1

      return { key: service.name, value: service }
    }, true)
  }

  /**
   * Return a service instance
   *
   * @param {String} name Service name
   * @returns {Object}
   */
  getService (name) {
    if (!this.serviceInstances[name]) throw new Error('@midgar/service: Unknow service: ' + name + ' !')
    return this.serviceInstances[name]
  }
}

export default ServicePlugin
