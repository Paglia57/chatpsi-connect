export interface ParsedLine {
  type: 'title' | 'heading' | 'metadata' | 'separator' | 'text' | 'empty';
  content: string;
}

export function parseEvolutionContent(content: string): ParsedLine[] {
  if (!content) return [];
  return content.split("\n").map(line => {
    const trimmed = line.trim();
    if (!trimmed) return { type: 'empty', content: '' };
    if (trimmed === "---") return { type: 'separator', content: '' };
    if (trimmed.startsWith("EVOLUÇÃO CLÍNICA") || trimmed.startsWith("# ")) {
      return { type: 'title', content: trimmed.replace(/^#\s*/, '') };
    }
    if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\/]+$/.test(trimmed) && trimmed.length > 3) {
      return { type: 'heading', content: trimmed };
    }
    if (trimmed.startsWith("Data:") || trimmed.startsWith("Paciente:")) {
      return { type: 'metadata', content: trimmed };
    }
    return { type: 'text', content: trimmed };
  });
}

export function getContentPreview(content: string | null, maxLength = 150): string {
  if (!content) return '';
  const lines = content.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "---") continue;
    if (/^[A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\/]+$/.test(trimmed) && trimmed.length > 3) continue;
    if (trimmed.startsWith("EVOLUÇÃO CLÍNICA") || trimmed.startsWith("# ")) continue;
    if (trimmed.startsWith("Data:") || trimmed.startsWith("Paciente:")) continue;
    return trimmed.length > maxLength ? trimmed.slice(0, maxLength) + '...' : trimmed;
  }
  return content.slice(0, maxLength) + '...';
}

export function exportEvolutionPdf(content: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.write(`
    <html><head><title>Evolução</title>
    <style>
      body { font-family: 'Times New Roman', serif; max-width: 800px; margin: 40px auto; padding: 20px; line-height: 1.6; color: #1a1a1a; }
      h1 { font-size: 18px; text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; }
      h2 { font-size: 14px; margin-top: 20px; text-transform: uppercase; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
      p { font-size: 13px; text-align: justify; }
      .meta { font-size: 12px; color: #666; }
      hr { border: none; border-top: 1px solid #ddd; margin: 16px 0; }
      @media print { body { margin: 0; } }
    </style></head><body>
    ${parseEvolutionContent(content).map(line => {
      switch (line.type) {
        case 'title': return `<h1>${line.content}</h1>`;
        case 'heading': return `<h2>${line.content}</h2>`;
        case 'metadata': return `<p class="meta">${line.content}</p>`;
        case 'separator': return '<hr/>';
        case 'empty': return '';
        case 'text': return `<p>${line.content}</p>`;
      }
    }).join("")}
    </body></html>
  `);
  printWindow.document.close();
  printWindow.print();
}
