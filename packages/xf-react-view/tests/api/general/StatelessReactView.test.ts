import { describe, it, expect } from 'vitest'
import { StatelessReactView } from '../../../index'

class PeerComponent {
  props: { logo: string }
  unmountCalls = 0
  constructor(props: { logo: string }) {
    this.props = props
  }
  componentWillUnmount(): void {
    this.unmountCalls++
  }
}

describe('StatelessReactView', () => {
  it('preserves the peer base constructor and props', () => {
    class SplashView extends StatelessReactView(PeerComponent) {
      override async init() {}
      override async terminate() {}
    }
    const v = new SplashView({ logo: 'logo.svg' })
    expect(v.props).toEqual({ logo: 'logo.svg' })
  })

  it('contributes the XF View lifecycle', async () => {
    const order: string[] = []
    class SplashView extends StatelessReactView(PeerComponent) {
      override async init() {
        order.push('init')
      }
      override async terminate() {
        order.push('terminate')
      }
    }
    const v = new SplashView({ logo: 'logo.svg' })
    await v.init()
    await v.terminate()
    expect(order).toEqual(['init', 'terminate'])
  })

  it('inherits the React lifecycle bridge from ReactView', () => {
    let terminated = 0
    class SplashView extends StatelessReactView(PeerComponent) {
      override async init() {}
      override async terminate() {
        terminated++
      }
    }
    const v = new SplashView({ logo: 'logo.svg' })
    v.componentWillUnmount()
    expect(v.unmountCalls).toBe(1)
    expect(terminated).toBe(1)
  })
})
