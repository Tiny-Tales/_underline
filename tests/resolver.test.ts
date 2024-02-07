import { describe, expect, test } from 'vitest'
import { resolve } from '../src/resolver'
import { Border, Dimensions, DisplayFlag, Position, RenderReference } from '../src/types'
import { Container } from '../src/stacks'
import { getStyle } from '../src/_uStyle'
import * as PIXI from 'pixi.js'
import { _uGlobal } from '../src/_uGlobal'

_uGlobal.resolution = { w: 1000, h: 1000 }

describe('resolve', () => {
  /*describe('base flex', () => {
    const parent = <RenderReference>{
      dimensions: <Dimensions<number>>{ w: 500, h: 500 },
      position: <Position<number>>{ x: 0, y: 0 },
    }
    //prettier-ignore
    const main = new Container('main')
    const child1 = new Container('child1', main.name)
    child1.display = DisplayFlag.Absolute

    child1.dimensions = <Dimensions<number>>{ w: 25, h: 25 }
    child1.position = <Position<number>>{ x: 10, y: 15 }
    const flex = new Container('flex1', main.name)
    flex.flex.push(DisplayFlag.FlexRow)
    const flexchild1 = new Container('flexchild1', flex.name)
    flexchild1.flex.push(DisplayFlag.FlexFixed)
    flexchild1.dimensions = <Dimensions<number>>{ w: 100, h: 100 }
    const flexchild2 = new Container('flexchild2', flex.name)
    flexchild2.flex.push(DisplayFlag.FlexDynamic)

    flex.add(flexchild1)
    flex.add(flexchild2)
    main.add(child1)
    main.add(flex)

    const stack = new Map([
      ['main', main],
      ['child1', child1],
      ['flex1', flex],
      ['flexchild1', flexchild1],
      ['flexchild2', flexchild2],
    ])

    const result = resolve(stack, parent)

    test('main should resolve', () => {
      expect(result.size).toStrictEqual(5)

      expect(result.get('main')!.dimensions).toStrictEqual({ w: 500, h: 500 })
      expect(result.get('main')!.position).toStrictEqual({ x: 0, y: 0 })
      expect(result.get('main')!.name).toStrictEqual('main')
      expect(result.get('main')!.display).toStrictEqual(DisplayFlag.Inherit)
    })
    test('child1 should resolve', () => {
      expect(result.get('child1')!.dimensions).toStrictEqual({ w: 25, h: 25 })
      expect(result.get('child1')!.position).toStrictEqual({ x: 10, y: 15 })
      expect(result.get('child1')!.name).toStrictEqual('child1')
      expect(result.get('child1')!.display).toStrictEqual(DisplayFlag.Absolute)
    })
    test('flex should resolve', () => {
      expect(result.get('flex1')!.dimensions).toStrictEqual({ w: 500, h: 500 })
      expect(result.get('flex1')!.position).toStrictEqual({ x: 0, y: 0 })
      expect(result.get('flex1')!.name).toStrictEqual('flex1')
    })
    test('flexchild1 should resolve', () => {
      expect(result.get('flexchild1')!.dimensions).toStrictEqual({ w: 100, h: 100 })
      expect(result.get('flexchild1')!.position).toStrictEqual({ x: 0, y: 0 })
      expect(result.get('flexchild1')!.name).toStrictEqual('flexchild1')
    })
    test('flexchild2 should resolve', () => {
      expect(result.get('flexchild2')!.dimensions).toStrictEqual({ w: 400, h: 500 })
      expect(result.get('flexchild2')!.position).toStrictEqual({ x: 100, y: 0 })
      expect(result.get('flexchild2')!.name).toStrictEqual('flexchild2')
    })
  })*/

  describe('resolve paddings and overflow', () => {
    const parent = <RenderReference>{
      dimensions: <Dimensions<number>>{ w: 500, h: 500 },
      position: <Position<number>>{ x: 0, y: 0 },
    }
    const main = new Container('main')
    main.padding = { t: 10, r: 10, b: 10, l: 10 }
    main.dimensions = <Dimensions<number>>{ w: 500, h: 500 }
    main.position = <Position<number>>{ x: 0, y: 0 }
    const child = new Container('child1', main.name)
    child.position = <Position<number>>{ x: 5, y: 5 }
    const child2 = new Container('child2', main.name)
    child2.position = <Position<number>>{ x: 5, y: 5 }
    child2.text = 'text'

    main.add(child)
    main.add(child2)

    const stack = new Map([
      ['main', main],
      ['child1', child],
      ['child2', child2],
    ])
    const result = resolve(stack, parent)

    test('resolve paddings', () => {
      expect(result.size).toStrictEqual(3)

      expect(result.get('child1')!.dimensions).toStrictEqual({ w: 475, h: 475 })
      expect(result.get('child1')!.position).toStrictEqual({ x: 15, y: 15 })
      expect(result.get('child2')!.dimensions).toStrictEqual({ w: 4, h: 2 })
      expect(result.get('child2')!.position).toStrictEqual({ x: 15, y: 15 })
    })
  })
})

// test('resolveText', () => {})
