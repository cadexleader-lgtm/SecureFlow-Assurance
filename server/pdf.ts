import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import type { Passenger, Insurance } from "@shared/schema";

function formatDate(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

export function generateTicketPDF(passenger: Passenger, verifyUrl: string, insuranceLogo?: string | null, insuranceData?: Partial<Insurance> | null): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: [340, 1200], margin: 20 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk: Buffer) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const policyNumber = `SF-${String(passenger.id).padStart(6, "0")}`;
      const w = 300;
      const col1 = 20;
      const col2 = 180;
      const labelStyle = () => doc.fontSize(8).fill("#94a3b8").font("Helvetica");
      const valueStyle = () => doc.fontSize(10).fill("#1e293b").font("Helvetica-Bold");
      const sectionHeader = (text: string, yPos: number) => {
        doc.fontSize(8).fill("#64748b").font("Helvetica").text(text, 20, yPos);
        return yPos + 14;
      };
      const dashedLine = (yPos: number) => {
        doc.moveTo(20, yPos).lineTo(320, yPos).dash(3, { space: 3 }).stroke("#cbd5e1").undash();
        return yPos + 12;
      };

      doc.rect(0, 0, 340, 80).fill("#1e40af");
      doc.fontSize(22).fill("#ffffff").font("Helvetica-Bold").text("SecureFlow", 20, 20, { width: w });
      doc.fontSize(10).fill("rgba(255,255,255,0.7)").font("Helvetica").text("Certificat d'Assurance Voyage", 20, 48, { width: w });
      doc.fontSize(9).fill("rgba(255,255,255,0.7)").text(policyNumber, 20, 62, { width: w, align: "right" });

      let y = 95;

      if (insuranceLogo) {
        try {
          const logoAbsPath = path.resolve(process.cwd(), insuranceLogo.replace(/^\//, ""));
          if (fs.existsSync(logoAbsPath)) {
            doc.image(logoAbsPath, 20, y, { width: 36, height: 36 });
            const insName = insuranceData?.raisonSociale || insuranceData?.name || (passenger as any).insuranceName;
            if (insName) {
              doc.fontSize(11).fill("#1e293b").font("Helvetica-Bold").text(insName, 62, y + 2, { width: 240 });
            }
            if (insuranceData?.siegeSocial) {
              doc.fontSize(7).fill("#94a3b8").font("Helvetica").text(insuranceData.siegeSocial, 62, y + 16, { width: 240 });
            }
            if (insuranceData?.telephone) {
              doc.fontSize(7).fill("#94a3b8").font("Helvetica").text(`Tel: ${insuranceData.telephone}`, 62, y + 26, { width: 240 });
            }
            y += 46;
          }
        } catch {}
      }

      if (insuranceData?.numeroAgrementCima) {
        doc.fontSize(7).fill("#64748b").font("Helvetica").text(`Agrement CIMA : ${insuranceData.numeroAgrementCima}`, 20, y, { width: w });
        y += 10;
      }

      y += 4;
      y = dashedLine(y);

      y = sectionHeader("PASSAGER ASSURE", y);
      doc.fontSize(16).fill("#1e293b").font("Helvetica-Bold").text(passenger.fullName, 20, y, { width: w });
      y += 22;
      doc.fontSize(9).fill("#64748b").font("Helvetica").text(`Tel: ${passenger.phone}`, 20, y);
      y += 14;
      if (passenger.email) {
        doc.fontSize(9).fill("#64748b").text(`Email: ${passenger.email}`, 20, y);
        y += 14;
      }
      doc.fontSize(9).fill("#64748b").text(`N° Police: ${policyNumber}`, 20, y);
      y += 14;

      y += 4;
      y = dashedLine(y);

      y = sectionHeader("VOYAGE", y);
      labelStyle().text("Depart", col1, y);
      labelStyle().text("Destination", col2, y);
      y += 11;
      valueStyle().text(passenger.departure || "-", col1, y);
      valueStyle().text(passenger.destination, col2, y);
      y += 16;

      labelStyle().text("Compagnie", col1, y);
      y += 11;
      valueStyle().text(passenger.company, col1, y);
      y += 16;

      labelStyle().text("Date de voyage", col1, y);
      labelStyle().text("Heure de depart", col2, y);
      y += 11;
      valueStyle().text(formatDate(passenger.travelDate), col1, y);
      valueStyle().text(passenger.travelTime, col2, y);
      y += 16;

      if (passenger.busNumber) {
        labelStyle().text("Numero de bus", col1, y);
        y += 11;
        valueStyle().text(passenger.busNumber, col1, y);
        y += 16;
      }

      if (passenger.documentType) {
        labelStyle().text(passenger.documentType, col1, y);
        y += 11;
        valueStyle().text(passenger.documentNumber || "-", col1, y);
        y += 16;
      }

      y += 4;
      y = dashedLine(y);

      y = sectionHeader("GARANTIES COUVERTES", y);

      labelStyle().text("Prix de l'assurance", col1, y);
      y += 11;
      doc.fontSize(12).fill("#1e40af").font("Helvetica-Bold").text(`${passenger.price} FCFA`, col1, y);
      y += 18;

      if (insuranceData?.garantieDeces || insuranceData?.garantieInvalidite || insuranceData?.garantieFraisMedicaux || insuranceData?.garantieRapatriement) {
        const guarantees = [
          insuranceData.garantieDeces ? `Deces accidentel : ${insuranceData.garantieDeces}` : null,
          insuranceData.garantieInvalidite ? `Invalidite permanente : ${insuranceData.garantieInvalidite}` : null,
          insuranceData.garantieFraisMedicaux ? `Frais medicaux : ${insuranceData.garantieFraisMedicaux}` : null,
          insuranceData.garantieRapatriement ? `Rapatriement : ${insuranceData.garantieRapatriement}` : null,
        ].filter(Boolean);
        guarantees.forEach((g) => {
          doc.fontSize(8).fill("#1e293b").font("Helvetica").text(`  ✓  ${g}`, 20, y, { width: w });
          y += 13;
        });
      } else {
        const defaultCoverages = [
          "Frais medicaux en cas d'accident (500 000 FCFA)",
          "Perte ou dommage des bagages (150 000 FCFA)",
          "Retard ou annulation - Remboursement du billet",
          "Responsabilite civile",
          "Rapatriement sanitaire d'urgence",
        ];
        defaultCoverages.forEach((c) => {
          doc.fontSize(8).fill("#1e293b").font("Helvetica").text(`  •  ${c}`, 20, y, { width: w });
          y += 13;
        });
      }

      if (insuranceData?.dureeValidite) {
        y += 2;
        doc.fontSize(8).fill("#64748b").font("Helvetica").text(`Duree de validite : ${insuranceData.dureeValidite}`, 20, y, { width: w });
        y += 12;
      }
      if (insuranceData?.franchise) {
        doc.fontSize(8).fill("#64748b").font("Helvetica").text(`Franchise : ${insuranceData.franchise}`, 20, y, { width: w });
        y += 12;
      }

      y += 4;
      y = dashedLine(y);

      if (passenger.emergencyContactName || passenger.emergencyContactPhone) {
        y = sectionHeader("PERSONNE A CONTACTER EN CAS DE SINISTRE", y);
        if (passenger.emergencyContactName) {
          valueStyle().text(passenger.emergencyContactName, col1, y);
          y += 14;
        }
        if (passenger.emergencyContactPhone) {
          labelStyle().text(`Tel: ${passenger.emergencyContactPhone}`, col1, y);
          y += 14;
        }
        y += 2;
        y = dashedLine(y);
      }

      if (insuranceData?.hotlineSinistres || insuranceData?.emailSinistres) {
        y = sectionHeader("CONTACT ASSURANCE EN CAS DE SINISTRE", y);
        if (insuranceData?.hotlineSinistres) {
          doc.fontSize(9).fill("#1e293b").font("Helvetica-Bold").text(`Hotline 24/7 : ${insuranceData.hotlineSinistres}`, 20, y);
          y += 12;
        }
        if (insuranceData?.emailSinistres) {
          doc.fontSize(9).fill("#1e293b").font("Helvetica").text(`Email : ${insuranceData.emailSinistres}`, 20, y);
          y += 12;
        }
        if (insuranceData?.urlDeclarationSinistre) {
          doc.fontSize(8).fill("#64748b").font("Helvetica").text(`Declaration en ligne : ${insuranceData.urlDeclarationSinistre}`, 20, y, { width: w });
          y += 12;
        }
        if (insuranceData?.documentsRequis) {
          y += 2;
          doc.fontSize(7).fill("#64748b").font("Helvetica").text("Documents a fournir :", 20, y);
          y += 10;
          const docLines = insuranceData.documentsRequis.split("\n").slice(0, 5);
          docLines.forEach((line) => {
            doc.fontSize(7).fill("#1e293b").font("Helvetica").text(line.trim(), 25, y, { width: w - 10 });
            y += 10;
          });
        }
        y += 4;
        y = dashedLine(y);
      }

      y = sectionHeader("CONTACT SECUREFLOW", y);
      doc.fontSize(9).fill("#1e293b").font("Helvetica-Bold").text("Tel/WhatsApp: +229 01 50 36 36 36", 20, y);
      y += 12;
      doc.fontSize(9).fill("#1e293b").font("Helvetica").text("Email: infosecureflowco@gmail.com", 20, y);
      y += 14;

      y += 4;
      y = dashedLine(y);

      if (insuranceData?.typePolice || insuranceData?.souscripteur || insuranceData?.urlConditionsGenerales) {
        y = sectionHeader("MENTIONS LEGALES", y);
        if (insuranceData?.typePolice) {
          doc.fontSize(7).fill("#64748b").font("Helvetica").text(insuranceData.typePolice, 20, y, { width: w });
          y += 10;
        }
        if (insuranceData?.souscripteur) {
          doc.fontSize(7).fill("#64748b").font("Helvetica").text(`Souscrite par ${insuranceData.souscripteur} aupres de ${insuranceData.name || (passenger as any).insuranceName || ""}`, 20, y, { width: w });
          y += 10;
        }
        doc.fontSize(7).fill("#64748b").font("Helvetica").text("Regie par le Code CIMA", 20, y, { width: w });
        y += 10;
        if (insuranceData?.emailReclamations) {
          doc.fontSize(7).fill("#64748b").font("Helvetica").text(`Reclamations : ${insuranceData.emailReclamations}`, 20, y, { width: w });
          y += 10;
        }
        if (insuranceData?.urlConditionsGenerales) {
          doc.fontSize(7).fill("#64748b").font("Helvetica").text(`Conditions generales : ${insuranceData.urlConditionsGenerales}`, 20, y, { width: w });
          y += 10;
        }
        y += 4;
        y = dashedLine(y);
      }

      doc.fontSize(7).fill("#94a3b8").font("Helvetica").text(`Verifiez en ligne: ${verifyUrl}`, 20, y, { width: w });
      y += 12;
      doc.fontSize(7).fill("#94a3b8").font("Helvetica").text("Powered by SecureFlow | www.secureflow.bj", 20, y, { width: w, align: "center" });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
