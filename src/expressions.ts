import { Dimensions, Position, TransformType, ValueExpression } from "./types"

export const evaluateDimensions = (
  ref: Dimensions,
  parent: Dimensions
): Dimensions => {
  if (typeof parent.w !== "number" || typeof parent.h !== "number") {
    throw new Error(`Parent stack has unresolved/invalid dimensions: ${parent}`)
  }

  const w = expToNumber(ref.w, parent.w as number, TransformType.Width)
  const h = expToNumber(ref.h, parent.h as number, TransformType.Height)
  return { w, h }
}

export const evaluatePosition = (
  refP: Position,
  refD: Dimensions,
  parent: Dimensions
): Position => {
  if (typeof parent.w !== "number" || typeof parent.h !== "number") {
    throw new Error(`Parent stack has unresolved/invalid dimensions: ${parent}`)
  }
  if (typeof refD.w !== "number" || typeof refD.h !== "number") {
    throw new Error(`Current stack has unresolved/invalid dimensions: ${refD}`)
  }
  let x = expToNumber(refP.x, parent.w, TransformType.X, refD.w as number)
  let y = expToNumber(refP.y, parent.h, TransformType.Y, refD.h as number)

  return { x: x, y: y }
}

const expToNumber = (
  exp: number | ValueExpression,
  p: number,
  type: TransformType,
  s?: number
): number => {
  if (typeof exp === "number") return exp
  return evaluateExpression(exp, p, type, s)
}

const evaluateExpression = (
  exp: ValueExpression,
  p: number,
  type: TransformType,
  refDimension?: number
) => {
  let baseValue = 0
  let refValue = 0
  switch (type) {
    case TransformType.Width:
    case TransformType.X:
      baseValue = Math.round(p)
      // Only needed for x (not present in dimensional evals)
      refValue = refDimension ? Math.round(refDimension) : 0
      break
    case TransformType.Height:
    case TransformType.Y:
      baseValue = Math.round(p)
      // Only needed for y (not present in dimensional evals)
      refValue = refDimension ? Math.round(refDimension) : 0
      break
  }

  if (exp === "100%") return baseValue
  if (exp === "50%") return baseValue / 2
  if (exp === "center") return baseValue / 2 - refValue / 2

  return 0
}
