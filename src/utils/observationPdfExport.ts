interface ObservationData {
  id: number;
  observation_number: number;
  pab_record_id?: number;
  description: string;
  category: string;
  conditions_actions: string;
  hazard_factors: string;
  measures: string;
  responsible_person: string;
  deadline: string;
  status: string;
  photo_url?: string;
  created_at?: string;
}

export const generateObservationPDF = (observations: ObservationData[]) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU');
  };

  const documentTitle = observations.length === 1 
    ? `Наблюдение №${observations[0].observation_number}`
    : 'Список наблюдений';

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
    
    .observation-document {
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
    
    .observation-item {
      border: 2px solid #000;
      padding: 12px;
      margin-bottom: 20px;
      page-break-inside: avoid;
    }
    
    .observation-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px solid #333;
    }
    
    .observation-number {
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
    
    .photo-section {
      margin: 10px 0;
      text-align: center;
    }
    
    .photo-section img {
      max-width: 100%;
      max-height: 400px;
      border: 1px solid #000;
      margin-top: 5px;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      
      .observation-document {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="observation-document">
    <div class="header">
      <h1>Протокол наблюдений по безопасности</h1>
      <p>Дата печати: ${formatDate(new Date().toISOString())}</p>
      ${observations.length > 1 ? `<p>Количество наблюдений: ${observations.length}</p>` : ''}
    </div>

    ${observations.map((obs, index) => `
      <div class="observation-item">
        <div class="observation-header">
          <div class="observation-number">Наблюдение №${obs.observation_number}</div>
          <div class="status-badge ${
            obs.status === 'Завершено' ? 'status-completed' :
            obs.status === 'В работе' || obs.status === 'Новый' ? 'status-in-progress' :
            'status-overdue'
          }">
            ${obs.status}
          </div>
        </div>

        <div class="info-section">
          <div class="info-row">
            <div class="info-field">
              <label>Категория:</label>
              <span>${obs.category || '-'}</span>
            </div>
            <div class="info-field">
              <label>Дата создания:</label>
              <span>${obs.created_at ? formatDate(obs.created_at) : '-'}</span>
            </div>
          </div>
          <div class="info-row">
            <div class="info-field">
              <label>Ответственное лицо:</label>
              <span>${obs.responsible_person || '-'}</span>
            </div>
            <div class="info-field">
              <label>Срок устранения:</label>
              <span style="${new Date(obs.deadline) < new Date() && obs.status !== 'Завершено' ? 'color: red; font-weight: bold;' : ''}">${formatDate(obs.deadline)}</span>
            </div>
          </div>
        </div>

        <div class="field-block">
          <div class="field-label">Описание наблюдения:</div>
          <div class="field-value">${obs.description || '-'}</div>
        </div>

        ${obs.conditions_actions ? `
        <div class="field-block">
          <div class="field-label">Условия/Действия:</div>
          <div class="field-value">${obs.conditions_actions}</div>
        </div>
        ` : ''}

        ${obs.hazard_factors ? `
        <div class="field-block">
          <div class="field-label">Опасные факторы:</div>
          <div class="field-value">${obs.hazard_factors}</div>
        </div>
        ` : ''}

        ${obs.measures ? `
        <div class="field-block">
          <div class="field-label">Меры по устранению:</div>
          <div class="field-value">${obs.measures}</div>
        </div>
        ` : ''}

        ${obs.photo_url ? `
        <div class="photo-section">
          <div class="field-label">Фотография:</div>
          <img src="${obs.photo_url}" alt="Фото наблюдения" />
        </div>
        ` : ''}
      </div>
      ${index < observations.length - 1 ? '<div class="page-break"></div>' : ''}
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
