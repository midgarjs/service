
/**
 * Midgar Test service
 */
class TestService {
  constructor (mid, testService) {
    this.mid = mid
    this.testService = testService
    this.testService.services.push('test-2')
  }

  async init () {}
}

export default {
  dependencies: [
    'test-plugin:test'
  ],
  service: TestService
}
