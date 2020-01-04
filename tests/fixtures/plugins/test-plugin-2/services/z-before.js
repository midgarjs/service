
const name = 'before-test'

/**
 * Midgar TestDepend service
 */
export default {
  name,
  before: 'depend',
  dependencies: [
    'test-plugin:test'
  ],
  service: class TestDependService {
    constructor (mid, testService) {
      this.mid = mid
      testService.services.push(name)
    }

    /**
     * Int service
     */
    async init () {}
  }
}
