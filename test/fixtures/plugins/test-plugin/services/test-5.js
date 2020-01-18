
/**
 * Midgar Test service
 */
class TestService {
  constructor (mid, testService3) {
    this.mid = mid
    this.testService = testService3.testService
    this.testService.services.push('test-5')
  }

  async init () {}
}

export default {
  before: ['depend'],
  dependencies: [
    'test-plugin:test-3',
    'test-plugin:test-2'
  ],
  service: TestService
}
