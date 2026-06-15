import { GreeterService } from './logic/service/GreeterService.js'

/**
 * Interaction Layer Injection. Owns the systemic entry-point service the
 * outside world (here, `main`) calls.
 */
export class A {
  private constructor() {}

  static readonly greeter = new GreeterService()

  static async init(): Promise<void> {
    await A.greeter.init()
  }

  static async terminate(): Promise<void> {
    await A.greeter.terminate()
  }
}
