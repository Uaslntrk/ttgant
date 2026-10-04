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
import { importBase64, importLocalPath, importClipboardText, getAvailableExcelFiles } from '../api';
import { AvailableExcelFile } from '../types';

interface ExcelUploadModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const ExcelUploadModal: React.FC<ExcelUploadModalProps> = ({
  onClose,
  onSuccess
}) => {
  const [activeMode, setActiveMode] = useState<'local' | 'clipboard' | 'upload'>('local');
  const [availableFiles, setAvailableFiles] = useState<AvailableExcelFile[]>([]);
  const [selectedFilePath, setSelectedFilePath] = useState<string>('');
  const [customPath, setCustomPath] = useState<string>('');
  const [clipboardText, setClipboardText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  // By default do NOT clear existing SQLite tables to avoid data loss on close
  const [clearExisting, setClearExisting] = useState<boolean>(false);
  const [autoHattatSync, setAutoHattatSync] = useState<boolean>(true);
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
        const ttnet = files.find(f => f.name.toLowerCase().includes('ttnet') || f.name.toLowerCase().includes('bekleyen'));
        setSelectedFilePath(prev => prev || (ttnet ? ttnet.path : files[0].path));
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
        // Prefer custom path if provided; otherwise use the selected file from the list
        const pathToUse = customPath.trim() !== '' ? customPath.trim() : selectedFilePath;
        if (!pathToUse) {
          // Show a clearer message when both fields are empty
          throw new Error('Lütfen bir Excel dosyası seçin veya dosya yolunu girin.');
        }
        // Verify that the path ends with a supported extension before sending to backend
        if (!/\.xlsx?$/i.test(pathToUse)) {
          throw new Error('Dosya uzantısı .xlsx veya .xls olmalıdır.');
        }
        res = await importLocalPath(pathToUse, clearExisting, autoHattatSync);
      } else if (activeMode === 'clipboard') {
        if (!clipboardText.trim()) {
          throw new Error('Lütfen Excelden kopyaladığınız satırları yapıştırın.');
        }
        res = await importClipboardText(clipboardText, clearExisting, autoHattatSync);
      } else {
        if (!selectedFile) {
          throw new Error('Lütfen bir .xlsx dosyası sürükleyip bırakın veya seçin.');
        }
        // Base64 yöntemi: multipart upload KULLANMAZ, güvenlik engeline takılmaz
        res = await importBase64(selectedFile, clearExisting, autoHattatSync);
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
              Excel Verilerini SQLite'a Aktar
            </div>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 2 }}>
              Güvenlik duvarını atlatmak için doğrudan diskten okuma veya pano yöntemi kullanılabilir.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
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
            Sürükle & Bırak (Güvenli)
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
                <b>Veriler Başarıyla Aktarıldı!</b> ({successInfo.importedTeams || 0} Ekip, {successInfo.importedTasks || 0} Görev)
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
                  <b>Güvenlik Dostu:</b> Dosya tarayıcı upload filtresine girmez; sunucu doğrudan diskten okur.
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
                  placeholder="C:\Users\...\dosya.xlsx"
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

          {/* TAB 3: SÜRÜKLE-BIRAK YÜKLEME (Base64 - Güvenlik Dostu) */}
          {activeMode === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
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
                  <b>Güvenlik Dostu:</b> Dosya tarayıcıda base64'e çevrilip JSON olarak gönderilir. Multipart upload kullanılmaz, güvenlik engeline takılmaz.
                </span>
              </div>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    const file = files[0];
                    const ext = file.name.toLowerCase();
                    if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
                      setSelectedFile(file);
                    } else {
                      setErrorMsg('Lütfen .xlsx veya .xls uzantılı bir Excel dosyası bırakın.');
                    }
                  }
                }}
                onClick={() => document.getElementById('standard-file-input')?.click()}
                style={{
                  border: isDragging ? '2px solid #16a34a' : '2px dashed #334155',
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: isDragging ? 'rgba(22, 163, 106, 0.1)' : '#0b0f19',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  borderRadius: 6
                }}
              >
                <input
                  id="standard-file-input"
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setSelectedFile(e.target.files[0]);
                    }
                  }}
                  style={{ display: 'none' }}
                />
                <UploadCloud size={32} style={{ color: isDragging ? '#16a34a' : '#0284c7', margin: '0 auto 8px' }} />
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isDragging ? '#4ade80' : '#f8fafc' }}>
                  {selectedFile ? `✅ ${selectedFile.name}` : 'Excel dosyasını buraya sürükleyip bırakın'}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: 4 }}>
                  veya tıklayarak dosya seçin (.xlsx / .xls)
                </div>
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
            İçe aktarmadan önce mevcut SQLite tablosunu temizle
          </label>

          {/* Auto Hattat Sync Checkbox */}
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: '0.75rem',
            color: '#38bdf8',
            cursor: 'pointer',
            background: 'rgba(0, 132, 136, 0.12)',
            padding: '7px 10px',
            border: '1px solid #008488',
            borderRadius: 4
          }}>
            <input
              type="checkbox"
              checked={autoHattatSync}
              onChange={(e) => setAutoHattatSync(e.target.checked)}
              style={{ accentColor: '#008488', width: 15, height: 15 }}
            />
            <span>
              <b>HaTTat Entegrasyonu:</b> Exceldeki BBK kodlarını otomatik sorgulayıp müşteri adreslerini çek
            </span>
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
