import type { StreamRowData } from "../components/StreamRow";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const CSV_HEADERS = ["ID", "Recipient", "Rate", "Schedule", "Status", "Next Action"];

function streamToRow(stream: StreamRowData): string {
  return [
    stream.id,
    stream.recipient,
    stream.rate,
    stream.schedule,
    stream.status,
    stream.nextAction,
  ]
    .map(escapeCsv)
    .join(",");
}

export function exportStreamsToCsv(streams: StreamRowData[], filename = "stream-history.csv"): void {
  const rows = [CSV_HEADERS.join(","), ...streams.map(streamToRow)];
  const csvContent = rows.join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
