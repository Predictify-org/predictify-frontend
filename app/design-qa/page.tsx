import { DesignChecklist } from "./DesignChecklist";

export const metadata = {
  title: "Design QA Checklist — StreamPay",
  description:
    "25+ item design QA checklist for StreamPay stream and money screens. Run before every dev handoff.",
};

export default function DesignQAPage() {
  return <DesignChecklist screen="Streams list" />;
}
