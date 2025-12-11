import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType, ImageRun } from 'docx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface ViolationItem {
  item_number: number;
  description: string;
  photos: Array<{ data: string }>;
  measures: string;
}

interface SignatureLine {
  userId: string;
  userName: string;
  date: string;
}

export default function ProductionControlPage() {
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
      measures: ''
    },
    {
      item_number: 2,
      description: '',
      photos: [],
      measures: ''
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
    
    setIssuerName(userFio);
    setIssuerPosition(userPosition);
    
    loadOrgUsers();
    generateDocNumber();
  }, [navigate]);

  const generateDocNumber = () => {
    const currentYear = new Date().getFullYear();
    const shortYear = currentYear.toString().slice(-2);
    const reportsKey = 'production_control_reports';
    const existingReports = JSON.parse(localStorage.getItem(reportsKey) || '[]');
    
    const currentYearReports = existingReports.filter((report: any) => {
      const reportYear = new Date(report.created_at).getFullYear();
      return reportYear === currentYear;
    });
    
    const nextNumber = currentYearReports.length + 1;
    const docNum = `ЭПК-${nextNumber}-${shortYear}`;
    setDocNumber(docNum);
  };

  const loadOrgUsers = async () => {
    const organizationId = localStorage.getItem('organizationId');
    if (!organizationId) return;

    try {
      const response = await fetch(
        `https://functions.poehali.dev/80de0ea1-b0e8-4b68-b93a-0d5aae40fd40?organization_id=${organizationId}`
      );
      const data = await response.json();
      if (data.users) {
        setOrgUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const addViolationRow = () => {
    setViolations([
      ...violations,
      {
        item_number: violations.length + 1,
        description: '',
        photos: [],
        measures: ''
      }
    ]);
  };

  const deleteViolationRow = () => {
    if (violations.length > 2) {
      const updated = violations.slice(0, -1);
      setViolations(updated);
    } else {
      toast.error('Таблица должна содержать минимум две строки');
    }
  };

  const updateViolation = (index: number, field: 'description' | 'measures', value: string) => {
    const updated = [...violations];
    updated[index][field] = value;
    setViolations(updated);
  };

  const handlePhotoUpload = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const updated = [...violations];
      updated[index].photos.push({
        data: e.target?.result as string
      });
      setViolations(updated);
      toast.success('Фото добавлено');
    };
    
    reader.readAsDataURL(file);
  };

  const removePhoto = (violationIndex: number, photoIndex: number) => {
    const updated = [...violations];
    updated[violationIndex].photos.splice(photoIndex, 1);
    setViolations(updated);
  };

  const handleTextareaChange = (index: number, field: 'description' | 'measures', value: string, event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateViolation(index, field, value);
    event.target.style.height = 'auto';
    event.target.style.height = event.target.scrollHeight + 'px';
  };

  const addSignatureLine = () => {
    setAcceptorSignatures([
      ...acceptorSignatures,
      { userId: '', userName: '', date: new Date().toISOString().split('T')[0] }
    ]);
  };

  const updateSignature = (index: number, userId: string) => {
    const user = orgUsers.find(u => String(u.id) === userId);
    const updated = [...acceptorSignatures];
    updated[index].userId = userId;
    updated[index].userName = user ? `${user.fio}, ${user.position}` : '';
    setAcceptorSignatures(updated);
  };

  const updateSignatureDate = (index: number, date: string) => {
    const updated = [...acceptorSignatures];
    updated[index].date = date;
    setAcceptorSignatures(updated);
  };

  const handleSave = async () => {
    if (!docNumber || !recipientUserId || !department) {
      toast.error('Заполните обязательные поля: Номер документа, Кому, Подразделение');
      return;
    }

    setLoading(true);

    try {
      const reportData = {
        current_date: currentDate,
        doc_number: docNumber,
        recipient_user_id: recipientUserId,
        recipient_name: orgUsers.find(u => String(u.id) === recipientUserId)?.fio || '',
        department,
        witness,
        violations,
        issuer_name: issuerName,
        issuer_position: issuerPosition,
        issue_date: issueDate,
        acceptor_signatures: acceptorSignatures,
        user_id: localStorage.getItem('userId'),
        organization_id: localStorage.getItem('organizationId'),
        created_at: new Date().toISOString()
      };

      const reportsKey = 'production_control_reports';
      const existingReports = JSON.parse(localStorage.getItem(reportsKey) || '[]');
      existingReports.push(reportData);
      localStorage.setItem(reportsKey, JSON.stringify(existingReports));

      toast.success('Предписание успешно сохранено!');
      
      // Имитация отправки уведомления
      const recipientName = orgUsers.find(u => String(u.id) === recipientUserId)?.fio || 'получателю';
      console.log(`Уведомление отправлено: ${recipientName} - Предписание ${docNumber} от ${currentDate}`);
      
      navigate('/dashboard');
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('Ошибка при сохранении');
    } finally {
      setLoading(false);
    }
  };

  const handleExportWord = async () => {
    try {
      const tableRows = [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph({ text: 'п/п', bold: true })], width: { size: 5, type: WidthType.PERCENTAGE } }),
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

        tableRows.push(
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph(String(item.item_number) + '.')] }),
              new TableCell({ children: descriptionParts }),
              new TableCell({ children: [new Paragraph(item.measures || '')] })
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

  const uniqueSubdivisions = Array.from(new Set(orgUsers.map(u => u.subdivision)));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 print:bg-white">
      <Card id="print-container" className="max-w-7xl mx-auto p-8 print:shadow-none bg-white">
        <div className="header text-center mb-6 border-b-2 border-slate-300 pb-4 print:border-black">
          <h3 className="text-xl font-bold text-slate-900">Электронная выдача АКТа производственного контроля</h3>
          <h4 className="text-lg font-semibold text-slate-700 mt-2">РОССИЙСКАЯ ФЕДЕРАЦИЯ (РОССИЯ)</h4>
          <h4 className="text-lg font-semibold text-slate-700">РЕСПУБЛИКА САХА (ЯКУТИЯ)</h4>
        </div>

        <div className="company-info text-center mb-6">
          <p className="font-bold text-slate-900">Акционерное Общество «Горно-рудная компания «Западная»</p>
          <p className="text-slate-700">678730, Республика Саха (Якутия), Оймяконский район, п. г. т. Усть-Нера, проезд Северный, д.12.</p>
          <p className="text-slate-700">тел. 8 (395) 225-52-88, доб.*1502</p>
          <div className="flex justify-between items-center mt-4">
            <Input
              type="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              className="w-40 print:border-none print:bg-transparent"
            />
            <span className="font-semibold text-slate-700">Рудник «Бадран»</span>
          </div>
        </div>

        <div className="document-title text-center mb-4">
          <h2 className="text-2xl font-bold text-slate-900 underline">ПРЕДПИСАНИЕ (АКТ) {docNumber ? `№${docNumber}` : ''}</h2>
          <p className="text-slate-700 mt-2">Проверки по производственному контролю за состоянием ОТ и ПБ</p>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <Label className="font-semibold">Кому: *</Label>
            <Select value={recipientUserId} onValueChange={setRecipientUserId}>
              <SelectTrigger className={`transition-colors ${recipientUserId ? 'bg-green-100 border-green-400' : ''}`}>
                <SelectValue placeholder="Выберите получателя" />
              </SelectTrigger>
              <SelectContent>
                {orgUsers.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.fio}, {user.position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="font-semibold">Наименование обследуемого подразделения общества *</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className={`transition-colors ${department ? 'bg-green-100 border-green-400' : ''}`}>
                <SelectValue placeholder="Выберите подразделение" />
              </SelectTrigger>
              <SelectContent>
                {uniqueSubdivisions.map((sub) => (
                  <SelectItem key={sub} value={sub}>
                    {sub}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="font-semibold">Проверка проведена в присутствии (должность, Ф.И.О.)</Label>
            <Input
              value={witness}
              onChange={(e) => setWitness(e.target.value)}
              className={`print:border-none print:bg-transparent transition-colors ${witness.trim() ? 'bg-green-100 border-green-400' : ''}`}
              placeholder="Должность, Ф.И.О."
            />
          </div>
        </div>

        <p className="font-semibold text-slate-900 mb-4">Необходимо устранить следующие нарушения в указанные сроки:</p>

        <div className="mb-6">
          <table className="w-full border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 w-12">п/п</th>
                <th className="border border-slate-300 p-2 w-1/2">Краткое изложение выявленных нарушений с указанием места обнаружения<br/>(при необходимости вкладывать фото)</th>
                <th className="border border-slate-300 p-2 w-1/2">Предлагаемые меры, ответственные за выполнение и срок устранения нарушений</th>
              </tr>
            </thead>
            <tbody>
              {violations.map((item, index) => (
                <tr key={index}>
                  <td className="border border-slate-300 p-2 text-center font-semibold">{item.item_number}.</td>
                  <td className={`border border-slate-300 p-2 transition-colors ${item.description.trim() || item.photos.length > 0 ? 'bg-green-100' : ''}`}>
                    <Textarea
                      value={item.description}
                      onChange={(e) => handleTextareaChange(index, 'description', e.target.value, e)}
                      className="w-full min-h-[80px] resize-none border-none bg-transparent print:border-none"
                      placeholder="Описание нарушения"
                    />
                    
                    {item.photos.map((photo, photoIndex) => (
                      <div key={photoIndex} className="mt-3 p-2 border border-slate-200 rounded">
                        <img src={photo.data} alt="Фото нарушения" className="max-w-xs h-auto mb-2" />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removePhoto(index, photoIndex)}
                          className="text-red-600 print:hidden"
                        >
                          <Icon name="Trash2" size={16} className="mr-1" />
                          Удалить фото
                        </Button>
                      </div>
                    ))}
                    
                    <div className="mt-2 print:hidden">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => document.getElementById(`photo-input-${index}`)?.click()}
                        className="border-dashed"
                      >
                        <Icon name="ImagePlus" size={16} className="mr-2" />
                        Вставить фото
                      </Button>
                      <input
                        id={`photo-input-${index}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handlePhotoUpload(index, e)}
                      />
                    </div>
                  </td>
                  <td className={`border border-slate-300 p-2 transition-colors ${item.measures.trim() ? 'bg-green-100' : ''}`}>
                    <Textarea
                      value={item.measures}
                      onChange={(e) => handleTextareaChange(index, 'measures', e.target.value, e)}
                      className="w-full min-h-[80px] resize-none border-none bg-transparent print:border-none"
                      placeholder="Меры и сроки устранения"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="flex gap-3 mt-4 print:hidden">
            <Button onClick={addViolationRow} size="sm" className="bg-green-600 hover:bg-green-700">
              <Icon name="Plus" size={16} className="mr-2" />
              Добавить строку
            </Button>
            <Button onClick={deleteViolationRow} size="sm" variant="outline" className="border-red-500 text-red-500 hover:bg-red-50">
              <Icon name="Minus" size={16} className="mr-2" />
              Удалить строку
            </Button>
          </div>
        </div>

        <p className="text-slate-900 mb-6">
          О выполнении настоящего предписания прошу предоставить письменное
          уведомление в отдел ОТ и ПБ <strong>согласно дат, указанных в пунктах.</strong>
        </p>

        <div className="signature-area space-y-4 mb-6">
          <div className="flex justify-between items-center border-t border-slate-300 pt-4">
            <div>
              <strong>Предписание выдал:</strong>
              <p className="text-slate-700">{issuerName}, {issuerPosition}</p>
            </div>
            <div>
              <Label className="font-semibold">Дата:</Label>
              <Input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-40 print:border-none print:bg-transparent"
              />
            </div>
          </div>

          <div className="border-t border-slate-300 pt-4">
            <strong className="block mb-3">Предписание принял:</strong>
            {acceptorSignatures.map((sig, index) => (
              <div key={index} className="flex justify-between items-center gap-4 mb-3">
                <Select value={sig.userId} onValueChange={(value) => updateSignature(index, value)}>
                  <SelectTrigger className={`flex-grow transition-colors ${sig.userId ? 'bg-green-100 border-green-400' : ''}`}>
                    <SelectValue placeholder="Выберите подписавшего" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgUsers.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.fio}, {user.position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Label className="font-semibold whitespace-nowrap">Дата:</Label>
                  <Input
                    type="date"
                    value={sig.date}
                    onChange={(e) => updateSignatureDate(index, e.target.value)}
                    className="w-40 print:border-none print:bg-transparent"
                  />
                </div>
              </div>
            ))}
            
            <Button onClick={addSignatureLine} size="sm" variant="outline" className="mt-2 print:hidden">
              <Icon name="Plus" size={16} className="mr-2" />
              Добавить подпись
            </Button>
          </div>
        </div>

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
  );
}