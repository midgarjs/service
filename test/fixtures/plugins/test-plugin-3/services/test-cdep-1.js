
export default {
  name: 'test-cdep-1',
  dependencies: [
    'test-cdep-2'
  ],
  service: class TestDependService {
    constructor(mid) {
      this.mid = mid
    }

    /**
     * Int service
     */
    async init() {
    }
  }
}
