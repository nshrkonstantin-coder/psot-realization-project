import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import OrganizationLogo from '@/components/OrganizationLogo';
import LightThemeWrapper from '@/components/LightThemeWrapper';
import { apiFetch } from '@/lib/api';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType, ImageRun } from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { uploadToEPKFolder } from '@/utils/uploadToEPKFolder';
import ProductionControlForm from '@/components/production-control/ProductionControlForm';
import ViolationsTable from '@/components/production-control/ViolationsTable';
import SignatureSection from '@/components/production-control/SignatureSection';
import { apiFetch } from '@/lib/api';

interface ViolationItem {
  item_number: number;
  description: string;
  photos: Array<{ data: string }>;
  measures: string;
  deadline: string;
  responsible_user_id?: string;
}

interface SignatureLine {
  userId: string;
  userName: string;
  date: string;
}

export default function ProductionControlPage() {
  console.log('[ProductionControlPage] Component rendering');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [orgUsers, setOrgUsers] = useState<Array<{ id: number; fio: string; position: string; subdivision: string }>>([]);
  
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
  const [docNumber, setDocNumber] = useState('');
  const [recipientUserId, setRecipientUserId] = useState('');
  const [department, setDepartment] = useState('');
  const [witness, setWitness] = useState('');
  const [issuerName, setIssuerName] = useState('');
  const [issuerPosition, setIssuerPosition] = useState('');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [violations, setViolations] = useState<ViolationItem[]>([
    {
      item_number: 1,
      description: '',
      photos: [],
      measures: '',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      item_number: 2,
      description: '',
      photos: [],
      measures: '',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  ]);

  const [acceptorSignatures, setAcceptorSignatures] = useState<SignatureLine[]>([
    { userId: '', userName: '', date: new Date().toISOString().split('T')[0] }
  ]);

  useEffect(() => {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      navigate('/');
      return;
    }
    
    const userFio = localStorage.getItem('userFio') || '';
    const userPosition = localStorage.getItem('userPosition') || '';
    const orgId = localStorage.getItem('organizationId');
    
    console.log('ProductionControlPage mounted:', { userId, userFio, orgId });
    
    setIssuerName(userFio);
    setIssuerPosition(userPosition);
    
    loadOrgUsers();
    generateDocNumber();
  }, [navigate]);

  const generateDocNumber = async () => {
    const organizationId = localStorage.getItem('organizationId');
    if (!organizationId) {
      console.error('No organizationId found');
      return;
    }

    try {
      const response = await apiFetch(
        `https://functions.poehali.dev/19d2aac9-fad8-4354-a87d-0d21abbbdc67?organization_id=${organizationId}`
      );
      
      if (!response.ok) {
        console.error('Failed to generate doc number:', response.status);
        return;
      }
      
      const data = await response.json();
      
      if (data.success && data.doc_number) {
        setDocNumber(data.doc_number);
        console.log('Generated doc number:', data.doc_number);
      }
    } catch (error) {
      console.error('Error generating doc number:', error);
    }
  };

  const loadOrgUsers = async () => {
    const organizationId = localStorage.getItem('organizationId');
    if (!organizationId) {
      console.error('No organizationId found in localStorage');
      return;
    }

    try {
      const response = await apiFetch(
        `https://functions.poehali.dev/bceeaee7-5cfa-418c-9c0d-0a61668ab1a4?organization_id=${organizationId}`
      );
      
      if (!response.ok) {
        console.error('Failed to fetch users:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      console.log('Loaded users:', data);
      
      if (Array.isArray(data)) {
        setOrgUsers(data);
      } else {
        console.error('Unexpected data format:', data);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('Ошибка загрузки пользователей');
    }
  };

  const handleSave = async () => {
    if (!docNumber || !recipientUserId || !department) {
      toast.error('Заполните обязательные поля: Номер документа, Кому, Подразделение');
      return;
    }

    setLoading(true);

    try {
      const userId = localStorage.getItem('userId');
      const organizationId = localStorage.getItem('organizationId');
      const recipientName = orgUsers.find(u => String(u.id) === recipientUserId)?.fio || '';
      
      toast.info('Генерация и загрузка Word документа в папку ЭПК...');
      const wordFileUrl = await generateAndUploadWord();
      
      if (!wordFileUrl) {
        toast.error('Ошибка загрузки Word файла');
        setLoading(false);
        return;
      }
      
      toast.info('Сохранение в базу данных...');
      const response = await apiFetch('https://functions.poehali.dev/2babe7b8-1f0b-464f-8aae-3e623cf3a795', {
        method: 'POST',
        body: JSON.stringify({
          doc_number: docNumber,
          doc_date: currentDate,
          recipient_user_id: parseInt(recipientUserId),
          recipient_name: recipientName,
          department,
          witness,
          issuer_name: issuerName,
          issuer_position: issuerPosition,
          issue_date: issueDate,
          violations,
          acceptor_signatures: acceptorSignatures,
          user_id: parseInt(userId!),
          organization_id: parseInt(organizationId!),
          word_file_url: wordFileUrl
        })
      });

      const result = await response.json();

      if (result.success) {
        const notificationData = {
          form_type: 'production_control',
          doc_number: docNumber,
          report_id: result.report_id,
          organization_id: parseInt(organizationId!),
          word_file_url: wordFileUrl,
          responsible_user_ids: [
            parseInt(recipientUserId),
            ...acceptorSignatures.filter(s => s.userId).map(s => parseInt(s.userId))
          ],
          form_data: {
            department,
            recipient_name: recipientName,
            issuer_name: issuerName,
            issuer_position: issuerPosition,
            issue_date: issueDate
          }
        };
        
        apiFetch('https://functions.poehali.dev/4a977fe4-5b7e-477d-b142-d85522845415', {
          method: 'POST',
          body: JSON.stringify(notificationData)
        }).then(res => res.json()).then(notifResult => {
          if (notifResult.success) {
            console.log(`Уведомления отправлены: ${notifResult.chat_notifications_sent} в чат, email: ${notifResult.email_sent}`);
          }
        }).catch(err => console.error('Error sending notifications:', err));
        
        toast.success(
          <div className="flex flex-col gap-2">
            <div className="font-bold">✅ Предписание успешно сохранено!</div>
            <div className="text-sm text-gray-600">
              <strong>Номер:</strong> {docNumber}<br/>
              <strong>Кому:</strong> {recipientName}<br/>
              <strong>ID в базе:</strong> {result.report_id}<br/>
              <strong>Место хранения:</strong> База данных + папка "ЭПК" в Хранилище<br/>
              <strong>📧 Уведомления:</strong> Отправлены ответственным и администратору
            </div>
            <a 
              href={wordFileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 text-sm underline text-left mt-1"
            >
              📄 Открыть Word документ
            </a>
            <button 
              onClick={() => navigate('/storage')}
              className="text-blue-600 hover:text-blue-800 text-sm underline text-left"
            >
              📁 Перейти в Хранилище → ЭПК
            </button>
          </div>,
          {
            duration: Infinity,
            closeButton: true
          }
        );
        
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        toast.error(result.error || 'Ошибка сохранения');
      }
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const generateAndUploadWord = async (): Promise<string> => {
    try {
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'п/п', bold: true })], width: { size: 1500, type: WidthType.DXA } }),
            new TableCell({ children: [new Paragraph({ text: 'Краткое изложение выявленных нарушений с указанием места обнаружения (при необходимости вкладывать фото)', bold: true })], width: { size: 45, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ text: 'Предлагаемые меры, ответственные за выполнение и срок устранения нарушений', bold: true })], width: { size: 50, type: WidthType.PERCENTAGE } })
          ]
        })
      ];

      for (const item of violations) {
        const descriptionParts: (Paragraph | Table)[] = [new Paragraph(item.description || '')];
        
        for (const photo of item.photos) {
          try {
            const base64Data = photo.data.split(',')[1];
            const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            
            descriptionParts.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: {
                      width: 300,
                      height: 225
                    }
                  })
                ],
                spacing: { before: 200, after: 200 }
              })
            );
          } catch (error) {
            console.error('Error adding image to Word:', error);
          }
        }

        const responsibleUser = item.responsible_user_id ? orgUsers.find(u => String(u.id) === item.responsible_user_id) : null;
        const responsibleText = responsibleUser ? `Ответственный: ${responsibleUser.fio}` : '';
        const measuresWithInfo = item.measures 
          ? `${item.measures}${responsibleText ? '\n\n' + responsibleText : ''}\n\nСрок: ${item.deadline || 'Не указан'}` 
          : `${responsibleText ? responsibleText + '\n\n' : ''}Срок: ${item.deadline || 'Не указан'}`;
        
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(String(item.item_number) + '.')], width: { size: 1500, type: WidthType.DXA } }),
              new TableCell({ children: descriptionParts }),
              new TableCell({ children: [new Paragraph(measuresWithInfo)] })
            ]
          })
        );
      }

      const recipientUser = orgUsers.find(u => String(u.id) === recipientUserId);
      const recipientText = recipientUser ? `${recipientUser.fio}, ${recipientUser.position}` : '';

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({ text: 'Электронная выдача АКТа производственного контроля', alignment: AlignmentType.CENTER, bold: true, spacing: { after: 200 } }),
              new Paragraph({ text: 'РОССИЙСКАЯ ФЕДЕРАЦИЯ (РОССИЯ)', alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
              new Paragraph({ text: 'РЕСПУБЛИКА САХА (ЯКУТИЯ)', alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
              new Paragraph({ text: 'Акционерное Общество «Горно-рудная компания «Западная»', alignment: AlignmentType.CENTER, bold: true, spacing: { after: 100 } }),
              new Paragraph({ text: '678730, Республика Саха (Якутия), Оймяконский район, п. г. т. Усть-Нера, проезд Северный, д.12.', alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
              new Paragraph({ text: 'тел. 8 (395) 225-52-88, доб.*1502', alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
              new Paragraph({ text: `${currentDate}                    Рудник «Бадран»`, spacing: { after: 300 } }),
              new Paragraph({ text: `ПРЕДПИСАНИЕ (АКТ) №${docNumber}`, alignment: AlignmentType.CENTER, bold: true, spacing: { after: 200 } }),
              new Paragraph({ text: 'Проверки по производственному контролю за состоянием ОТ и ПБ', alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
              new Paragraph({ text: `Кому: ${recipientText}`, spacing: { after: 100 } }),
              new Paragraph({ text: department, spacing: { after: 100 } }),
              new Paragraph({ text: `Проверка проведена в присутствии: ${witness}`, spacing: { after: 200 } }),
              new Paragraph({ text: 'Необходимо устранить следующие нарушения в указанные сроки:', spacing: { after: 200 } }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: tableRows
              }),
              new Paragraph({ text: 'О выполнении настоящего предписания прошу предоставить письменное уведомление в отдел ОТ и ПБ согласно дат, указанных в пунктах.', spacing: { before: 300, after: 300 } }),
              new Paragraph({ text: `Предписание выдал: ${issuerName}, ${issuerPosition}       Дата: ${issueDate}`, spacing: { after: 200 } }),
              ...acceptorSignatures.map(sig => 
                new Paragraph({ text: `Предписание принял: ${sig.userName}       Дата: ${sig.date}`, spacing: { after: 100 } })
              )
            ]
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      const file = new File([blob], `Предписание_${docNumber}_${new Date().toISOString().slice(0, 10)}.docx`, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
      
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('User ID not found');
      }
      
      const fileUrl = await uploadToEPKFolder(file, userId);
      return fileUrl;
    } catch (error) {
      console.error('Error generating and uploading Word:', error);
      return '';
    }
  };

  const handleExportWord = async () => {
    try {
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'п/п', bold: true })], width: { size: 1500, type: WidthType.DXA } }),
            new TableCell({ children: [new Paragraph({ text: 'Краткое изложение выявленных нарушений с указанием места обнаружения (при необходимости вкладывать фото)', bold: true })], width: { size: 45, type: WidthType.PERCENTAGE } }),
            new TableCell({ children: [new Paragraph({ text: 'Предлагаемые меры, ответственные за выполнение и срок устранения нарушений', bold: true })], width: { size: 50, type: WidthType.PERCENTAGE } })
          ]
        })
      ];

      for (const item of violations) {
        const descriptionParts: (Paragraph | Table)[] = [new Paragraph(item.description || '')];
        
        for (const photo of item.photos) {
          try {
            const base64Data = photo.data.split(',')[1];
            const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            
            descriptionParts.push(
              new Paragraph({
                children: [
                  new ImageRun({
                    data: imageBuffer,
                    transformation: {
                      width: 300,
                      height: 225
                    }
                  })
                ],
                spacing: { before: 200, after: 200 }
              })
            );
          } catch (error) {
            console.error('Error adding image to Word:', error);
          }
        }

        const responsibleUser = item.responsible_user_id ? orgUsers.find(u => String(u.id) === item.responsible_user_id) : null;
        const responsibleText = responsibleUser ? `Ответственный: ${responsibleUser.fio}` : '';
        const measuresWithInfo = item.measures 
          ? `${item.measures}${responsibleText ? '\n\n' + responsibleText : ''}\n\nСрок: ${item.deadline || 'Не указан'}` 
          : `${responsibleText ? responsibleText + '\n\n' : ''}Срок: ${item.deadline || 'Не указан'}`;
        
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(String(item.item_number) + '.')], width: { size: 1500, type: WidthType.DXA } }),
              new TableCell({ children: descriptionParts }),
              new TableCell({ children: [new Paragraph(measuresWithInfo)] })
            ]
          })
        );
      }

      const recipientUser = orgUsers.find(u => String(u.id) === recipientUserId);
      const recipientText = recipientUser ? `${recipientUser.fio}, ${recipientUser.position}` : '';

      const doc = new Document({
        sections: [
          {
            properties: {},
            children: [
              new Paragraph({ text: 'Электронная выдача АКТа производственного контроля', alignment: AlignmentType.CENTER, bold: true, spacing: { after: 200 } }),
              new Paragraph({ text: 'РОССИЙСКАЯ ФЕДЕРАЦИЯ (РОССИЯ)', alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
              new Paragraph({ text: 'РЕСПУБЛИКА САХА (ЯКУТИЯ)', alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
              new Paragraph({ text: 'Акционерное Общество «Горно-рудная компания «Западная»', alignment: AlignmentType.CENTER, bold: true, spacing: { after: 100 } }),
              new Paragraph({ text: '678730, Республика Саха (Якутия), Оймяконский район, п. г. т. Усть-Нера, проезд Северный, д.12.', alignment: AlignmentType.CENTER, spacing: { after: 100 } }),
              new Paragraph({ text: 'тел. 8 (395) 225-52-88, доб.*1502', alignment: AlignmentType.CENTER, spacing: { after: 200 } }),
              new Paragraph({ text: `${currentDate}                    Рудник «Бадран»`, spacing: { after: 300 } }),
              new Paragraph({ text: `ПРЕДПИСАНИЕ (АКТ) №${docNumber}`, alignment: AlignmentType.CENTER, bold: true, spacing: { after: 200 } }),
              new Paragraph({ text: 'Проверки по производственному контролю за состоянием ОТ и ПБ', alignment: AlignmentType.CENTER, spacing: { after: 300 } }),
              new Paragraph({ text: `Кому: ${recipientText}`, spacing: { after: 100 } }),
              new Paragraph({ text: department, spacing: { after: 100 } }),
              new Paragraph({ text: `Проверка проведена в присутствии: ${witness}`, spacing: { after: 200 } }),
              new Paragraph({ text: 'Необходимо устранить следующие нарушения в указанные сроки:', spacing: { after: 200 } }),
              new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: tableRows
              }),
              new Paragraph({ text: 'О выполнении настоящего предписания прошу предоставить письменное уведомление в отдел ОТ и ПБ согласно дат, указанных в пунктах.', spacing: { before: 300, after: 300 } }),
              new Paragraph({ text: `Предписание выдал: ${issuerName}, ${issuerPosition}       Дата: ${issueDate}`, spacing: { after: 200 } }),
              ...acceptorSignatures.map(sig => 
                new Paragraph({ text: `Предписание принял: ${sig.userName}       Дата: ${sig.date}`, spacing: { after: 100 } })
              )
            ]
          }
        ]
      });

      const blob = await Packer.toBlob(doc);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Предписание_${docNumber}_${new Date().toISOString().slice(0, 10)}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Документ Word успешно скачан!');
    } catch (error) {
      console.error('Error exporting to Word:', error);
      toast.error('Ошибка при экспорте в Word');
    }
  };

  const handlePrint = async () => {
    try {
      const element = document.getElementById('print-container');
      if (!element) {
        toast.error('Ошибка: контейнер не найден');
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth - 30;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 15;

      pdf.addImage(imgData, 'PNG', 15, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight - 30;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 15;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 15, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight - 30;
      }

      pdf.save(`Предписание_${docNumber}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF успешно сохранен!');
    } catch (error) {
      console.error('Error creating PDF:', error);
      toast.error('Ошибка при создании PDF');
    }
  };

  return (
    <LightThemeWrapper>
    <div className="min-h-screen p-6 print:bg-white">
      <Card id="print-container" className="max-w-7xl mx-auto p-8 print:shadow-none">
        <ProductionControlForm
          currentDate={currentDate}
          setCurrentDate={setCurrentDate}
          docNumber={docNumber}
          recipientUserId={recipientUserId}
          setRecipientUserId={setRecipientUserId}
          department={department}
          setDepartment={setDepartment}
          witness={witness}
          setWitness={setWitness}
          orgUsers={orgUsers}
        />

        <ViolationsTable
          violations={violations}
          setViolations={setViolations}
          orgUsers={orgUsers}
        />

        <SignatureSection
          issuerName={issuerName}
          issuerPosition={issuerPosition}
          issueDate={issueDate}
          setIssueDate={setIssueDate}
          acceptorSignatures={acceptorSignatures}
          setAcceptorSignatures={setAcceptorSignatures}
          orgUsers={orgUsers}
        />

        <div className="buttons flex gap-3 justify-center print:hidden">
          <Button variant="outline" onClick={() => navigate('/dashboard')} className="border-red-500 text-red-500 hover:bg-red-50">
            <Icon name="ArrowLeft" size={20} className="mr-2" />
            Назад
          </Button>
          <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700">
            <Icon name="Save" size={20} className="mr-2" />
            {loading ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Button onClick={handleExportWord} variant="outline" className="border-blue-700 text-blue-700 hover:bg-blue-50">
            <Icon name="FileText" size={20} className="mr-2" />
            Скачать Word
          </Button>
          <Button onClick={handlePrint} variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-50">
            <Icon name="FileDown" size={20} className="mr-2" />
            Скачать PDF
          </Button>
        </div>
      </Card>
    </div>
    </LightThemeWrapper>
  );
}