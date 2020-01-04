
/**
 * Midgar Test service
 */
class TestService {
  constructor (mid, testService3) {
    this.mid = mid
    this.testService = testService3.testService
    this.testService.services.push('test-4')
  }

  async init () {}
}

export default {
  dependencies: [
    'test-plugin:test-3',
    'test-plugin:test-5'
  ],
  service: TestService
}
