// The ASCEND identity, imported from the supplied logo pack as vectors rather than a bitmap:
// one colour (`currentColor`) so it can sit on obsidian in lime or on paper in ink, and sharp at
// every size. `AscendLogo` is the full lockup (mark + wordmark) used on the sign-in screen and
// the boot screen; `AscendMark` and `AscendWordmark` let the app bar place the two parts itself.
const MARK = (
  <>
    <polygon points="6,194 100,4 112,30 52,194" />
    <polygon points="137.6,80 194,194 150,194 121.8,137" />
    <polygon points="100,96 127,164 109,164 100,141 91,164 73,164" />
  </>
)

const WORDMARK = (
  <g transform="translate(-40 232)">
    <polygon points="0,32 10.5,0 15.5,0 26,32 20,32 13,8 6,32" />
    <g fill="none" stroke="currentColor" strokeWidth="6">
      <path transform="translate(50 0)" d="M26 3 H3 V16 H23 V29 H0" />
      <path transform="translate(100 0)" d="M26 3 H3 V29 H26" />
      <path transform="translate(150 0)" d="M26 3 H3 V29 H26 M3 16 H22" />
      <path transform="translate(200 0)" d="M3 0 V32 M23 0 V32 M3 4 L23 28" />
      <path transform="translate(250 0)" d="M3 32 V3 H15 L23 11 V21 L15 29 H0" />
    </g>
  </g>
)

const label = (title, labelled) => labelled ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true }

export function AscendMark({ className = '', title = 'ASCEND', labelled = false, ...rest }) {
  return (
    <svg className={className} viewBox="0 0 200 200" fill="currentColor" focusable="false" {...label(title, labelled)} {...rest}>
      {MARK}
    </svg>
  )
}

export function AscendWordmark({ className = '', title = 'ASCEND', labelled = false, ...rest }) {
  return (
    <svg className={className} viewBox="-43 229 282 38" fill="currentColor" focusable="false" {...label(title, labelled)} {...rest}>
      {WORDMARK}
    </svg>
  )
}

export default function AscendLogo({ className = '', title = 'ASCEND', labelled = true, ...rest }) {
  return (
    <svg className={className} viewBox="-40 -20 276 290" fill="currentColor" focusable="false" {...label(title, labelled)} {...rest}>
      <g fill="var(--logo-mark,currentColor)">{MARK}</g>
      {WORDMARK}
    </svg>
  )
}
