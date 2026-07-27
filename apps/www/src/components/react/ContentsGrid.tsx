import {
  CalendarBlank,
  ChatsCircle,
  ClockCounterClockwise,
  FilePdf,
  Heart,
  Image as ImageIcon
} from "@phosphor-icons/react"

// Rendered by Astro at build time with NO client directive, so this ships as
// plain HTML and the icon library never reaches the browser. It is a React
// component only because that is how Phosphor ships its glyphs, and hand-rolling
// SVG paths is worse than compiling them away.
const CONTENTS = [
  {
    icon: ChatsCircle,
    title: "Every message, in order",
    body: "Sent and received bubbles, in the blue and green you already know."
  },
  {
    icon: ImageIcon,
    title: "Photos inline",
    body: "Image attachments land in the page where they were sent, not in a folder."
  },
  {
    icon: ClockCounterClockwise,
    title: "Timestamps and read receipts",
    body: "Date separators between sessions, delivery and read times where Messages had them."
  },
  {
    icon: Heart,
    title: "Tapbacks",
    body: "Reactions stay attached to the message they were a reaction to."
  },
  {
    icon: CalendarBlank,
    title: "Any date range",
    body: "Export a whole history, or just the summer you care about."
  },
  {
    icon: FilePdf,
    title: "An ordinary PDF",
    body: "US Letter, searchable text, opens anywhere. Print it, mail it, archive it."
  }
]

export default function ContentsGrid() {
  return (
    <div className="mt-11 grid grid-cols-1 gap-x-12 gap-y-9 sm:grid-cols-2">
      {CONTENTS.map((item) => {
        const Icon = item.icon
        return (
          <div className="flex gap-4" key={item.title}>
            <Icon
              size={24}
              weight="regular"
              aria-hidden="true"
              className="mt-0.5 shrink-0 text-[#cba980]"
            />
            <div>
              <h3 className="font-[600] text-[#f5f3ef]">{item.title}</h3>
              <p className="mt-1.5 max-w-[42ch] text-[#f5f3ef]/65 text-[0.95rem] leading-[1.5]">
                {item.body}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
