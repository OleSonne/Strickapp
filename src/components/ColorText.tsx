import { Fragment } from 'react'
import { colorParts } from '../core/chartColors'

/** Text mit markierten Farbangaben. Der Buchstabe steht immer dabei. */
export function ColorText({ text }: { text: string }) {
  return colorParts(text).map((part, i) =>
    part.color ? (
      <mark key={i} className={`yarn yarn-${part.color.toLowerCase()}`}>{part.text}</mark>
    ) : (
      <Fragment key={i}>{part.text}</Fragment>
    ),
  )
}
