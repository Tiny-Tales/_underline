import { evaluateDimensions, evaluatePosition } from './expressions'
import { Area, Dimensions, DisplayFlag, Position, RenderReference } from './types'
import { Style, _underlineStyle, getStyle } from './_uStyle'
import { _uGlobal } from './_uGlobal'
import { Text, TextMetrics, TextStyle } from 'pixi.js'
import { Container, ContainerStack, ReferenceStack } from './stacks'

export const resolve = (stack: ContainerStack, parent: RenderReference): ReferenceStack => {
  const ref = new Map()
  let flex = false
  let flexParent: Container | null = null
  let flexChildren: Array<Container> = []
  stack.forEach((c: Container) => {
    // Whenever we encounter absiolute or inherit, we stop the flex process
    flex = c.isFlex()
    // If we are currently in a flex process, we push the child to the flex children
    if (flex) {
      if (c.flex == DisplayFlag.FlexRow || c.flex == DisplayFlag.FlexCol) {
        flexParent = c
      } else {
        flexChildren.push(c)
      }
    } else {
      // If we are not in a flex, we need to resolve all previous flex children
      // Before we can resolve the current container
      if (flexChildren.length > 0) {
        const flexRef = resolveFlex(ref.get(c.parent?.name) ?? parent, flexParent!, flexChildren)
        flexRef.forEach((c: RenderReference) => {
          // Push to same ref to keep the stack flat and in order
          ref.set(c.name, c)
        })
        flexChildren = []
        flexParent = null
      }
      // Resolve current container
      const cRef = resolveContainer(c, ref.get(c.parent?.name) ?? parent)
      ref.set(c.name, cRef)
      // There were no previous flex children, but this one could start a new flex
      // If display is FlexRow or FlexCol
      if (c.flex != null) {
        flex = true
        flexParent = c
      }
    }
  })

  // Whenever we leave the loop with a flex process open, we need to resolve
  // before returning
  //TODO: Refactor to nicer code (duplicate from above)
  if (flexChildren.length > 0) {
    const flexRef = resolveFlex(ref.get(flexParent!.parent?.name) ?? parent, flexParent!, flexChildren)
    flexRef.forEach((c: RenderReference) => {
      // Push to same ref to keep the stack flat and in order
      ref.set(c.name, c)
    })
    flexChildren = []
    flexParent = null
  }
  // Resolve flex parent without children
  // We do this to remain fault tolerant
  // (even if flex doesnt make sence on this container)
  if (flexParent != null) {
    const pRef = resolveContainer(flexParent, ref.get((flexParent as Container).parent?.name) ?? parent)
    ref.set(pRef.name, pRef)
  }

  return ref
}

export const resolveContainer = (container: Container, parent: RenderReference | RenderReference): RenderReference => {
  // Resolve expressions
  let d = resolveDimensions(container, parent.dimensions as Dimensions<number>)
  let p = resolvePositions(container, d, parent.position as Position<number>, parent.dimensions as Dimensions<number>)
  // We make sure that the container doesnt go out of bounds
  // Can happen when position is not 0 and dimensions are set to 100%
  if (container.position != null && typeof container.position.x === 'number') {
    // Check the initial x position + resolved width
    if (container.position.x + d.w > parent.dimensions.w) {
      d.w = parent.dimensions.w - container.position.x
    }
  }
  if (container.position != null && typeof container.position.y === 'number') {
    // Check the initial y position + resolved height
    if (container.position.y + d.h > parent.dimensions.h) {
      d.h = parent.dimensions.h - container.position.y
    }
  }

  let tRef = null
  let tStyle = null
  if (container.text != null) {
    // Get given style or default fallback
    const uStyle = getStyle(container.textStyle ?? '_default')
    tStyle = resolveTextStyle(uStyle)
    tRef = resolveText(container, d, p, tStyle, uStyle)
    // If the stack doesnt have dimensions, it scales of of the text dimensions
    // in which case we can just pass them on (even if its display absolute)
    if (container.dimensions == null) {
      d = { w: tRef.dimensions.w, h: tRef.dimensions.h }
      // Reevaluate the position (which needs the dimensions)
      p = resolvePositions(container, d, parent.position as Position<number>, parent.dimensions as Dimensions<number>)
      tRef = resolveText(container, d, p, tStyle, uStyle)
    }
  }

  const sRef = {
    name: container.name,
    container: container.container,
    display: container.display,
    dimensions: d,
    position: p,
    fill: container.fill,
    border: container.border,
    padding: container.padding,
    text: tRef ? tRef.text : null,
    textStyle: tStyle,
  } satisfies RenderReference

  return sRef
}

const resolveDimensions = (container: Container, parent: Dimensions<number>): Dimensions<number> => {
  let dRef = <Dimensions<number>>{}
  switch (true) {
    /**
     * Display Absolute - No dimensions specified
     *
     * Gets 0,0 dimensions as default.
     */
    case container.display === DisplayFlag.Absolute && container.dimensions == null:
      // Otherwise print a warning that no dimensions are set
      if (container.text == null) {
        console.warn(`Current stack is absolute but has no dimensions: ${container.name} will not display`)
      }
      dRef = { w: 0, h: 0 }
      break
    /**
     * Display Inherit - No dimensions specified
     *
     * Inherits dimensions from parent
     */
    case container.display === DisplayFlag.Inherit && container.dimensions == null:
      dRef = parent
      break
    /**
     * Display Absolute - Dimensions specified
     *
     * Expression get evaluated based on window dimensions.
     */
    case container.display === DisplayFlag.Absolute && container.dimensions != null:
      if (_uGlobal.resolution == null) {
        throw new Error(`Game resolution not set (Use _uGlobal.resolution)`)
      }
      const wd = <Dimensions<number>>{
        w: _uGlobal.resolution.w,
        h: _uGlobal.resolution.h,
      }
      dRef = evaluateDimensions(container.dimensions!, wd)
      break
    /**
     * Display Inherit - Dimensions specified
     *
     * Expressions get avaluated based on parent.
     */
    case container.display === DisplayFlag.Inherit && container.dimensions != null:
      dRef = evaluateDimensions(container.dimensions!, parent)
      break
    default:
      throw new Error(`Something went terribly wrong with dimensions on: ${container.name}`)
  }
  return dRef
}

