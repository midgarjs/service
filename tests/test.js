import mocha from 'mocha'
import chai from 'chai'
import dirtyChai from 'dirty-chai'
import path from 'path'
import ServicePlugin from '../src/index'
import testService from './fixtures/plugins/test-plugin/services/test'
import namedService from './fixtures/plugins/test-plugin/services/named'

/**
 * @type {Midgar}
 */
import Midgar from '@midgar/midgar'

// fix for TypeError: describe is not a function with mocha-teamcity-reporter
const { describe, it } = mocha

const expect = chai.expect
chai.use(dirtyChai)

let mid = null
const initMidgar = async () => {
  mid = new Midgar()
  await mid.start(path.join(__dirname, 'fixtures/config'))
  return mid
}

/**
 * Test the service plugin
 */
describe('Service', function () {
  beforeEach(async () => {
    mid = await initMidgar()
  })

  afterEach(async () => {
    await mid.stop()
    mid = null
  })

  /**
   * Test if the plugin id load
   */
  it('plugin is load', async () => {
    const plugin = mid.pm.getPlugin('@midgar/service')
    expect(plugin).to.be.an.instanceof(ServicePlugin, 'Plugin is not an instance of ServicePlugin')
  })

  /**
   * Test the getService function
   */
  it('getService', async () => {
    expect(mid.getService).be.a('function', 'mid.getService is not a function')

    const _testService = mid.getService('test-plugin:test')
    expect(_testService).to.be.an.instanceof(testService.service, 'testService is not an instance of TestService')

    // Test error
    const name = 'notexists'
    expect(() => mid.getService(name)).to.throw(Error, `@midgar/service: Unknow service: ${name} !`)
  })

  /**
   * Test if the service is init
   */
  it('is init', async () => {
    const _testService = mid.getService('test-plugin:test')
    expect(_testService.isInit).equal(true, 'TestService is not init !')
  })

  /**
   * Test if the named service have the good name
   */
  it('named service', async () => {
    const _testService2 = mid.getService('test2')
    expect(_testService2).to.be.an.instanceof(namedService.service, 'namedService is not an instance of NamedService')
  })

  /**
   * Test if the named service have the good name
   */
  it('depend service', async () => {
    const dependService = mid.getService('depend')
    expect(dependService.testService).to.be.an.instanceof(testService.service, 'testService is not an instance of TestService')
    expect(dependService.test2Service).to.be.an.instanceof(namedService.service, 'test2Service is not an instance of NamedService')
  })
})
