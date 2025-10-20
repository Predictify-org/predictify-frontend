import Image from "next/image";
import Link from "next/link";
import {
  COMPANY_LINKS,
  PRODUCT_LINKS,
  RESOURCES_LINKS,
  SOCIAL_LINKS,
} from "@/components/constants/data";

export function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-[#1a1d2e] border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <Link href="/" className="inline-block mb-4">
                <Image
                  src="/images/predictify-logo.png"
                  alt="Predictify Logo"
                  width={140}
                  height={32}
                  className="h-8 w-auto"
                />
              </Link>
              <p className="text-gray-400 text-sm leading-relaxed mb-6 max-w-xs">
                The decentralized prediction market platform where your insights
                turn into rewards.
              </p>

              <div className="flex items-center space-x-4">
                {SOCIAL_LINKS.map((social) => {
                  const IconComponent = social.icon;
                  return (
                    <a
                      key={social.name}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.ariaLabel}
                      className="text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      <IconComponent className="w-5 h-5" />
                    </a>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold text-sm mb-4">Product</h3>
              <ul className="space-y-3">
                {PRODUCT_LINKS.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-400 text-sm hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold text-sm mb-4">
                Resources
              </h3>
              <ul className="space-y-3">
                {RESOURCES_LINKS.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-400 text-sm hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold text-sm mb-4">Company</h3>
              <ul className="space-y-3">
                {COMPANY_LINKS.map((link) => (
                  <li key={link.name}>
                    <Link
                      href={link.href}
                      className="text-gray-400 text-sm hover:text-white transition-colors duration-200"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} Predictify. All rights reserved.
            </p>
            <p className="text-gray-500 text-sm">
              Predictify is a decentralized platform. Please use at your own
              risk.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
