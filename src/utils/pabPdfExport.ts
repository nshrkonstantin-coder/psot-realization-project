interface Observation {
  observation_number: number;
  description: string;
  category: string;
  conditions_actions: string;
  hazard_factors: string;
  measures: string;
  responsible_person: string;
  deadline: string;
  status: string;
  photo_url?: string;
}

interface PabData {
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
  logo_url?: string;
  observations: Observation[];
}

export const generatePabPDF = (pabs: PabData[]) => {
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

  const documentTitle = pabs.length === 1 
    ? `Протокол аудита безопасности ${pabs[0].doc_number}`
    : 'Протокол аудита безопасности';

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
    
    .pab-document {
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
    
    .observations-title {
      font-size: 13pt;
      font-weight: bold;
      margin: 15px 0 10px 0;
      text-align: center;
      text-transform: uppercase;
    }
    
    .observation {
      margin-bottom: 12px;
      border: 1px solid #000;
      padding: 8px;
      page-break-inside: avoid;
    }
    
    .observation-header {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 8px;
      border-bottom: 1px solid #666;
      padding-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .observation-status {
      font-size: 9pt;
      padding: 2px 8px;
      border-radius: 3px;
      background: #e0e0e0;
    }
    
    .observation-field {
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
      
      .pab-document {
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
  ${pabs.map((pab, pabIndex) => `
    <div class="pab-document">
      <div class="header">
        <h1>Протокол аудита безопасности</h1>
        <h2>${pab.doc_number}</h2>
      </div>
      
      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Дата:</span>
          <span class="info-value">${formatDate(pab.doc_date)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Проверяющий:</span>
          <span class="info-value">${pab.inspector_fio}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Должность:</span>
          <span class="info-value">${pab.inspector_position}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Подразделение:</span>
          <span class="info-value">${pab.department}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Участок:</span>
          <span class="info-value">${pab.location}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Проверяемый объект:</span>
          <span class="info-value">${pab.checked_object}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Статус ПАБ:</span>
          <span class="info-value">${getStatusLabel(pab.status)}</span>
        </div>
      </div>
      
      ${pab.photo_url ? `
      <div class="info-section">
        <div class="info-row">
          <span class="info-label">Фото объекта:</span>
        </div>
        <div class="photo-container">
          <img src="${pab.photo_url}" alt="Фото объекта проверки" />
        </div>
      </div>
      ` : ''}
      
      <div class="observations-title">Наблюдения</div>
      
      ${pab.observations.map(obs => `
        <div class="observation">
          <div class="observation-header">
            <span>Наблюдение №${obs.observation_number}</span>
            <span class="observation-status">${getStatusLabel(obs.status)}</span>
          </div>
          
          <div class="observation-field">
            <span class="field-label">Описание:</span>
            <div class="text-block">${obs.description}</div>
          </div>
          
          <div class="observation-field">
            <span class="field-label">Категория:</span>
            <span class="field-value">${obs.category}</span>
          </div>
          
          <div class="observation-field">
            <span class="field-label">Вид условий и действий:</span>
            <span class="field-value">${obs.conditions_actions}</span>
          </div>
          
          <div class="observation-field">
            <span class="field-label">Опасные факторы:</span>
            <span class="field-value">${obs.hazard_factors}</span>
          </div>
          
          <div class="observation-field">
            <span class="field-label">Мероприятия:</span>
            <div class="text-block">${obs.measures}</div>
          </div>
          
          <div class="observation-field">
            <span class="field-label">Ответственный:</span>
            <span class="field-value">${obs.responsible_person || '—'}</span>
          </div>
          
          <div class="observation-field">
            <span class="field-label">Срок выполнения:</span>
            <span class="field-value">${obs.deadline ? formatDate(obs.deadline) : '—'}</span>
          </div>
          
          ${obs.photo_url ? `
          <div class="observation-field">
            <span class="field-label">Фотография нарушения:</span>
            <div class="photo-container">
              <img src="${obs.photo_url}" alt="Фото наблюдения №${obs.observation_number}" />
            </div>
          </div>
          ` : ''}
        </div>
      `).join('')}
      
      <div class="signatures-section">
        <div class="signatures-title">ПОДПИСИ</div>
        <div class="signatures-grid">
          <div class="signature-block">
            <div class="signature-label">Проверяющий:</div>
            <div class="signature-name">${pab.inspector_fio}</div>
            <div class="signature-line">
              <span>Подпись ______________</span>
              <span>Дата: ${formatDate(pab.doc_date)}</span>
            </div>
          </div>
          <div class="signature-block">
            <div class="signature-label">Ответственный за выполнение:</div>
            <div class="signature-name">${pab.observations[0]?.responsible_person || '—'}</div>
            <div class="signature-line">
              <span>Подпись ______________</span>
              <span>Дата: __________</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    ${pabIndex < pabs.length - 1 ? '<div class="page-break"></div>' : ''}
  `).join('')}
</body>
</html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  
  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };
};