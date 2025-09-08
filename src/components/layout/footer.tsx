import Link from "next/link"

const quickLinks = [
  { name: "Home", href: "/" },
  { name: "Register", href: "/register" },
  { name: "Events", href: "/events" },
  { name: "Rankings", href: "/rankings" },
  { name: "About", href: "/about" },
]

export function Footer() {
  return (
    <footer className="bg-[#1C1F33] text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Quick Links */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Contact Info</h3>
            <div className="space-y-2 text-gray-300">
              <p>Email: daniel@cnlscc.com</p>
              <p>Phone: (709) 727-0484</p>
            </div>
          </div>

          {/* Location */}
          <div>
            <h3 className="font-heading font-semibold text-lg mb-4">Location</h3>
            <div className="space-y-2 text-gray-300">
              <p>Exploits Valley Intermediate School</p>
              <p>19 Greenwood Avenue</p>
              <p>Grand Falls-Windsor, NL  A2B 1S6</p>
            </div>
          </div>
        </div>

        {/* Bottom Strip */}
        <div className="border-t border-gray-600 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[#2D5BE3] text-white">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="M8 2v4l-6 6v10h20V12l-6-6V2z" />
                <path d="M8 6h8" />
                <path d="M8 10h8" />
                <path d="M8 14h8" />
              </svg>
            </div>
            <span className="font-heading font-semibold">Central NL Scholastic Chess Club</span>
          </div>
          
          <div className="flex space-x-6 text-gray-300 text-sm">
            <p>&copy; 2025 Central NL Scholastic Chess Club. All rights reserved.</p>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
