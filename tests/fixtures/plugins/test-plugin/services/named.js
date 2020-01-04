
/**
 * Midgar Test service
 */

export default {
  name: 'test2',
  service: class NamedService {
    constructor (midgar) {
      this.midgar = midgar
    }

    /**
     * Int service
     */
    async init () {
    }
  }
}
