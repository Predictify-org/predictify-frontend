import Link from "next/link";
import { SOCIAL_LINKS, PLATFORM_LINKS, LEGAL_LINKS } from "../constants/data";
import { Logo } from "../ui/logo";

export function Footer() {
  return (
    <footer className="relative border-t border-cyan-500/20 bg-slate-950/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          <div className="col-span-1 sm:col-span-2 lg:col-span-2">
            <div className="mb-6">
              <Logo />
            </div>
            <p className="text-slate-300 mb-6 sm:mb-8 max-w-md text-base sm:text-lg leading-relaxed">
              The world's leading decentralized prediction platform. Predict the
              future, earn rewards, powered by blockchain.
            </p>
            <div className="flex space-x-4 sm:space-x-6">
              {SOCIAL_LINKS.map((social, index) => (
                <Link key={index} href={social.href} className="group">
                  <div className="w-12 h-12 bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl flex items-center justify-center hover:border-cyan-500/30 transition-all duration-300 transform hover:scale-110 hover:-translate-y-1">
                    <social.icon className="w-6 h-6 text-slate-400 group-hover:text-cyan-400 transition-colors duration-300" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg sm:text-xl mb-4 sm:mb-6">
              Platform
            </h4>
            <ul className="space-y-3 sm:space-y-4">
              {PLATFORM_LINKS.map((item, index) => (
                <li key={index}>
                  <Link
                    href="#"
                    className="text-slate-300 hover:text-cyan-400 transition-colors duration-300 text-base sm:text-lg"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold text-lg sm:text-xl mb-4 sm:mb-6">
              Legal
            </h4>
            <ul className="space-y-3 sm:space-y-4">
              {LEGAL_LINKS.map((item, index) => (
                <li key={index}>
                  <Link
                    href="#"
                    className="text-slate-300 hover:text-cyan-400 transition-colors duration-300 text-base sm:text-lg"
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-cyan-500/20 mt-12 sm:mt-16 pt-8 sm:pt-12">
          <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
            <p className="text-slate-400 text-sm sm:text-base text-center lg:text-left">
              © {new Date().getFullYear()} Predictify. All rights reserved.
            </p>
            <p className="text-slate-400 text-sm sm:text-base text-center lg:text-right max-w-md">
              ⚠️ Prediction markets involve risk. Only bet what you can afford
              to lose.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
