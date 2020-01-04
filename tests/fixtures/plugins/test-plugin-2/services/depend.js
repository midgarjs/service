
const name = 'depend'
/**
 * Midgar TestDepend service
 */
export default {
  name,
  dependencies: [
    'test-plugin:test',
    'test2'
  ],
  service: class TestDependService {
    constructor (mid, testService, test2Service) {
      testService.services.push(name)
      this.mid = mid
      this.testService = testService
      this.test2Service = test2Service
    }

    /**
     * Int service
     */
    async init () {}
  }
}
