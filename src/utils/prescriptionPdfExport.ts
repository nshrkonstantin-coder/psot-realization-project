interface PrescriptionData {
  id: number;
  prescription_id: number;
  violation_text: string;
  assigned_user_id: number;
  assigned_user_fio: string;
  status: string;
  deadline: string;
  completed_at?: string;
  confirmed_by_issuer?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const generatePrescriptionPDF = (prescriptions: PrescriptionData[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const documentTitle = prescriptions.length === 1 
    ? `Предписание №${prescriptions[0].prescription_id}`
    : 'Список предписаний';

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
    
    .prescription-document {
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
    
    .header p {
      font-size: 12pt;
      margin: 3px 0;
    }
    
    .info-section {
      margin-bottom: 15px;
      border: 1px solid #000;
      padding: 10px;
    }
    
    .info-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 8px;
    }
    
    .info-field {
      border-bottom: 1px dotted #666;
      padding: 3px 0;
    }
    
    .info-field label {
      font-weight: bold;
      margin-right: 5px;
    }
    
    .section-title {
      font-size: 13pt;
      font-weight: bold;
      margin: 15px 0 8px 0;
      padding: 5px;
      background: #f0f0f0;
      border-left: 4px solid #333;
    }
    
    .prescription-item {
      border: 2px solid #000;
      padding: 12px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .prescription-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #333;
    }
    
    .prescription-number {
      font-size: 14pt;
      font-weight: bold;
    }
    
    .status-badge {
      padding: 4px 12px;
      border: 1px solid #000;
      font-size: 10pt;
      font-weight: bold;
    }
    
    .status-completed {
      background: #d4edda;
    }
    
    .status-in-progress {
      background: #fff3cd;
    }
    
    .status-overdue {
      background: #f8d7da;
    }
    
    .field-block {
      margin-bottom: 10px;
    }
    
    .field-label {
      font-weight: bold;
      margin-bottom: 3px;
      font-size: 10pt;
    }
    
    .field-value {
      padding: 5px;
      border: 1px solid #ccc;
      background: #fafafa;
      min-height: 20px;
    }
    
    .signature-section {
      margin-top: 30px;
      border-top: 2px solid #000;
      padding-top: 15px;
    }
    
    .signature-line {
      margin-top: 15px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    
    .signature-line label {
      font-weight: bold;
    }
    
    .signature-line span {
      border-bottom: 1px solid #000;
      min-width: 200px;
      display: inline-block;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      
      .prescription-document {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="prescription-document">
    <div class="header">
      <h1>Протокол предписаний по устранению нарушений</h1>
      <p>Дата печати: ${formatDate(new Date().toISOString())}</p>
      ${prescriptions.length > 1 ? `<p>Количество предписаний: ${prescriptions.length}</p>` : ''}
    </div>

    ${prescriptions.map((presc, index) => `
      <div class="prescription-item">
        <div class="prescription-header">
          <div class="prescription-number">Предписание №${presc.prescription_id}</div>
          <div class="status-badge ${
            presc.status === 'Выполнено' ? 'status-completed' :
            presc.status === 'В работе' ? 'status-in-progress' :
            'status-overdue'
          }">
            ${presc.status}
          </div>
        </div>

        <div class="info-section">
          <div class="info-row">
            <div class="info-field">
              <label>Дата выписки:</label>
              <span>${presc.created_at ? formatDate(presc.created_at) : '-'}</span>
            </div>
            <div class="info-field">
              <label>Срок устранения:</label>
              <span style="${new Date(presc.deadline) < new Date() && presc.status !== 'Выполнено' ? 'color: red; font-weight: bold;' : ''}">${formatDate(presc.deadline)}</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-field">
              <label>Ответственное лицо:</label>
              <span>${presc.assigned_user_fio || '-'}</span>
            </div>
            ${presc.completed_at ? `
            <div class="info-field">
              <label>Дата выполнения:</label>
              <span>${formatDate(presc.completed_at)}</span>
            </div>
            ` : '<div></div>'}
          </div>
        </div>

        <div class="field-block">
          <div class="field-label">Описание нарушения:</div>
          <div class="field-value">${presc.violation_text || '-'}</div>
        </div>

        ${presc.status === 'Выполнено' && presc.confirmed_by_issuer ? `
        <div class="field-block">
          <div class="field-label" style="color: green;">✓ Выполнение подтверждено</div>
        </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-line">
            <label>Ответственное лицо:</label>
            <span>${presc.assigned_user_fio}</span>
          </div>
          <div class="signature-line">
            <label>Подпись:</label>
            <span>_______________________</span>
          </div>
          <div class="signature-line">
            <label>Дата:</label>
            <span>_______________________</span>
          </div>
        </div>
      </div>
      ${index < prescriptions.length - 1 ? '<div class="page-break"></div>' : ''}
    `).join('')}

  </div>

  <script>
    window.onload = function() {
      setTimeout(() => {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
};
