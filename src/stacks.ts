import * as PIXI from 'pixi.js'
import { Area, Border, Dimensions, DisplayFlag, Position } from './types'

const _stacks: Array<StackReference> = []
let _currentStack: Stack | null = null

export interface StackReference {
  name: string
  container: PIXI.Graphics
  display: DisplayFlag
  dimensions: Dimensions<number>
  position: Position<number>
  border: Border | null
  padding: Area | null
  fill: string | null
  text: PIXI.Text | null
  textStyle: PIXI.TextStyle | null
}

export class Stack {
  public readonly container: PIXI.Graphics = new PIXI.Graphics()
  public display: DisplayFlag = DisplayFlag.Inherit
  public dimensions: Dimensions<number | string> | null = null
  public border: Border | null = null
  public position: Position<number | string> | null = null
  public padding: Area | null = null
  public fill: string | null = null
  public text: string = ''
  public textStyle: string = ''

  constructor(
    public readonly name: string,
    public readonly parent?: Stack,
  ) {
    this.container.name = name
  }

  private _children: Array<Stack> = []
  get children(): Array<Stack> {
    return this._children
  }

  public add(child: Stack): void {
    this._children.push(child)
  }

  public hasExpressions(transform: Position<number | string> | Dimensions<number | string>): boolean {
    let position: Position<number | string> | string | null = null
    let dimensions: Dimensions<number | string> | string | null = null
    if ((transform as Position<number | string>).x != null) {
      position = transform as Position<number | string>
    } else {
      dimensions = transform as Dimensions<number | string>
    }
    // Finx expression
    if (position != null) {
      if (typeof position.x === 'string') return true
      if (typeof position.y === 'string') return true
    } else if (dimensions != null) {
      if (typeof dimensions.w === 'string') return true
      if (typeof dimensions.h === 'string') return true
    }
    return false
  }
}

export const setCurrentStack = (stack: Stack | null): void => {
  _currentStack = stack
}
export const getCurrentStack = (): Stack | null => {
  return _currentStack
}

export const addReference = (ref: StackReference): void => {
  _stacks.push(ref)
}

export const ensureOpenStack = (): Stack => {
  if (_currentStack == null) {
    throw new Error('No open stack. Did you forget to begin() ?')
  }
  return _currentStack
}