const resolvePositions = (
  stack: Container,
  stackD: Dimensions<number>,
  parentP: Position<number>,
  parentD: Dimensions<number>
): Position<number> => {
  let pRef = <Position<number>>{}
  switch (true) {
    /**
     * Display Absolute - No position specified
     *
     * Set position to 0,0 as default.
     */
    case stack.display === DisplayFlag.Absolute && stack.position == null:
      pRef = { x: 0, y: 0 }
      break
    /**
     * Display Inherit - No position specified
     *
     * Use parent position.
     */
    case stack.display === DisplayFlag.Inherit && stack.position == null:
      pRef = parentP
      break
    /**
     * Display Absolute - Position specified
     */
    case stack.display === DisplayFlag.Absolute && stack.position != null:
      // Dont evaluate the position if it has expressions and we have text
      // In that case we will change the dimensions after creating the text
      // and reevaluating the position
      if (stack.text != null && stackD == null && stack.hasExpressions(stack.position!)) {
        pRef = { x: 0, y: 0 }
        break
      }

      pRef = evaluatePosition(stack.position!, stackD, _uGlobal.resolution)
      break
    /**
     * Display Inherit - Position specified
     */
    case stack.display === DisplayFlag.Inherit && stack.position != null:
      pRef = evaluatePosition(stack.position!, stackD, parentD)
      // Add parents position to the evaluated stack position
      pRef.x = (pRef.x as number) + (parentP.x as number)
      pRef.y = (pRef.y as number) + (parentP.y as number)
      break
    default:
      throw new Error(`Something went terribly wrong with dimensions on: ${stack.name}`)
  }

  return pRef
}

type TextReference = {
  text: Text
  position: Position<number>
  dimensions: Dimensions<number>
}

export const resolveText = (
  stack: Container,
  stackD: Dimensions<number>,
  stackP: Position<number>,
  style: TextStyle,
  uStyle: Style
): TextReference => {
  // Create text object
  const t = new Text(stack.text!, style)
  t.name = stack.name + '_text'
  // Get text dimensions
  const tm = TextMetrics.measureText(stack.text!, style)

  const tp = evaluatePosition({ x: uStyle.position.x, y: uStyle.position.y }, { w: tm.width, h: tm.height }, stackD)
  t.x = tp.x as number
  t.y = tp.y as number
  // Align with parent position
  t.x += stackP.x as number
  t.y += stackP.y as number

  return {
    text: t,
    position: tp,
    dimensions: { w: tm.width, h: tm.height },
  } satisfies TextReference
}

// Create pixi text style
const resolveTextStyle = (uStyle: Style): TextStyle => {
  return new TextStyle({
    fontFamily: uStyle.font,
    fontSize: uStyle.size,
    fill: uStyle.color,
  })
}

const resolveFlex = (
  parent: RenderReference | RenderReference,
  flexParent: Container,
  children: Array<Container>
): Array<RenderReference> => {
  const ref: Array<RenderReference> = []
  const pRef = resolveContainer(flexParent, parent)
  ref.push(pRef)

  const maxSpace =
    flexParent.flex === DisplayFlag.FlexRow
      ? (pRef.dimensions!.w as number) // Left to right display
      : (pRef.dimensions!.h as number) // Top to bottom display

  let fixedSpace = 0
  let dynamicCount = 0
  // Calculate space
  children.forEach((c: Container) => {
    if (c.flex === DisplayFlag.FlexFixed) {
      if (c.dimensions == null) {
        throw new Error(`No dimensions provided for fixed flex child ${c.name}`)
      }
      fixedSpace += c.dimensions.w as number // fixed container cant have expressions
    } else if (c.flex === DisplayFlag.FlexDynamic) {
      ++dynamicCount
    } else {
      throw new Error(`No flex display option provided for ${c.name}`)
    }
  })

  const dynamicMaxSpace = maxSpace - fixedSpace
  const dynamicSpacePerChild = dynamicMaxSpace / dynamicCount

  // Apply dimension
  let currentPosition = 0
  children.forEach((c: Container) => {
    const cP = <Position<number>>{
      x: c.position ? c.position.x : 0,
      y: c.position ? c.position.y : 0,
    }
    const cD = <Dimensions<number>>{
      w: c.dimensions ? c.dimensions.w : 0,
      h: c.dimensions ? c.dimensions.h : 0,
    }
    //TODO: Recursive call for all children
    if (c.flex === DisplayFlag.FlexDynamic) {
      if (flexParent.flex === DisplayFlag.FlexRow) {
        cD.w = dynamicSpacePerChild
        cD.h = pRef.dimensions!.h as number
      } else {
        cD.h = dynamicSpacePerChild
        cD.w = pRef.dimensions!.w as number
      }
    }
    if (flexParent.flex === DisplayFlag.FlexRow) {
      cP.x = currentPosition
    } else {
      cP.y = currentPosition
    }
    currentPosition += cD.w as number

    c.dimensions = cD
    c.position = cP

    const cRef = resolveContainer(c, pRef)
    ref.push(cRef)
  })
  return ref
}
