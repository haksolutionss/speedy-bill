import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  dateRange?: { start: string; end: string };
  headers: string[];
  data: (string | number)[][];
  footer?: string;
  orientation?: 'portrait' | 'landscape';
  summary?: { label: string; value: string | number }[];
}

export function exportToPDF(options: PDFExportOptions): void {
  const {
    title,
    subtitle,
    dateRange,
    headers,
    data,
    footer,
    orientation = 'portrait',
    summary,
  } = options;

  const doc = new jsPDF({ orientation });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, 20, { align: 'center' });

  let yPos = 28;

  if (subtitle) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
  }

  if (dateRange) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    const rangeText = `Period: ${format(new Date(dateRange.start), 'dd MMM yyyy')} - ${format(new Date(dateRange.end), 'dd MMM yyyy')}`;
    doc.text(rangeText, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
  }

  // Generated timestamp
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  // Table
  autoTable(doc, {
    head: [headers],
    body: data,
    startY: yPos,
    theme: 'striped',
    headStyles: {
      fillColor: [51, 51, 51],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      halign: 'center',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    margin: { top: 10, left: 14, right: 14 },
    didDrawPage: (hookData) => {
      // Page number
      const pageNumber = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.text(
        `Page ${hookData.pageNumber} of ${pageNumber}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },
  });

  // Summary section
  if (summary && summary.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || yPos + 20;
    let summaryY = finalY + 15;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, summaryY);
    summaryY += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    summary.forEach(({ label, value }) => {
      doc.text(`${label}: ${value}`, 14, summaryY);
      summaryY += 6;
    });
  }

  // Footer
  if (footer) {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text(footer, pageWidth / 2, doc.internal.pageSize.getHeight() - 5, { align: 'center' });
    }
  }

  // Save
  const fileName = `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-IN');
}

export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`;
}
