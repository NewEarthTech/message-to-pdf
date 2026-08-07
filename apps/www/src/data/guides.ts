// The use-case pages, defined once. Three surfaces read this list: the section
// on the home page, the footer nav, and the "related" links at the foot of each
// guide. Adding a guide means adding a page file and a row here, and every
// internal link to it appears on its own.
//
// `path` is extensionless to match trailingSlash: "never" and the canonical the
// Base layout derives from the route.
export interface Guide {
  path: string
  /** Short label, for nav and related links. */
  nav: string
  /** Sentence-case heading used on the home page card. */
  title: string
  /** One line, home page card and related links. */
  blurb: string
}

export const GUIDES: Guide[] = [
  {
    path: "/export-text-messages-for-court",
    nav: "Text messages for court",
    title: "Text messages for a lawyer or a court",
    blurb:
      "One paginated PDF instead of a folder of screenshots, with the dates, the timestamps, and both sides of the thread still in order."
  },
  {
    path: "/save-text-messages-from-a-deceased-loved-one",
    nav: "Messages from a loved one",
    title: "Messages from someone you have lost",
    blurb:
      "A thread you can keep as a file, print, and hand to family, instead of one that lives inside an app on a phone."
  },
  {
    path: "/print-imessages-to-pdf",
    nav: "Print iMessages to PDF",
    title: "Printing iMessages to PDF",
    blurb:
      "Messages has no export command. Here is what the alternatives cost you, and what a real export puts in the file."
  }
]

export const guidesExcept = (path: string) => GUIDES.filter((guide) => guide.path !== path)
