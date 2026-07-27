import Footer from "@/components/footer"
import { Header } from "@/components/header"
import { matchRoute } from "@/routes"

// Navigation is plain <a href> full page loads against prerendered HTML, so the
// route is fixed for the lifetime of the document: the server passes the path it
// is rendering, the client passes the one it loaded.
export default function App({ path }: { path: string }) {
  const route = matchRoute(path)
  return (
    <>
      <Header />
      {route.render()}
      <Footer />
    </>
  )
}
