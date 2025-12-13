interface Violation {
  violation_number: number;
  description: string;
  who_violated: string;
  measures: string;
  responsible_person: string;
  deadline: string;
  status: string;
  photo_url?: string;
  photos?: Array<{ data: string }>;
}

interface PcData {
  id: number;
  doc_number: string;
  doc_date: string;
  inspector_fio: string;
  inspector_position: string;
  department: string;
  location: string;
  checked_object: string;
  status: string;
  photo_url?: string;
  violations: Violation[];
}

export const generatePcPDF = (records: PcData[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'new': return 'Новый';
      case 'in_progress': return 'В работе';
      case 'completed': return 'Выполнен';
      case 'overdue': return 'Просрочен';
      default: return 'Новый';
    }
  };

  const documentTitle = records.length === 1 
    ? `Протокол производственного контроля ${records[0].doc_number}`
    : 'Протокол производственного контроля';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${documentTitle}</title>
  <style>
    @page {
      size: A4;
      margin: 15mm;
    }
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Times New Roman', serif;
      font-size: 11pt;
      line-height: 1.4;
      color: #000;
      background: #fff;
    }
    
    .page-break {
      page-break-after: always;
    }
    
    .pc-document {
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      padding: 10mm;
      background: white;
    }
    
    .header {
      text-align: center;
      margin-bottom: 15px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    
    .header h1 {
      font-size: 16pt;
      font-weight: bold;
      margin-bottom: 8px;
      text-transform: uppercase;
    }
    
    .header h2 {
      font-size: 14pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .info-section {
      margin-bottom: 12px;
      border: 1px solid #000;
      padding: 8px;
    }
    
    .info-row {
      display: flex;
      margin-bottom: 5px;
      font-size: 10pt;
    }
    
    .info-label {
      font-weight: bold;
      min-width: 140px;
      flex-shrink: 0;
    }
    
    .info-value {
      flex: 1;
      word-wrap: break-word;
    }
    
    .violations-title {
      font-size: 13pt;
      font-weight: bold;
      margin: 15px 0 10px 0;
      text-align: center;
      text-transform: uppercase;
    }
    
    .violation {
      margin-bottom: 12px;
      border: 1px solid #000;
      padding: 8px;
      page-break-inside: avoid;
    }
    
    .violation-header {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 8px;
      border-bottom: 1px solid #666;
      padding-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .violation-status {
      font-size: 9pt;
      padding: 2px 8px;
      border-radius: 3px;
      background: #e0e0e0;
    }
    
    .violation-field {
      margin-bottom: 6px;
      font-size: 10pt;
    }
    
    .field-label {
      font-weight: bold;
      display: inline;
      margin-right: 5px;
    }
    
    .field-value {
      display: inline;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      max-width: 100%;
    }
    
    .text-block {
      margin-top: 3px;
      padding-left: 10px;
      border-left: 2px solid #ccc;
      word-wrap: break-word;
      word-break: break-word;
      overflow-wrap: break-word;
      max-width: 100%;
      white-space: pre-wrap;
    }
    
    .photo-container {
      margin-top: 10px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }
    
    .photo-container img {
      max-width: 400px;
      max-height: 300px;
      border: 2px solid #ccc;
      border-radius: 4px;
      display: block;
      margin: 10px 0;
    }
    
    .signatures-section {
      margin-top: 30px;
      padding: 15px;
      border: 1px solid #000;
      page-break-inside: avoid;
    }
    
    .signatures-title {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 15px;
      text-align: center;
    }
    
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    
    .signature-block {
      min-height: 80px;
    }
    
    .signature-label {
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 5px;
    }
    
    .signature-name {
      font-size: 10pt;
      margin-bottom: 20px;
    }
    
    .signature-line {
      border-top: 2px solid #000;
      padding-top: 5px;
      display: flex;
      justify-content: space-between;
      font-size: 9pt;
      color: #666;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      
      .pc-document {
        padding: 0;
        max-width: 100%;
      }
      
      .page-break {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  ${records.map((pc, pcIndex) => `
    <div class="pc-document">
      <div class="header">
        <h1>Протокол производственного контроля</h1>
        <h2>${pc.doc_number}</h2>
      </div>
      
      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Дата:</span>
          <span class="info-value">${formatDate(pc.doc_date)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Проверяющий:</span>
          <span class="info-value">${pc.inspector_fio}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Должность:</span>
          <span class="info-value">${pc.inspector_position}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Подразделение:</span>
          <span class="info-value">${pc.department}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Участок:</span>
          <span class="info-value">${pc.location}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Проверяемый объект:</span>
          <span class="info-value">${pc.checked_object}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Статус:</span>
          <span class="info-value">${getStatusLabel(pc.status)}</span>
        </div>
      </div>
      
      ${pc.photo_url ? `
      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Фото объекта:</span>
        </div>
        <div class="photo-container">
          <img src="${pc.photo_url}" alt="Фото объекта проверки" />
        </div>
      </div>
      ` : ''}
      
      <div class="violations-title">Нарушения</div>
      
      ${pc.violations.map(violation => `
        <div class="violation">
          <div class="violation-header">
            <span>Нарушение №${violation.violation_number}</span>
            <span class="violation-status">${getStatusLabel(violation.status)}</span>
          </div>
          
          <div class="violation-field">
            <span class="field-label">Описание нарушения:</span>
            <div class="text-block">${violation.description}</div>
          </div>
          
          <div class="violation-field">
            <span class="field-label">Кем допущено:</span>
            <div class="text-block">${violation.who_violated}</div>
          </div>
          
          <div class="violation-field">
            <span class="field-label">Мероприятия по устранению:</span>
            <div class="text-block">${violation.measures}</div>
          </div>
          
          <div class="violation-field">
            <span class="field-label">Ответственный:</span>
            <span class="field-value">${violation.responsible_person}</span>
          </div>
          
          <div class="violation-field">
            <span class="field-label">Срок устранения:</span>
            <span class="field-value">${formatDate(violation.deadline)}</span>
          </div>
          
          ${violation.photos && violation.photos.length > 0 ? `
          <div class="violation-field">
            <span class="field-label">Фото нарушений (${violation.photos.length}):</span>
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 10px;">
            ${violation.photos.map((photo, idx) => `
              <img src="${photo.data}" alt="Фото ${idx + 1}" style="width: 200px; height: 200px; object-fit: cover; border: 2px solid #ccc; border-radius: 4px;" />
            `).join('')}
          </div>
          ` : ''}
        </div>
      `).join('')}
      
      <div class="signatures-section">
        <div class="signatures-title">ПОДПИСИ</div>
        <div class="signatures-grid">
          <div class="signature-block">
            <div class="signature-label">Проверяющий:</div>
            <div class="signature-name">${pc.inspector_fio}</div>
            <div class="signature-line">
              <span>Подпись</span>
              <span>______________</span>
              <span>${formatDate(pc.doc_date)}</span>
            </div>
          </div>
          <div class="signature-block">
            <div class="signature-label">Ответственный за устранение:</div>
            <div class="signature-name">${pc.violations[0]?.responsible_person || '—'}</div>
            <div class="signature-line">
              <span>Подпись</span>
              <span>______________</span>
              <span>__________</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${pcIndex < records.length - 1 ? '<div class="page-break"></div>' : ''}
  `).join('')}
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
};