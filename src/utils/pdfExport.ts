import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const exportToPDF = async (
  elementId: string,
  filename: string,
  title: string
) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Element not found");
    return;
  }

  // Capture the element as canvas
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Add title
  pdf.setFontSize(16);
  pdf.text(title, 15, 15);

  // Calculate dimensions
  const imgWidth = 180;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  
  // Add image to PDF
  pdf.addImage(imgData, "PNG", 15, 25, imgWidth, imgHeight);

  // Save PDF
  pdf.save(filename);
};
