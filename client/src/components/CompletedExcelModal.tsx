import React, { useState, useEffect } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  ClipboardPaste, 
  ShieldCheck,
  RefreshCw 
} from 'lucide-react';
import { 
  getAvailableExcelFiles, 
  importCompletedPath, 
  importCompletedClipboard, 
  uploadCompletedExcel 
} from '../api';
import { AvailableExcelFile } from '../types';

interface CompletedExcelModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const CompletedExcelModal: React.FC<CompletedExcelModalProps> = ({
  onClose,
  onSuccess
}) => {
  const [activeMode, setActiveMode] = useState<'local' | 'clipboard' | 'upload'>('local');
  const [availableFiles, setAvailableFiles] = useState<AvailableExcelFile[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');
  const [customPath, setCustomPath] = useState<string>('');
  const [clipboardText, setClipboardText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clearExisting, setClearExisting] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successInfo, setSuccessInfo] = useState<any>(null);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);

  const loadFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const files = await getAvailableExcelFiles();
      setAvailableFiles(files);
      if (files.length > 0) {
        const completedFile = files.find(f => 
          f.name.toLowerCase().includes('isemri-listesi') || 
          f.name.toLowerCase().includes('tamamlanan') ||
          f.name.toLowerCase().includes('rapor')
        );
        setSelectedFilePath(prev => prev || (completedFile ? completedFile.path : files[0].path));
      }
    } catch (e) {
      console.error('Excel dosyaları yüklenemedi:', e);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  // Load available local Excel files in Downloads & Project
  useEffect(() => {
    loadFiles();
  }, []);

  const formatFileMeta = (f: AvailableExcelFile) => {
    const parts = [];
    if (f.mtime) {
      const d = new Date(f.mtime);
      parts.push(d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
    }
    if (f.size) {
      const sizeMb = f.size > 1048576 ? `${(f.size / 1048576).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`;
      parts.push(sizeMb);
    }
    return parts.length > 0 ? ` (${parts.join(' - ')})` : '';
  };

  const handleExecute = async () => {
    setIsProcessing(true);
    setErrorMsg('');
    setSuccessInfo(null);

    try {
      let res: any;

      if (activeMode === 'local') {
        const pathToUse = customPath.trim() || selectedFilePath;
        if (!pathToUse) {
          throw new Error('Lütfen bir Excel dosyası seçin veya yolunu girin.');
        }
        res = await importCompletedPath(pathToUse, clearExisting);
      } else if (activeMode === 'clipboard') {
        if (!clipboardText.trim()) {
          throw new Error('Lütfen Excelden kopyaladığınız satırları yapıştırın.');
        }
        res = await importCompletedClipboard(clipboardText, clearExisting);
      } else {
        if (!selectedFile) {
          throw new Error('Lütfen bir .xlsx veya .xls dosyası seçin.');
        }
        res = await uploadCompletedExcel(selectedFile, clearExisting);
      }

      setSuccessInfo(res.details || res);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'İçe aktarma sırasında bir hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        {/* Header */}
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#0d131f'
        }}>
          <div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              <FileSpreadsheet size={18} style={{ color: '#16a34a' }} />
              Yapılan İşler Raporunu İçe Aktar
            </div>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
              Bildirim, Ekibe Atanma ve Tamamlanma Zamanlarını içeren Excel raporunu aktarır.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs - Flat */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1f293d', background: '#0b0f19' }}>
          <button
            type="button"
            onClick={() => setActiveMode('local')}
            style={{
              flex: 1,
              padding: '8px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: activeMode === 'local' ? '#0284c7' : 'transparent',
              color: activeMode === 'local' ? '#ffffff' : '#94a3b8',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5
            }}
          >
            <ShieldCheck size={14} />
            Yerel Dosyadan Oku (Önerilen)
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('clipboard')}
            style={{
              flex: 1,
              padding: '8px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: activeMode === 'clipboard' ? '#0284c7' : 'transparent',
              color: activeMode === 'clipboard' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderLeft: '1px solid #1f293d',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5
            }}
          >
            <ClipboardPaste size={14} />
            Kopyala / Yapıştır
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('upload')}
            style={{
              flex: 1,
              padding: '8px 10px',
              fontSize: '0.75rem',
              fontWeight: 700,
              background: activeMode === 'upload' ? '#0284c7' : 'transparent',
              color: activeMode === 'upload' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderLeft: '1px solid #1f293d',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 5
            }}
          >
            <UploadCloud size={14} />
            Standart Yükleme
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {errorMsg && (
            <div style={{
              padding: '8px 10px',
              background: '#281113',
              border: '1px solid #dc2626',
              color: '#fca5a5',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <AlertCircle size={14} /> {errorMsg}
            </div>
          )}

          {successInfo && (
            <div style={{
              padding: '8px 10px',
              background: '#0d2818',
              border: '1px solid #16a34a',
              color: '#4ade80',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              <CheckCircle size={16} />
              <div>
                <b>Yapılan İşler Başarıyla Aktarıldı!</b> ({successInfo.importedCompleted || 0} Görev)
              </div>
            </div>
          )}

          {/* TAB 1: LOCAL FILE READING */}
          {activeMode === 'local' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{
                background: '#052e16',
                border: '1px solid #16a34a',
                padding: '8px 10px',
                fontSize: '0.73rem',
                color: '#86efac',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <ShieldCheck size={16} />
                <span>
                  <b>Güvenlik Dostu:</b> Dosya tarayıcı upload'ına takılmaz; sunucu doğrudan yerel diskinizden okur.
                </span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1' }}>
                    Tespit Edilen Excel Dosyaları (Downloads / Workspace):
                  </label>
                  <button
                    type="button"
                    onClick={loadFiles}
                    disabled={isLoadingFiles}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      cursor: 'pointer',
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '2px 4px'
                    }}
                    title="Dosya listesini yeniden tara"
                  >
                    <RefreshCw size={11} className={isLoadingFiles ? 'animate-spin' : ''} />
                    {isLoadingFiles ? 'Taranıyor...' : 'Yenile'}
                  </button>
                </div>

                {availableFiles.length === 0 ? (
                  <div style={{
                    padding: '8px 10px',
                    background: '#111827',
                    border: '1px dashed #334155',
                    borderRadius: 4,
                    color: '#94a3b8',
                    fontSize: '0.73rem',
                    textAlign: 'center'
                  }}>
                    {isLoadingFiles ? 'Excel dosyaları taranıyor...' : 'Otomatik Excel dosyası bulunamadı. Lütfen aşağıdaki kutudan dosya yolunu girin veya Pano sekmesini kullanın.'}
                  </div>
                ) : (
                  <select
                    value={selectedFilePath}
                    onChange={(e) => {
                      setSelectedFilePath(e.target.value);
                      setCustomPath('');
                    }}
                    className="form-input"
                    style={{ fontSize: '0.8rem' }}
                  >
                    {availableFiles.map((f, i) => (
                      <option key={i} value={f.path}>
                        [{f.source}] {f.name}{formatFileMeta(f)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', marginBottom: 4 }}>
                  Veya Farklı Bir Dosya Yolu:
                </label>
                <input
                  type="text"
                  placeholder="C:\Users\...\Isemri-Listesi-RPR.xls"
                  className="form-input"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  style={{ fontSize: '0.78rem' }}
                />
              </div>
            </div>
          )}

          {/* TAB 2: CLIPBOARD COPY-PASTE */}
          {activeMode === 'clipboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{
                background: '#0b1626',
                border: '1px solid #0284c7',
                padding: '8px 10px',
                fontSize: '0.73rem',
                color: '#7dd3fc'
              }}>
                <b>Nasıl Yapılır:</b> Excel dosyanızı açın, satırları seçip <b>Ctrl+C</b> yapın ve aşağıdaki kutucuğa <b>Ctrl+V</b> ile yapıştırın.
              </div>

              <textarea
                rows={5}
                className="form-input"
                placeholder="Excelden kopyaladığınız satırları buraya yapıştırın (Ctrl + V)..."
                value={clipboardText}
                onChange={(e) => setClipboardText(e.target.value)}
                style={{ fontSize: '0.73rem', fontFamily: 'monospace' }}
              />
            </div>
          )}

          {/* TAB 3: STANDARD UPLOAD */}
          {activeMode === 'upload' && (
            <div
              style={{
                border: '1px dashed #334155',
                padding: '16px',
                textAlign: 'center',
                background: '#0b0f19',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById('completed-file-input')?.click()}
            >
              <input
                id="completed-file-input"
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setSelectedFile(e.target.files[0]);
                  }
                }}
                style={{ display: 'none' }}
              />
              <UploadCloud size={28} style={{ color: '#0284c7', margin: '0 auto 6px' }} />
              <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#f8fafc' }}>
                {selectedFile ? selectedFile.name : 'Yapılan İşler Excel (.xlsx / .xls) Dosyası Seçin'}
              </div>
            </div>
          )}

          {/* Clear Existing Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#cbd5e1', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(e) => setClearExisting(e.target.checked)}
              style={{ accentColor: '#0284c7', width: 14, height: 14 }}
            />
            İçe aktarmadan önce mevcut Yapılan İşler tablosunu temizle
          </label>

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            paddingTop: 8,
            borderTop: '1px solid #1f293d'
          }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Kapat
            </button>
            <button
              type="button"
              onClick={handleExecute}
              disabled={isProcessing}
              className="btn btn-primary"
            >
              {isProcessing ? 'İşleniyor...' : 'Veritabanına Aktar'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
