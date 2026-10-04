import React, { useState } from 'react';
import { X, Save, Clock, Bell, Lock, MapPin, Building, Calendar, Users, AlertCircle } from 'lucide-react';
import { Task, Team } from '../types';

interface TaskEditModalProps {
  task: Task | null;
  teams: Team[];
  onClose: () => void;
  onSave: (taskId: string, updatedFields: { DurationDays: number; NotificationBeforeDays: number }) => Promise<void>;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
  task,
  teams,
  onClose,
  onSave
}) => {
  if (!task) return null;

  // KURAL 1: Yalnızca DurationDays ve NotificationBeforeDays değiştirilebilir.
  const [durationDays, setDurationDays] = useState<number>(task.DurationDays || 1);
  const [notificationBeforeDays, setNotificationBeforeDays] = useState<number>(task.NotificationBeforeDays || 2);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');

    try {
      await onSave(task.TaskId, {
        DurationDays: Number(durationDays),
        NotificationBeforeDays: Number(notificationBeforeDays)
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Görev güncellenirken hata oluştu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                İş Emri Parametreleri
              </span>
              <span style={{
                background: '#0284c7',
                color: 'white',
                padding: '1px 6px',
                fontSize: '0.72rem',
                fontWeight: 700
              }}>
                #{task.HizmetNo || task.TaskId}
              </span>
            </div>
            <p style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              <Lock size={11} style={{ color: '#d97706' }} />
              Excel kaynaklı veriler kilitlidir. Yalnızca planlama parametreleri düzenlenebilir.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 2 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
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

          {/* KİLİTLİ EXCEL VERİLERİ (READ-ONLY) */}
          <div style={{
            background: '#0b0f19',
            border: '1px solid #1f293d',
            padding: 10,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: '0.73rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1f293d', paddingBottom: 4 }}>
              <span style={{ fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Lock size={11} /> Excel Orijinal Bilgileri
              </span>
              <span style={{ color: '#64748b', fontSize: '0.68rem' }}>Salt Okunur</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div>
                <span style={{ color: '#94a3b8' }}>İş Emri / Hzm No:</span>
                <div style={{ fontWeight: 700, color: '#f8fafc' }}>{task.HizmetNo || task.TaskId}</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Kategori / İş Türü:</span>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>{task.TaskType}</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Atanan Ekip:</span>
                <div style={{ fontWeight: 700, color: '#38bdf8' }}>{task.TeamName || task.TeamId}</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Amirlik / Santral:</span>
                <div style={{ fontWeight: 600, color: '#f8fafc' }}>{task.Amirlik || task.Santral || '-'}</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Ekibe Atanma:</span>
                <div style={{ color: '#f8fafc' }}>{task.StartTime}</div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Randevu / Bitiş:</span>
                <div style={{ color: '#f8fafc' }}>{task.EndTime}</div>
              </div>
            </div>

            {task.HizmetAdresi && (
              <div style={{ borderTop: '1px solid #1f293d', paddingTop: 4 }}>
                <span style={{ color: '#94a3b8' }}>Hizmet Adresi:</span>
                <div style={{ color: '#cbd5e1', fontSize: '0.72rem', marginTop: 2 }}>
                  {task.HizmetAdresi}
                </div>
              </div>
            )}
          </div>

          {/* DÜZENLENEBİLİR PARAMETRELER: Duration (days) & Notify X days before */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {/* Duration (days) */}
            <div style={{
              background: '#0d131f',
              border: '1px solid #0284c7',
              padding: 10
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>
                <Clock size={13} /> Süre (Gün)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                className="form-input"
                value={durationDays}
                onChange={(e) => setDurationDays(Math.max(1, parseInt(e.target.value, 10) || 1))}
                required
                style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc', padding: '4px 8px' }}
              />
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 3, display: 'block' }}>
                İş süresi (gün)
              </span>
            </div>

            {/* Notify X days before */}
            <div style={{
              background: '#0d131f',
              border: '1px solid #d97706',
              padding: 10
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>
                <Bell size={13} /> Uyarı Eşiği (Gün Önce)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                className="form-input"
                value={notificationBeforeDays}
                onChange={(e) => setNotificationBeforeDays(Math.max(0, parseInt(e.target.value, 10) || 0))}
                required
                style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc', padding: '4px 8px' }}
              />
              <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: 3, display: 'block' }}>
                Bitişten kaç gün önce bildirim verilsin
              </span>
            </div>
          </div>

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
              type="submit"
              disabled={isSaving}
              className="btn btn-primary"
            >
              <Save size={14} />
              {isSaving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
