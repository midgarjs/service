
/**
 * Midgar Test service
 */
class TestService {
  constructor(midgar) {
    this.midgar = midgar
    this.isInit = false
  }

  /**
   * Int service
   */
  async init() {
    this.isInit = true
  }
}

export default {
  service: TestService
}
