// Shared frontend package for this monorepo.
//
// What belongs here: anything more than one surface states or renders. Right
// now that is product identity (below). Brand tokens live alongside it in
// tokens.css and are imported directly by the web surfaces that want them.
//
// What does not belong here: visual components copied out of one app for the
// sake of having some. The desktop app and the marketing site look deliberately
// different (a native macOS utility versus a dark brand page), so there is no
// shared component library to extract yet. Add one when a second surface
// actually needs the same component, not before.
export * from "./product"
