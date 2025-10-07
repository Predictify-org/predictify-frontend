import WalletConnectionIssues from "@/components/wallet-connection-issues";
import WalletIntegration from "@/components/wallet-integration";
import { ContactSupportForm } from "@/components/contact-support-form";
import { OtherWaysToGetHelp } from "@/components/other-way-to-get-help";
import FAQ from "@/components/faq";

export default function HelpPage() {
  return <div className="bg-[#540D8D]">
  <FAQ />
  <WalletConnectionIssues/>
  <WalletIntegration/>
  <ContactSupportForm />
  <OtherWaysToGetHelp />
  </div>
}
