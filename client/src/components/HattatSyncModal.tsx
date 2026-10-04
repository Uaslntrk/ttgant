import React, { useState, useEffect } from 'react';
import { 
  X, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  MapPin, 
  Globe, 
  Play, 
  Building2, 
  Sparkles,
  Radio
} from 'lucide-react';
import { syncHattatAddresses, getHattatStatus, querySingleBbk } from '../api';
import { Task, HattatSyncStatus } from '../types';

interface HattatSyncModalProps {
  tasks: Task[];
  onClose: () => void;
  onSuccess: () => void;
}

export const HattatSyncModal: React.FC<HattatSyncModalProps> = ({
  tasks,
  onClose,
  onSuccess
}) => {
  const [onlyMissing, setOnlyMissing] = useState(true);
  const [status, setStatus] = useState<HattatSyncStatus | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Single test state
  const [testBbk, setTestBbk] = useState('38625596');
  const [testResult, setTestResult] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [testError, setTestError] = useState('');

  // Calculate task counts
  const tasksWithBbk = tasks.filter(t => t.BbkKodu && t.BbkKodu.trim() !== '');
  const tasksMissingAddress = tasksWithBbk.filter(t => !t.HizmetAdresi || t.HizmetAdresi.trim() === '');
  const tasksWithAddress = tasksWithBbk.length - tasksMissingAddress.length;

  // Poll status while running
  useEffect(() => {
    let interval: any = null;

    const checkStatus = async () => {
      try {
        const current = await getHattatStatus();
        if (current) {
          setStatus(current);
          if (current.isRunning) {
            // Keep polling
          } else if (status?.isRunning && !current.isRunning) {
            // Finished!
            onSuccess();
          }
        }
      } catch (e) {}
    };

    checkStatus();
    interval = setInterval(checkStatus, 1500);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status?.isRunning]);

  const handleStartSync = async () => {
    setIsStarting(true);
    setErrorMsg('');
    try {
      const res = await syncHattatAddresses(onlyMissing);
      if (res && res.status) {
        setStatus(res.status);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Hattat sorgulama başlatılamadı.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleTestSingle = async () => {
    if (!testBbk.trim()) return;
    setIsTesting(true);
    setTestError('');
    setTestResult(null);

    try {
      const res = await querySingleBbk(testBbk.trim());
      setTestResult(res);
    } catch (err: any) {
      setTestError(err.message || 'Sorgu başarısız');
    } finally {
      setIsTesting(false);
    }
  };

  const isRunning = status?.isRunning || isStarting;
  const progressPercent = status && status.total > 0 
    ? Math.round((status.current / status.total) * 100) 
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: 620, padding: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(90deg, #071927 0%, #0d1e30 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 6,
              background: '#008488',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              boxShadow: '0 0 12px rgba(0, 132, 136, 0.4)'
            }}>
              <Globe size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
                HaTTat BBK Adres Sorgulama
                <span style={{ fontSize: '0.65rem', background: '#0284c7', color: 'white', padding: '1px 6px', borderRadius: 4, fontWeight: 600 }}>
                  Otomatik
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                hattat.turktelekom.com.tr üzerinden BBK kodlarını sorgular ve müşteri adreslerini getirir
              </div>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="btn" 
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Stats Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
            background: '#0b0f19',
            padding: '10px 12px',
            border: '1px solid #1e293b'
          }}>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>BBK'lı Görevler</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>{tasksWithBbk.length}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#eab308' }}>Adresi Eksik Olan</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#eab308' }}>{tasksMissingAddress.length}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', color: '#22c55e' }}>Adresi Mevcut</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#22c55e' }}>{tasksWithAddress}</div>
            </div>
          </div>

          {/* Options & Action */}
          <div style={{
            background: '#0d131f',
            border: '1px solid #334155',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 10
          }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Radio size={14} style={{ color: '#008488' }} />
              Sorgulama Kapsamı:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.75rem', color: '#cbd5e1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scope"
                  checked={onlyMissing}
                  onChange={() => setOnlyMissing(true)}
                  disabled={isRunning}
                  style={{ accentColor: '#008488' }}
                />
                <span>
                  <b>Sadece Adresi Eksik Görevleri Sorgula</b> ({tasksMissingAddress.length} adet - Önerilen ve Hızlı)
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="scope"
                  checked={!onlyMissing}
                  onChange={() => setOnlyMissing(false)}
                  disabled={isRunning}
                  style={{ accentColor: '#008488' }}
                />
                <span>
                  <b>Tüm BBK Kodlu Görevleri Yeniden Sorgula</b> ({tasksWithBbk.length} adet)
                </span>
              </label>
            </div>

            {errorMsg && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid #ef4444',
                color: '#fca5a5',
                fontSize: '0.75rem',
                padding: '8px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}>
                <AlertCircle size={15} />
                {errorMsg}
              </div>
            )}

            <button
              onClick={handleStartSync}
              disabled={isRunning || tasksWithBbk.length === 0}
              className="btn"
              style={{
                background: isRunning ? '#334155' : '#008488',
                color: 'white',
                border: 'none',
                padding: '9px 16px',
                fontSize: '0.82rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: isRunning ? 'none' : '0 2px 8px rgba(0, 132, 136, 0.35)',
                cursor: isRunning ? 'not-allowed' : 'pointer'
              }}
            >
              {isRunning ? (
                <>
                  <RefreshCw size={15} className="spin" />
                  Sorgulama Devam Ediyor...
                </>
              ) : (
                <>
                  <Play size={15} />
                  Hattat'tan Adresleri Çekmeye Başla
                </>
              )}
            </button>
          </div>

          {/* Live Progress Bar (when running or recent status) */}
          {status && (status.isRunning || status.total > 0) && (
            <div style={{
              background: '#07131e',
              border: '1px solid #008488',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {status.isRunning ? <RefreshCw size={13} className="spin" /> : <CheckCircle2 size={14} style={{ color: '#22c55e' }} />}
                  {status.message || 'İşleniyor...'}
                </span>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f8fafc' }}>
                  %{progressPercent} ({status.current} / {status.total})
                </span>
              </div>

              {/* Progress bar container */}
              <div style={{ width: '100%', height: 7, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: status.isRunning ? 'linear-gradient(90deg, #008488, #38bdf8)' : '#22c55e',
                  transition: 'width 0.3s ease'
                }} />
              </div>

              <div style={{ display: 'flex', gap: 14, fontSize: '0.72rem', color: '#94a3b8' }}>
                <span>✅ Güncellenen: <b style={{ color: '#22c55e' }}>{status.updated}</b></span>
                <span>⚠️ Bulunamayan: <b style={{ color: '#ef4444' }}>{status.failed}</b></span>
                {status.currentBbk && (
                  <span style={{ color: '#38bdf8' }}>Aktif BBK: <b>{status.currentBbk}</b></span>
                )}
              </div>
            </div>
          )}

          {/* Quick Single BBK Test Accordion */}
          <div style={{
            background: '#0b0f19',
            border: '1px solid #1e293b',
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} style={{ color: '#008488' }} />
              Tekil BBK Testi (Hızlı Doğrulama)
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Örn: 38625596"
                value={testBbk}
                onChange={(e) => setTestBbk(e.target.value)}
                style={{ fontSize: '0.75rem', padding: '5px 8px', flex: 1 }}
              />
              <button
                onClick={handleTestSingle}
                disabled={isTesting || !testBbk.trim()}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '5px 12px', borderColor: '#008488', color: '#2dd4bf' }}
              >
                {isTesting ? <RefreshCw size={13} className="spin" /> : <Search size={13} />}
                Test Et
              </button>
            </div>

            {testError && (
              <div style={{ fontSize: '0.72rem', color: '#f87171' }}>{testError}</div>
            )}

            {testResult && (
              <div style={{
                background: '#071822',
                border: '1px solid #008488',
                padding: '8px 10px',
                fontSize: '0.72rem',
                color: '#e2e8f0',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={13} style={{ color: '#008488', flexShrink: 0 }} />
                  <b>Adres:</b>
                  <span style={{ color: '#22c55e', fontWeight: 600 }}>
                    {testResult.address || 'Adres bilgisi dönmedi'}
                  </span>
                </div>
                {testResult.santral && (
                  <div><b>Santral / Amirlik:</b> {testResult.santral} {testResult.amirlik ? `(${testResult.amirlik})` : ''}</div>
                )}
                {testResult.latitude && testResult.longitude && (
                  <div><b>Koordinat:</b> {testResult.latitude.toFixed(6)}, {testResult.longitude.toFixed(6)}</div>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 18px',
          borderTop: '1px solid #334155',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 8,
          background: '#0d131f'
        }}>
          <button
            onClick={() => {
              onSuccess();
              onClose();
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '5px 14px' }}
          >
            Kapat
          </button>
        </div>

      </div>
    </div>
  );
};
