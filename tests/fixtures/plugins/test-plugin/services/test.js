
/**
 * Midgar Test service
 */
class TestService {
  constructor (mid) {
    this.mid = mid
    this.isInit = false
    this.services = []
  }

  /**
   * Int service
   */
  async init () {
    this.isInit = true
  }
}

export default {
  service: TestService
}
