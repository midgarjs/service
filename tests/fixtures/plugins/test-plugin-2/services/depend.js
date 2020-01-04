
/**
 * Midgar TestDepend service
 */
export default {
  name: 'depend',
  dependencies: [
    'test-plugin:test',
    'test2'
  ],
  service: class TestDependService {
    constructor(mid, testService, test2Service) {
      this.mid = mid
      this.testService = testService
      this.test2Service = test2Service
    }

    /**
     * Int service
     */
    async init() {
    }
  }
}
