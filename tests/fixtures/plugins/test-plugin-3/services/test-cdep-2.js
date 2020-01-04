
export default {
  name: 'test-cdep-2',
  dependencies: [
    'test-cdep-1'
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
