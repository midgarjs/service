
/**
 * Midgar Test service
 */
class TestService {
  constructor (mid, testService2) {
    this.mid = mid
    this.testService = testService2.testService
    this.testService.services.push('test-3')
  }

  async init () {}
}

export default {
  dependencies: [
    'test-plugin:test-2'
  ],
  service: TestService
}
